import { Link } from '@inertiajs/react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatFileSize } from '@/lib/format-file-size';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import { show } from '@/routes/dashboard/videos';

import type { VideoUploadWorkflow } from './use-video-upload';

type VideoUploadControlsProps = {
    workflow: VideoUploadWorkflow;
};

export function VideoUploadControls({ workflow }: VideoUploadControlsProps) {
    return (
        <aside
            className={cn(
                'border-t border-neutral-950 pt-6 dark:border-neutral-100',
                workflow.isReviewStage
                    ? 'xl:border-t-0 xl:border-l xl:pt-0 xl:pl-8'
                    : 'lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8',
            )}
        >
            {workflow.activeStep === 0 ? (
                <UploadControls workflow={workflow} />
            ) : null}

            {workflow.activeStep === 1 ? (
                <ProcessingControls workflow={workflow} />
            ) : null}

            {workflow.isReviewStage && workflow.stage === 'review' ? (
                <ReviewControls workflow={workflow} />
            ) : null}

            {workflow.isReviewStage && workflow.stage === 'publishing' ? (
                <PublishingControls />
            ) : null}

            {workflow.isReviewStage && workflow.stage === 'published' ? (
                <PublishedControls />
            ) : null}
        </aside>
    );
}

function UploadControls({ workflow }: VideoUploadControlsProps) {
    const {
        description,
        isCreatingUpload,
        isTransferActive,
        pipelineError,
        resetDraft,
        setDescription,
        setTitle,
        stage,
        title,
        titleError,
        uploadProgress,
        videoFile,
    } = workflow;

    return (
        <div>
            <SectionEyebrow>Upload</SectionEyebrow>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">
                Video details
            </h2>

            <div className="mt-6 space-y-5">
                <div>
                    <label
                        htmlFor="title"
                        className="mb-2 block text-xs font-semibold tracking-[0.08em] uppercase"
                    >
                        Title
                    </label>
                    <Input
                        id="title"
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        required
                        maxLength={120}
                        disabled={stage !== 'draft'}
                        className="border-neutral-400 bg-white focus-visible:ring-offset-[#f7f7f5] dark:bg-neutral-900 dark:text-white dark:focus-visible:ring-offset-neutral-950"
                    />
                    {titleError ? (
                        <p className="mt-2 text-xs text-red-700 dark:text-red-300">
                            {titleError}
                        </p>
                    ) : null}
                </div>

                <div>
                    <label
                        htmlFor="description"
                        className="mb-2 block text-xs font-semibold tracking-[0.08em] uppercase"
                    >
                        Description{' '}
                        <span className="font-normal text-neutral-500 normal-case">
                            optional
                        </span>
                    </label>
                    <textarea
                        id="description"
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        rows={4}
                        maxLength={1000}
                        disabled={stage !== 'draft'}
                        className="w-full resize-y border border-neutral-400 bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#0086d8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f7f7f5] disabled:opacity-60 dark:bg-neutral-900 dark:text-white dark:focus-visible:ring-offset-neutral-950"
                    />
                </div>

                {stage === 'uploading' ? (
                    <div aria-live="polite">
                        <div className="mb-2 flex justify-between text-xs font-medium">
                            <span>
                                {isTransferActive
                                    ? 'Uploading to R2'
                                    : 'Upload paused'}
                            </span>
                            <span className="tabular-nums">
                                {uploadProgress}%
                            </span>
                        </div>
                        <div className="h-1.5 overflow-hidden bg-neutral-300 dark:bg-neutral-700">
                            <div
                                className="h-full bg-[#0086d8] transition-[width]"
                                style={{ width: `${uploadProgress}%` }}
                            />
                        </div>
                    </div>
                ) : null}

                {pipelineError ? (
                    <PipelineError>{pipelineError}</PipelineError>
                ) : null}

                <Button
                    type="submit"
                    disabled={
                        !videoFile || isCreatingUpload || isTransferActive
                    }
                    className="w-full"
                >
                    {stage === 'uploading' && !isTransferActive
                        ? 'Retry upload'
                        : 'Upload video'}
                </Button>

                {stage === 'draft' && videoFile ? (
                    <button
                        type="button"
                        onClick={resetDraft}
                        className="text-xs font-medium text-neutral-500 hover:text-neutral-950 dark:hover:text-white"
                    >
                        Start over
                    </button>
                ) : null}
            </div>
        </div>
    );
}

function ProcessingControls({ workflow }: VideoUploadControlsProps) {
    const { pipelineError, serverVideo, stage } = workflow;

    return (
        <div>
            <SectionEyebrow>Preprocess</SectionEyebrow>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">
                {stage === 'failed'
                    ? 'Processing stopped'
                    : 'Preparing playback'}
            </h2>
            <p className="mt-3 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                {stage === 'failed'
                    ? pipelineError
                    : 'The source is being compressed into the resolutions it can support. The thumbnail and short preview are generated in the same job.'}
            </p>

            {stage === 'preprocessing' ? (
                <div className="mt-7" aria-live="polite">
                    <div className="h-1.5 overflow-hidden bg-neutral-300 dark:bg-neutral-700">
                        <div className="h-full w-1/3 animate-pulse bg-[#0086d8]" />
                    </div>
                    <p className="mt-3 text-xs text-neutral-500">
                        This view updates automatically.
                    </p>
                </div>
            ) : null}

            {serverVideo ? (
                <Link
                    href={show(serverVideo.id)}
                    className="mt-7 inline-flex border-b border-neutral-500 pb-0.5 text-xs font-medium"
                >
                    Open status page
                </Link>
            ) : null}
        </div>
    );
}

function ReviewControls({ workflow }: VideoUploadControlsProps) {
    const {
        customThumbnailUrl,
        isPublishing,
        pipelineError,
        previewMode,
        resetThumbnail,
        selectThumbnail,
        selectedRendition,
        serverVideo,
        setSelectedRendition,
        submitPublication,
        thumbnailFileName,
        thumbnailInputRef,
    } = workflow;

    return (
        <div className="flex h-full flex-col">
            <div className="flex-1">
                {previewMode === 'video' ? (
                    <div>
                        <SectionEyebrow>Video</SectionEyebrow>
                        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">
                            Playback resolution
                        </h2>
                        <p className="mt-3 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                            Compare each processed file with its actual stored
                            size.
                        </p>

                        <div className="mt-6 divide-y divide-neutral-300 dark:divide-neutral-700">
                            {serverVideo?.renditions.map((rendition) => (
                                <button
                                    key={rendition.label}
                                    type="button"
                                    onClick={() =>
                                        setSelectedRendition(rendition.label)
                                    }
                                    className={cn(
                                        'grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 text-left hover:bg-neutral-200 dark:hover:bg-neutral-800',
                                        selectedRendition === rendition.label &&
                                            'bg-neutral-950 text-white hover:bg-neutral-950 dark:bg-neutral-100 dark:text-neutral-950 dark:hover:bg-neutral-100',
                                    )}
                                >
                                    <span>
                                        <span className="block text-sm font-semibold">
                                            {rendition.label}
                                        </span>
                                        <span className="mt-0.5 block text-[10px] opacity-60">
                                            {rendition.width} ×{' '}
                                            {rendition.height}
                                        </span>
                                    </span>
                                    <span className="text-xs font-medium tabular-nums">
                                        {formatFileSize(rendition.sizeBytes)}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : null}

                {previewMode === 'thumbnail' ? (
                    <div>
                        <SectionEyebrow>Thumbnail</SectionEyebrow>
                        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">
                            Cover image
                        </h2>
                        <p className="mt-3 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                            Keep the generated frame or choose a 16:9 JPG, PNG,
                            or WebP image.
                        </p>

                        <div className="mt-6 py-3">
                            <p className="truncate text-sm font-semibold">
                                {thumbnailFileName ?? 'Generated from video'}
                            </p>
                            <p className="mt-1 text-xs text-neutral-500">
                                1280 × 720 recommended
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => thumbnailInputRef.current?.click()}
                            className="mt-3 border-b border-neutral-500 pb-0.5 text-xs font-medium hover:border-neutral-950 dark:hover:border-neutral-50"
                        >
                            Choose another image
                        </button>
                        <input
                            ref={thumbnailInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            tabIndex={-1}
                            aria-label="Choose thumbnail image"
                            onChange={selectThumbnail}
                            className="sr-only"
                        />

                        {customThumbnailUrl ? (
                            <button
                                type="button"
                                onClick={resetThumbnail}
                                className="mt-4 block text-xs font-medium text-neutral-500 hover:text-neutral-950 dark:hover:text-white"
                            >
                                Use generated thumbnail
                            </button>
                        ) : null}
                    </div>
                ) : null}

                {previewMode === 'hover' ? <HoverPreviewDetails /> : null}
            </div>

            <div className="mt-10">
                {pipelineError ? (
                    <p className="mb-4 text-xs text-red-700 dark:text-red-300">
                        {pipelineError}
                    </p>
                ) : null}
                <Button
                    type="button"
                    onClick={submitPublication}
                    disabled={isPublishing}
                    className="w-full"
                >
                    Publish video
                </Button>
            </div>
        </div>
    );
}

function HoverPreviewDetails() {
    return (
        <div>
            <SectionEyebrow>Hover preview</SectionEyebrow>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">
                A short automatic loop
            </h2>
            <p className="mt-3 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                This muted 5–10 second loop samples key moments across the
                video. It starts on hover or swipe in the feed.
            </p>
            <dl className="mt-6 text-xs">
                <div className="flex items-center justify-between gap-4 py-3">
                    <dt className="text-neutral-500">Playback</dt>
                    <dd className="font-semibold">Muted · looping</dd>
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-neutral-300 py-3 dark:border-neutral-700">
                    <dt className="text-neutral-500">Watermark</dt>
                    <dd className="font-semibold">Top right</dd>
                </div>
            </dl>
        </div>
    );
}

function PublishingControls() {
    return (
        <div>
            <SectionEyebrow>Publishing</SectionEyebrow>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
                Moving assets live
            </h2>
            <p className="mt-3 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                The approved files are being copied to public storage. This view
                updates when publication is complete.
            </p>
            <div className="mt-7 h-1.5 overflow-hidden bg-neutral-300 dark:bg-neutral-700">
                <div className="h-full w-1/3 animate-pulse bg-[#0086d8]" />
            </div>
        </div>
    );
}

function PublishedControls() {
    return (
        <div>
            <p className="text-[10px] font-semibold tracking-[0.18em] text-emerald-700 uppercase dark:text-emerald-400">
                Published
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
                Video is live
            </h2>
            <p className="mt-3 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                The public URLs now point to every processed resolution.
            </p>
            <Link
                href={dashboard()}
                className="mt-7 inline-flex bg-[#0086d8] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#0075bd]"
            >
                Back to channel
            </Link>
        </div>
    );
}

function PipelineError({ children }: { children: string }) {
    return (
        <p className="border-l-2 border-red-700 pl-3 text-xs leading-5 text-red-800 dark:text-red-300">
            {children}
        </p>
    );
}

function SectionEyebrow({ children }: { children: string }) {
    return (
        <p className="text-[10px] font-semibold tracking-[0.18em] text-[#0086d8] uppercase">
            {children}
        </p>
    );
}
