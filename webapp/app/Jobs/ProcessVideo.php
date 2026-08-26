<?php

namespace App\Jobs;

use App\Models\Video;
use App\Services\VideoProcessor;
use App\VideoStatus;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Throwable;

class ProcessVideo implements ShouldBeUnique, ShouldQueue
{
    use Queueable;

    public int $tries = 2;

    public int $timeout;

    public int $uniqueFor;

    public bool $failOnTimeout = true;

    /** @var list<int> */
    public array $backoff = [60];

    public function __construct(public Video $video)
    {
        $this->timeout = (int) config('video.processing_timeout');
        $this->uniqueFor = $this->timeout + 600;
        $this->onConnection('video_processing');
    }

    public function uniqueId(): string
    {
        return (string) $this->video->getKey();
    }

    /**
     * Execute the job.
     */
    public function handle(VideoProcessor $processor): void
    {
        $this->video->refresh();

        if ($this->video->status !== VideoStatus::Preprocessing) {
            return;
        }

        $manifest = $processor->process($this->video);

        $this->video->update([
            'processed_path' => $this->video->storagePrefix().'/processed',
            'processing_manifest' => $manifest,
            'duration' => $this->formatDuration((float) data_get($manifest, 'durationSeconds', 0)),
            'status' => VideoStatus::Ready,
            'processing_error' => null,
        ]);
    }

    public function failed(?Throwable $exception): void
    {
        $this->video->refresh();

        if ($this->video->status === VideoStatus::Preprocessing) {
            $this->video->update([
                'status' => VideoStatus::Failed,
                'processing_error' => 'Video processing failed.',
            ]);
        }

        Log::error('Video processing failed.', [
            'video_id' => $this->video->getKey(),
            'error' => $exception?->getMessage(),
        ]);
    }

    private function formatDuration(float $duration): string
    {
        $seconds = max(0, (int) round($duration));

        return sprintf('%02d:%02d', intdiv($seconds, 60), $seconds % 60);
    }
}
