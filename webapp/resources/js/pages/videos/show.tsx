import { Head, Link } from '@inertiajs/react';

import { VideoPlayer } from '@/components/video-player';
import { AppLayout } from '@/layouts/app-layout';
import { home } from '@/routes';
import type { Video } from '@/types';

type ShowVideoProps = {
    video: Video;
};

export default function ShowVideo({ video }: ShowVideoProps) {
    return (
        <AppLayout>
            <Head title={video.title} />

            <main className="mx-auto max-w-[1320px] px-5 py-8 md:px-8 md:py-12 lg:px-10">
                <Link
                    href={home()}
                    className="mb-6 inline-flex border-b border-neutral-400 pb-0.5 text-xs font-medium tracking-[0.08em] text-neutral-600 uppercase hover:border-neutral-950 hover:text-neutral-950 dark:text-neutral-400 dark:hover:border-neutral-50 dark:hover:text-neutral-50"
                >
                    Back to feed
                </Link>

                <VideoPlayer
                    poster={video.thumbnailUrl}
                    src={video.playbackUrl}
                    title={video.title}
                />

                <div className="grid gap-8 border-t border-neutral-950 pt-6 md:grid-cols-[minmax(0,1fr)_16rem] dark:border-neutral-200">
                    <div>
                        <h1 className="max-w-4xl text-2xl leading-tight font-semibold tracking-[-0.035em] md:text-4xl">
                            {video.title}
                        </h1>
                        <p className="mt-4 max-w-3xl text-sm leading-6 text-neutral-600 md:text-base md:leading-7 dark:text-neutral-400">
                            {video.description}
                        </p>
                    </div>

                    <aside className="border-t border-neutral-300 pt-4 md:border-t-0 md:border-l md:pt-0 md:pl-6 dark:border-neutral-700">
                        <div className="flex items-center gap-3">
                            <span
                                aria-hidden="true"
                                className="flex size-9 items-center justify-center rounded-full bg-neutral-950 text-[10px] font-semibold tracking-wide text-white dark:bg-neutral-100 dark:text-neutral-950"
                            >
                                {video.creatorInitials}
                            </span>
                            <div>
                                <p className="text-sm font-semibold">
                                    {video.creator}
                                </p>
                                <p className="text-xs text-neutral-500">
                                    {video.publishedAt}
                                </p>
                            </div>
                        </div>
                    </aside>
                </div>
            </main>
        </AppLayout>
    );
}
