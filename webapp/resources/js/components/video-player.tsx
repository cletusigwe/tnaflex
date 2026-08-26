import type Hls from 'hls.js';
import hlsWorkerUrl from 'hls.js/dist/hls.worker.js?url';
import {
    Check,
    Pause,
    Play,
    RotateCcw,
    RotateCw,
    Settings2,
    Volume2,
    VolumeX,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { formatFileSize } from '@/lib/format-file-size';
import { cn } from '@/lib/utils';

type VideoPlayerProps = {
    poster: string | null;
    src: string;
    title: string;
};

type QualityOption = {
    height: number;
    label: string;
    levelIndex: number;
};

type QualitySelection = 'auto' | number;

type VideoManifest = {
    renditions?: Array<{
        height: number;
        sizeBytes: number;
    }>;
};

const hlsMimeType = 'application/vnd.apple.mpegurl';
const skipDuration = 10;

const controlButtonClassName =
    'size-10 shrink-0 bg-transparent p-0 text-white hover:bg-white/10 focus-visible:outline-white';
const overlayButtonClassName =
    'relative size-12 rounded-full bg-black/60 p-0 text-white backdrop-blur-sm hover:bg-black/80 focus-visible:outline-white';

function isHlsSource(src: string): boolean {
    return /[.]m3u8(?:$|[?#])/.test(src);
}

function getVideoManifestUrl(src: string): string | null {
    const masterPlaylistSuffix = /\/hls\/master[.]m3u8(?:[?#].*)?$/;

    if (!masterPlaylistSuffix.test(src)) {
        return null;
    }

    return src.replace(masterPlaylistSuffix, '/manifest.json');
}

function formatTime(seconds: number): string {
    if (!Number.isFinite(seconds)) {
        return '0:00';
    }

    const totalSeconds = Math.max(0, Math.floor(seconds));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const remainingSeconds = totalSeconds % 60;

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function VideoPlayer({ poster, src, title }: VideoPlayerProps) {
    const hlsRef = useRef<Hls | null>(null);
    const qualityMenuRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [activeQualityHeight, setActiveQualityHeight] = useState<
        number | null
    >(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [hasPlaybackError, setHasPlaybackError] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isPlaybackOverlayVisible, setIsPlaybackOverlayVisible] =
        useState(true);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isQualityMenuOpen, setIsQualityMenuOpen] = useState(false);
    const [playbackAttempt, setPlaybackAttempt] = useState(0);
    const [qualityOptions, setQualityOptions] = useState<QualityOption[]>([]);
    const [renditionSizeData, setRenditionSizeData] = useState<{
        sizes: Record<number, number>;
        src: string;
    }>({ sizes: {}, src: '' });
    const [selectedQuality, setSelectedQuality] =
        useState<QualitySelection>('auto');

    const togglePlayback = () => {
        const video = videoRef.current;

        if (!video) {
            return;
        }

        if (video.paused || video.ended) {
            void video
                .play()
                .then(() => {
                    setIsPlaybackOverlayVisible(false);
                })
                .catch(() => {
                    setHasPlaybackError(true);
                });

            return;
        }

        video.pause();
    };

    const skipBy = (seconds: number) => {
        const video = videoRef.current;

        if (!video || !Number.isFinite(video.duration)) {
            return;
        }

        const nextTime = Math.min(
            video.duration,
            Math.max(0, video.currentTime + seconds),
        );

        video.currentTime = nextTime;
        setCurrentTime(nextTime);
    };

    const toggleMute = () => {
        const video = videoRef.current;

        if (!video) {
            return;
        }

        video.muted = !video.muted;
    };

    const selectQuality = (quality: QualitySelection) => {
        const hls = hlsRef.current;

        if (!hls) {
            return;
        }

        hls.currentLevel = quality === 'auto' ? -1 : quality;
        setSelectedQuality(quality);
        setIsQualityMenuOpen(false);
    };

    useEffect(() => {
        const manifestUrl = getVideoManifestUrl(src);

        if (!manifestUrl) {
            return;
        }

        const abortController = new AbortController();

        const loadRenditionSizes = async () => {
            try {
                const response = await fetch(manifestUrl, {
                    signal: abortController.signal,
                });

                if (!response.ok) {
                    return;
                }

                const manifest = (await response.json()) as VideoManifest;
                const sizes: Record<number, number> = {};

                for (const rendition of manifest.renditions ?? []) {
                    if (
                        Number.isFinite(rendition.height) &&
                        Number.isFinite(rendition.sizeBytes) &&
                        rendition.sizeBytes >= 0
                    ) {
                        sizes[rendition.height] = rendition.sizeBytes;
                    }
                }

                setRenditionSizeData({ sizes, src });
            } catch (error) {
                if (
                    !(error instanceof DOMException) ||
                    error.name !== 'AbortError'
                ) {
                    setRenditionSizeData({ sizes: {}, src });
                }
            }
        };

        void loadRenditionSizes();

        return () => {
            abortController.abort();
        };
    }, [src]);

    useEffect(() => {
        if (!isQualityMenuOpen) {
            return;
        }

        const closeQualityMenu = (event: PointerEvent) => {
            if (
                qualityMenuRef.current &&
                !qualityMenuRef.current.contains(event.target as Node)
            ) {
                setIsQualityMenuOpen(false);
            }
        };

        document.addEventListener('pointerdown', closeQualityMenu);

        return () => {
            document.removeEventListener('pointerdown', closeQualityMenu);
        };
    }, [isQualityMenuOpen]);

    useEffect(() => {
        const video = videoRef.current;

        if (!video) {
            return;
        }

        let attachedPlayer: Hls | null = null;
        let hasNativeErrorListener = false;
        let isActive = true;

        const showPlaybackError = () => {
            if (isActive) {
                setHasPlaybackError(true);
            }
        };

        const handleNativeError = () => {
            showPlaybackError();
        };

        const loadNativeSource = () => {
            video.addEventListener('error', handleNativeError);
            hasNativeErrorListener = true;
            video.src = src;
            video.load();
        };

        setActiveQualityHeight(null);
        setCurrentTime(0);
        setDuration(0);
        setHasPlaybackError(false);
        setIsPlaybackOverlayVisible(true);
        setIsPlaying(false);
        setIsQualityMenuOpen(false);
        setQualityOptions([]);
        setSelectedQuality('auto');
        video.pause();
        video.removeAttribute('src');
        video.load();

        if (!isHlsSource(src)) {
            loadNativeSource();
        } else {
            const loadHlsSource = async () => {
                try {
                    const { default: HlsPlayer } = await import('hls.js/light');

                    if (!isActive) {
                        return;
                    }

                    if (HlsPlayer.isSupported()) {
                        let mediaRecoveryAttempts = 0;
                        let networkRecoveryAttempts = 0;
                        const player = new HlsPlayer({
                            workerPath: hlsWorkerUrl,
                        });

                        attachedPlayer = player;
                        hlsRef.current = player;

                        player.on(HlsPlayer.Events.MANIFEST_PARSED, () => {
                            if (!isActive) {
                                return;
                            }

                            const availableQualities = player.levels
                                .map((level, levelIndex): QualityOption => ({
                                    height: level.height,
                                    label: `${level.height}p`,
                                    levelIndex,
                                }))
                                .filter((quality) => quality.height > 0)
                                .filter(
                                    (quality, index, qualities) =>
                                        qualities.findIndex(
                                            (candidate) =>
                                                candidate.height ===
                                                quality.height,
                                        ) === index,
                                );

                            setQualityOptions(availableQualities);
                        });
                        player.on(
                            HlsPlayer.Events.LEVEL_SWITCHED,
                            (_event, levelData) => {
                                if (!isActive) {
                                    return;
                                }

                                setActiveQualityHeight(
                                    player.levels[levelData.level]?.height ??
                                        null,
                                );
                            },
                        );
                        player.on(
                            HlsPlayer.Events.ERROR,
                            (_event, errorData) => {
                                if (!errorData.fatal || !isActive) {
                                    return;
                                }

                                if (
                                    errorData.type ===
                                        HlsPlayer.ErrorTypes.NETWORK_ERROR &&
                                    networkRecoveryAttempts === 0
                                ) {
                                    networkRecoveryAttempts += 1;
                                    player.startLoad();

                                    return;
                                }

                                if (
                                    errorData.type ===
                                        HlsPlayer.ErrorTypes.MEDIA_ERROR &&
                                    mediaRecoveryAttempts === 0
                                ) {
                                    mediaRecoveryAttempts += 1;
                                    player.recoverMediaError();

                                    return;
                                }

                                player.destroy();
                                attachedPlayer = null;
                                hlsRef.current = null;
                                showPlaybackError();
                            },
                        );
                        player.loadSource(src);
                        player.attachMedia(video);

                        return;
                    }

                    if (video.canPlayType(hlsMimeType)) {
                        loadNativeSource();

                        return;
                    }

                    showPlaybackError();
                } catch {
                    showPlaybackError();
                }
            };

            void loadHlsSource();
        }

        return () => {
            isActive = false;
            attachedPlayer?.destroy();

            if (hlsRef.current === attachedPlayer) {
                hlsRef.current = null;
            }

            if (hasNativeErrorListener) {
                video.removeEventListener('error', handleNativeError);
            }

            video.pause();
            video.removeAttribute('src');
            video.load();
        };
    }, [playbackAttempt, src]);

    const playbackProgress =
        duration > 0
            ? Math.min(100, Math.max(0, (currentTime / duration) * 100))
            : 0;
    const selectedQualityOption =
        typeof selectedQuality === 'number'
            ? qualityOptions.find(
                  (quality) => quality.levelIndex === selectedQuality,
              )
            : null;
    const qualityLabel =
        selectedQuality === 'auto'
            ? activeQualityHeight
                ? `Auto · ${activeQualityHeight}p`
                : 'Auto'
            : (selectedQualityOption?.label ?? 'Auto');
    const renditionSizes =
        renditionSizeData.src === src ? renditionSizeData.sizes : {};

    return (
        <div
            role="region"
            aria-label={`${title} video player`}
            className="w-full bg-neutral-950 text-white"
        >
            <div className="relative aspect-video bg-black">
                <video
                    ref={videoRef}
                    playsInline
                    preload="metadata"
                    poster={poster ?? undefined}
                    aria-label={title}
                    onClick={() => {
                        setIsPlaybackOverlayVisible((isVisible) =>
                            isPlaying ? !isVisible : true,
                        );
                    }}
                    onDurationChange={(event) => {
                        const nextDuration = event.currentTarget.duration;

                        if (Number.isFinite(nextDuration)) {
                            setDuration(nextDuration);
                        }
                    }}
                    onLoadedMetadata={(event) => {
                        const video = event.currentTarget;

                        setCurrentTime(video.currentTime);
                        setDuration(
                            Number.isFinite(video.duration)
                                ? video.duration
                                : 0,
                        );
                        setIsMuted(video.muted);
                    }}
                    onPlay={() => {
                        setIsPlaybackOverlayVisible(false);
                        setIsPlaying(true);
                    }}
                    onPause={(event) => {
                        setCurrentTime(event.currentTarget.currentTime);
                        setIsPlaybackOverlayVisible(true);
                        setIsPlaying(false);
                    }}
                    onEnded={(event) => {
                        setCurrentTime(event.currentTarget.duration);
                        setIsPlaybackOverlayVisible(true);
                        setIsPlaying(false);
                    }}
                    onTimeUpdate={(event) => {
                        setCurrentTime(event.currentTarget.currentTime);
                    }}
                    onVolumeChange={(event) => {
                        setIsMuted(event.currentTarget.muted);
                    }}
                    className="h-full w-full cursor-pointer bg-black object-contain"
                />

                {isPlaybackOverlayVisible && !hasPlaybackError ? (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <div className="pointer-events-auto flex items-center gap-3">
                            <Button
                                aria-label={`Go back ${skipDuration} seconds`}
                                onClick={() => {
                                    skipBy(-skipDuration);
                                }}
                                className={overlayButtonClassName}
                            >
                                <RotateCcw
                                    aria-hidden="true"
                                    className="size-5"
                                />
                                <span className="absolute text-[10px] font-semibold tabular-nums">
                                    {skipDuration}
                                </span>
                            </Button>
                            <Button
                                aria-label={
                                    isPlaying ? 'Pause video' : 'Play video'
                                }
                                onClick={togglePlayback}
                                className={cn(
                                    overlayButtonClassName,
                                    'size-14 bg-black/70',
                                )}
                            >
                                {isPlaying ? (
                                    <Pause
                                        aria-hidden="true"
                                        className="size-5"
                                    />
                                ) : (
                                    <Play
                                        aria-hidden="true"
                                        className="size-5 fill-current"
                                    />
                                )}
                            </Button>
                            <Button
                                aria-label={`Skip ahead ${skipDuration} seconds`}
                                onClick={() => {
                                    skipBy(skipDuration);
                                }}
                                className={overlayButtonClassName}
                            >
                                <RotateCw
                                    aria-hidden="true"
                                    className="size-5"
                                />
                                <span className="absolute text-[10px] font-semibold tabular-nums">
                                    {skipDuration}
                                </span>
                            </Button>
                        </div>
                    </div>
                ) : null}

                {hasPlaybackError ? (
                    <div
                        role="alert"
                        className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/85 px-6 text-center"
                    >
                        <div className="flex flex-col gap-1.5">
                            <p className="text-sm font-semibold">
                                Playback unavailable
                            </p>
                            <p className="max-w-sm text-xs leading-5 text-neutral-300">
                                The video could not be loaded in this browser.
                            </p>
                        </div>
                        <Button
                            onClick={() => {
                                setPlaybackAttempt((attempt) => attempt + 1);
                            }}
                            className="h-9 px-4"
                        >
                            Try again
                        </Button>
                    </div>
                ) : null}
            </div>

            <div className="flex flex-col gap-2 border-t border-white/15 px-3 py-3 md:px-4">
                <div className="relative flex h-5 items-center">
                    <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-0 h-1 bg-white/25"
                    >
                        <span
                            style={{ width: `${playbackProgress}%` }}
                            className="block h-full bg-[#0086d8]"
                        />
                    </span>
                    <input
                        type="range"
                        min={0}
                        max={duration > 0 ? duration : 0}
                        step={0.01}
                        value={Math.min(currentTime, duration || 0)}
                        aria-label="Video progress"
                        aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
                        onChange={(event) => {
                            const video = videoRef.current;
                            const nextTime = Number(event.currentTarget.value);

                            if (!video) {
                                return;
                            }

                            video.currentTime = nextTime;
                            setCurrentTime(nextTime);
                        }}
                        className="absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white [&::-moz-range-thumb]:size-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white [&::-moz-range-track]:h-1 [&::-moz-range-track]:bg-transparent [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:mt-[-4px] [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                    />
                </div>

                <div className="flex items-center justify-between gap-2">
                    <Button
                        aria-label={isMuted ? 'Unmute video' : 'Mute video'}
                        aria-pressed={isMuted}
                        onClick={toggleMute}
                        className={controlButtonClassName}
                    >
                        {isMuted ? (
                            <VolumeX aria-hidden="true" className="size-4" />
                        ) : (
                            <Volume2 aria-hidden="true" className="size-4" />
                        )}
                    </Button>

                    {qualityOptions.length > 0 ? (
                        <div ref={qualityMenuRef} className="relative">
                            {isQualityMenuOpen ? (
                                <div
                                    aria-label="Video quality"
                                    className="absolute right-0 bottom-full z-20 mb-2 min-w-44 border border-white/20 bg-neutral-950 p-1 shadow-xl"
                                >
                                    <Button
                                        aria-pressed={
                                            selectedQuality === 'auto'
                                        }
                                        onClick={() => {
                                            selectQuality('auto');
                                        }}
                                        className={cn(
                                            'h-9 w-full justify-between bg-transparent px-3 text-xs text-white hover:bg-white/10 focus-visible:outline-white',
                                            selectedQuality === 'auto' &&
                                                'text-[#33a9ef]',
                                        )}
                                    >
                                        Auto
                                        {selectedQuality === 'auto' ? (
                                            <Check
                                                aria-hidden="true"
                                                className="size-3.5"
                                            />
                                        ) : null}
                                    </Button>
                                    {[...qualityOptions]
                                        .reverse()
                                        .map((quality) => (
                                            <Button
                                                key={quality.levelIndex}
                                                aria-pressed={
                                                    selectedQuality ===
                                                    quality.levelIndex
                                                }
                                                onClick={() => {
                                                    selectQuality(
                                                        quality.levelIndex,
                                                    );
                                                }}
                                                className={cn(
                                                    'h-9 w-full justify-between bg-transparent px-3 text-xs text-white hover:bg-white/10 focus-visible:outline-white',
                                                    selectedQuality ===
                                                        quality.levelIndex &&
                                                        'text-[#33a9ef]',
                                                )}
                                            >
                                                {quality.label}
                                                <span className="flex items-center gap-3">
                                                    {renditionSizes[
                                                        quality.height
                                                    ] !== undefined ? (
                                                        <span className="text-neutral-400 tabular-nums">
                                                            {formatFileSize(
                                                                renditionSizes[
                                                                    quality
                                                                        .height
                                                                ],
                                                            )}
                                                        </span>
                                                    ) : null}
                                                    {selectedQuality ===
                                                    quality.levelIndex ? (
                                                        <Check
                                                            aria-hidden="true"
                                                            className="size-3.5"
                                                        />
                                                    ) : null}
                                                </span>
                                            </Button>
                                        ))}
                                </div>
                            ) : null}

                            <Button
                                aria-label={`Video quality, ${qualityLabel}`}
                                aria-haspopup="true"
                                aria-expanded={isQualityMenuOpen}
                                onClick={() => {
                                    setIsQualityMenuOpen((isOpen) => !isOpen);
                                }}
                                className="h-10 gap-2 bg-transparent px-2 text-xs text-white tabular-nums hover:bg-white/10 focus-visible:outline-white"
                            >
                                <Settings2
                                    aria-hidden="true"
                                    className="size-4"
                                />
                                {qualityLabel}
                            </Button>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
