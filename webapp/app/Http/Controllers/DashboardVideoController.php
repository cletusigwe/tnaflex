<?php

namespace App\Http\Controllers;

use App\Http\Requests\PublishVideoRequest;
use App\Http\Requests\StoreVideoRequest;
use App\Jobs\ProcessVideo;
use App\Jobs\PublishVideo;
use App\Models\Video;
use App\VideoStatus;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use JsonException;
use RuntimeException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DashboardVideoController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('dashboard/videos/create');
    }

    public function store(StoreVideoRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $video = $request->user()->videos()->create([
            'slug' => Str::slug($validated['title']).'-'.Str::lower(Str::random(6)),
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'source_mime_type' => $validated['content_type'],
            'file_size_bytes' => $validated['file_size_bytes'],
        ]);

        $video->update([
            'source_path' => $video->storagePrefix().'/source/original.'.$request->extension(),
        ]);

        $expiresAt = now()->addMinutes((int) config('video.upload_url_ttl'));
        $upload = Storage::disk('r2_private')->temporaryUploadUrl(
            $video->source_path,
            $expiresAt,
            ['ContentType' => $video->source_mime_type],
        );

        if (! is_string($upload['url'] ?? null) || ! is_array($upload['headers'] ?? null)) {
            throw new RuntimeException('The upload URL could not be created.');
        }

        $headers = [];

        foreach ($upload['headers'] as $name => $value) {
            if (! is_string($name) || strcasecmp($name, 'host') === 0) {
                continue;
            }

            $headers[$name] = is_array($value)
                ? implode(', ', $value)
                : (string) $value;
        }

        return response()->json([
            'video' => $this->videoPayload($video),
            'upload' => [
                'url' => $upload['url'],
                'headers' => $headers,
                'expiresAt' => $expiresAt->toIso8601String(),
            ],
        ], 201);
    }

    public function complete(Video $video): JsonResponse
    {
        Gate::authorize('update', $video);

        if ($video->status !== VideoStatus::AwaitingUpload) {
            abort_if($video->status === VideoStatus::Failed, 409, 'This upload cannot be completed.');

            return response()->json(['video' => $this->videoPayload($video)]);
        }

        if ($video->source_path === null) {
            throw new RuntimeException('The video has no source path.');
        }

        $disk = Storage::disk('r2_private');

        if (! $disk->exists($video->source_path)) {
            throw ValidationException::withMessages([
                'video' => 'The uploaded video was not found. Upload it again before continuing.',
            ]);
        }

        if ($disk->size($video->source_path) !== $video->file_size_bytes) {
            throw ValidationException::withMessages([
                'video' => 'The uploaded video size does not match the selected file.',
            ]);
        }

        if ($disk->mimeType($video->source_path) !== $video->source_mime_type) {
            throw ValidationException::withMessages([
                'video' => 'The uploaded file type does not match the selected video.',
            ]);
        }

        $wasQueued = Video::query()
            ->whereKey($video->getKey())
            ->where('status', VideoStatus::AwaitingUpload)
            ->update([
                'status' => VideoStatus::Preprocessing,
                'processing_error' => null,
            ]) === 1;

        $video->refresh();

        if ($wasQueued) {
            ProcessVideo::dispatch($video)->afterCommit();
        }

        return response()->json(['video' => $this->videoPayload($video)], 202);
    }

    public function publish(PublishVideoRequest $request, Video $video): JsonResponse
    {
        abort_unless($video->status === VideoStatus::Ready, 409, 'Only a processed video can be published.');

        $manifest = $video->processing_manifest;

        if ($manifest === null || $video->processed_path === null) {
            throw new RuntimeException('The processed video metadata is missing.');
        }

        if ($request->hasFile('thumbnail')) {
            $manifest = $this->storeCustomThumbnail(
                $video,
                $request->file('thumbnail'),
                $manifest,
            );
        }

        $wasQueued = Video::query()
            ->whereKey($video->getKey())
            ->where('status', VideoStatus::Ready)
            ->update([
                'status' => VideoStatus::Publishing,
                'processing_manifest' => $manifest,
                'processing_error' => null,
            ]) === 1;

        abort_unless($wasQueued, 409, 'This video is already being published.');

        $video->refresh();
        PublishVideo::dispatch($video)->afterCommit();

        return response()->json(['video' => $this->videoPayload($video)], 202);
    }

    public function asset(Video $video, string $asset): StreamedResponse
    {
        Gate::authorize('view', $video);

        abort_if(
            $video->processed_path === null
                || $asset === ''
                || str_contains($asset, '..')
                || str_contains($asset, '\\'),
            404,
        );

        $path = $video->processed_path.'/'.ltrim($asset, '/');
        $disk = Storage::disk('r2_private');

        abort_unless($disk->exists($path), 404);

        $stream = $disk->readStream($path);

        if (! is_resource($stream)) {
            throw new RuntimeException('The processed video asset could not be read.');
        }

        return response()->stream(function () use ($stream): void {
            try {
                fpassthru($stream);
            } finally {
                fclose($stream);
            }
        }, 200, [
            'Cache-Control' => 'private, max-age=300',
            'Content-Length' => (string) $disk->size($path),
            'Content-Type' => $this->contentTypeFor($path),
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    public function show(Request $request, Video $video): JsonResponse|Response
    {
        Gate::authorize('view', $video);

        if ($request->expectsJson()) {
            return response()->json(['video' => $this->videoPayload($video)]);
        }

        return Inertia::render('dashboard/videos/show', [
            'video' => $this->videoPayload($video),
        ]);
    }

    /**
     * @param  array<string, mixed>  $manifest
     * @return array<string, mixed>
     *
     * @throws JsonException
     */
    private function storeCustomThumbnail(Video $video, ?UploadedFile $thumbnail, array $manifest): array
    {
        if ($thumbnail === null || $video->processed_path === null) {
            return $manifest;
        }

        $filename = 'thumbnail-custom.'.$thumbnail->extension();
        $path = $thumbnail->storeAs($video->processed_path, $filename, 'r2_private');

        if ($path === false) {
            throw new RuntimeException('The thumbnail could not be stored.');
        }

        $manifest['thumbnail'] = [
            'path' => $filename,
            'sizeBytes' => $thumbnail->getSize(),
        ];

        Storage::disk('r2_private')->put(
            $video->processed_path.'/manifest.json',
            json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR),
            ['ContentType' => 'application/json'],
        );

        return $manifest;
    }

    /**
     * @return array<string, mixed>
     */
    private function videoPayload(Video $video): array
    {
        $manifest = $video->processing_manifest ?? [];
        $thumbnailPath = data_get($manifest, 'thumbnail.path');
        $previewPath = data_get($manifest, 'preview.path');
        $playlistPath = data_get($manifest, 'playlist');

        $manifestRenditions = data_get($manifest, 'renditions', []);
        $renditions = [];

        if (is_array($manifestRenditions)) {
            foreach ($manifestRenditions as $rendition) {
                $data = is_array($rendition) ? $rendition : [];
                $playlist = data_get($data, 'playlist');
                $renditions[] = [
                    ...$data,
                    'playlistUrl' => is_string($playlist)
                        ? ($video->status === VideoStatus::Live
                            ? $video->publicAssetUrl($video->storagePrefix().'/'.$playlist)
                            : route('dashboard.videos.assets', ['video' => $video, 'asset' => $playlist]))
                        : null,
                ];
            }
        }

        return [
            'id' => $video->slug,
            'title' => $video->title,
            'status' => $video->status->value,
            'statusLabel' => str($video->status->value)->headline()->toString(),
            'processingError' => $video->processing_error,
            'fileSizeBytes' => $video->file_size_bytes,
            'durationSeconds' => data_get($manifest, 'durationSeconds'),
            'thumbnailUrl' => $video->status !== VideoStatus::Live && is_string($thumbnailPath)
                ? route('dashboard.videos.assets', ['video' => $video, 'asset' => $thumbnailPath])
                : $video->thumbnailUrl(),
            'previewUrl' => $video->status !== VideoStatus::Live && is_string($previewPath)
                ? route('dashboard.videos.assets', ['video' => $video, 'asset' => $previewPath])
                : $video->previewUrl(),
            'playbackUrl' => $video->status !== VideoStatus::Live && is_string($playlistPath)
                ? route('dashboard.videos.assets', ['video' => $video, 'asset' => $playlistPath])
                : $video->playbackUrl(),
            'renditions' => $renditions,
            'createdAt' => $video->created_at?->diffForHumans(),
        ];
    }

    private function contentTypeFor(string $path): string
    {
        return match (strtolower(pathinfo($path, PATHINFO_EXTENSION))) {
            'jpg', 'jpeg' => 'image/jpeg',
            'json' => 'application/json',
            'm3u8' => 'application/vnd.apple.mpegurl',
            'mp4' => 'video/mp4',
            'png' => 'image/png',
            'ts' => 'video/mp2t',
            'webp' => 'image/webp',
            default => 'application/octet-stream',
        };
    }
}
