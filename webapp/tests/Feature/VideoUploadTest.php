<?php

namespace Tests\Feature;

use App\Jobs\ProcessVideo;
use App\Jobs\PublishVideo;
use App\Models\User;
use App\Models\Video;
use App\Services\VideoProcessor;
use App\VideoStatus;
use Closure;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
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
        Bus::fake();

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
            ->assertJsonPath('video.processingProgress', 0)
            ->assertJsonPath('video.processingStage', 'Waiting for upload')
            ->assertJsonStructure(['upload' => ['url', 'headers', 'expiresAt']]);
        $this->assertTrue($video->user->is($user));
        $this->assertSame('videos/'.$video->slug.'/source/original.mp4', $video->source_path);
        $this->assertSame('video/mp4', $video->source_mime_type);
        Bus::assertNothingDispatched();

        Storage::disk('r2_private')->put($video->source_path, $fileContents);

        $this->actingAs($user)
            ->postJson(route('dashboard.videos.complete', $video))
            ->assertAccepted()
            ->assertJsonPath('video.status', VideoStatus::Preprocessing->value)
            ->assertJsonPath('video.processingProgress', 5)
            ->assertJsonPath('video.processingStage', 'Queued for processing');

        $video->refresh();

        $this->assertSame(VideoStatus::Preprocessing, $video->status);
        Bus::assertChained([ProcessVideo::class, PublishVideo::class]);
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

    public function test_processing_job_prepares_video_for_automatic_publication(): void
    {
        $video = Video::factory()->preprocessing()->create();
        $manifest = $this->processingManifest();
        $processor = Mockery::mock(VideoProcessor::class);
        $processor->shouldReceive('process')
            ->once()
            ->with(
                Mockery::on(fn (Video $candidate): bool => $candidate->is($video)),
                Mockery::type(Closure::class),
            )
            ->andReturnUsing(function (Video $video, Closure $onProgress) use ($manifest): array {
                $onProgress(54, 'Encoding 720p');

                return $manifest;
            });

        (new ProcessVideo($video))->handle($processor);
        $video->refresh();

        $this->assertSame(VideoStatus::Publishing, $video->status);
        $this->assertSame(85, $video->processing_progress);
        $this->assertSame('Publishing video', $video->processing_stage);
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
        $this->assertSame('Processing failed', $video->processing_stage);
        $this->assertSame('Video processing failed.', $video->processing_error);
    }

    public function test_manual_publish_endpoint_is_not_exposed(): void
    {
        $user = User::factory()->create();
        $video = Video::factory()->for($user)->publishing()->create();

        $this->actingAs($user)
            ->postJson('/dashboard/videos/'.$video->slug.'/publish')
            ->assertNotFound();
    }

    public function test_owner_can_poll_persisted_processing_progress(): void
    {
        $user = User::factory()->create();
        $video = Video::factory()->for($user)->preprocessing()->create([
            'processing_progress' => 54,
            'processing_stage' => 'Encoding 720p',
        ]);

        $this->actingAs($user)
            ->getJson(route('dashboard.videos.show', $video))
            ->assertOk()
            ->assertJsonPath('video.processingProgress', 54)
            ->assertJsonPath('video.processingStage', 'Encoding 720p');
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
        $this->assertSame(100, $video->processing_progress);
        $this->assertSame('Published', $video->processing_stage);
        $this->assertNotNull($video->published_at);
        $this->assertSame('videos/'.$video->slug.'/thumbnail.jpg', $video->thumbnail_path);
        $this->assertSame('videos/'.$video->slug.'/preview.mp4', $video->preview_path);
        $this->assertSame('videos/'.$video->slug.'/hls/master.m3u8', $video->playback_path);
    }

    public function test_private_processed_assets_are_not_exposed_over_http(): void
    {
        $owner = User::factory()->create();
        $video = Video::factory()->for($owner)->publishing()->create();

        $this->actingAs($owner)
            ->get('/dashboard/videos/'.$video->slug.'/assets/hls/master.m3u8')
            ->assertNotFound();
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
