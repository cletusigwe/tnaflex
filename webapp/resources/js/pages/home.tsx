import { Head, Link, usePage } from '@inertiajs/react';

import { VideoCard } from '@/components/video-card';
import { AppLayout } from '@/layouts/app-layout';
import { home, register } from '@/routes';
import { create as createVideo } from '@/routes/dashboard/videos';
import type { Video } from '@/types';

type HomeProps = {
    query: string;
    videos: Video[];
};

export default function Home({ query, videos }: HomeProps) {
    const { auth } = usePage().props;
    const isSearching = query !== '';
    const heading = query === '' ? 'Latest videos' : `Results for “${query}”`;
    const emptyState = isSearching
        ? {
              action: 'View all videos',
              description: 'Try another search or view all videos.',
              href: home(),
              title: `No videos match “${query}”.`,
          }
        : {
              action: 'Upload a video',
              description: 'Please upload the first video.',
              href: auth.user ? createVideo() : register(),
              title: 'No videos yet.',
          };

    return (
        <AppLayout query={query}>
            <Head title="Videos" />

            <main className="mx-auto max-w-[1600px] px-5 py-10 md:px-8 md:py-14 lg:px-10">
                <div className="mb-8 border-b border-neutral-300 pb-4 dark:border-neutral-700">
                    <p className="mb-2 text-[10px] font-semibold tracking-[0.18em] text-[#0086d8] uppercase">
                        Watch
                    </p>
                    <h1 className="text-2xl leading-none font-semibold tracking-[-0.035em] md:text-3xl">
                        {heading}
                    </h1>
                </div>

                {videos.length > 0 ? (
                    <div className="grid grid-cols-1 gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                        {videos.map((video) => (
                            <VideoCard key={video.id} video={video} />
                        ))}
                    </div>
                ) : (
                    <div className="flex min-h-[45vh] flex-col items-center justify-center px-6 text-center">
                        <p className="text-xl font-semibold tracking-[-0.025em] md:text-2xl">
                            {emptyState.title}
                        </p>
                        <p className="mt-2 max-w-md text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                            {emptyState.description}
                        </p>
                        <Link
                            href={emptyState.href}
                            className="mt-6 bg-[#0086d8] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0075bd] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0086d8]"
                        >
                            {emptyState.action}
                        </Link>
                    </div>
                )}
            </main>
        </AppLayout>
    );
}
