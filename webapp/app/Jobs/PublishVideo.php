<?php

namespace App\Jobs;

use App\Models\Video;
use App\VideoStatus;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Throwable;

class PublishVideo implements ShouldBeUnique, ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public int $timeout = 1800;

    public int $uniqueFor = 2400;

    /** @var list<int> */
    public array $backoff = [30, 120];

    public function __construct(public Video $video)
    {
        $this->onConnection('video_processing');
    }

    public function uniqueId(): string
    {
        return (string) $this->video->getKey();
    }

    public function handle(): void
    {
        $this->video->refresh();

        if ($this->video->status !== VideoStatus::Publishing) {
            return;
        }

        if ($this->video->processed_path === null || $this->video->processing_manifest === null) {
            throw new RuntimeException('The processed video metadata is missing.');
        }

        $privateDisk = Storage::disk('r2_private');
        $publicDisk = Storage::disk((string) config('video.public_disk'));
        $publicPrefix = $this->video->storagePrefix();
        $files = $privateDisk->allFiles($this->video->processed_path);

        if ($files === []) {
            throw new RuntimeException('No processed video assets were found.');
        }

        usort($files, fn (string $left, string $right): int => match (true) {
            str_ends_with($left, '/manifest.json') => 1,
            str_ends_with($right, '/manifest.json') => -1,
            default => $left <=> $right,
        });

        foreach ($files as $privatePath) {
            $relativePath = substr($privatePath, strlen($this->video->processed_path) + 1);
            $stream = $privateDisk->readStream($privatePath);

            if (! is_resource($stream)) {
                throw new RuntimeException('A processed video asset could not be read.');
            }

            try {
                $publicDisk->put(
                    $publicPrefix.'/'.$relativePath,
                    $stream,
                    ['ContentType' => $this->contentTypeFor($privatePath)],
                );
            } finally {
                fclose($stream);
            }
        }

        $manifest = $this->video->processing_manifest;
        $thumbnailPath = data_get($manifest, 'thumbnail.path');
        $previewPath = data_get($manifest, 'preview.path');
        $playlistPath = data_get($manifest, 'playlist');

        if (! is_string($thumbnailPath) || ! is_string($previewPath) || ! is_string($playlistPath)) {
            throw new RuntimeException('The processed video manifest is incomplete.');
        }

        $this->video->update([
            'thumbnail_path' => $publicPrefix.'/'.$thumbnailPath,
            'preview_path' => $publicPrefix.'/'.$previewPath,
            'playback_path' => $publicPrefix.'/'.$playlistPath,
            'status' => VideoStatus::Live,
            'processing_error' => null,
            'published_at' => now(),
        ]);
    }

    public function failed(?Throwable $exception): void
    {
        $this->video->refresh();

        if ($this->video->status === VideoStatus::Publishing) {
            $this->video->update([
                'status' => VideoStatus::Ready,
                'processing_error' => 'Video publishing failed. Try publishing it again.',
            ]);
        }

        Log::error('Video publishing failed.', [
            'video_id' => $this->video->getKey(),
            'error' => $exception?->getMessage(),
        ]);
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
