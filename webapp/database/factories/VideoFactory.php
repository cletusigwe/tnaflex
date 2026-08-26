<?php

namespace Database\Factories;

use App\Models\User;
use App\Models\Video;
use App\VideoStatus;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Video>
 */
class VideoFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'slug' => fake()->unique()->slug(3),
            'title' => fake()->sentence(5),
            'description' => fake()->paragraph(),
            'status' => VideoStatus::Live,
            'thumbnail_path' => fn (array $attributes): string => 'videos/'.$attributes['slug'].'/thumbnail.jpg',
            'preview_path' => fn (array $attributes): string => 'videos/'.$attributes['slug'].'/preview.mp4',
            'playback_path' => fn (array $attributes): string => 'videos/'.$attributes['slug'].'/hls/master.m3u8',
            'duration' => '04:18',
            'file_size_bytes' => fake()->numberBetween(4_000_000, 90_000_000),
            'published_at' => now(),
        ];
    }

    public function preprocessing(): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => VideoStatus::Preprocessing,
            'source_path' => 'videos/'.$attributes['slug'].'/source/original.mp4',
            'source_mime_type' => 'video/mp4',
            'thumbnail_path' => null,
            'preview_path' => null,
            'playback_path' => null,
            'published_at' => null,
        ]);
    }

    public function awaitingUpload(): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => VideoStatus::AwaitingUpload,
            'source_path' => 'videos/'.$attributes['slug'].'/source/original.mp4',
            'source_mime_type' => 'video/mp4',
            'thumbnail_path' => null,
            'preview_path' => null,
            'playback_path' => null,
            'published_at' => null,
        ]);
    }

    public function ready(): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => VideoStatus::Ready,
            'source_path' => 'videos/'.$attributes['slug'].'/source/original.mp4',
            'source_mime_type' => 'video/mp4',
            'processed_path' => 'videos/'.$attributes['slug'].'/processed',
            'processing_manifest' => $this->processingManifest(),
            'thumbnail_path' => null,
            'preview_path' => null,
            'playback_path' => null,
            'published_at' => null,
        ]);
    }

    public function publishing(): static
    {
        return $this->ready()->state(fn (array $attributes): array => [
            'status' => VideoStatus::Publishing,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function processingManifest(): array
    {
        return [
            'durationSeconds' => 62.4,
            'thumbnail' => ['path' => 'thumbnail.jpg', 'sizeBytes' => 12_000],
            'preview' => ['path' => 'preview.mp4', 'sizeBytes' => 32_000],
            'playlist' => 'hls/master.m3u8',
            'renditions' => [
                [
                    'label' => '240p',
                    'width' => 426,
                    'height' => 240,
                    'sizeBytes' => 100_000,
                    'playlist' => 'hls/240p/index.m3u8',
                ],
            ],
        ];
    }
}
