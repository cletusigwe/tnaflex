import type { PropsWithChildren } from 'react';

import { AppHeader } from '@/components/app-header';

type AppLayoutProps = PropsWithChildren<{
    query?: string;
}>;

export function AppLayout({ children, query }: AppLayoutProps) {
    return (
        <div className="min-h-screen bg-[#f7f7f5] text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50">
            <AppHeader query={query} />
            {children}
        </div>
    );
}
