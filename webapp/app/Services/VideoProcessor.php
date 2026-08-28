<?php

namespace App\Services;

use App\Models\Video;
use Closure;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use JsonException;
use RuntimeException;
use Symfony\Component\Process\Process as SymfonyProcess;

class VideoProcessor
{
    /**
     * @return array<string, mixed>
     *
     * @throws JsonException
     */
    public function process(Video $video, ?Closure $onProgress = null): array
    {
        if ($video->source_path === null) {
            throw new RuntimeException('The video has no source path.');
        }

        $workingRoot = storage_path('app/video-processing');
        $workingDirectory = $workingRoot.'/'.Str::uuid();
        $sourcePath = $workingDirectory.'/source.'.pathinfo($video->source_path, PATHINFO_EXTENSION);
        $outputPath = $workingDirectory.'/output';

        File::ensureDirectoryExists($workingDirectory);

        try {
            $this->downloadSource($video->source_path, $sourcePath);
            $onProgress?->__invoke(15, 'Inspecting source');

            $outputBuffer = '';

            Process::timeout(max(60, (int) config('video.processing_timeout') - 60))
                ->run([
                    base_path('scripts/preprocess-video.sh'),
                    '--input',
                    $sourcePath,
                    '--output',
                    $outputPath,
                    '--watermark',
                    resource_path('media/watermarks/tnaflex.png'),
                ], function (string $type, string $output) use (&$outputBuffer, $onProgress): void {
                    if ($type !== SymfonyProcess::OUT || $onProgress === null) {
                        return;
                    }

                    $outputBuffer .= $output;

                    while (($lineEnd = strpos($outputBuffer, "\n")) !== false) {
                        $line = substr($outputBuffer, 0, $lineEnd);
                        $outputBuffer = substr($outputBuffer, $lineEnd + 1);
                        $this->reportProgress($line, $onProgress);
                    }
                })
                ->throw();

            if ($outputBuffer !== '' && $onProgress !== null) {
                $this->reportProgress($outputBuffer, $onProgress);
            }

            $manifest = $this->readManifest($outputPath);
            $onProgress?->__invoke(80, 'Uploading processed files');
            $this->uploadOutputs($outputPath, $video->storagePrefix().'/processed');

            return $manifest;
        } finally {
            if (str_starts_with($workingDirectory, $workingRoot.'/')) {
                File::deleteDirectory($workingDirectory);
            }
        }
    }

    private function reportProgress(string $line, Closure $onProgress): void
    {
        if (preg_match('/^\[video-preprocessor\] progress:(\d+):(.+)$/', trim($line), $matches) !== 1) {
            return;
        }

        $onProgress((int) $matches[1], trim($matches[2]));
    }

    private function downloadSource(string $remotePath, string $localPath): void
    {
        $source = Storage::disk('r2_private')->readStream($remotePath);

        if (! is_resource($source)) {
            throw new RuntimeException('The source video could not be read.');
        }

        $destination = fopen($localPath, 'wb');

        if ($destination === false) {
            fclose($source);

            throw new RuntimeException('The local source file could not be created.');
        }

        try {
            if (stream_copy_to_stream($source, $destination) === false) {
                throw new RuntimeException('The source video could not be downloaded.');
            }
        } finally {
            fclose($source);
            fclose($destination);
        }
    }

    /**
     * @return array<string, mixed>
     *
     * @throws JsonException
     */
    private function readManifest(string $outputPath): array
    {
        $manifestPath = $outputPath.'/manifest.json';

        if (! File::exists($manifestPath)) {
            throw new RuntimeException('The video processor did not produce a manifest.');
        }

        $manifest = json_decode(File::get($manifestPath), true, flags: JSON_THROW_ON_ERROR);

        if (! is_array($manifest) || ! is_array(data_get($manifest, 'renditions'))) {
            throw new RuntimeException('The video processor produced an invalid manifest.');
        }

        return $manifest;
    }

    private function uploadOutputs(string $outputPath, string $remotePrefix): void
    {
        $disk = Storage::disk('r2_private');
        $files = collect(File::allFiles($outputPath))
            ->sortBy(fn (\SplFileInfo $file): bool => $file->getFilename() === 'manifest.json');

        foreach ($files as $file) {
            $relativePath = ltrim(str_replace($outputPath, '', $file->getPathname()), DIRECTORY_SEPARATOR);
            $relativePath = str_replace(DIRECTORY_SEPARATOR, '/', $relativePath);
            $stream = fopen($file->getPathname(), 'rb');

            if ($stream === false) {
                throw new RuntimeException('A processed video asset could not be opened.');
            }

            try {
                $disk->put(
                    $remotePrefix.'/'.$relativePath,
                    $stream,
                    ['ContentType' => $this->contentTypeFor($relativePath)],
                );
            } finally {
                fclose($stream);
            }
        }
    }

    private function contentTypeFor(string $path): string
    {
        return match (strtolower(pathinfo($path, PATHINFO_EXTENSION))) {
            'jpg', 'jpeg' => 'image/jpeg',
            'json' => 'application/json',
            'm3u8' => 'application/vnd.apple.mpegurl',
            'mp4' => 'video/mp4',
            'ts' => 'video/mp2t',
            default => 'application/octet-stream',
        };
    }
}
