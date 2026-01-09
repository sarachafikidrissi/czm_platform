import { Head, useForm } from '@inertiajs/react';
import { Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import PhoneInput, { getCountries, getCountryCallingCode } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { isValidPhoneNumber } from 'react-phone-number-input';
import enLocale from 'react-phone-number-input/locale/en.json';
import frLocale from 'react-phone-number-input/locale/fr.json';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';

import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import AuthLayout from '@/layouts/auth-layout';

// Helper function to get flag emoji from country code
function getFlagEmoji(countryCode) {
    if (!countryCode) return '';
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
}

// Custom Country Select Component with flags
function CustomCountrySelect({ value, onChange, labels, disabled, ...rest }) {
    const { i18n } = useTranslation();
    const phoneCountries = getCountries();
    
    // Get country name based on current language
    const getLocalizedCountryName = (countryCode) => {
        try {
            if (i18n.language === 'fr') {
                return frLocale[countryCode] || labels?.[countryCode] || enLocale[countryCode] || countryCode;
            } else if (i18n.language === 'ar') {
                // For Arabic, we'll use English names as fallback since Arabic names might not be available
                return labels?.[countryCode] || enLocale[countryCode] || countryCode;
            }
            return enLocale[countryCode] || labels?.[countryCode] || countryCode;
        } catch (e) {
            return labels?.[countryCode] || countryCode;
        }
    };

    return (
        <Select value={value || ''} onValueChange={onChange} disabled={disabled} {...rest}>
            <SelectTrigger className="border-[#096626] border-2 w-auto min-w-[140px] h-full">
                <div className="flex items-center gap-2">
                    {value && (
                        <span className="text-xl flex-shrink-0">{getFlagEmoji(value)}</span>
                    )}
                    <SelectValue placeholder="Country" />
                </div>
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
                {phoneCountries.map((country) => (
                    <SelectItem key={country} value={country}>
                        <div className="flex items-center gap-2 w-full">
                            {/* <span className="text-xl flex-shrink-0">{getFlagEmoji(country)}</span> */}
                            <span className="flex-1">{getLocalizedCountryName(country)}</span>
                            {/* <span className="text-muted-foreground text-sm">
                                +{getCountryCallingCode(country)}
                            </span> */}
                        </div>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

export default function Register() {
    const { showToast } = useToast();
    const { t } = useTranslation();
    const containerRef = useRef(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [countries, setCountries] = useState([]);
    const [countryCodeToCities, setCountryCodeToCities] = useState({});
    const [selectedCountryCode, setSelectedCountryCode] = useState('');
    const [loadingCountries, setLoadingCountries] = useState(false);
    const [errorCountries, setErrorCountries] = useState('');
    const [phoneError, setPhoneError] = useState('');

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
                const response = await axios.get('/locations');
                if (!isMounted) return;
                
                const countriesData = Array.isArray(response.data?.countries) ? response.data.countries : [];
                
                // Map: keep iso2 and cities; use existing frenchName from JSON
                const normalized = countriesData
                    .filter((item) => item?.iso2)
                    .map((item) => ({
                        iso2: item.iso2,
                        iso3: item.iso3,
                        englishName: item.name,
                        frenchName: item.frenchName || item.name,
                        cities: Array.isArray(item.cities) ? item.cities : [],
                    }))
                    .sort((a, b) => a.frenchName.localeCompare(b.frenchName, 'fr'));

                const codeToCities = normalized.reduce((acc, item) => {
                    acc[item.iso2] = item.cities;
                    return acc;
                }, {});

                if (isMounted) {
                    setCountries(normalized);
                    setCountryCodeToCities(codeToCities);
                }
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
        
        // Deduplicate cities using Set and sort them
        const uniqueCities = Array.from(new Set(list))
            .filter(city => city && city.trim() !== '') // Remove empty strings
            .sort((a, b) => a.localeCompare(b, 'fr'));
        
        // Convert to format expected by SearchableSelect
        return uniqueCities.map(city => ({
            value: city,
            label: city,
        }));
    }, [selectedCountryCode, countryCodeToCities]);

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

    const handlePhoneChange = (value) => {
        setPhoneError('');
        if (value && !isValidPhoneNumber(value)) {
            setPhoneError('Please enter a valid phone number');
        } else if (value && /[a-zA-Z]/.test(value)) {
            setPhoneError('Phone number must not contain text');
        } else {
            setPhoneError('');
        }
        setData('phone', value || '');
    };

    const submit = (e) => {
        e.preventDefault();
        if (!termsAccepted) {
            showToast('Terms Required', 'Please accept the terms and conditions to continue.', 'warning');
            return;
        }
        
        // Validate phone number
        if (!data.phone) {
            setPhoneError('Phone number is required');
            return;
        }
        if (!isValidPhoneNumber(data.phone)) {
            setPhoneError('Please enter a valid phone number');
            return;
        }
        if (/[a-zA-Z]/.test(data.phone)) {
            setPhoneError('Phone number must not contain text');
            return;
        }
        
        // setData('condition', termsAccepted);
        data.condition = termsAccepted;
        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <div ref={containerRef} className="auth-layout-bg  flex min-h-screen flex-col relative">
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
                            title="Créer un compte"
                            className="bg-transparent p-0"
                            description="Saisissez vos coordonnées ci-dessous pour créer votre compte."
                        >
                            <Head title="Register" />
                            <form className=" " onSubmit={submit}>
                            <div className="flex flex-col gap-y-1.5">
                                <div className="flex  flex-col gap-y-1">
                                    <Label htmlFor="name" >
                                        Identifiant
                                    </Label>
                                    <p className="text-sm font-medium leading-none mt-0.5" dir="rtl">المعرف</p>
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
                                        className="border-[#096626] border-2"
                                    />
                                    <InputError message={errors.name} className="mt-0.5" />
                </div>

                                <div className="">
                                    <Label  htmlFor="email">
                                        Adress Email
                                    </Label>
                                    <p className="text-sm font-medium leading-none mt-0.5" dir="rtl">عنوان البريد الإلكتروني</p>
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
                                        className="border-[#096626] border-2"
                                    />
                                    <InputError message={errors.email} />
                                </div>

                                <div className="">
                                    <Label  htmlFor="phone">
                                        Numéro de téléphone
                                    </Label>
                                    <p className="text-sm font-medium leading-none mt-0.5" dir="rtl">رقم الهاتف</p>
                                    <p className="text-xs text-muted-foreground mb-2">
                                        {t('auth.phoneWarning')}
                                    </p>
                                    <div className="phone-input-wrapper">
                                        <PhoneInput
                                            international
                                            defaultCountry="MA"
                                            value={data.phone}
                                            onChange={handlePhoneChange}
                                            disabled={processing}
                                            className="phone-input-custom"
                                            countrySelectComponent={CustomCountrySelect}
                                            inputProps={{
                                                className: "border-[#096626] border-2 rounded-md px-3 py-2 w-full",
                                                tabIndex: 3,
                                                autoComplete: "tel"
                                            }}
                                        />
                                    </div>
                                    <InputError message={phoneError || errors.phone} />
                                </div>

                                <div className="grid gap-2">
                                    <Label  htmlFor="gender">
                                        Sexe
                                    </Label>
                                    <p className="text-sm font-medium leading-none mt-0.5" dir="rtl">الجنس</p>
                                    <Select value={data.gender} onValueChange={(value) => setData('gender', value)} disabled={processing}>
                                        <SelectTrigger tabIndex={4} className="border-[#096626] border-2">
                                            <SelectValue placeholder="Choisur votre sexe" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="male">Homme</SelectItem>
                                            <SelectItem value="female">Femme</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.gender} />
                                </div>
                                <div className="flex flex-col w-full gap-y-2">
                                    <div className="grid w-full gap-2 truncate">
                                        <Label  htmlFor="country">
                                            Pays
                                        </Label>
                                        <p className="text-sm font-medium leading-none mt-0.5" dir="rtl">البلد</p>
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
                                            <SelectTrigger tabIndex={5} className="border-[#096626] border-2">
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

                                    <div className="grid w-full gap-2">
                                        <Label  htmlFor="city">
                                            Ville
                                        </Label>
                                        <p className="text-sm font-medium leading-none mt-0.5" dir="rtl">المدينة</p>
                                        {!selectedCountryCode ? (
                                            <div className="rounded-lg border border-border px-4 py-3 text-sm text-muted-foreground">
                                                Sélectionnez d'abord un pays
                                            </div>
                                        ) : availableCities.length === 0 ? (
                                            <div className="rounded-lg border border-border px-4 py-3 text-sm text-muted-foreground">
                                                Aucune ville disponible
                                            </div>
                                        ) : (
                                            <SearchableSelect
                                                options={availableCities}
                                                value={data.city}
                                                onValueChange={(value) => setData('city', value)}
                                                placeholder="Sélectionnez votre ville"
                                                searchPlaceholder="Rechercher une ville..."
                                                emptyMessage="Aucune ville trouvée"
                                                disabled={processing || !selectedCountryCode}
                                            />
                                        )}
                                        <InputError message={errors.city} />
                                    </div>
                                </div>
                                <div className="flex flex-col w-full gap-y-2">
                                    <div className="grid gap-2">
                                        <Label  htmlFor="password">
                                            Mot de passe
                                        </Label>
                                        <p className="text-sm font-medium leading-none mt-0.5" dir="rtl">كلمة المرور</p>
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
                                                className="border-[#096626] border-2"
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
                                        <Label  htmlFor="password_confirmation">
                                            Confirmer Mot de passe
                                        </Label>
                                        <p className="text-sm font-medium leading-none mt-0.5" dir="rtl">تأكيد كلمة المرور</p>
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
                                                className="border-[#096626] border-2"
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
                                        className="border-[#096626] border-2 w-6 h-6"
                                    />
                                    <Label  htmlFor="terms">
                                        J'accepte les{' '}
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <button type="button" className="text-primary underline hover:no-underline" disabled={processing}>
                                                    Conditions générales d'utilisation
                                                </button>
                                            </DialogTrigger>
                                            <DialogContent className="max-h-[80vh] w-[80vw] !max-w-none overflow-y-auto">
                                                <DialogHeader>
                                                    <DialogTitle>Conditions Générales d'Utilisation de Centre Zawaj Maroc</DialogTitle>
                                                </DialogHeader>
                                                <div className="space-y-4 text-sm">
                                                    <div>
                                                        <h3 className="mb-2 font-semibold">1. Introduction</h3>
                                                        <p>
                                                            Les présentes Conditions Générales d'Utilisation ("Conditions") régissent l'utilisation du
                                                            site web et des services fournis par Centre Zawaj Maroc ("CZM", "le Centre", "nous",
                                                            "notre") aux utilisateurs ("vous", "l'utilisateur"), qu'ils soient clients ou visiteurs.
                                                            En accédant à notre site ou en utilisant nos services, vous acceptez ces Conditions. Si
                                                            vous n'acceptez pas ces Conditions, vous devez immédiatement cesser d'utiliser notre site
                                                            et nos services.
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <h3 className="mb-2 font-semibold">2. Services Proposés</h3>
                                                        <p>
                                                            Centre Zawaj Maroc propose plusieurs services, notamment :<br />
                                                            • Coaching matrimonial spécialisé : accompagnement personnalisé et orientation prénuptiale
                                                            pour les célibataires en quête de conseils et fiancés souhaitant se préparer au mariage.
                                                            <br />
                                                            • Matchmaking personnalisé : service de mise en relation hautement personnalisé et
                                                            confidentiel pour trouver un partenaire compatible.
                                                            <br />
                                                            • Conseil conjugal post-mariage : assistance pour la résolution de conflits et
                                                            l'épanouissement du couple.
                                                            <br />
                                                            • Ateliers et séminaires : formations sur le mariage, la communication et la gestion de la
                                                            vie de couple.
                                                            <br />
                                                            <br />
                                                            Notre mission est de promouvoir des relations matrimoniales saines et durables.
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <h3 className="mb-2 font-semibold">3. Conditions d'Utilisation</h3>
                                                        <p>
                                                            • L'utilisation du site et des services est réservée aux personnes majeures (18 ans et
                                                            plus).
                                                            <br />
                                                            • Toute utilisation à des fins illégales ou contraires à l'éthique du Centre est
                                                            strictement interdite.
                                                            <br />• Il est interdit d'utiliser le site pour diffamer, harceler ou porter atteinte à la
                                                            réputation du Centre ou d'un tiers.
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <h3 className="mb-2 font-semibold">4. Comptes Utilisateurs</h3>
                                                        <p>
                                                            • La création d'un compte utilisateur peut être nécessaire pour accéder à certains
                                                            services.
                                                            <br />
                                                            • Vous êtes responsable de la confidentialité de vos identifiants et de l'utilisation de
                                                            votre compte.
                                                            <br />• Toute utilisation frauduleuse ou non autorisée de votre compte doit être signalée
                                                            immédiatement au Centre.
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <h3 className="mb-2 font-semibold">5. Propriété Intellectuelle</h3>
                                                        <p>
                                                            • Tout le contenu du site (textes, images, logos, vidéos) est protégé par les lois sur la
                                                            propriété intellectuelle.
                                                            <br />• Toute reproduction, modification ou diffusion sans autorisation écrite du Centre
                                                            est interdite.
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <h3 className="mb-2 font-semibold">6. Protection des Données et Confidentialité</h3>
                                                        <p>
                                                            • CZM s'engage à protéger vos données personnelles conformément à notre politique de
                                                            confidentialité.
                                                            <br />
                                                            • Les informations collectées sont utilisées uniquement pour fournir et améliorer nos
                                                            services.
                                                            <br />• Vous avez le droit d'accéder, de modifier ou de supprimer vos données personnelles
                                                            sur simple demande.
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <h3 className="mb-2 font-semibold">7. Utilisation des Cookies</h3>
                                                        <p>
                                                            • Notre site utilise des cookies pour améliorer l'expérience utilisateur.
                                                            <br />• Vous pouvez désactiver les cookies via les paramètres de votre navigateur, mais
                                                            certaines fonctionnalités du site pourraient être affectées.
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <h3 className="mb-2 font-semibold">8. Modification des Conditions</h3>
                                                        <p>
                                                            • Le Centre se réserve le droit de modifier ces Conditions à tout moment.
                                                            <br />• Toute modification sera publiée sur le site et votre utilisation continue du site
                                                            après publication constitue une acceptation des nouvelles Conditions.
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <h3 className="mb-2 font-semibold">9. Limitation de Responsabilité</h3>
                                                        <p>
                                                            • CZM ne saurait être tenu responsable des dommages directs ou indirects résultant de
                                                            l'utilisation du site ou des services.
                                                            <br />• Nous nous réservons le droit de suspendre ou de résilier l'accès au site à notre
                                                            seule discrétion.
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <h3 className="mb-2 font-semibold">10. Résiliation</h3>
                                                        <p>
                                                            • En cas de violation de ces Conditions, CZM se réserve le droit de suspendre ou de
                                                            résilier votre accès au site et aux services.
                                                            <br />• Aucune indemnité ne pourra être réclamée en cas de résiliation pour non-respect
                                                            des Conditions.
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <h3 className="mb-2 font-semibold">11. Conformité Légale</h3>
                                                        <p>
                                                            Vous acceptez d'utiliser notre site en conformité avec les lois marocaines et
                                                            internationales applicables.
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <h3 className="mb-2 font-semibold">12. Indemnisation</h3>
                                                        <p>
                                                            Vous acceptez d'indemniser CZM en cas de réclamation, litige ou dommage résultant de votre
                                                            utilisation du site ou de la violation des présentes Conditions.
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <h3 className="mb-2 font-semibold">13. Règlement des Litiges</h3>
                                                        <p>
                                                            Tout litige relatif à ces Conditions sera soumis à la juridiction exclusive des tribunaux
                                                            marocains.
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <h3 className="mb-2 font-semibold">14. Interdiction des Contenus Inappropriés</h3>
                                                        <p>
                                                            Les utilisateurs s'engagent à ne pas publier, transmettre ou partager des contenus
                                                            offensants, diffamatoires, injurieux ou incitant à la haine. Le Centre se réserve le droit
                                                            de supprimer tout contenu inapproprié et de suspendre ou résilier le compte de
                                                            l'utilisateur concerné.
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <h3 className="mb-2 font-semibold">15. Politique de Remboursement et d'Annulation</h3>
                                                        <p>
                                                            • Aucun remboursement ne sera effectué après la prestation du service.
                                                            <br />
                                                            • Toute demande d'annulation doit être soumise au minimum 48 heures avant la date prévue
                                                            du service.
                                                            <br />• Les remboursements ne sont possibles qu'en cas d'erreur avérée de CZM ou
                                                            d'impossibilité avérée de fournir le service.
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <h3 className="mb-2 font-semibold">16. Engagement des Utilisateurs</h3>
                                                        <p>
                                                            Les utilisateurs s'engagent à fournir des informations exactes et véridiques lors de leur
                                                            inscription et dans leurs interactions. Tout manquement pourra entraîner la suspension ou
                                                            la suppression du compte.
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <h3 className="mb-2 font-semibold">17. Responsabilité des Utilisateurs</h3>
                                                        <p>
                                                            CZM met en relation des personnes mais ne garantit pas la compatibilité ni la réussite des
                                                            relations établies. L'utilisateur est seul responsable de ses interactions et rencontres
                                                            avec d'autres membres.
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <h3 className="mb-2 font-semibold">18. Droit de Refus d'Inscription et de Suspension</h3>
                                                        <p>
                                                            CZM se réserve le droit de refuser l'inscription d'un utilisateur sans obligation de
                                                            justification et de suspendre ou supprimer un compte en cas de non-respect des présentes
                                                            conditions.
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <h3 className="mb-2 font-semibold">19. Durée et Résiliation du Contrat</h3>
                                                        <p>
                                                            L'utilisation du site et des services est valable pour une durée indéterminée. Un
                                                            utilisateur peut demander la fermeture de son compte à tout moment.
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <h3 className="mb-2 font-semibold">20. Sécurité et Usage des Données Personnelles</h3>
                                                        <p>
                                                            Les informations personnelles des utilisateurs ne seront ni revendues ni partagées avec
                                                            des tiers sans consentement. CZM applique des mesures de sécurité pour protéger les
                                                            données contre toute intrusion ou fuite.
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <h3 className="mb-2 font-semibold">21. Sécurisation des Transactions</h3>
                                                        <p>
                                                            Toutes les transactions financières effectuées sur le site sont sécurisées par un
                                                            protocole de cryptage. CZM ne stocke pas les informations bancaires des utilisateurs.
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <h3 className="mb-2 font-semibold">
                                                            22. Conditions Complémentaires de Sécurité et d'Authenticité
                                                        </h3>
                                                        <p>
                                                            • Garantie de sérieux pour les femmes de moins de 26 ans : toute femme âgée de moins de 26
                                                            ans souhaitant s'inscrire doit fournir les coordonnées téléphoniques de l'un de ses
                                                            parents.
                                                            <br />
                                                            • Limitation du temps de rendez-vous avant l'officialisation (pour les hommes) : délai
                                                            limité à un mois maximum.
                                                            <br />
                                                            • Organisation des rendez-vous hors du Centre : tout rendez-vous doit se tenir dans un
                                                            lieu public choisi par la femme.
                                                            <br />• Obligation de justificatifs légaux pour l'inscription : présentation obligatoire
                                                            de la Carte d'Identité Nationale (CIN).
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <h3 className="mb-2 font-semibold">Contact</h3>
                                                        <p>
                                                            Pour toute question ou demande d'information :<br />
                                                            • Email : contact@czm.ma
                                                            <br />
                                                            • Adresse : 2MARS Casablanca. Maroc
                                                            <br />• Téléphone : +212 6 98 98 96 97
                                                        </p>
                                                    </div>
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    </Label>
                                </div>
                                <InputError message={errors.condition} />

                                <Button
                                    type="submit"
                                    className="auth-signup-button mt-1 w-full"
                                    tabIndex={9}
                                    disabled={processing || !termsAccepted}
                                >
                                    {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                                    Inscrivez-vous
                                </Button>
                            </div>

                            <div className="text-muted-foreground text-center text-sm mt-2">
                                Vous avez déjà un compte ?{' '}
                                <TextLink href={route('login')} tabIndex={6}>
                                    Se connecter
                                </TextLink>
                            </div>
                        </form>
                    </AuthLayout>
                    </div>
                </div>
            </div>
            
            {/* Large Screen Layout - original design */}
            <div className="hidden md:flex flex-1 relative items-center justify-center py-4 px-4">
                {/* Form Modal */}
                <div className="auth-form-modal relative z-10 bottom-0">
                    <Head title="Register" />
                    
                    {/* CZM Logo in Red Circle */}
                    {/* <div className="auth-logo-container">
                        <div className="auth-logo-ribbon">
                            <img src="/images/czm_Logo.png" alt="CZM Logo" />
                        </div>
                    </div> */}
                    
                    <AuthLayout
                        title="Créer un compte"
                        className="bg-transparent p-0"
                        description="Saisissez vos coordonnées ci-dessous pour créer votre compte."
                    >
                        <form className=" " onSubmit={submit}>
                            <div className="flex flex-col gap-y-1.5">
                                <div className="flex  flex-col gap-y-1">
                                    <Label htmlFor="name" >
                                        Identifiant
                                    </Label>
                                    <p className="text-sm font-medium leading-none mt-0.5" dir="rtl">المعرف</p>
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
                                        className="border-[#096626] border-2"
                                    />
                                    <InputError message={errors.name} className="mt-0.5" />
                                </div>

                                <div className="">
                                    <Label  htmlFor="email">
                                        Adress Email
                                    </Label>
                                    <p className="text-sm font-medium leading-none mt-0.5" dir="rtl">عنوان البريد الإلكتروني</p>
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
                                        className="border-[#096626] border-2"
                                    />
                                    <InputError message={errors.email} />
                                </div>

                                <div className="">
                                    <Label  htmlFor="phone">
                                        Numéro de téléphone
                                    </Label>
                                    <p className="text-sm font-medium leading-none mt-0.5" dir="rtl">رقم الهاتف</p>
                                    <p className="text-xs text-muted-foreground mb-2">
                                        {t('auth.phoneWarning')}
                                    </p>
                                    <div className="phone-input-wrapper">
                                        <PhoneInput
                                            international
                                            defaultCountry="MA"
                                            value={data.phone}
                                            onChange={handlePhoneChange}
                                            disabled={processing}
                                            className="phone-input-custom"
                                            countrySelectComponent={CustomCountrySelect}
                                            inputProps={{
                                                className: "border-[#096626] border-2 rounded-md px-3 py-2 w-full",
                                                tabIndex: 3,
                                                autoComplete: "tel"
                                            }}
                                        />
                                    </div>
                                    <InputError message={phoneError || errors.phone} />
                                </div>

                                <div className="grid gap-2">
                                    <Label  htmlFor="gender">
                                        Sexe
                                    </Label>
                                    <p className="text-sm font-medium leading-none mt-0.5" dir="rtl">الجنس</p>
                                    <Select value={data.gender} onValueChange={(value) => setData('gender', value)} disabled={processing}>
                                        <SelectTrigger tabIndex={4} className="border-[#096626] border-2">
                                            <SelectValue placeholder="Choisur votre sexe" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="male">Homme</SelectItem>
                                            <SelectItem value="female">Femme</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.gender} />
                                </div>
                                <div className="flex flex-col w-full gap-y-2">
                                    <div className="grid w-full gap-2 truncate">
                                        <Label  htmlFor="country">
                                            Pays
                                        </Label>
                                        <p className="text-sm font-medium leading-none mt-0.5" dir="rtl">البلد</p>
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
                                            <SelectTrigger tabIndex={5} className="border-[#096626] border-2">
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

                                    <div className="grid w-full gap-2">
                                        <Label  htmlFor="city">
                                            Ville
                                        </Label>
                                        <p className="text-sm font-medium leading-none mt-0.5" dir="rtl">المدينة</p>
                                        {!selectedCountryCode ? (
                                            <div className="rounded-lg border border-border px-4 py-3 text-sm text-muted-foreground">
                                                Sélectionnez d'abord un pays
                                            </div>
                                        ) : availableCities.length === 0 ? (
                                            <div className="rounded-lg border border-border px-4 py-3 text-sm text-muted-foreground">
                                                Aucune ville disponible
                                            </div>
                                        ) : (
                                            <SearchableSelect
                                                options={availableCities}
                                                value={data.city}
                                                onValueChange={(value) => setData('city', value)}
                                                placeholder="Sélectionnez votre ville"
                                                searchPlaceholder="Rechercher une ville..."
                                                emptyMessage="Aucune ville trouvée"
                                                disabled={processing || !selectedCountryCode}
                                            />
                                        )}
                                        <InputError message={errors.city} />
                                    </div>
                                </div>
                                <div className="flex flex-col w-full gap-y-2">
                                    <div className="grid gap-2">
                                        <Label  htmlFor="password">
                                            Mot de passe
                                        </Label>
                                        <p className="text-sm font-medium leading-none mt-0.5" dir="rtl">كلمة المرور</p>
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
                                                className="border-[#096626] border-2"
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
                                        <Label  htmlFor="password_confirmation">
                                            Confirmer Mot de passe
                                        </Label>
                                        <p className="text-sm font-medium leading-none mt-0.5" dir="rtl">تأكيد كلمة المرور</p>
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
                                                className="border-[#096626] border-2"
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
                                        className="border-[#096626] border-2 w-6 h-6"
                                    />
                                    <Label  htmlFor="terms">
                                        J'accepte les{' '}
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <button type="button" className="text-primary underline hover:no-underline" disabled={processing}>
                                                    Conditions générales d'utilisation
                                                </button>
                                            </DialogTrigger>
                                            <DialogContent className="max-h-[80vh] w-[80vw] !max-w-none overflow-y-auto">
                                                <DialogHeader>
                                                    <DialogTitle>Conditions Générales d'Utilisation de Centre Zawaj Maroc</DialogTitle>
                                                </DialogHeader>
                                                <div className="space-y-4 text-sm">
                                                    <div>
                                                        <h3 className="mb-2 font-semibold">1. Introduction</h3>
                                                        <p>
                                                            Les présentes Conditions Générales d'Utilisation ("Conditions") régissent l'utilisation du
                                                            site web et des services fournis par Centre Zawaj Maroc ("CZM", "le Centre", "nous",
                                                            "notre") aux utilisateurs ("vous", "l'utilisateur"), qu'ils soient clients ou visiteurs.
                                                            En accédant à notre site ou en utilisant nos services, vous acceptez ces Conditions. Si
                                                            vous n'acceptez pas ces Conditions, vous devez immédiatement cesser d'utiliser notre site
                                                            et nos services.
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <h3 className="mb-2 font-semibold">2. Services Proposés</h3>
                                                        <p>
                                                            Centre Zawaj Maroc propose plusieurs services, notamment :<br />
                                                            • Coaching matrimonial spécialisé : accompagnement personnalisé et orientation prénuptiale
                                                            pour les célibataires en quête de conseils et fiancés souhaitant se préparer au mariage.
                                                            <br />
                                                            • Matchmaking personnalisé : service de mise en relation hautement personnalisé et
                                                            confidentiel pour trouver un partenaire compatible.
                                                            <br />
                                                            • Conseil conjugal post-mariage : assistance pour la résolution de conflits et
                                                            l'épanouissement du couple.
                                                            <br />
                                                            • Ateliers et séminaires : formations sur le mariage, la communication et la gestion de la
                                                            vie de couple.
                                                            <br />
                                                            <br />
                                                            Notre mission est de promouvoir des relations matrimoniales saines et durables.
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <h3 className="mb-2 font-semibold">3. Conditions d'Utilisation</h3>
                                                        <p>
                                                            • L'utilisation du site et des services est réservée aux personnes majeures (18 ans et
                                                            plus).
                                                            <br />
                                                            • Toute utilisation à des fins illégales ou contraires à l'éthique du Centre est
                                                            strictement interdite.
                                                            <br />• Il est interdit d'utiliser le site pour diffamer, harceler ou porter atteinte à la
                                                            réputation du Centre ou d'un tiers.
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <h3 className="mb-2 font-semibold">4. Comptes Utilisateurs</h3>
                                                        <p>
                                                            • La création d'un compte utilisateur peut être nécessaire pour accéder à certains
                                                            services.
                                                            <br />
                                                            • Vous êtes responsable de la confidentialité de vos identifiants et de l'utilisation de
                                                            votre compte.
                                                            <br />• Toute utilisation frauduleuse ou non autorisée de votre compte doit être signalée
                                                            immédiatement au Centre.
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <h3 className="mb-2 font-semibold">5. Propriété Intellectuelle</h3>
                                                        <p>
                                                            • Tout le contenu du site (textes, images, logos, vidéos) est protégé par les lois sur la
                                                            propriété intellectuelle.
                                                            <br />• Toute reproduction, modification ou diffusion sans autorisation écrite du Centre
                                                            est interdite.
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <h3 className="mb-2 font-semibold">6. Protection des Données et Confidentialité</h3>
                                                        <p>
                                                            • CZM s'engage à protéger vos données personnelles conformément à notre politique de
                                                            confidentialité.
                                                            <br />
                                                            • Les informations collectées sont utilisées uniquement pour fournir et améliorer nos
                                                            services.
                                                            <br />• Vous avez le droit d'accéder, de modifier ou de supprimer vos données personnelles
                                                            sur simple demande.
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <h3 className="mb-2 font-semibold">7. Utilisation des Cookies</h3>
                                                        <p>
                                                            • Notre site utilise des cookies pour améliorer l'expérience utilisateur.
                                                            <br />• Vous pouvez désactiver les cookies via les paramètres de votre navigateur, mais
                                                            certaines fonctionnalités du site pourraient être affectées.
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <h3 className="mb-2 font-semibold">8. Modification des Conditions</h3>
                                                        <p>
                                                            • Le Centre se réserve le droit de modifier ces Conditions à tout moment.
                                                            <br />• Toute modification sera publiée sur le site et votre utilisation continue du site
                                                            après publication constitue une acceptation des nouvelles Conditions.
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <h3 className="mb-2 font-semibold">9. Limitation de Responsabilité</h3>
                                                        <p>
                                                            • CZM ne saurait être tenu responsable des dommages directs ou indirects résultant de
                                                            l'utilisation du site ou des services.
                                                            <br />• Nous nous réservons le droit de suspendre ou de résilier l'accès au site à notre
                                                            seule discrétion.
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <h3 className="mb-2 font-semibold">10. Résiliation</h3>
                                                        <p>
                                                            • En cas de violation de ces Conditions, CZM se réserve le droit de suspendre ou de
                                                            résilier votre accès au site et aux services.
                                                            <br />• Aucune indemnité ne pourra être réclamée en cas de résiliation pour non-respect
                                                            des Conditions.
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <h3 className="mb-2 font-semibold">11. Conformité Légale</h3>
                                                        <p>
                                                            Vous acceptez d'utiliser notre site en conformité avec les lois marocaines et
                                                            internationales applicables.
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <h3 className="mb-2 font-semibold">12. Indemnisation</h3>
                                                        <p>
                                                            Vous acceptez d'indemniser CZM en cas de réclamation, litige ou dommage résultant de votre
                                                            utilisation du site ou de la violation des présentes Conditions.
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <h3 className="mb-2 font-semibold">13. Règlement des Litiges</h3>
                                                        <p>
                                                            Tout litige relatif à ces Conditions sera soumis à la juridiction exclusive des tribunaux
                                                            marocains.
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <h3 className="mb-2 font-semibold">14. Interdiction des Contenus Inappropriés</h3>
                                                        <p>
                                                            Les utilisateurs s'engagent à ne pas publier, transmettre ou partager des contenus
                                                            offensants, diffamatoires, injurieux ou incitant à la haine. Le Centre se réserve le droit
                                                            de supprimer tout contenu inapproprié et de suspendre ou résilier le compte de
                                                            l'utilisateur concerné.
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <h3 className="mb-2 font-semibold">15. Politique de Remboursement et d'Annulation</h3>
                                                        <p>
                                                            • Aucun remboursement ne sera effectué après la prestation du service.
                                                            <br />
                                                            • Toute demande d'annulation doit être soumise au minimum 48 heures avant la date prévue
                                                            du service.
                                                            <br />• Les remboursements ne sont possibles qu'en cas d'erreur avérée de CZM ou
                                                            d'impossibilité avérée de fournir le service.
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <h3 className="mb-2 font-semibold">16. Engagement des Utilisateurs</h3>
                                                        <p>
                                                            Les utilisateurs s'engagent à fournir des informations exactes et véridiques lors de leur
                                                            inscription et dans leurs interactions. Tout manquement pourra entraîner la suspension ou
                                                            la suppression du compte.
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <h3 className="mb-2 font-semibold">17. Responsabilité des Utilisateurs</h3>
                                                        <p>
                                                            CZM met en relation des personnes mais ne garantit pas la compatibilité ni la réussite des
                                                            relations établies. L'utilisateur est seul responsable de ses interactions et rencontres
                                                            avec d'autres membres.
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <h3 className="mb-2 font-semibold">18. Droit de Refus d'Inscription et de Suspension</h3>
                                                        <p>
                                                            CZM se réserve le droit de refuser l'inscription d'un utilisateur sans obligation de
                                                            justification et de suspendre ou supprimer un compte en cas de non-respect des présentes
                                                            conditions.
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <h3 className="mb-2 font-semibold">19. Durée et Résiliation du Contrat</h3>
                                                        <p>
                                                            L'utilisation du site et des services est valable pour une durée indéterminée. Un
                                                            utilisateur peut demander la fermeture de son compte à tout moment.
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <h3 className="mb-2 font-semibold">20. Sécurité et Usage des Données Personnelles</h3>
                                                        <p>
                                                            Les informations personnelles des utilisateurs ne seront ni revendues ni partagées avec
                                                            des tiers sans consentement. CZM applique des mesures de sécurité pour protéger les
                                                            données contre toute intrusion ou fuite.
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <h3 className="mb-2 font-semibold">21. Sécurisation des Transactions</h3>
                                                        <p>
                                                            Toutes les transactions financières effectuées sur le site sont sécurisées par un
                                                            protocole de cryptage. CZM ne stocke pas les informations bancaires des utilisateurs.
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <h3 className="mb-2 font-semibold">
                                                            22. Conditions Complémentaires de Sécurité et d'Authenticité
                                                        </h3>
                                                        <p>
                                                            • Garantie de sérieux pour les femmes de moins de 26 ans : toute femme âgée de moins de 26
                                                            ans souhaitant s'inscrire doit fournir les coordonnées téléphoniques de l'un de ses
                                                            parents.
                                                            <br />
                                                            • Limitation du temps de rendez-vous avant l'officialisation (pour les hommes) : délai
                                                            limité à un mois maximum.
                                                            <br />
                                                            • Organisation des rendez-vous hors du Centre : tout rendez-vous doit se tenir dans un
                                                            lieu public choisi par la femme.
                                                            <br />• Obligation de justificatifs légaux pour l'inscription : présentation obligatoire
                                                            de la Carte d'Identité Nationale (CIN).
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <h3 className="mb-2 font-semibold">Contact</h3>
                                                        <p>
                                                            Pour toute question ou demande d'information :<br />
                                                            • Email : contact@czm.ma
                                                            <br />
                                                            • Adresse : 2MARS Casablanca. Maroc
                                                            <br />• Téléphone : +212 6 98 98 96 97
                                                        </p>
                                                    </div>
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    </Label>
                                </div>
                                <InputError message={errors.condition} />

                                <Button
                                    type="submit"
                                    className="auth-signup-button mt-1 w-full"
                                    tabIndex={9}
                                    disabled={processing || !termsAccepted}
                                >
                                    {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                                    Inscrivez-vous
                                </Button>
                            </div>

                            <div className="text-muted-foreground text-center text-sm mt-2">
                                Vous avez déjà un compte ?{' '}
                                <TextLink href={route('login')} tabIndex={6}>
                                    Se connecter
                                </TextLink>
                            </div>
                        </form>
                    </AuthLayout>
                </div>
            </div>
        </div>
    );
}