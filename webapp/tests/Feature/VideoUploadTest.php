<?php

namespace Tests\Feature;

use App\Jobs\ProcessVideo;
use App\Jobs\PublishVideo;
use App\Models\User;
use App\Models\Video;
use App\Services\VideoProcessor;
use App\VideoStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Mockery;
use RuntimeException;
use Tests\TestCase;

class VideoUploadTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_create_and_complete_a_direct_upload(): void
    {
        Storage::fake('r2_private');
        Queue::fake();

        $user = User::factory()->create();
        $fileContents = str_repeat('v', 2048);

        $response = $this->actingAs($user)->postJson(route('dashboard.videos.store'), [
            'title' => 'Field Notes',
            'description' => 'A short field study.',
            'filename' => 'field-notes.mp4',
            'content_type' => 'video/mp4',
            'file_size_bytes' => strlen($fileContents),
        ]);

        $video = Video::query()->sole();

        $response
            ->assertCreated()
            ->assertJsonPath('video.id', $video->slug)
            ->assertJsonPath('video.status', VideoStatus::AwaitingUpload->value)
            ->assertJsonStructure(['upload' => ['url', 'headers', 'expiresAt']]);
        $this->assertTrue($video->user->is($user));
        $this->assertSame('videos/'.$video->slug.'/source/original.mp4', $video->source_path);
        $this->assertSame('video/mp4', $video->source_mime_type);
        Queue::assertNothingPushed();

        Storage::disk('r2_private')->put($video->source_path, $fileContents);

        $this->actingAs($user)
            ->postJson(route('dashboard.videos.complete', $video))
            ->assertAccepted()
            ->assertJsonPath('video.status', VideoStatus::Preprocessing->value);

        $video->refresh();

        $this->assertSame(VideoStatus::Preprocessing, $video->status);
        Queue::assertPushed(ProcessVideo::class, function (ProcessVideo $job) use ($video): bool {
            return $job->video->is($video) && $job->connection === 'video_processing';
        });
    }

    public function test_direct_upload_requires_supported_metadata(): void
    {
        Storage::fake('r2_private');
        Queue::fake();

        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson(route('dashboard.videos.store'), [
                'title' => 'Not a video',
                'filename' => 'notes.txt',
                'content_type' => 'text/plain',
                'file_size_bytes' => 10,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('content_type');

        $this->assertDatabaseCount('videos', 0);
        Queue::assertNothingPushed();
    }

    public function test_authenticated_user_can_prepare_a_matroska_upload(): void
    {
        Storage::fake('r2_private');

        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson(route('dashboard.videos.store'), [
                'title' => 'Recording',
                'description' => '',
                'filename' => 'recording.mkv',
                'content_type' => 'video/matroska',
                'file_size_bytes' => 9_714_538,
            ])
            ->assertCreated()
            ->assertJsonStructure(['upload' => ['url', 'headers', 'expiresAt']]);

        $video = Video::query()->sole();

        $this->assertSame('video/matroska', $video->source_mime_type);
        $this->assertSame('videos/'.$video->slug.'/source/original.mkv', $video->source_path);
    }

    public function test_upload_completion_verifies_the_object_size(): void
    {
        Storage::fake('r2_private');
        Queue::fake();

        $user = User::factory()->create();
        $video = Video::factory()->for($user)->awaitingUpload()->create([
            'file_size_bytes' => 200,
        ]);
        Storage::disk('r2_private')->put($video->source_path, str_repeat('v', 100));

        $this->actingAs($user)
            ->postJson(route('dashboard.videos.complete', $video))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('video');

        $this->assertSame(VideoStatus::AwaitingUpload, $video->refresh()->status);
        Queue::assertNothingPushed();
    }

    public function test_processing_job_marks_video_ready_with_its_manifest(): void
    {
        $video = Video::factory()->preprocessing()->create();
        $manifest = $this->processingManifest();
        $processor = Mockery::mock(VideoProcessor::class);
        $processor->shouldReceive('process')
            ->once()
            ->with(Mockery::on(fn (Video $candidate): bool => $candidate->is($video)))
            ->andReturn($manifest);

        (new ProcessVideo($video))->handle($processor);
        $video->refresh();

        $this->assertSame(VideoStatus::Ready, $video->status);
        $this->assertSame('videos/'.$video->slug.'/processed', $video->processed_path);
        $this->assertSame($manifest, $video->processing_manifest);
        $this->assertSame('01:02', $video->duration);
        $this->assertNull($video->published_at);
    }

    public function test_failed_processing_job_records_failure(): void
    {
        $video = Video::factory()->preprocessing()->create();

        (new ProcessVideo($video))->failed(new RuntimeException('Processor unavailable.'));
        $video->refresh();

        $this->assertSame(VideoStatus::Failed, $video->status);
        $this->assertSame('Video processing failed.', $video->processing_error);
    }

    public function test_owner_can_approve_a_ready_video_for_publication(): void
    {
        Storage::fake('r2_private');
        Queue::fake();

        $user = User::factory()->create();
        $video = Video::factory()->for($user)->ready()->create();

        $this->actingAs($user)
            ->postJson(route('dashboard.videos.publish', $video))
            ->assertAccepted()
            ->assertJsonPath('video.status', VideoStatus::Publishing->value);

        $this->assertSame(VideoStatus::Publishing, $video->refresh()->status);
        Queue::assertPushed(PublishVideo::class, function (PublishVideo $job) use ($video): bool {
            return $job->video->is($video) && $job->connection === 'video_processing';
        });
    }

    public function test_owner_can_replace_the_generated_thumbnail_when_publishing(): void
    {
        Storage::fake('r2_private');
        Queue::fake();

        $user = User::factory()->create();
        $video = Video::factory()->for($user)->ready()->create();

        $this->actingAs($user)
            ->post(route('dashboard.videos.publish', $video), [
                'thumbnail' => UploadedFile::fake()->image('cover.jpg', 1280, 720),
            ], ['Accept' => 'application/json'])
            ->assertAccepted();

        Storage::disk('r2_private')->assertExists($video->processed_path.'/thumbnail-custom.jpg');
        Storage::disk('r2_private')->assertExists($video->processed_path.'/manifest.json');
        $this->assertSame(
            'thumbnail-custom.jpg',
            data_get($video->refresh()->processing_manifest, 'thumbnail.path'),
        );
        Queue::assertPushed(PublishVideo::class);
    }

    public function test_publication_job_copies_processed_assets_and_marks_video_live(): void
    {
        Storage::fake('r2_private');
        Storage::fake('r2_public');
        config()->set('video.public_disk', 'r2_public');

        $video = Video::factory()->publishing()->create();
        $files = [
            'thumbnail.jpg' => 'thumbnail',
            'preview.mp4' => 'preview',
            'manifest.json' => '{}',
            'hls/master.m3u8' => '#EXTM3U',
            'hls/240p/index.m3u8' => '#EXTM3U',
            'hls/240p/segment-0000.ts' => 'segment',
        ];

        foreach ($files as $path => $contents) {
            Storage::disk('r2_private')->put($video->processed_path.'/'.$path, $contents);
        }

        (new PublishVideo($video))->handle();
        $video->refresh();

        foreach (array_keys($files) as $path) {
            Storage::disk('r2_public')->assertExists('videos/'.$video->slug.'/'.$path);
        }

        $this->assertSame(VideoStatus::Live, $video->status);
        $this->assertNotNull($video->published_at);
        $this->assertSame('videos/'.$video->slug.'/thumbnail.jpg', $video->thumbnail_path);
        $this->assertSame('videos/'.$video->slug.'/preview.mp4', $video->preview_path);
        $this->assertSame('videos/'.$video->slug.'/hls/master.m3u8', $video->playback_path);
    }

    public function test_private_processed_assets_are_owner_only(): void
    {
        Storage::fake('r2_private');

        $owner = User::factory()->create();
        $otherUser = User::factory()->create();
        $video = Video::factory()->for($owner)->ready()->create();
        Storage::disk('r2_private')->put($video->processed_path.'/hls/master.m3u8', '#EXTM3U');
        $route = route('dashboard.videos.assets', [
            'video' => $video,
            'asset' => 'hls/master.m3u8',
        ]);

        $this->actingAs($owner)
            ->get($route)
            ->assertOk()
            ->assertHeader('Content-Type', 'application/vnd.apple.mpegurl');
        $this->actingAs($otherUser)->get($route)->assertForbidden();
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
