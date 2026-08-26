import { Head, Link, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';

import RegisteredUserController from '@/actions/App/Http/Controllers/Auth/RegisteredUserController';
import { FormError } from '@/components/form-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuthLayout } from '@/layouts/auth-layout';
import { login } from '@/routes';

export default function Register() {
    const form = useForm({
        email: '',
        username: '',
        password: '',
    });

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        form.post(RegisteredUserController.store().url, {
            onFinish: () => form.reset('password'),
        });
    };

    return (
        <AuthLayout
            title="Create an account"
            description="Choose a username and start building your channel."
        >
            <Head title="Create an account" />

            <form onSubmit={submit} className="space-y-6">
                <div>
                    <label
                        htmlFor="email"
                        className="mb-2 block text-xs font-semibold tracking-[0.08em] uppercase"
                    >
                        Email
                    </label>
                    <Input
                        id="email"
                        name="email"
                        type="email"
                        value={form.data.email}
                        onChange={(event) =>
                            form.setData('email', event.target.value)
                        }
                        autoComplete="email"
                        autoFocus
                        required
                        className="border-neutral-400 bg-white focus-visible:ring-offset-[#f7f7f5]"
                    />
                    <FormError message={form.errors.email} />
                </div>

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
                        autoComplete="new-password"
                        minLength={8}
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
                    {form.processing ? 'Creating account…' : 'Sign up'}
                </Button>
            </form>

            <p className="mt-7 text-sm text-neutral-600">
                Already have an account?{' '}
                <Link
                    href={login()}
                    className="border-b border-neutral-950 pb-0.5 font-medium text-neutral-950"
                >
                    Log in
                </Link>
            </p>
        </AuthLayout>
    );
}
