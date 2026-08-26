import { Link } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';
import { show } from '@/routes/videos';
import type { Video } from '@/types';

type VideoPreviewProps = {
    video: Pick<
        Video,
        'duration' | 'id' | 'previewUrl' | 'thumbnailUrl' | 'title'
    >;
};

const swipeThreshold = 44;

function prefersReducedMotion(): boolean {
    return (
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
}

export function VideoPreview({ video }: VideoPreviewProps) {
    const previewRef = useRef<HTMLVideoElement>(null);
    const progressRef = useRef<HTMLSpanElement>(null);
    const progressAnimationRef = useRef<number | null>(null);
    const shouldPlayRef = useRef(false);
    const swipeStartRef = useRef<{
        pointerId: number;
        x: number;
        y: number;
    } | null>(null);
    const suppressNextClickRef = useRef(false);
    const [hasPlaybackError, setHasPlaybackError] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        return () => {
            if (progressAnimationRef.current !== null) {
                window.cancelAnimationFrame(progressAnimationRef.current);
            }
        };
    }, []);

    const stopProgressAnimation = () => {
        if (progressAnimationRef.current !== null) {
            window.cancelAnimationFrame(progressAnimationRef.current);
            progressAnimationRef.current = null;
        }

        if (progressRef.current) {
            progressRef.current.style.transform = 'scaleX(0)';
        }
    };

    const updatePreviewProgress = () => {
        const preview = previewRef.current;
        const progress = progressRef.current;

        if (
            preview &&
            progress &&
            Number.isFinite(preview.duration) &&
            preview.duration > 0
        ) {
            const previewProgress = Math.min(
                1,
                Math.max(0, preview.currentTime / preview.duration),
            );

            progress.style.transform = `scaleX(${previewProgress})`;
        }

        progressAnimationRef.current = window.requestAnimationFrame(
            updatePreviewProgress,
        );
    };

    const startProgressAnimation = () => {
        stopProgressAnimation();
        progressAnimationRef.current = window.requestAnimationFrame(
            updatePreviewProgress,
        );
    };

    const playPreview = () => {
        const preview = previewRef.current;

        if (!preview || hasPlaybackError || prefersReducedMotion()) {
            return;
        }

        shouldPlayRef.current = true;

        void preview.play().catch(() => {
            if (shouldPlayRef.current) {
                setHasPlaybackError(true);
                setIsPlaying(false);
                stopProgressAnimation();
            }
        });
    };

    const stopPreview = () => {
        const preview = previewRef.current;

        shouldPlayRef.current = false;
        setIsPlaying(false);
        stopProgressAnimation();

        if (!preview) {
            return;
        }

        preview.pause();
        preview.currentTime = 0;
    };

    return (
        <Link
            href={show(video.id)}
            prefetch
            aria-label={`Watch ${video.title}`}
            onPointerEnter={(event) => {
                if (event.pointerType === 'mouse') {
                    playPreview();
                }
            }}
            onPointerLeave={(event) => {
                if (event.pointerType === 'mouse') {
                    stopPreview();
                }
            }}
            onPointerDown={(event) => {
                if (event.pointerType !== 'touch') {
                    return;
                }

                swipeStartRef.current = {
                    pointerId: event.pointerId,
                    x: event.clientX,
                    y: event.clientY,
                };
            }}
            onPointerMove={(event) => {
                const swipeStart = swipeStartRef.current;

                if (
                    event.pointerType !== 'touch' ||
                    !swipeStart ||
                    swipeStart.pointerId !== event.pointerId
                ) {
                    return;
                }

                const distanceX = event.clientX - swipeStart.x;
                const distanceY = event.clientY - swipeStart.y;
                const horizontalDistance = Math.abs(distanceX);
                const verticalDistance = Math.abs(distanceY);

                if (
                    verticalDistance > 24 &&
                    verticalDistance > horizontalDistance
                ) {
                    swipeStartRef.current = null;

                    return;
                }

                if (
                    horizontalDistance < swipeThreshold ||
                    horizontalDistance <= verticalDistance * 1.25 ||
                    !video.previewUrl ||
                    hasPlaybackError ||
                    prefersReducedMotion()
                ) {
                    return;
                }

                event.preventDefault();
                swipeStartRef.current = null;
                suppressNextClickRef.current = true;

                if (shouldPlayRef.current) {
                    stopPreview();
                } else {
                    playPreview();
                }
            }}
            onPointerUp={() => {
                swipeStartRef.current = null;

                window.setTimeout(() => {
                    suppressNextClickRef.current = false;
                }, 0);
            }}
            onPointerCancel={() => {
                swipeStartRef.current = null;
                suppressNextClickRef.current = false;
            }}
            onClick={(event) => {
                if (!suppressNextClickRef.current) {
                    return;
                }

                event.preventDefault();
                suppressNextClickRef.current = false;
            }}
            onFocus={(event) => {
                if (event.currentTarget.matches(':focus-visible')) {
                    playPreview();
                }
            }}
            onBlur={stopPreview}
            className="block touch-pan-y focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0086d8]"
        >
            <div className="relative aspect-video overflow-hidden bg-neutral-200 dark:bg-neutral-800">
                {video.thumbnailUrl ? (
                    <img
                        src={video.thumbnailUrl}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <div className="flex h-full items-center justify-center bg-[#0086d8] text-xs font-semibold tracking-[0.14em] text-white uppercase">
                        Safe For Work
                    </div>
                )}

                {video.previewUrl && !hasPlaybackError ? (
                    <video
                        ref={previewRef}
                        src={video.previewUrl}
                        poster={video.thumbnailUrl ?? undefined}
                        muted
                        loop
                        playsInline
                        preload="none"
                        aria-hidden="true"
                        onPlaying={() => {
                            if (shouldPlayRef.current) {
                                setIsPlaying(true);
                                startProgressAnimation();
                            }
                        }}
                        onError={() => {
                            shouldPlayRef.current = false;
                            setHasPlaybackError(true);
                            setIsPlaying(false);
                            stopProgressAnimation();
                        }}
                        className={cn(
                            'pointer-events-none absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-150',
                            isPlaying && 'opacity-100',
                        )}
                    />
                ) : null}

                <span
                    aria-hidden="true"
                    className={cn(
                        'pointer-events-none absolute inset-x-0 top-0 z-20 h-1 overflow-hidden bg-black/30 opacity-0 transition-opacity duration-150',
                        isPlaying && 'opacity-100',
                    )}
                >
                    <span
                        ref={progressRef}
                        style={{ transform: 'scaleX(0)' }}
                        className="block h-full origin-left bg-[#0086d8] will-change-transform"
                    />
                </span>

                <span className="absolute right-2 bottom-2 z-10 bg-black/85 px-1.5 py-0.5 text-[11px] leading-4 font-medium text-white tabular-nums">
                    {video.duration}
                </span>
            </div>
        </Link>
    );
}
