import { Link } from '@inertiajs/react';

import { VideoPreview } from '@/components/video-preview';
import { show } from '@/routes/videos';
import type { Video } from '@/types';

type VideoCardProps = {
    video: Video;
};

export function VideoCard({ video }: VideoCardProps) {
    return (
        <article className="min-w-0">
            <VideoPreview video={video} />

            <div className="flex flex-col gap-1.5 border-t border-neutral-950 pt-3 dark:border-neutral-200">
                <Link
                    href={show(video.id)}
                    prefetch
                    className="block hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0086d8]"
                >
                    <h2 className="line-clamp-2 text-[15px] leading-5 font-semibold tracking-[-0.01em] text-neutral-950 dark:text-neutral-50">
                        {video.title}
                    </h2>
                </Link>

                <div className="flex items-center justify-between gap-4 text-xs leading-5">
                    <p className="min-w-0 truncate text-neutral-600 dark:text-neutral-400">
                        @{video.creator}
                    </p>
                    <p className="shrink-0 text-neutral-500">
                        {video.publishedAt}
                    </p>
                </div>
            </div>
        </article>
    );
}
