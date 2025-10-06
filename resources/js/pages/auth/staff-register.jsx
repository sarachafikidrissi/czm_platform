import { Head, Link, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import AuthLayout from '@/layouts/auth-layout';
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

export default function StaffRegister({ agencies = [] }) {
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

    const submit = (e) => {
        e.preventDefault();
        post(route('staff.register'));
    };

    return (
        <div className="flex h-[100svh] w-[100svw] place-content-center place-items-center auth-layout-bg ">
            <div className='w-full absolute top-0 left-0 auth-layout-overlay '></div>
            <div className="flex sm:flex-row flex-col sm:h-[90svh] h-fit sm:w:[80svw] w-[100vw] z-50 sm:relative sm:translate-x-[240px]">
                <div className="contenr-center sm:h-full h-[30%] sm:w-[50%] w-[100%]">
                    <img loading="lazy" src="/images/team.jpg" alt="" className="h-full w-full sm:rounded-s-4xl object-cover" />
                </div>
                <div className="sm:h-full sm:w-[50%] w-[100%]">
                    <AuthLayout
                        title="Créer un compte Staff"
                        className="h-full sm:rounded-e-4xl sm:rounded-s-[40px] sm:absolute sm:right-[35%] bg-[#fbf6f6]"
                        description="Saisissez vos coordonnées ci-dessous pour créer un compte staff."
                    >
                        <Head title="Staff Registration" />
                        <form onSubmit={submit} className="space-y-2">
                            <div>
                                <Label htmlFor="name">Full Name</Label>
                                <Input
                                    id="name"
                                    type="text"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    required
                                />
                                {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
                            </div>

                            <div>
                                <Label htmlFor="email">Email Address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    required
                                />
                                {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
                            </div>

                            <div>
                                <Label htmlFor="phone">Phone Number</Label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    value={data.phone}
                                    onChange={(e) => setData('phone', e.target.value)}
                                    required
                                />
                                {errors.phone && <p className="text-red-500 text-sm">{errors.phone}</p>}
                            </div>

                            <div>
                                <Label htmlFor="role">Role</Label>
                                <Select value={data.role} onValueChange={(value) => setData('role', value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select your role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="admin">Admin</SelectItem>
                                        <SelectItem value="manager">Manager</SelectItem>
                                        <SelectItem value="matchmaker">Matchmaker</SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.role && <p className="text-red-500 text-sm">{errors.role}</p>}
                            </div>

                            {(data.role === 'manager' || data.role === 'matchmaker') && (
                                <div>
                                    <Label htmlFor="agency">Agency</Label>
                                    <Select value={data.agency} onValueChange={(v) => setData('agency', v)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select your agency" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {agencies.map((agency) => (
                                                <SelectItem key={agency.id} value={agency.name}>{agency.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.agency && <p className="text-red-500 text-sm">{errors.agency}</p>}
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={data.password}
                                        onChange={(e) => setData('password', e.target.value)}
                                        required
                                    />
                                    <button type="button" className="absolute inset-y-0 right-3 flex items-center text-neutral-500" onClick={() => setShowPassword((v) => !v)}>
                                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                    </button>
                                </div>
                                {errors.password && <p className="text-red-500 text-sm">{errors.password}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password_confirmation">Confirm Password</Label>
                                <div className="relative">
                                    <Input
                                        id="password_confirmation"
                                        type={showPasswordConfirmation ? 'text' : 'password'}
                                        value={data.password_confirmation}
                                        onChange={(e) => setData('password_confirmation', e.target.value)}
                                        required
                                    />
                                    <button type="button" className="absolute inset-y-0 right-3 flex items-center text-neutral-500" onClick={() => setShowPasswordConfirmation((v) => !v)}>
                                        {showPasswordConfirmation ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                    </button>
                                </div>
                                {errors.password_confirmation && <p className="text-red-500 text-sm">{errors.password_confirmation}</p>}
                            </div>

                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="condition"
                                    checked={data.condition}
                                    onCheckedChange={(checked) => setData('condition', checked)}
                                />
                                <Label htmlFor="condition" className="text-sm">
                                    I agree to the terms and conditions
                                </Label>
                            </div>
                            {errors.condition && <p className="text-red-500 text-sm">{errors.condition}</p>}

                            <Button type="submit" className="w-full" disabled={processing}>
                                {processing ? 'Registering...' : 'Register'}
                            </Button>
                        </form>
                        <div className="mt-6 text-center">
                            <p className="text-sm text-gray-600">
                                Already have an account?{' '}
                                <Link href={route('login')} className="font-medium text-indigo-600 hover:text-indigo-500">
                                    Sign in
                                </Link>
                            </p>
                        </div>
                    </AuthLayout>
                </div>
            </div>
        </div>
    );
}
