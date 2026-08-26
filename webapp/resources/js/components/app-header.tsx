import { Link, usePage } from '@inertiajs/react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { dashboard, home, login } from '@/routes';

type AppHeaderProps = {
    query?: string;
};

export function AppHeader({ query = '' }: AppHeaderProps) {
    const { auth } = usePage().props;

    return (
        <header className="border-b border-neutral-800 bg-neutral-950 text-white">
            <div className="mx-auto grid max-w-[1600px] grid-cols-[1fr_auto] items-center gap-x-6 gap-y-5 px-5 py-5 md:grid-cols-[minmax(9rem,1fr)_minmax(20rem,42rem)_minmax(9rem,1fr)] md:px-8 lg:px-10">
                <Link
                    href={home()}
                    className="w-fit"
                    aria-label="Safe For Work home"
                >
                    <img
                        src="/logo.svg"
                        alt="TNA"
                        width="92"
                        height="21"
                        className="h-auto w-[92px]"
                    />
                    <span className="mt-1.5 block text-[10px] leading-none font-medium tracking-[0.17em] text-neutral-400 uppercase">
                        Safe For Work
                    </span>
                </Link>

                <form
                    {...home.form()}
                    role="search"
                    className="order-3 col-span-2 flex w-full md:order-none md:col-span-1"
                >
                    <label htmlFor="site-search" className="sr-only">
                        Search videos
                    </label>
                    <Input
                        id="site-search"
                        name="q"
                        type="search"
                        defaultValue={query}
                        placeholder="Search videos"
                        className="border-r-0"
                    />
                    <Button type="submit" className="shrink-0">
                        Search
                    </Button>
                </form>

                {auth.user ? (
                    <Link
                        href={dashboard()}
                        className="justify-self-end border-b border-neutral-600 pb-0.5 text-xs font-medium text-neutral-200 hover:border-white hover:text-white"
                    >
                        @{auth.user.username}
                    </Link>
                ) : (
                    <Link
                        href={login()}
                        className="justify-self-end bg-[#0086d8] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#0075bd] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    >
                        Log in
                    </Link>
                )}
            </div>
        </header>
    );
}
