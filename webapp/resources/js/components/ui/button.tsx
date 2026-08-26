import { cn } from '@/lib/utils';
import type { ComponentProps } from 'react';

export function Button({ className, type = 'button', ...props }: ComponentProps<'button'>) {
    return (
        <button
            type={type}
            data-slot="button"
            className={cn(
                'inline-flex h-10 items-center justify-center bg-[#0086d8] px-5 text-sm font-medium text-white transition-colors hover:bg-[#0075bd] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:pointer-events-none disabled:opacity-50',
                className,
            )}
            {...props}
        />
    );
}
