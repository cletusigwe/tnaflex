import { Link } from '@inertiajs/react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { dashboard } from '@/routes';
import { show } from '@/routes/dashboard/videos';
import { show as showVideo } from '@/routes/videos';

import type { VideoUploadWorkflow } from './use-video-upload';

type VideoUploadControlsProps = {
    workflow: VideoUploadWorkflow;
};

export function VideoUploadControls({ workflow }: VideoUploadControlsProps) {
    return (
        <aside className="border-t border-neutral-950 pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8 dark:border-neutral-100">
            {workflow.activeStep === 0 ? (
                <UploadControls workflow={workflow} />
            ) : null}

            {workflow.activeStep === 1 ? (
                <ProcessingControls workflow={workflow} />
            ) : null}

            {workflow.stage === 'published' && workflow.serverVideo ? (
                <PublishedControls videoId={workflow.serverVideo.id} />
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
    const progress = serverVideo?.processingProgress ?? 0;
    const processingStage =
        serverVideo?.processingStage ?? 'Waiting for the processor';

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
                    : 'The source is being compressed, watermarked, and published automatically.'}
            </p>

            {stage === 'preprocessing' || stage === 'publishing' ? (
                <div className="mt-7" aria-live="polite">
                    <div className="mb-2 flex items-center justify-between gap-4 text-xs font-medium">
                        <span>{processingStage}</span>
                        <span className="tabular-nums">{progress}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden bg-neutral-300 dark:bg-neutral-700">
                        <div
                            className="h-full bg-[#0086d8] transition-[width] duration-500"
                            style={{ width: `${progress}%` }}
                        />
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

function PublishedControls({ videoId }: { videoId: string }) {
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
            <div className="mt-7 flex flex-wrap items-center gap-5">
                <Link
                    href={showVideo(videoId)}
                    className="inline-flex bg-[#0086d8] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#0075bd]"
                >
                    Watch video
                </Link>
                <Link
                    href={dashboard()}
                    className="border-b border-neutral-500 pb-0.5 text-xs font-medium"
                >
                    Back to channel
                </Link>
            </div>
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
