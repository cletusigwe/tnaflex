import { cn } from '@/lib/utils';
import type { ComponentProps } from 'react';

export function Input({ className, type, ...props }: ComponentProps<'input'>) {
    return (
        <input
            type={type}
            data-slot="input"
            className={cn(
                'h-10 w-full min-w-0 border border-white/20 bg-white px-3 text-sm text-neutral-950 outline-none transition-shadow placeholder:text-neutral-500 focus-visible:ring-2 focus-visible:ring-[#0086d8] focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:pointer-events-none disabled:opacity-50',
                className,
            )}
            {...props}
        />
    );
}
