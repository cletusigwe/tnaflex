import { cn } from '@/lib/utils';

import { pipelineSteps, previewModes } from './types';
import type { PipelineStage, PreviewMode } from './types';

type PipelineNavigationProps = {
    activeStep: number;
    stage: PipelineStage;
};

export function PipelineNavigation({
    activeStep,
    stage,
}: PipelineNavigationProps) {
    return (
        <nav aria-label="Video pipeline" className="mt-7">
            <ol className="grid grid-cols-3 border border-neutral-300 dark:border-neutral-700">
                {pipelineSteps.map((step, index) => {
                    const isComplete =
                        index < activeStep || stage === 'published';
                    const isCurrent =
                        index === activeStep && stage !== 'published';

                    return (
                        <li
                            key={step}
                            aria-current={isCurrent ? 'step' : undefined}
                            className={cn(
                                'grid min-w-0 grid-cols-[auto_1fr] items-center gap-3 border-r border-neutral-300 px-4 py-3 last:border-r-0 sm:px-6 dark:border-neutral-700',
                                isComplete &&
                                    'bg-neutral-950 text-white dark:bg-neutral-100 dark:text-neutral-950',
                                isCurrent && 'bg-[#0086d8] text-white',
                            )}
                        >
                            <span className="text-xs font-semibold tabular-nums">
                                {isComplete ? '✓' : `0${index + 1}`}
                            </span>
                            <span className="truncate text-xs font-semibold tracking-[0.08em] uppercase sm:text-sm">
                                {step}
                            </span>
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}

type PreviewNavigationProps = {
    previewMode: PreviewMode;
    setPreviewMode: (mode: PreviewMode) => void;
};

export function PreviewNavigation({
    previewMode,
    setPreviewMode,
}: PreviewNavigationProps) {
    return (
        <nav
            role="tablist"
            aria-label="Publish previews"
            className="grid grid-cols-3 border-y border-neutral-300 xl:block xl:border-y-0 xl:border-r xl:pr-6 dark:border-neutral-700"
        >
            {previewModes.map((mode, index) => (
                <button
                    key={mode.value}
                    type="button"
                    role="tab"
                    aria-selected={previewMode === mode.value}
                    onClick={() => setPreviewMode(mode.value)}
                    className={cn(
                        'flex min-h-14 w-full items-center px-3 py-3 text-left text-[10px] font-semibold tracking-[0.07em] uppercase hover:bg-neutral-200 xl:min-h-16 dark:hover:bg-neutral-800',
                        index > 0 &&
                            'border-l border-neutral-300 xl:border-t xl:border-l-0 dark:border-neutral-700',
                        previewMode === mode.value &&
                            'bg-[#0086d8] text-white hover:bg-[#0086d8] dark:hover:bg-[#0086d8]',
                    )}
                >
                    {mode.label}
                </button>
            ))}
        </nav>
    );
}
