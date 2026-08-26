<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Video;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_is_redirected_from_dashboard(): void
    {
        $this->get(route('dashboard'))->assertRedirect(route('login'));
        $this->get(route('dashboard.videos.create'))->assertRedirect(route('login'));
    }

    public function test_dashboard_only_lists_the_authenticated_users_videos(): void
    {
        $user = User::factory()->create();
        $ownedVideo = Video::factory()->for($user)->preprocessing()->create([
            'slug' => 'owned-video',
            'file_size_bytes' => 12_500_000,
            'created_at' => now()->subMinute(),
        ]);
        Video::factory()->create(['slug' => 'another-channel-video']);
        $liveVideo = Video::factory()->for($user)->create([
            'slug' => 'live-video',
            'created_at' => now(),
        ]);

        $response = $this->actingAs($user)->get(route('dashboard'));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page): Assert => $page
            ->component('dashboard')
            ->has('videos', 2)
            ->where('videos.0.id', $liveVideo->slug)
            ->where('videos.0.status', 'live')
            ->where('videos.1.id', $ownedVideo->slug)
            ->where('videos.1.fileSizeBytes', 12_500_000)
            ->where('videos.1.status', 'preprocessing'));
    }

    public function test_video_status_page_is_owner_only(): void
    {
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();
        $video = Video::factory()->for($owner)->preprocessing()->create();

        $this->actingAs($owner)
            ->get(route('dashboard.videos.show', $video))
            ->assertOk()
            ->assertInertia(fn (Assert $page): Assert => $page
                ->component('dashboard/videos/show')
                ->where('video.id', $video->slug)
                ->where('video.status', 'preprocessing'));

        $this->actingAs($otherUser)
            ->get(route('dashboard.videos.show', $video))
            ->assertForbidden();
    }
}
