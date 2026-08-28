import { Head, Link, usePage } from '@inertiajs/react';
import { useState } from 'react';

import { VideoStatusBadge } from '@/components/video-status';
import { AppLayout } from '@/layouts/app-layout';
import { formatFileSize } from '@/lib/format-file-size';
import { cn } from '@/lib/utils';
import { logout } from '@/routes';
import { create, show as showStatus } from '@/routes/dashboard/videos';
import { show as showVideo } from '@/routes/videos';
import type { DashboardVideo } from '@/types';

type DashboardProps = {
    videos: DashboardVideo[];
};

type DashboardView = 'live' | 'unpublished';

const dashboardViews: { label: string; value: DashboardView }[] = [
    { label: 'Live', value: 'live' },
    { label: 'Unpublished', value: 'unpublished' },
];

export default function Dashboard({ videos }: DashboardProps) {
    const { auth } = usePage().props;
    const [activeView, setActiveView] = useState<DashboardView>('live');
    const liveVideos = videos.filter((video) => video.status === 'live');
    const unpublishedVideos = videos.filter((video) => video.status !== 'live');
    const visibleVideos =
        activeView === 'live' ? liveVideos : unpublishedVideos;

    return (
        <AppLayout>
            <Head title="Your channel" />

            <main className="mx-auto max-w-6xl px-5 py-10 md:px-8 md:py-14 lg:px-10">
                <header className="flex flex-col gap-6 border-b border-neutral-300 pb-7 sm:flex-row sm:items-end sm:justify-between dark:border-neutral-700">
                    <div>
                        <p className="mb-2 text-[10px] font-semibold tracking-[0.18em] text-[#0086d8] uppercase">
                            Your channel
                        </p>
                        <h1 className="text-3xl font-semibold tracking-[-0.04em] md:text-5xl">
                            @{auth.user?.username}
                        </h1>
                    </div>

                    <div className="flex items-center gap-5">
                        <Link
                            href={logout()}
                            className="border-b border-neutral-400 pb-0.5 text-sm font-medium text-neutral-600 hover:border-neutral-950 hover:text-neutral-950 dark:text-neutral-400 dark:hover:border-neutral-50 dark:hover:text-neutral-50"
                        >
                            Log out
                        </Link>
                        <Link
                            href={create()}
                            className="bg-[#0086d8] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#0075bd]"
                        >
                            Upload a video
                        </Link>
                    </div>
                </header>

                <section className="grid gap-8 py-8 md:grid-cols-[11rem_minmax(0,1fr)] md:gap-10 md:py-10">
                    <aside>
                        <p className="hidden text-[10px] font-semibold tracking-[0.16em] text-neutral-500 uppercase md:block">
                            Videos
                        </p>
                        <nav
                            aria-label="Channel videos"
                            className="grid grid-cols-2 border-y border-neutral-300 md:mt-4 md:block dark:border-neutral-700"
                        >
                            {dashboardViews.map((view, index) => {
                                const count =
                                    view.value === 'live'
                                        ? liveVideos.length
                                        : unpublishedVideos.length;

                                return (
                                    <button
                                        key={view.value}
                                        type="button"
                                        aria-pressed={activeView === view.value}
                                        onClick={() =>
                                            setActiveView(view.value)
                                        }
                                        className={cn(
                                            'flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-xs font-semibold tracking-[0.08em] uppercase hover:bg-neutral-200 md:px-3 dark:hover:bg-neutral-800',
                                            index > 0 &&
                                                'border-l border-neutral-300 md:border-t md:border-l-0 dark:border-neutral-700',
                                            activeView === view.value &&
                                                'bg-[#0086d8] text-white hover:bg-[#0086d8] dark:hover:bg-[#0086d8]',
                                        )}
                                    >
                                        <span>{view.label}</span>
                                        <span className="text-[10px] tabular-nums opacity-65">
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                        </nav>
                    </aside>

                    <div className="min-w-0">
                        <h2 className="text-xl font-semibold tracking-[-0.025em]">
                            {activeView === 'live' ? 'Live' : 'Unpublished'}
                        </h2>

                        {visibleVideos.length > 0 ? (
                            <div className="mt-6 border-t border-neutral-950 dark:border-neutral-100">
                                {visibleVideos.map((video) => {
                                    const destination =
                                        video.status === 'live'
                                            ? showVideo(video.id)
                                            : showStatus(video.id);

                                    return (
                                        <article
                                            key={video.id}
                                            className="grid gap-5 border-b border-neutral-300 py-5 sm:grid-cols-[10rem_minmax(0,1fr)_auto] sm:items-center dark:border-neutral-700"
                                        >
                                            <Link
                                                href={destination}
                                                className="aspect-video overflow-hidden bg-neutral-200 dark:bg-neutral-800"
                                                aria-label={`Open ${video.title}`}
                                            >
                                                {video.thumbnailUrl ? (
                                                    <img
                                                        src={video.thumbnailUrl}
                                                        alt=""
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex h-full items-center justify-center bg-[#0086d8] text-[10px] font-semibold tracking-[0.14em] text-white uppercase">
                                                        Safe For Work
                                                    </div>
                                                )}
                                            </Link>

                                            <div className="min-w-0">
                                                <Link
                                                    href={destination}
                                                    className="text-base font-semibold tracking-[-0.015em] hover:underline"
                                                >
                                                    {video.title}
                                                </Link>
                                                <p className="mt-1 text-xs text-neutral-500">
                                                    {formatFileSize(
                                                        video.fileSizeBytes,
                                                    )}
                                                    <span aria-hidden="true">
                                                        {' '}
                                                        ·{' '}
                                                    </span>
                                                    Added {video.createdAt}
                                                </p>
                                            </div>

                                            <VideoStatusBadge
                                                status={video.status}
                                                label={video.statusLabel}
                                            />
                                        </article>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="mt-6 flex min-h-64 flex-col items-start justify-center border-y border-neutral-300 dark:border-neutral-700">
                                <p className="text-xl font-semibold tracking-[-0.025em]">
                                    {activeView === 'live'
                                        ? 'No live videos.'
                                        : 'No unpublished videos.'}
                                </p>
                                <p className="mt-2 max-w-md text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                                    {activeView === 'live'
                                        ? 'Upload a video and it will appear here when processing finishes.'
                                        : 'Videos that are processing or need attention will appear here.'}
                                </p>
                                <Link
                                    href={create()}
                                    className="mt-6 bg-[#0086d8] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#0075bd]"
                                >
                                    Upload a video
                                </Link>
                            </div>
                        )}
                    </div>
                </section>
            </main>
        </AppLayout>
    );
}
