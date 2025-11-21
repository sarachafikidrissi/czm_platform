import { Head, useForm } from '@inertiajs/react';
import { Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AuthLayout from '@/layouts/auth-layout';

export default function StaffRegister({ agencies = [] }) {
    const containerRef = useRef(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        email: '',
        phone: '',
        role: '',
        agency: '',
        password: '',
        password_confirmation: '',
        condition: false,
    });

    const agencyItems = useMemo(() => agencies.map((agency) => (
        <SelectItem key={agency.id} value={agency.name}>{agency.name}</SelectItem>
    )), [agencies]);

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
    }, [data]); // Re-run when form data changes

    const submit = (e) => {
        e.preventDefault();
        post(route('staff.register'));
    };

    return (
        <div ref={containerRef} className="auth-layout-bg flex min-h-screen flex-col relative">
            {/* Main Content Area */}
            <div className="flex-1 relative flex items-center justify-center py-4 px-4">
                {/* Form Modal */}
                <div className="auth-form-modal relative z-10 bottom-0">
                    <Head title="Staff Registration" />
                    
                    <AuthLayout
                        title="Créer un compte Staff"
                        className="bg-transparent p-0"
                        description="Saisissez vos coordonnées ci-dessous pour créer un compte staff."
                    >
                        <form className="flex flex-col gap-3" onSubmit={submit}>
                            <div className="grid gap-3">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Full Name</Label>
                                    <Input
                                        id="name"
                                        type="text"
                                        required
                                        autoFocus
                                        tabIndex={1}
                                        autoComplete="name"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        disabled={processing}
                                        placeholder="Enter your full name"
                                    />
                                    <InputError message={errors.name} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="email">Email Address</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        required
                                        tabIndex={2}
                                        autoComplete="email"
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
                                        disabled={processing}
                                        placeholder="email@example.com"
                                    />
                                    <InputError message={errors.email} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="phone">Phone Number</Label>
                                    <Input
                                        id="phone"
                                        type="tel"
                                        required
                                        tabIndex={3}
                                        autoComplete="tel"
                                        value={data.phone}
                                        onChange={(e) => setData('phone', e.target.value)}
                                        disabled={processing}
                                        placeholder="+212 6-XX-XX-XX-XX"
                                    />
                                    <InputError message={errors.phone} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="role">Role</Label>
                                    <Select 
                                        value={data.role} 
                                        onValueChange={(value) => setData('role', value)}
                                        disabled={processing}
                                    >
                                        <SelectTrigger tabIndex={4}>
                                            <SelectValue placeholder="Select your role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="admin">Admin</SelectItem>
                                            <SelectItem value="manager">Manager</SelectItem>
                                            <SelectItem value="matchmaker">Matchmaker</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.role} />
                                </div>

                                {(data.role === 'manager' || data.role === 'matchmaker') && (
                                    <div className="grid gap-2">
                                        <Label htmlFor="agency">Agency</Label>
                                        <Select 
                                            value={data.agency} 
                                            onValueChange={(v) => setData('agency', v)}
                                            disabled={processing}
                                        >
                                            <SelectTrigger tabIndex={5}>
                                                <SelectValue placeholder="Select your agency" />
                                            </SelectTrigger>
                                            <SelectContent>{agencyItems}</SelectContent>
                                        </Select>
                                        <InputError message={errors.agency} />
                                    </div>
                                )}

                                <div className="grid gap-2">
                                    <Label htmlFor="password">Password</Label>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            type={showPassword ? 'text' : 'password'}
                                            required
                                            tabIndex={6}
                                            autoComplete="new-password"
                                            value={data.password}
                                            onChange={(e) => setData('password', e.target.value)}
                                            disabled={processing}
                                            placeholder="Create a strong password"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent"
                                            onClick={() => setShowPassword(!showPassword)}
                                            disabled={processing}
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                    <InputError message={errors.password} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="password_confirmation">Confirm Password</Label>
                                    <div className="relative">
                                        <Input
                                            id="password_confirmation"
                                            type={showPasswordConfirmation ? 'text' : 'password'}
                                            required
                                            tabIndex={7}
                                            autoComplete="new-password"
                                            value={data.password_confirmation}
                                            onChange={(e) => setData('password_confirmation', e.target.value)}
                                            disabled={processing}
                                            placeholder="Confirm your password"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent"
                                            onClick={() => setShowPasswordConfirmation(!showPasswordConfirmation)}
                                            disabled={processing}
                                        >
                                            {showPasswordConfirmation ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                    <InputError message={errors.password_confirmation} />
                                </div>

                                <div className="flex items-center space-x-3">
                                    <Checkbox
                                        id="condition"
                                        checked={data.condition}
                                        onCheckedChange={(checked) => setData('condition', checked)}
                                        disabled={processing}
                                        tabIndex={8}
                                    />
                                    <Label htmlFor="condition">I agree to the terms and conditions</Label>
                                </div>
                                <InputError message={errors.condition} />

                                <Button
                                    type="submit"
                                    className="auth-signup-button mt-1 w-full cursor-pointer"
                                    tabIndex={9}
                                    disabled={processing || !data.condition}
                                >
                                    {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                                    Register
                                </Button>
                            </div>

                            <div className="text-muted-foreground text-center text-sm mt-2">
                                Already have an account?{' '}
                                <TextLink href={route('login')} tabIndex={10}>
                                    Sign in
                                </TextLink>
                            </div>
                        </form>
                    </AuthLayout>
                </div>
            </div>
        </div>
    );
}
