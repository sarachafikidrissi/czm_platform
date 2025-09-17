import { Head, useForm } from '@inertiajs/react';
import { Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AuthLayout from '@/layouts/auth-layout';

export default function Register() {
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [countries, setCountries] = useState([]);
    const [countryCodeToCities, setCountryCodeToCities] = useState({});
    const [selectedCountryCode, setSelectedCountryCode] = useState('');
    const [loadingCountries, setLoadingCountries] = useState(false);
    const [errorCountries, setErrorCountries] = useState('');

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

    // Fetch countries and cities
    useEffect(() => {
        let isMounted = true;
        const fetchCountries = async () => {
            try {
                setLoadingCountries(true);
                setErrorCountries('');
                const response = await fetch('https://countriesnow.space/api/v0.1/countries');
                if (!response.ok) throw new Error('Failed to fetch countries');
                const json = await response.json();
                const list = Array.isArray(json?.data) ? json.data : [];
                if (!isMounted) return;
                // Map: keep iso2 and cities; localize country display to French via Intl.DisplayNames
                const regionNamesFr = new Intl.DisplayNames(['fr'], { type: 'region' });
                const normalized = list
                    .filter((item) => item?.iso2)
                    .map((item) => ({
                        iso2: item.iso2,
                        iso3: item.iso3,
                        englishName: item.country,
                        frenchName: regionNamesFr.of(item.iso2) || item.country,
                        cities: Array.isArray(item.cities) ? item.cities : [],
                    }))
                    .sort((a, b) => a.frenchName.localeCompare(b.frenchName, 'fr'));

                const codeToCities = normalized.reduce((acc, item) => {
                    acc[item.iso2] = item.cities;
                    return acc;
                }, {});

                setCountries(normalized);
                setCountryCodeToCities(codeToCities);
            } catch (err) {
                if (!isMounted) return;
                setErrorCountries('Impossible de charger la liste des pays.');
            } finally {
                if (isMounted) setLoadingCountries(false);
            }
        };
        fetchCountries();
        return () => {
            isMounted = false;
        };
    }, []);

    const availableCities = useMemo(() => {
        if (!selectedCountryCode) return [];
        const list = countryCodeToCities[selectedCountryCode] || [];
        return list;
    }, [selectedCountryCode, countryCodeToCities]);

    const submit = (e) => {
        e.preventDefault();
        if (!termsAccepted) {
            alert('Please accept the terms and conditions to continue.');
            return;
        }
        // setData('condition', termsAccepted);
        data.condition = termsAccepted;
        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <div className="flex h-[100svh] w-[100svw] place-content-center place-items-center">
            <div className="flex h-[90svh] w-[90svw]">
                {/* left side  */}
                <div className="contenr-center h-full w-[50%]">
                    <img src="./images/register.avif" alt="" className="h-full w-full rounded-s-4xl object-cover" />
                </div>
                {/* right side */}
                <div className="h-full w-[50%] ">
                    <AuthLayout
                        title="Créer un compte"
                        className="rounded-e-4xl bg-[#fbf6f6] h-full"
                        description="Saisissez vos coordonnées ci-dessous pour créer votre compte."
                    >
                        <Head title="Register" />

                        <form className=" " onSubmit={submit}>
                            <div className="flex flex-col gap-y-2">
                                <div className="flex flex-col gap-y-2">
                                    <Label htmlFor="name" className="text-label text-[13px]">
                                        Identifiant
                                    </Label>
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
                                        placeholder="Entrer votre identifiant ex:hajar05"
                                    />
                                    <InputError message={errors.name} className="mt-2" />
                                </div>

                                <div className="">
                                    <Label className="text-label text-[13px]" htmlFor="email">
                                        Adress Email
                                    </Label>
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

                                <div className="">
                                    <Label className="text-label text-[13px]" htmlFor="phone">
                                        Numéro de téléphone
                                    </Label>
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
                                    <Label className="text-label text-[13px]" htmlFor="gender">
                                        Sexe
                                    </Label>
                                    <Select value={data.gender} onValueChange={(value) => setData('gender', value)} disabled={processing}>
                                        <SelectTrigger tabIndex={4}>
                                            <SelectValue placeholder="Choisur votre sexe" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="male">Homme</SelectItem>
                                            <SelectItem value="female">Femme</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.gender} />
                                </div>
                                <div className="flex w-full gap-x-4">
                                    <div className="grid w-[50%] gap-2">
                                        <Label className="text-label text-[13px]" htmlFor="country">
                                            Pays
                                        </Label>
                                        <Select
                                            value={selectedCountryCode}
                                            onValueChange={(value) => {
                                                setSelectedCountryCode(value);
                                                const selected = countries.find((c) => c.iso2 === value);
                                                setData('country', selected ? selected.frenchName : '');
                                                setData('city', '');
                                            }}
                                            disabled={processing || loadingCountries}
                                        >
                                            <SelectTrigger tabIndex={5}>
                                                <SelectValue placeholder={loadingCountries ? 'Chargement des pays…' : 'Sélectionnez votre pays'} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {countries.map((c) => (
                                                    <SelectItem key={c.iso2} value={c.iso2}>
                                                        {c.frenchName}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {errorCountries && <p className="text-destructive text-sm">{errorCountries}</p>}
                                        <InputError message={errors.country} />
                                    </div>

                                    <div className="grid w-[50%] gap-2">
                                        <Label className="text-label text-[13px]" htmlFor="city">
                                            Ville
                                        </Label>
                                        <Select
                                            value={data.city}
                                            onValueChange={(value) => setData('city', value)}
                                            disabled={processing || !selectedCountryCode || availableCities.length === 0}
                                        >
                                            <SelectTrigger tabIndex={6}>
                                                <SelectValue
                                                    placeholder={
                                                        !selectedCountryCode
                                                            ? 'Sélectionnez d’abord un pays'
                                                            : availableCities.length
                                                              ? 'Sélectionnez votre ville'
                                                              : 'Aucune ville disponible'
                                                    }
                                                />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availableCities.map((city) => (
                                                    <SelectItem key={city} value={city}>
                                                        {city}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <InputError message={errors.city} />
                                    </div>
                                </div>
                                <div className='grid grid-cols-2 gap-x-4'>
                                    <div className="grid gap-2">
                                        <Label className="text-label text-[13px]" htmlFor="password">
                                            Mot de passe
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                id="password"
                                                type={showPassword ? 'text' : 'password'}
                                                required
                                                tabIndex={7}
                                                autoComplete="new-password"
                                                value={data.password}
                                                onChange={(e) => setData('password', e.target.value)}
                                                disabled={processing}
                                                placeholder="Créer un mot de passe fort
"
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
                                        <Label className="text-label text-[13px]" htmlFor="password_confirmation">
                                            Confirmer Mot de passe
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                id="password_confirmation"
                                                type={showPasswordConfirmation ? 'text' : 'password'}
                                                required
                                                tabIndex={8}
                                                autoComplete="new-password"
                                                value={data.password_confirmation}
                                                onChange={(e) => setData('password_confirmation', e.target.value)}
                                                disabled={processing}
                                                placeholder="Confirmer Mot de passe"
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
                                </div>

                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="terms"
                                        checked={termsAccepted}
                                        onCheckedChange={() => setTermsAccepted(!termsAccepted)}
                                        disabled={processing}
                                    />
                                    <Label className="text-label text-[13px]" htmlFor="terms">
                                        J'accepte les{' '}
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <button type="button" className="text-primary underline hover:no-underline" disabled={processing}>
                                                    Conditions générales d'utilisation
                                                </button>
                                            </DialogTrigger>
                                            <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
                                                <DialogHeader>
                                                    <DialogTitle>Terms and Conditions</DialogTitle>
                                                </DialogHeader>
                                                <div className="space-y-4 text-sm">
                                                    <div>
                                                        <h3 className="mb-2 font-semibold">1. Acceptance of Terms</h3>
                                                        <p>
                                                            By accessing and using this website, you accept and agree to be bound by the terms and
                                                            provision of this agreement.
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <h3 className="mb-2 font-semibold">2. Use License</h3>
                                                        <p>
                                                            Permission is granted to temporarily download one copy of the materials on this website
                                                            for personal, non-commercial transitory viewing only.
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <h3 className="mb-2 font-semibold">3. Privacy Policy</h3>
                                                        <p>
                                                            Your privacy is important to us. We collect and use your personal information in
                                                            accordance with our Privacy Policy.
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <h3 className="mb-2 font-semibold">4. User Accounts</h3>
                                                        <p>
                                                            You are responsible for maintaining the confidentiality of your account and password and
                                                            for restricting access to your computer.
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <h3 className="mb-2 font-semibold">5. Prohibited Uses</h3>
                                                        <p>
                                                            You may not use our website for any unlawful purpose or to solicit others to perform
                                                            unlawful acts.
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <h3 className="mb-2 font-semibold">6. Content</h3>
                                                        <p>
                                                            Our website allows you to post, link, store, share and otherwise make available certain
                                                            information, text, graphics, videos, or other material.
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <h3 className="mb-2 font-semibold">7. Termination</h3>
                                                        <p>
                                                            We may terminate or suspend your account and bar access to the website immediately,
                                                            without prior notice or liability, under our sole discretion.
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <h3 className="mb-2 font-semibold">8. Disclaimer</h3>
                                                        <p>
                                                            The information on this website is provided on an "as is" basis. To the fullest extent
                                                            permitted by law, this Company excludes all representations, warranties, conditions and
                                                            terms.
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <h3 className="mb-2 font-semibold">9. Governing Law</h3>
                                                        <p>
                                                            These terms and conditions are governed by and construed in accordance with the laws and
                                                            you irrevocably submit to the exclusive jurisdiction of the courts in that state or
                                                            location.
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <h3 className="mb-2 font-semibold">10. Contact Information</h3>
                                                        <p>
                                                            If you have any questions about these Terms and Conditions, please contact us at
                                                            support@example.com.
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
                </div>
            </div>
        </div>
    );
}
