import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { useEffect, useRef } from 'react';

import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/layouts/auth-layout';

export default function ForgotPassword({ status }) {
    const containerRef = useRef(null);
    const { data, setData, post, processing, errors } = useForm({
        email: '',
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

        post(route('password.email'));
    };

    return (
        <div ref={containerRef} className="auth-layout-bg flex min-h-screen flex-col relative">
            {/* Small Screen Layout - matches login page design */}
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
                            title="Mot de passe oublié"
                            description="Entrez votre adresse email pour recevoir un lien de réinitialisation de mot de passe"
                        >
                            <Head title="Mot de passe oublié" />

                            {status && <div className="mb-4 text-center text-sm font-medium text-green-600">{status}</div>}

                            <form className="flex flex-col gap-3" onSubmit={submit}>
                                <div className="grid gap-3">
                                    <div className="grid gap-2">
                                        <Label htmlFor="email">Adresse Email</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            name="email"
                                            required
                                            autoFocus
                                            autoComplete="email"
                                            value={data.email}
                                            onChange={(e) => setData('email', e.target.value)}
                                            placeholder="email@example.com"
                                            className="border-[#096626] border-2"
                                        />
                                        <InputError message={errors.email} />
                                    </div>

                                    <Button
                                        type="submit"
                                        className="auth-signup-button mt-1 w-full cursor-pointer"
                                        disabled={processing}
                                    >
                                        {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                                        Envoyer le lien de réinitialisation
                                    </Button>
                                </div>

                                <div className="text-muted-foreground text-center text-sm mt-2">
                                    <span>Ou, retournez à la</span>
                                    <TextLink href={route('login')}> page de connexion</TextLink>
                                </div>
                            </form>
                        </AuthLayout>
                    </div>
                </div>
            </div>
            
            {/* Large Screen Layout - original design */}
            <div className="hidden md:flex flex-1 relative items-center justify-center py-4 px-4">
                {/* Form Modal */}
                <div className="auth-form-modal bottom-0 relative z-10">
                    <AuthLayout
                        className="bg-transparent p-0"
                        title="Mot de passe oublié"
                        description="Entrez votre adresse email pour recevoir un lien de réinitialisation de mot de passe"
                    >
                        <Head title="Mot de passe oublié" />

                        {status && <div className="mb-4 text-center text-sm font-medium text-green-600">{status}</div>}

                        <form className="flex flex-col gap-3" onSubmit={submit}>
                            <div className="grid gap-3">
                                <div className="grid gap-2">
                                    <Label htmlFor="email">Adresse Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        name="email"
                                        required
                                        autoFocus
                                        autoComplete="email"
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
                                        placeholder="email@example.com"
                                        className="border-[#096626] border-2"
                                    />
                                    <InputError message={errors.email} />
                                </div>

                                <Button
                                    type="submit"
                                    className="auth-signup-button mt-1 w-full cursor-pointer"
                                    disabled={processing}
                                >
                                    {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                                    Envoyer le lien de réinitialisation
                                </Button>
                            </div>

                            <div className="text-muted-foreground text-center text-sm mt-2">
                                <span>Ou, retournez à la</span>
                                <TextLink href={route('login')}> page de connexion</TextLink>
                            </div>
                        </form>
                    </AuthLayout>
                </div>
            </div>
        </div>
    );
}
