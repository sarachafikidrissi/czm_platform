import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import AuthLayout from '@/layouts/auth-layout';

export default function Register() {
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        phone: '',
        gender: '',
        country: '',
        city: '',
        condition: false,
        password: '',
        password_confirmation: '',
    });

    const submit = (e) => {
        e.preventDefault();
        if (!termsAccepted) {
            alert('Please accept the terms and conditions to continue.');
            return;
        }
        setData('condition', termsAccepted);
        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <AuthLayout title="Create an account" description="Enter your details below to create your account">
            <Head title="Register" />
            <form className="flex flex-col gap-6" onSubmit={submit}>
                <div className="grid gap-6">
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
                        <InputError message={errors.name} className="mt-2" />
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
                            placeholder="+1 (555) 123-4567"
                        />
                        <InputError message={errors.phone} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="gender">Gender</Label>
                        <Select value={data.gender} onValueChange={(value) => setData('gender', value)} disabled={processing}>
                            <SelectTrigger tabIndex={4}>
                                <SelectValue placeholder="Select your gender" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="male">Male</SelectItem>
                                <SelectItem value="female">Female</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                                <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                            </SelectContent>
                        </Select>
                        <InputError message={errors.gender} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="country">Country</Label>
                        <Input
                            id="country"
                            type="text"
                            required
                            tabIndex={5}
                            autoComplete="country"
                            value={data.country}
                            onChange={(e) => setData('country', e.target.value)}
                            disabled={processing}
                            placeholder="Enter your country"
                        />
                        <InputError message={errors.country} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="city">City</Label>
                        <Input
                            id="city"
                            type="text"
                            required
                            tabIndex={6}
                            autoComplete="address-level2"
                            value={data.city}
                            onChange={(e) => setData('city', e.target.value)}
                            disabled={processing}
                            placeholder="Enter your city"
                        />
                        <InputError message={errors.city} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="password">Password</Label>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                required
                                tabIndex={7}
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
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowPassword(!showPassword)}
                                disabled={processing}
                            >
                                {showPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                ) : (
                                    <Eye className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                        <InputError message={errors.password} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="password_confirmation">Confirm Password</Label>
                        <div className="relative">
                            <Input
                                id="password_confirmation"
                                type={showPasswordConfirmation ? "text" : "password"}
                                required
                                tabIndex={8}
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
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowPasswordConfirmation(!showPasswordConfirmation)}
                                disabled={processing}
                            >
                                {showPasswordConfirmation ? (
                                    <EyeOff className="h-4 w-4" />
                                ) : (
                                    <Eye className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                        <InputError message={errors.password_confirmation} />
                    </div>

                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="terms"
                            checked={termsAccepted}
                            onCheckedChange={setTermsAccepted}
                            disabled={processing}
                        />
                        <Label htmlFor="terms" className="text-sm font-normal">
                            I agree to the{' '}
                            <Dialog>
                                <DialogTrigger asChild>
                                    <button
                                        type="button"
                                        className="text-primary underline hover:no-underline"
                                        disabled={processing}
                                    >
                                        Terms and Conditions
                                    </button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                    <DialogHeader>
                                        <DialogTitle>Terms and Conditions</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4 text-sm">
                                        <div>
                                            <h3 className="font-semibold mb-2">1. Acceptance of Terms</h3>
                                            <p>
                                                By accessing and using this website, you accept and agree to be bound by the terms and provision of this agreement.
                                            </p>
                                        </div>
                                        
                                        <div>
                                            <h3 className="font-semibold mb-2">2. Use License</h3>
                                            <p>
                                                Permission is granted to temporarily download one copy of the materials on this website for personal, non-commercial transitory viewing only.
                                            </p>
                                        </div>
                                        
                                        <div>
                                            <h3 className="font-semibold mb-2">3. Privacy Policy</h3>
                                            <p>
                                                Your privacy is important to us. We collect and use your personal information in accordance with our Privacy Policy.
                                            </p>
                                        </div>
                                        
                                        <div>
                                            <h3 className="font-semibold mb-2">4. User Accounts</h3>
                                            <p>
                                                You are responsible for maintaining the confidentiality of your account and password and for restricting access to your computer.
                                            </p>
                                        </div>
                                        
                                        <div>
                                            <h3 className="font-semibold mb-2">5. Prohibited Uses</h3>
                                            <p>
                                                You may not use our website for any unlawful purpose or to solicit others to perform unlawful acts.
                                            </p>
                                        </div>
                                        
                                        <div>
                                            <h3 className="font-semibold mb-2">6. Content</h3>
                                            <p>
                                                Our website allows you to post, link, store, share and otherwise make available certain information, text, graphics, videos, or other material.
                                            </p>
                                        </div>
                                        
                                        <div>
                                            <h3 className="font-semibold mb-2">7. Termination</h3>
                                            <p>
                                                We may terminate or suspend your account and bar access to the website immediately, without prior notice or liability, under our sole discretion.
                                            </p>
                                        </div>
                                        
                                        <div>
                                            <h3 className="font-semibold mb-2">8. Disclaimer</h3>
                                            <p>
                                                The information on this website is provided on an "as is" basis. To the fullest extent permitted by law, this Company excludes all representations, warranties, conditions and terms.
                                            </p>
                                        </div>
                                        
                                        <div>
                                            <h3 className="font-semibold mb-2">9. Governing Law</h3>
                                            <p>
                                                These terms and conditions are governed by and construed in accordance with the laws and you irrevocably submit to the exclusive jurisdiction of the courts in that state or location.
                                            </p>
                                        </div>
                                        
                                        <div>
                                            <h3 className="font-semibold mb-2">10. Contact Information</h3>
                                            <p>
                                                If you have any questions about these Terms and Conditions, please contact us at support@example.com.
                                            </p>
                                        </div>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </Label>
                    </div>
                    <InputError message={errors.condition} />

                    <Button type="submit" className="mt-2 w-full" tabIndex={9} disabled={processing || !termsAccepted}>
                        {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                        Create account
                    </Button>
                </div>

                <div className="text-muted-foreground text-center text-sm">
                    Already have an account?{' '}
                    <TextLink href={route('login')} tabIndex={6}>
                        Log in
                    </TextLink>
                </div>
            </form>
        </AuthLayout>
    );
}
