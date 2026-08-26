import { cn } from '@/lib/utils';
import type { VideoStatus } from '@/types';

type VideoStatusBadgeProps = {
    status: VideoStatus;
    label: string;
};

export function VideoStatusBadge({ status, label }: VideoStatusBadgeProps) {
    return (
        <span
            className={cn(
                'inline-flex px-2 py-1 text-[10px] font-semibold tracking-[0.12em] uppercase',
                status === 'live' && 'bg-emerald-100 text-emerald-800',
                status === 'awaiting_upload' &&
                    'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
                status === 'preprocessing' && 'bg-amber-100 text-amber-900',
                status === 'ready' && 'bg-sky-100 text-sky-800',
                status === 'publishing' && 'bg-violet-100 text-violet-800',
                status === 'failed' && 'bg-red-100 text-red-800',
            )}
        >
            {label}
        </span>
    );
}
