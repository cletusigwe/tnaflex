import { Head, Link, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';

import AuthenticatedSessionController from '@/actions/App/Http/Controllers/Auth/AuthenticatedSessionController';
import { FormError } from '@/components/form-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuthLayout } from '@/layouts/auth-layout';
import { register } from '@/routes';

export default function Login() {
    const form = useForm({
        username: '',
        password: '',
    });

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        form.post(AuthenticatedSessionController.store().url, {
            onFinish: () => form.reset('password'),
        });
    };

    return (
        <AuthLayout
            title="Log in"
            description="Continue to your channel and video uploads."
        >
            <Head title="Log in" />

            <form onSubmit={submit} className="space-y-6">
                <div>
                    <label
                        htmlFor="username"
                        className="mb-2 block text-xs font-semibold tracking-[0.08em] uppercase"
                    >
                        Username
                    </label>
                    <Input
                        id="username"
                        name="username"
                        value={form.data.username}
                        onChange={(event) =>
                            form.setData('username', event.target.value)
                        }
                        autoComplete="username"
                        autoFocus
                        required
                        className="border-neutral-400 bg-white focus-visible:ring-offset-[#f7f7f5]"
                    />
                    <FormError message={form.errors.username} />
                </div>

                <div>
                    <label
                        htmlFor="password"
                        className="mb-2 block text-xs font-semibold tracking-[0.08em] uppercase"
                    >
                        Password
                    </label>
                    <Input
                        id="password"
                        name="password"
                        type="password"
                        value={form.data.password}
                        onChange={(event) =>
                            form.setData('password', event.target.value)
                        }
                        autoComplete="current-password"
                        required
                        className="border-neutral-400 bg-white focus-visible:ring-offset-[#f7f7f5]"
                    />
                    <FormError message={form.errors.password} />
                </div>

                <Button
                    type="submit"
                    disabled={form.processing}
                    className="w-full"
                >
                    {form.processing ? 'Logging in…' : 'Log in'}
                </Button>
            </form>

            <p className="mt-7 text-sm text-neutral-600">
                New here?{' '}
                <Link
                    href={register()}
                    className="border-b border-neutral-950 pb-0.5 font-medium text-neutral-950"
                >
                    Create an account
                </Link>
            </p>
        </AuthLayout>
    );
}
