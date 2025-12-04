import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { useEffect, useRef } from 'react';

import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/layouts/auth-layout';

export default function Login({ status, canResetPassword }) {
    const containerRef = useRef(null);
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    // Ensure background expands with content height
    useEffect(() => {
        const updateBackgroundHeight = () => {
            if (containerRef.current) {
                const height = containerRef.current.scrollHeight;
                containerRef.current.style.setProperty('--container-height', `${height}px`);
            }
        };

        updateBackgroundHeight();
        window.addEventListener('resize', updateBackgroundHeight);
        const observer = new ResizeObserver(updateBackgroundHeight);
        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => {
            window.removeEventListener('resize', updateBackgroundHeight);
            observer.disconnect();
        };
    }, []);

    const submit = (e) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <div ref={containerRef} className="auth-layout-bg flex min-h-screen flex-col relative">
            {/* Small Screen Layout - matches welcome page design */}
            <div className="relative z-10 w-full md:hidden">
                {/* Hero Image Section with curved bottom */}
                <div 
                    className="relative h-[50vh] min-h-[350px] overflow-hidden"
                    style={{
                        backgroundImage: "url('/images/bg-no-title.png')",
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat'
                    }}
                >
                    {/* Curved bottom edge */}
                    <div className="absolute bottom-0 left-0 right-0 h-16 bg-[#f5f5f5]" style={{ clipPath: 'ellipse(100% 60% at 50% 100%)' }}></div>
                </div>
                
                {/* Logo - overlapping bottom of hero section (half above) */}
                <div className="relative -mt-20 flex justify-center z-20">
                    <div className="rounded-full border-4 border-white bg-white p-3 shadow-2xl">
                        <img src="/images/czm_Logo.png" alt="CZM Logo" className="h-20 w-auto object-contain" />
                    </div>
                </div>
                
                {/* Form Content Section - light gray background */}
                <div className="bg-[#f5f5f5] pt-8 pb-12 px-4">
                    <div className="max-w-md mx-auto">
                        <AuthLayout
                            className="bg-transparent p-0"
                            title="Accès à votre compte"
                            description="Entrez votre email et votre mot de passe ci-dessous pour vous connecter"
                        >
                            <form className="flex flex-col gap-3" onSubmit={submit}>
                                <div className="grid gap-3">
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
                                            className="border-[#096626] border-2"
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
                                            className="border-[#096626] border-2"
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
                                            className="border-[#096626] border-2 w-6 h-6"
                                        />
                                        <Label htmlFor="remember"> Se souvenir de moi</Label>
                                    </div>

                                    <Button
                                        type="submit"
                                        className="auth-signup-button mt-1 w-full cursor-pointer"
                                        tabIndex={4}
                                        disabled={processing}
                                    >
                                        {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                                        Se connecter
                                    </Button>
                                </div>

                                <div className="text-muted-foreground text-center text-sm mt-2">
                                    Vous n'avez pas de compte ?{' '}
                                    <TextLink href={route('register')} tabIndex={5}>
                                        Inscrivez-vous
                                    </TextLink>
                                </div>
                            </form>

                            {status && <div className="mb-2 text-center text-sm font-medium text-green-600 mt-2">{status}</div>}
                        </AuthLayout>
                    </div>
                </div>
            </div>
            
            {/* Large Screen Layout - original design */}
            <div className="hidden md:flex flex-1 relative items-center justify-center py-4 px-4">
                {/* Form Modal */}
                <div className="auth-form-modal bottom-0 relative z-10">
                    {/* <Head title="Log in" /> */}
                    
                    {/* CZM Logo in Red Circle */}
                    {/* <div className="auth-logo-container">
                        <div className="auth-logo-ribbon">
                            <img src="/images/czm_Logo.png" alt="CZM Logo" />
                        </div>
                    </div>
                     */}
                    <AuthLayout
                        className="bg-transparent p-0"
                        title="Accès à votre compte"
                        description="Entrez votre email et votre mot de passe ci-dessous pour vous connecter"
                    >

                        <form className="flex flex-col gap-3" onSubmit={submit}>
                            <div className="grid gap-3">
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
                                        className="border-[#096626] border-2"
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
                                        className="border-[#096626] border-2"
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
                                                                                    className="border-[#096626] border-2 w-6 h-6"
                                    />
                                    <Label htmlFor="remember"> Se souvenir de moi</Label>
                                </div>

                                <Button
                                    type="submit"
                                    className="auth-signup-button mt-1 w-full cursor-pointer"
                                    tabIndex={4}
                                    disabled={processing}
                                >
                                    {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                                    Se connecter
                                </Button>
                            </div>

                            <div className="text-muted-foreground text-center text-sm mt-2">
                                Vous n'avez pas de compte ?{' '}
                                <TextLink href={route('register')} tabIndex={5}>
                                    Inscrivez-vous
                                </TextLink>
                            </div>
                        </form>

                        {status && <div className="mb-2 text-center text-sm font-medium text-green-600 mt-2">{status}</div>}
                    </AuthLayout>
                </div>
            </div>
        </div>
    );
}
