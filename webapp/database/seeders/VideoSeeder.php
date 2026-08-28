<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Video;
use App\VideoStatus;
use Illuminate\Database\Seeder;

class VideoSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $user = User::query()->where('username', 'tnaflexer')->firstOrFail();

        foreach ($this->videos() as $video) {
            Video::query()->updateOrCreate(
                ['slug' => $video['slug']],
                ['user_id' => $user->id, ...$video],
            );
        }
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function videos(): array
    {
        return [
            [
                'slug' => 'dont-jerk-off-to-this',
                'title' => "Don't Jerk Off to This",
                'description' => 'A sexy bowl of fruit presents an impossible challenge',
                'status' => VideoStatus::Live,
                'thumbnail_path' => 'videos/dont-jerk-off-to-this/thumbnail.jpg',
                'preview_path' => 'videos/dont-jerk-off-to-this/preview.mp4',
                'playback_path' => 'videos/dont-jerk-off-to-this/hls/master.m3u8',
                'duration' => '04:21',
                'file_size_bytes' => 43_989_497,
                'processing_progress' => 100,
                'processing_stage' => 'Published',
                'published_at' => now()->subHours(2),
            ],
            [
                'slug' => 'pranking-girlfriend',
                'title' => 'Pranking My Girlfriend',
                'description' => 'Let\'s see if she will touch it',
                'status' => VideoStatus::Live,
                'thumbnail_path' => 'videos/pranking-girlfriend/thumbnail.jpg',
                'preview_path' => 'videos/pranking-girlfriend/preview.mp4',
                'playback_path' => 'videos/pranking-girlfriend/hls/master.m3u8',
                'duration' => '02:02',
                'file_size_bytes' => 21_241_247,
                'processing_progress' => 100,
                'processing_stage' => 'Published',
                'published_at' => now()->subDay(),
            ],
            [
                'slug' => 'matrix-red-dress',
                'title' => 'The Dude in the Red Dress',
                'description' => 'Inside the matrix, even Neo cant focus',
                'status' => VideoStatus::Live,
                'thumbnail_path' => 'videos/matrix-red-dress/thumbnail.jpg',
                'preview_path' => 'videos/matrix-red-dress/preview.mp4',
                'playback_path' => 'videos/matrix-red-dress/hls/master.m3u8',
                'duration' => '03:01',
                'file_size_bytes' => 52_924_269,
                'processing_progress' => 100,
                'processing_stage' => 'Published',
                'published_at' => now()->subDays(2),
            ],

            [
                'slug' => 'sperm-racing',
                'title' => 'Sperm Racing',
                'description' => 'The next billion dollar sport loved by everyone',
                'status' => VideoStatus::Live,
                'thumbnail_path' => 'videos/sperm-racing/thumbnail.jpg',
                'preview_path' => 'videos/sperm-racing/preview.mp4',
                'playback_path' => 'videos/sperm-racing/hls/master.m3u8',
                'duration' => '00:55',
                'file_size_bytes' => 9_223_333,
                'processing_progress' => 100,
                'processing_stage' => 'Published',
                'published_at' => now()->subDays(3),
            ],
        ];
    }
}
