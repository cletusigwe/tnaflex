import { Link } from '@inertiajs/react';
import type { PropsWithChildren } from 'react';

import { home } from '@/routes';

type AuthLayoutProps = PropsWithChildren<{
    title: string;
    description: string;
}>;

export function AuthLayout({ children, title, description }: AuthLayoutProps) {
    return (
        <main className="grid min-h-screen bg-[#f7f7f5] text-neutral-950 lg:grid-cols-[minmax(20rem,0.85fr)_minmax(32rem,1.15fr)]">
            <section className="relative isolate flex min-h-64 flex-col justify-between overflow-hidden bg-neutral-950 p-6 text-white md:p-10 lg:min-h-screen">
                <img
                    src="/auth-banner.jpg"
                    alt=""
                    className="absolute inset-0 -z-20 h-full w-full object-cover"
                />
                <div
                    aria-hidden="true"
                    className="absolute inset-0 -z-10 bg-black/50"
                />

                <Link href={home()} className="w-fit">
                    <img
                        src="/logo.svg"
                        alt="TNA"
                        width="104"
                        height="24"
                        className="h-auto w-[104px]"
                    />
                    <span className="mt-2 block text-[10px] font-medium tracking-[0.17em] text-neutral-400 uppercase">
                        Safe For Work
                    </span>
                </Link>

                <p className="max-w-sm text-3xl leading-tight font-semibold tracking-[-0.04em] md:text-5xl">
                    We know why you are here. Haha
                </p>
            </section>

            <section className="flex items-center px-6 py-14 md:px-14 lg:px-20">
                <div className="w-full max-w-md">
                    <p className="mb-3 text-[10px] font-semibold tracking-[0.18em] text-[#0086d8] uppercase">
                        Account
                    </p>
                    <h1 className="text-3xl font-semibold tracking-[-0.04em] md:text-4xl">
                        {title}
                    </h1>
                    <p className="mt-3 text-sm leading-6 text-neutral-600">
                        {description}
                    </p>

                    <div className="mt-10">{children}</div>
                </div>
            </section>
        </main>
    );
}
