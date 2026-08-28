import { Head, Link, usePoll } from '@inertiajs/react';
import { useEffect } from 'react';

import { VideoStatusBadge } from '@/components/video-status';
import { AppLayout } from '@/layouts/app-layout';
import { formatFileSize } from '@/lib/format-file-size';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import { show as showVideo } from '@/routes/videos';
import type { UploadingVideo, VideoStatus } from '@/types';

type ShowUploadingVideoProps = {
    video: UploadingVideo;
};

type StepState = 'complete' | 'current' | 'upcoming' | 'failed';

function stepState(status: VideoStatus, step: number): StepState {
    if (status === 'failed') {
        if (step === 0) {
            return 'complete';
        }

        return step === 1 ? 'failed' : 'upcoming';
    }

    const currentStep = {
        awaiting_upload: 0,
        preprocessing: 1,
        publishing: 1,
        live: 3,
    }[status];

    if (step < currentStep) {
        return 'complete';
    }

    return step === currentStep ? 'current' : 'upcoming';
}

export default function ShowUploadingVideo({ video }: ShowUploadingVideoProps) {
    const shouldPoll = [
        'awaiting_upload',
        'preprocessing',
        'publishing',
    ].includes(video.status);
    const { start, stop } = usePoll(
        2000,
        { only: ['video'] },
        { autoStart: shouldPoll, mode: 'rest' },
    );

    useEffect(() => {
        if (shouldPoll) {
            start();
        } else {
            stop();
        }
    }, [shouldPoll, start, stop]);

    const steps = ['Upload', 'Process', 'Live'];

    return (
        <AppLayout>
            <Head title={`${video.title} status`} />

            <main className="mx-auto max-w-4xl px-5 py-10 md:px-8 md:py-14 lg:px-10">
                <Link
                    href={dashboard()}
                    className="mb-8 inline-flex border-b border-neutral-400 pb-0.5 text-xs font-medium tracking-[0.08em] text-neutral-600 uppercase hover:border-neutral-950 hover:text-neutral-950 dark:text-neutral-400 dark:hover:border-neutral-50 dark:hover:text-neutral-50"
                >
                    Back to channel
                </Link>

                <div className="border-b border-neutral-300 pb-8 dark:border-neutral-700">
                    <div className="flex flex-wrap items-center gap-4">
                        <p className="text-[10px] font-semibold tracking-[0.18em] text-[#0086d8] uppercase">
                            Video status
                        </p>
                        <VideoStatusBadge
                            status={video.status}
                            label={video.statusLabel}
                        />
                    </div>
                    <h1 className="mt-4 max-w-3xl text-3xl leading-tight font-semibold tracking-[-0.04em] md:text-5xl">
                        {video.title}
                    </h1>
                    <p className="mt-3 text-xs text-neutral-500">
                        {formatFileSize(video.fileSizeBytes)}
                        <span aria-hidden="true"> · </span>
                        Added {video.createdAt}
                    </p>
                </div>

                <ol className="mt-10 grid gap-0 md:grid-cols-3">
                    {steps.map((label, index) => {
                        const state = stepState(video.status, index);

                        return (
                            <li
                                key={label}
                                className="border-t border-neutral-300 py-5 md:border-r md:px-5 md:first:pl-0 md:last:border-r-0 dark:border-neutral-700"
                            >
                                <div className="flex items-center gap-3">
                                    <span
                                        aria-hidden="true"
                                        className={cn(
                                            'flex size-7 items-center justify-center rounded-full border text-xs font-semibold tabular-nums',
                                            state === 'complete' &&
                                                'border-emerald-600 bg-emerald-600 text-white',
                                            state === 'current' &&
                                                'border-[#0086d8] bg-[#0086d8] text-white',
                                            state === 'upcoming' &&
                                                'border-neutral-400 text-neutral-500',
                                            state === 'failed' &&
                                                'border-red-700 bg-red-700 text-white',
                                        )}
                                    >
                                        {state === 'complete' ? '✓' : index + 1}
                                    </span>
                                    <span className="text-sm font-semibold">
                                        {label}
                                    </span>
                                </div>
                                <p className="mt-3 pl-10 text-xs leading-5 text-neutral-500 md:pl-0">
                                    {index === 0 &&
                                        'The original is stored privately.'}
                                    {index === 1 &&
                                        'Playback files and previews are generated and published.'}
                                    {index === 2 &&
                                        'The finished video appears on your channel.'}
                                </p>
                            </li>
                        );
                    })}
                </ol>

                {shouldPoll ? (
                    <div className="mt-8" aria-live="polite">
                        <div className="mb-2 flex items-center justify-between gap-4 text-sm font-medium">
                            <span>
                                {video.processingStage ?? 'Preparing video'}
                            </span>
                            <span className="tabular-nums">
                                {video.processingProgress}%
                            </span>
                        </div>
                        <div className="h-1.5 overflow-hidden bg-neutral-300 dark:bg-neutral-700">
                            <div
                                className="h-full bg-[#0086d8] transition-[width] duration-500"
                                style={{
                                    width: `${video.processingProgress}%`,
                                }}
                            />
                        </div>
                        <p className="mt-3 text-xs text-neutral-500">
                            This page updates automatically.
                        </p>
                    </div>
                ) : null}

                {video.status === 'failed' ? (
                    <div className="mt-8 border-l-2 border-red-700 py-1 pl-4">
                        <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                            Processing failed
                        </p>
                        <p className="mt-1 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                            {video.processingError ??
                                'The video could not be processed.'}
                        </p>
                    </div>
                ) : null}

                {video.status === 'live' ? (
                    <Link
                        href={showVideo(video.id)}
                        className="mt-8 inline-flex bg-[#0086d8] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#0075bd]"
                    >
                        Watch video
                    </Link>
                ) : null}
            </main>
        </AppLayout>
    );
}
