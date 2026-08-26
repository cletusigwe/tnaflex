<?php

namespace App\Http\Controllers;

use App\Models\Video;
use App\VideoStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class VideoController extends Controller
{
    public function index(Request $request): Response
    {
        $query = $request->string('q')->trim()->toString();

        $videos = Video::query()
            ->with('user')
            ->live()
            ->when($query !== '', fn (Builder $videos): Builder => $videos
                ->where(fn (Builder $matchingVideos): Builder => $matchingVideos
                    ->where('title', 'like', "%{$query}%")
                    ->orWhere('description', 'like', "%{$query}%")
                    ->orWhereHas('user', fn (Builder $users): Builder => $users
                        ->where('username', 'like', "%{$query}%"))))
            ->latest('published_at')
            ->get();

        return Inertia::render('home', [
            'query' => $query,
            'videos' => $videos->map(fn (Video $video): array => $this->videoData($video)),
        ]);
    }

    public function show(Video $video): Response
    {
        abort_unless($video->status === VideoStatus::Live, 404);

        return Inertia::render('videos/show', [
            'video' => $this->videoData($video->load('user')),
        ]);
    }

    /**
     * @return array<string, int|string|null>
     */
    private function videoData(Video $video): array
    {
        return [
            'id' => $video->slug,
            'title' => $video->title,
            'creator' => $video->user->username,
            'creatorInitials' => Str::of($video->user->username)->substr(0, 2)->upper()->toString(),
            'thumbnailUrl' => $video->thumbnailUrl(),
            'previewUrl' => $video->previewUrl(),
            'playbackUrl' => $video->playbackUrl(),
            'duration' => $video->duration ?? '00:00',
            'fileSizeBytes' => $video->file_size_bytes,
            'publishedAt' => $video->published_at?->diffForHumans() ?? 'Not published',
            'description' => $video->description ?? '',
        ];
    }
}
