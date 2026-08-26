import { VideoPlayer } from '@/components/video-player';
import { formatFileSize } from '@/lib/format-file-size';

import { previewModes } from './types';
import type { VideoUploadWorkflow } from './use-video-upload';
import { formatDuration } from './utils';

type VideoUploadPreviewProps = {
    workflow: VideoUploadWorkflow;
};

export function VideoUploadPreview({ workflow }: VideoUploadPreviewProps) {
    const {
        captureThumbnail,
        fileInputRef,
        isReviewStage,
        localPreviewUrl,
        metadata,
        playbackUrl,
        previewMode,
        readMetadata,
        selectVideo,
        selectedRendition,
        serverVideo,
        stage,
        thumbnailUrl,
        title,
        videoFile,
    } = workflow;
    const previewLabel = previewModes.find(
        (mode) => mode.value === previewMode,
    )?.label;

    return (
        <section className="min-w-0">
            <div className="mb-3">
                <h2 className="text-xs font-semibold tracking-[0.1em] uppercase">
                    {isReviewStage ? previewLabel : 'Video preview'}
                </h2>
                {videoFile ? (
                    <p className="mt-1 text-xs text-neutral-500">
                        {previewMode === 'video'
                            ? (selectedRendition ?? 'Source video')
                            : previewMode === 'thumbnail'
                              ? '16:9 cover image'
                              : 'Automatic short loop'}
                    </p>
                ) : null}
            </div>

            {!videoFile ? (
                <label
                    htmlFor="video"
                    className="flex aspect-video cursor-pointer flex-col items-center justify-center border border-dashed border-neutral-400 bg-white px-6 text-center hover:border-[#0086d8] dark:bg-neutral-900"
                >
                    <span className="text-xl font-semibold tracking-[-0.025em]">
                        Choose a video
                    </span>
                    <span className="mt-2 text-sm text-neutral-500">
                        MP4, WebM, MOV, or MKV
                    </span>
                </label>
            ) : null}

            {videoFile && previewMode === 'video' ? (
                playbackUrl && isReviewStage ? (
                    <VideoPlayer
                        key={playbackUrl}
                        src={playbackUrl}
                        poster={thumbnailUrl}
                        title={title}
                    />
                ) : (
                    <div className="overflow-hidden bg-black">
                        <video
                            src={localPreviewUrl ?? undefined}
                            controls
                            playsInline
                            preload="metadata"
                            onLoadedMetadata={readMetadata}
                            onLoadedData={(event) => {
                                if (!thumbnailUrl) {
                                    captureThumbnail(event.currentTarget);
                                }
                            }}
                            onSeeked={(event) => {
                                if (!thumbnailUrl) {
                                    captureThumbnail(event.currentTarget);
                                }
                            }}
                            className="aspect-video h-auto w-full bg-black object-contain"
                        />
                    </div>
                )
            ) : null}

            {videoFile && previewMode === 'thumbnail' ? (
                thumbnailUrl ? (
                    <div className="aspect-video overflow-hidden bg-black">
                        <img
                            src={thumbnailUrl}
                            alt={`Thumbnail for ${title}`}
                            className="h-full w-full object-cover"
                        />
                    </div>
                ) : (
                    <PreviewPlaceholder>
                        Preparing thumbnail…
                    </PreviewPlaceholder>
                )
            ) : null}

            {videoFile && previewMode === 'hover' ? (
                serverVideo?.previewUrl ? (
                    <div className="aspect-video overflow-hidden bg-black">
                        <video
                            src={serverVideo.previewUrl}
                            poster={thumbnailUrl ?? undefined}
                            autoPlay
                            muted
                            loop
                            playsInline
                            preload="auto"
                            className="h-full w-full object-cover"
                        />
                    </div>
                ) : (
                    <PreviewPlaceholder>
                        Preparing hover preview…
                    </PreviewPlaceholder>
                )
            ) : null}

            <input
                ref={fileInputRef}
                id="video"
                type="file"
                accept="video/mp4,video/webm,video/quicktime,video/x-matroska,.mkv"
                onChange={selectVideo}
                disabled={stage !== 'draft'}
                required
                className="sr-only"
            />

            {videoFile && !isReviewStage ? (
                <div className="grid gap-3 border-b border-neutral-300 py-3 text-xs sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] dark:border-neutral-700">
                    <p className="truncate font-semibold">{videoFile.name}</p>
                    <p className="text-neutral-500 tabular-nums">
                        {formatFileSize(videoFile.size)}
                    </p>
                    <p className="text-neutral-500 tabular-nums">
                        {metadata
                            ? `${metadata.width} × ${metadata.height}`
                            : 'Reading…'}
                    </p>
                    <p className="text-neutral-500 tabular-nums">
                        {metadata ? formatDuration(metadata.duration) : '—'}
                    </p>
                </div>
            ) : null}

            {videoFile && stage === 'draft' ? (
                <label
                    htmlFor="video"
                    className="mt-3 inline-flex cursor-pointer border-b border-neutral-500 pb-0.5 text-xs font-medium text-neutral-600 hover:border-neutral-950 hover:text-neutral-950 dark:text-neutral-400 dark:hover:border-neutral-50 dark:hover:text-neutral-50"
                >
                    Choose a different video
                </label>
            ) : null}
        </section>
    );
}

function PreviewPlaceholder({ children }: { children: string }) {
    return (
        <div className="flex aspect-video items-center justify-center bg-neutral-200 text-sm font-medium text-neutral-500 dark:bg-neutral-800">
            {children}
        </div>
    );
}
