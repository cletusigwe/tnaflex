<?php

namespace App\Models;

use App\VideoStatus;
use Database\Factories\VideoFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;

/**
 * @property int $id
 * @property int $user_id
 * @property string $slug
 * @property string $title
 * @property string|null $description
 * @property VideoStatus $status
 * @property string|null $source_path
 * @property string|null $source_mime_type
 * @property string|null $processed_path
 * @property array<string, mixed>|null $processing_manifest
 * @property string|null $thumbnail_path
 * @property string|null $preview_path
 * @property string|null $playback_path
 * @property string|null $duration
 * @property int $file_size_bytes
 * @property int $processing_progress
 * @property string|null $processing_stage
 * @property string|null $processing_error
 * @property Carbon|null $published_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read User $user
 */
#[Fillable([
    'user_id',
    'slug',
    'title',
    'description',
    'status',
    'source_path',
    'source_mime_type',
    'processed_path',
    'processing_manifest',
    'thumbnail_path',
    'preview_path',
    'playback_path',
    'duration',
    'file_size_bytes',
    'processing_progress',
    'processing_stage',
    'processing_error',
    'published_at',
])]
class Video extends Model
{
    /** @use HasFactory<VideoFactory> */
    use HasFactory;

    /**
     * @var array<string, mixed>
     */
    protected $attributes = [
        'status' => VideoStatus::AwaitingUpload->value,
        'file_size_bytes' => 0,
        'processing_progress' => 0,
    ];

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    public function storagePrefix(): string
    {
        return 'videos/'.$this->slug;
    }

    public function thumbnailUrl(): ?string
    {
        return $this->publicAssetUrl($this->thumbnail_path);
    }

    public function previewUrl(): ?string
    {
        return $this->publicAssetUrl($this->preview_path);
    }

    public function playbackUrl(): ?string
    {
        return $this->publicAssetUrl($this->playback_path);
    }

    public function publicAssetUrl(?string $path): ?string
    {
        if ($path === null) {
            return null;
        }

        return Storage::disk((string) config('video.public_disk'))->url($path);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'published_at' => 'datetime',
            'processing_manifest' => 'array',
            'status' => VideoStatus::class,
            'file_size_bytes' => 'integer',
            'processing_progress' => 'integer',
        ];
    }

    /**
     * @param  Builder<Video>  $query
     * @return Builder<Video>
     */
    #[Scope]
    protected function live(Builder $query): Builder
    {
        return $query->where('status', VideoStatus::Live);
    }
}
