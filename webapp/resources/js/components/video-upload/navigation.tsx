import { cn } from '@/lib/utils';

import { pipelineSteps } from './types';
import type { PipelineStage } from './types';

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
