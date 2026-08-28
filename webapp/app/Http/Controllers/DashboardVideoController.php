<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreVideoRequest;
use App\Jobs\ProcessVideo;
use App\Jobs\PublishVideo;
use App\Models\Video;
use App\VideoStatus;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

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
            'processing_stage' => 'Waiting for upload',
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
                'processing_progress' => 5,
                'processing_stage' => 'Queued for processing',
                'processing_error' => null,
            ]) === 1;

        $video->refresh();

        if ($wasQueued) {
            Bus::chain([
                new ProcessVideo($video),
                new PublishVideo($video),
            ])->onConnection('video_processing')->dispatch();
        }

        return response()->json(['video' => $this->videoPayload($video)], 202);
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
     * @return array<string, mixed>
     */
    private function videoPayload(Video $video): array
    {
        $manifest = $video->processing_manifest ?? [];
        $manifestRenditions = data_get($manifest, 'renditions', []);
        $renditions = [];

        if (is_array($manifestRenditions)) {
            foreach ($manifestRenditions as $rendition) {
                $data = is_array($rendition) ? $rendition : [];
                $playlist = data_get($data, 'playlist');
                $renditions[] = [
                    ...$data,
                    'playlistUrl' => is_string($playlist) && $video->status === VideoStatus::Live
                        ? $video->publicAssetUrl($video->storagePrefix().'/'.$playlist)
                        : null,
                ];
            }
        }

        return [
            'id' => $video->slug,
            'title' => $video->title,
            'status' => $video->status->value,
            'statusLabel' => str($video->status->value)->headline()->toString(),
            'processingProgress' => $video->processing_progress,
            'processingStage' => $video->processing_stage,
            'processingError' => $video->processing_error,
            'fileSizeBytes' => $video->file_size_bytes,
            'durationSeconds' => data_get($manifest, 'durationSeconds'),
            'thumbnailUrl' => $video->thumbnailUrl(),
            'previewUrl' => $video->previewUrl(),
            'playbackUrl' => $video->playbackUrl(),
            'renditions' => $renditions,
            'createdAt' => $video->created_at?->diffForHumans(),
        ];
    }
}
