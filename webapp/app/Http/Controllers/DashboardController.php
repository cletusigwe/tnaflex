<?php

namespace App\Http\Controllers;

use App\Models\Video;
use App\VideoStatus;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Handle the incoming request.
     */
    public function __invoke(Request $request): Response
    {
        $videos = $request->user()->videos()->latest()->get();

        return Inertia::render('dashboard', [
            'videos' => $videos->map(function (Video $video): array {
                $processedThumbnail = data_get($video->processing_manifest, 'thumbnail.path');

                return [
                    'id' => $video->slug,
                    'title' => $video->title,
                    'status' => $video->status->value,
                    'statusLabel' => str($video->status->value)->headline()->toString(),
                    'thumbnailUrl' => $video->status !== VideoStatus::Live && is_string($processedThumbnail)
                        ? route('dashboard.videos.assets', ['video' => $video, 'asset' => $processedThumbnail])
                        : $video->thumbnailUrl(),
                    'fileSizeBytes' => $video->file_size_bytes,
                    'createdAt' => $video->created_at?->diffForHumans(),
                ];
            }),
        ]);
    }
}
