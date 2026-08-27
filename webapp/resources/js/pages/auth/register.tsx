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
        username: '',
        password: '',
        password_confirmation: '',
    });

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        form.post(RegisteredUserController.store().url, {
            onFinish: () => form.reset('password', 'password_confirmation'),
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
                        autoComplete="new-password"
                        minLength={8}
                        required
                        className="border-neutral-400 bg-white focus-visible:ring-offset-[#f7f7f5]"
                    />
                    <FormError message={form.errors.password} />
                </div>

                <div>
                    <label
                        htmlFor="password_confirmation"
                        className="mb-2 block text-xs font-semibold tracking-[0.08em] uppercase"
                    >
                        Confirm password
                    </label>
                    <Input
                        id="password_confirmation"
                        name="password_confirmation"
                        type="password"
                        value={form.data.password_confirmation}
                        onChange={(event) =>
                            form.setData(
                                'password_confirmation',
                                event.target.value,
                            )
                        }
                        autoComplete="new-password"
                        minLength={8}
                        required
                        className="border-neutral-400 bg-white focus-visible:ring-offset-[#f7f7f5]"
                    />
                    <FormError message={form.errors.password_confirmation} />
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
