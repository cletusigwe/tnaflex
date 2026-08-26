<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('videos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('slug')->unique();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('status')->default('awaiting_upload')->index();
            $table->string('source_path')->nullable();
            $table->string('source_mime_type')->nullable();
            $table->string('processed_path')->nullable();
            $table->json('processing_manifest')->nullable();
            $table->string('thumbnail_path')->nullable();
            $table->string('preview_path')->nullable();
            $table->string('playback_path')->nullable();
            $table->string('duration')->nullable();
            $table->unsignedBigInteger('file_size_bytes')->default(0);
            $table->text('processing_error')->nullable();
            $table->timestamp('published_at')->nullable()->index();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('videos');
    }
};
