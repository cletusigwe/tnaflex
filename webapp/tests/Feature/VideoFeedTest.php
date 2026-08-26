<?php

namespace Tests\Feature;

use App\Models\Video;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class VideoFeedTest extends TestCase
{
    use RefreshDatabase;

    public function test_feed_displays_live_seeded_videos_with_previews(): void
    {
        $this->seed();

        $video = Video::query()->where('slug', 'dont-jerk-off-to-this')->sole();
        $response = $this->get(route('home'));

        $this->assertSame(
            'videos/dont-jerk-off-to-this/hls/master.m3u8',
            $video->playback_path,
        );
        $response->assertOk();
        $response->assertInertia(fn (Assert $page): Assert => $page
            ->component('home')
            ->where('query', '')
            ->has('videos', 4)
            ->where('videos.0.id', 'dont-jerk-off-to-this')
            ->where('videos.0.fileSizeBytes', 43_989_497)
            ->where('videos.0.previewUrl', 'http://localhost:8000/storage/videos/dont-jerk-off-to-this/preview.mp4')
            ->where('videos.0.playbackUrl', 'http://localhost:8000/storage/videos/dont-jerk-off-to-this/hls/master.m3u8'));
    }

    public function test_feed_can_be_searched(): void
    {
        Video::factory()->create([
            'slug' => 'making-a-vessel',
            'title' => 'Making a Clay Vessel',
        ]);
        Video::factory()->create([
            'slug' => 'open-water',
            'title' => 'Open Water',
            'description' => 'A coastal film.',
        ]);

        $response = $this->get(route('home', ['q' => 'clay']));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page): Assert => $page
            ->component('home')
            ->where('query', 'clay')
            ->has('videos', 1)
            ->where('videos.0.id', 'making-a-vessel'));
    }

    public function test_search_without_matches_returns_an_empty_result(): void
    {
        Video::factory()->create([
            'title' => 'Open Water',
        ]);

        $this->get(route('home', ['q' => 'clay']))
            ->assertOk()
            ->assertInertia(fn (Assert $page): Assert => $page
                ->component('home')
                ->where('query', 'clay')
                ->has('videos', 0));
    }

    public function test_live_video_has_a_watch_page(): void
    {
        $video = Video::factory()->create([
            'slug' => 'still-water',
            'title' => 'Still Water, Open Sky',
        ]);

        $response = $this->get(route('videos.show', $video));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page): Assert => $page
            ->component('videos/show')
            ->where('video.id', 'still-water')
            ->where('video.title', 'Still Water, Open Sky'));
    }

    public function test_preprocessing_video_is_not_public(): void
    {
        $video = Video::factory()->preprocessing()->create();

        $this->get(route('home'))
            ->assertInertia(fn (Assert $page): Assert => $page
                ->has('videos', 0));
        $this->get(route('videos.show', $video))->assertNotFound();
    }

    public function test_unknown_video_returns_not_found(): void
    {
        $this->get(route('videos.show', 'not-a-video'))->assertNotFound();
    }
}
