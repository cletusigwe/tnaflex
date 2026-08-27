import { Head, Link, router, useHttp, usePoll } from '@inertiajs/react';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { VideoStatusBadge } from '@/components/video-status';
import { AppLayout } from '@/layouts/app-layout';
import { formatFileSize } from '@/lib/format-file-size';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import { publish } from '@/routes/dashboard/videos';
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
        ready: 2,
        publishing: 2,
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
        { autoStart: shouldPoll },
    );
    const publication = useHttp<
        Record<string, never>,
        {
            video: UploadingVideo;
        }
    >({});

    useEffect(() => {
        if (shouldPoll) {
            start();
        } else {
            stop();
        }
    }, [shouldPoll, start, stop]);

    const queuePublication = async () => {
        const response = await publication.post(publish(video.id).url);

        if (response) {
            start();
            router.reload({ only: ['video'] });
        }
    };

    const steps = ['Upload', 'Preprocess', 'Publish'];

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
                                        'Playback files and previews are generated.'}
                                    {index === 2 &&
                                        'Approved assets move to public storage.'}
                                </p>
                            </li>
                        );
                    })}
                </ol>

                {shouldPoll ? (
                    <p
                        className="mt-8 border-l-2 border-[#0086d8] py-1 pl-4 text-sm leading-6 text-neutral-600 dark:text-neutral-400"
                        aria-live="polite"
                    >
                        {video.status === 'publishing'
                            ? 'The approved assets are moving to public storage.'
                            : video.status === 'awaiting_upload'
                              ? 'Waiting for the direct upload to finish.'
                              : 'The video is being compressed and watermarked.'}{' '}
                        This page updates automatically.
                    </p>
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

                {video.status === 'ready' ? (
                    <section className="mt-10 grid gap-8 md:grid-cols-[minmax(0,1fr)_16rem]">
                        <div className="aspect-video overflow-hidden bg-neutral-200 dark:bg-neutral-800">
                            {video.thumbnailUrl ? (
                                <img
                                    src={video.thumbnailUrl}
                                    alt={`Thumbnail for ${video.title}`}
                                    className="h-full w-full object-cover"
                                />
                            ) : null}
                        </div>

                        <div>
                            <p className="text-[10px] font-semibold tracking-[0.18em] text-[#0086d8] uppercase">
                                Ready to publish
                            </p>
                            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">
                                Review complete
                            </h2>
                            <div className="mt-5 divide-y divide-neutral-300 text-xs dark:divide-neutral-700">
                                {video.renditions.map((rendition) => (
                                    <div
                                        key={rendition.label}
                                        className="flex items-center justify-between gap-4 py-2.5"
                                    >
                                        <span className="font-semibold">
                                            {rendition.label}
                                        </span>
                                        <span className="text-neutral-500 tabular-nums">
                                            {formatFileSize(
                                                rendition.sizeBytes,
                                            )}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            {video.processingError ? (
                                <p className="mt-5 text-xs leading-5 text-red-700 dark:text-red-300">
                                    {video.processingError}
                                </p>
                            ) : null}
                            <Button
                                type="button"
                                onClick={queuePublication}
                                disabled={publication.processing}
                                className="mt-6 w-full"
                            >
                                Publish video
                            </Button>
                        </div>
                    </section>
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
