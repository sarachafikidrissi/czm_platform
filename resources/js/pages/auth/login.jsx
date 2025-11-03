import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';

import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/layouts/auth-layout';

export default function Login({ status, canResetPassword }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <div className="auth-layout-bg flex h-[100svh] w-[100svw] place-content-center place-items-center">
            <div className="auth-layout-overlay sm:absolute top-0 left-0 w-full bg-red-400"></div>
            <div className="sm:relative z-50 flex sm:flex-row flex-col-reverse sm:h-[90svh] h-fit sm:w-[80svw] w-[100vw] sm:translate-x-[-50px]">
                {/* left side  */}
                <div className="sm:h-full sm:w-[50%] w-[100svw]">
                    <AuthLayout
                        className="sm:absolute left-[160px] h-full sm:rounded-s-4xl sm:rounded-e-[40px] bg-muted"
                        title="Accès à votre compte"
                        description="Entrez votre email et votre mot de passe ci-dessous pour vous connecter"
                    >
                        <Head title="Log in" />

                        <form className="flex flex-col gap-6" onSubmit={submit}>
                            <div className="grid gap-6">
                                <div className="grid gap-2">
                                    <Label htmlFor="email">Adress Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        required
                                        autoFocus
                                        tabIndex={1}
                                        autoComplete="email"
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
                                        placeholder="email@example.com"
                                    />
                                    <InputError message={errors.email} />
                                </div>

                                <div className="grid gap-2">
                                    <div className="flex items-center">
                                        <Label htmlFor="password">Mot de passe</Label>
                                        {canResetPassword && (
                                            <TextLink href={route('password.request')} className="ml-auto text-sm" tabIndex={5}>
                                                Mot de passe oublié?
                                            </TextLink>
                                        )}
                                    </div>
                                    <Input
                                        id="password"
                                        type="password"
                                        required
                                        tabIndex={2}
                                        autoComplete="current-password"
                                        value={data.password}
                                        onChange={(e) => setData('password', e.target.value)}
                                        placeholder="Mot de passe"
                                    />
                                    <InputError message={errors.password} />
                                </div>

                                <div className="flex items-center space-x-3">
                                    <Checkbox
                                        id="remember"
                                        name="remember"
                                        checked={data.remember}
                                        onClick={() => setData('remember', !data.remember)}
                                        tabIndex={3}
                                    />
                                    <Label htmlFor="remember"> Se souvenir de moi</Label>
                                </div>

                                <Button
                                    type="submit"
                                    className="bg-button-primary hover:bg-button-primary-hover mt-4 w-full cursor-pointer"
                                    tabIndex={4}
                                    disabled={processing}
                                >
                                    {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                                    Se connecter
                                </Button>
                            </div>

                            <div className="text-muted-foreground text-center text-sm">
                                Vous n'avez pas de compte ?{' '}
                                <TextLink href={route('register')} tabIndex={5}>
                                    Inscrivez-vous
                                </TextLink>
                            </div>
                        </form>

                        {status && <div className="mb-4 text-center text-sm font-medium text-green-600">{status}</div>}
                    </AuthLayout>
                </div>
                {/* right side */}
                <div className="contenr-center sm:h-full h-[30vh] sm:w-[50%] w-[100%]">
                    <img loading="lazy" src="./images/Wedding-photo.avif" alt="Flower Bouquet" className="h-full w-full sm:rounded-e-4xl object-cover" />
                </div>
            </div>
        </div>
    );
}
