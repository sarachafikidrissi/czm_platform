import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import PhoneInput, { getCountries, getCountryCallingCode } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { isValidPhoneNumber } from 'react-phone-number-input';
import enLocale from 'react-phone-number-input/locale/en.json';
import frLocale from 'react-phone-number-input/locale/fr.json';
import { useTranslation } from 'react-i18next';
import { route } from 'ziggy-js';

import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
                            <span className="flex-1">{getLocalizedCountryName(country)}</span>
                        </div>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

export default function AppointmentRequest({ status }) {
    const { t } = useTranslation();
    const containerRef = useRef(null);
    const [countries, setCountries] = useState([]);
    const [countryCodeToCities, setCountryCodeToCities] = useState({});
    const [selectedCountryCode, setSelectedCountryCode] = useState('');
    const [loadingCountries, setLoadingCountries] = useState(false);
    const [errorCountries, setErrorCountries] = useState('');
    const [phoneError, setPhoneError] = useState('');
    const [dateError, setDateError] = useState('');

    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        phone: '',
        city: '',
        country: '',
        reason: '',
        preferred_date: '',
        message: '',
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

    // Load countries and cities
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
                console.error('Error loading countries:', err);
            } finally {
                if (isMounted) setLoadingCountries(false);
            }
        };
        fetchCountries();
        return () => {
            isMounted = false;
        };
    }, []);

    const handleCountryChange = (countryName) => {
        setData('country', countryName || '');
        setData('city', ''); // Reset city when country changes
        // Find country code from country name
        if (countryName) {
            const country = countries.find(c => c.frenchName === countryName || c.englishName === countryName);
            if (country) {
                setSelectedCountryCode(country.iso2);
            } else {
                setSelectedCountryCode('');
            }
        } else {
            setSelectedCountryCode('');
        }
    };

    const handlePhoneChange = (value) => {
        setData('phone', value || '');
        setPhoneError('');
        if (value && !isValidPhoneNumber(value)) {
            setPhoneError('Numéro de téléphone invalide');
        }
    };

    // Get next valid weekday (Monday-Friday)
    const getNextValidWeekday = () => {
        const today = new Date();
        let date = new Date(today);
        
        // If today is weekend, move to next Monday
        while (date.getDay() === 0 || date.getDay() === 6) {
            date.setDate(date.getDate() + 1);
            date.setHours(9, 0, 0, 0);
        }
        
        // If today is Friday after 5pm, move to next Monday
        if (date.getDay() === 5 && date.getHours() >= 17) {
            date.setDate(date.getDate() + 3);
            date.setHours(9, 0, 0, 0);
        }
        // If today is weekday but after 5pm, move to next day
        else if (date.getHours() >= 17) {
            date.setDate(date.getDate() + 1);
            // If next day is weekend, move to Monday
            while (date.getDay() === 0 || date.getDay() === 6) {
                date.setDate(date.getDate() + 1);
            }
            date.setHours(9, 0, 0, 0);
        }
        // If today is before 9am, use today at 9am
        else if (date.getHours() < 9) {
            date.setHours(9, 0, 0, 0);
        }
        // If today is between 9am and 5pm, use current time rounded to next hour
        else {
            // Round up to next hour if not on the hour
            if (date.getMinutes() > 0) {
                date.setHours(date.getHours() + 1, 0, 0, 0);
            }
        }
        
        return date;
    };

    // Format date for datetime-local input (YYYY-MM-DDTHH:mm)
    const formatDateTimeLocal = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    // Get min and max datetime for the picker
    const getMinDateTime = () => {
        const nextValid = getNextValidWeekday();
        return formatDateTimeLocal(nextValid);
    };

    const getMaxDateTime = () => {
        // Set max to 3 months from now, but only weekdays
        const maxDate = new Date();
        maxDate.setMonth(maxDate.getMonth() + 3);
        maxDate.setHours(17, 0, 0, 0);
        return formatDateTimeLocal(maxDate);
    };

    const handleDateChange = (e) => {
        const selectedDateTime = e.target.value;
        setDateError('');

        if (selectedDateTime) {
            const selected = new Date(selectedDateTime);
            const dayOfWeek = selected.getDay();
            const hour = selected.getHours();
            const minutes = selected.getMinutes();

            // Check if it's a weekend
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                setDateError('Les rendez-vous sont disponibles uniquement du lundi au vendredi');
                setData('preferred_date', '');
                return;
            }

            // Check if time is outside 9am-5pm
            if (hour < 9 || hour >= 17 || (hour === 17 && minutes > 0)) {
                setDateError('Les rendez-vous sont disponibles de 9h à 17h');
                setData('preferred_date', '');
                return;
            }

            // Check if date is in the past
            const now = new Date();
            if (selected < now) {
                setDateError('La date doit être dans le futur');
                setData('preferred_date', '');
                return;
            }
        }

        setData('preferred_date', selectedDateTime);
    };

    const submit = (e) => {
        e.preventDefault();
        
        // Validate phone
        if (data.phone && !isValidPhoneNumber(data.phone)) {
            setPhoneError('Numéro de téléphone invalide');
            return;
        }

        // Validate date if provided
        if (data.preferred_date) {
            const selected = new Date(data.preferred_date);
            const dayOfWeek = selected.getDay();
            const hour = selected.getHours();

            if (dayOfWeek === 0 || dayOfWeek === 6) {
                setDateError('Les rendez-vous sont disponibles uniquement du lundi au vendredi');
                return;
            }

            if (hour < 9 || hour >= 17) {
                setDateError('Les rendez-vous sont disponibles de 9h à 17h');
                return;
            }
        }

        post(route('appointment-request.store'), {
            onSuccess: () => {
                reset();
                setPhoneError('');
                setDateError('');
            },
        });
    };

    const availableCities = selectedCountryCode ? (countryCodeToCities[selectedCountryCode] || []) : [];
    const cityOptions = availableCities.map(city => ({ value: city, label: city }));

    return (
        <div ref={containerRef} className="auth-layout-bg flex min-h-screen flex-col relative">
            {/* Small Screen Layout */}
            <div className="relative z-10 w-full md:hidden">
                {/* Hero Image Section with curved bottom */}
                <div 
                    className="relative h-[40vh] min-h-[300px] overflow-hidden"
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
                
                {/* Logo - overlapping bottom of hero section */}
                <div className="relative -mt-20 flex justify-center z-20">
                    <div className="rounded-full border-4 border-white bg-white p-3 shadow-2xl">
                        <img src="/images/czm_Logo.png" alt="CZM Logo" className="h-20 w-auto object-contain" />
                    </div>
                </div>
                
                {/* Form Content Section */}
                <div className="bg-[#f5f5f5] pt-8 pb-12 px-4">
                    <div className="max-w-md mx-auto">
                        <AuthLayout
                            className="bg-transparent p-0"
                            title={t('welcome.appointmentRequestTitle', 'Demande de Rendez-vous')}
                            description={t('welcome.appointmentRequestSubtitle', 'Remplissez le formulaire ci-dessous pour demander un rendez-vous')}
                        >
                            {status && <div className="mb-4 text-center text-sm font-medium text-green-600">{status}</div>}
                            
                            <form className="flex flex-col gap-4" onSubmit={submit}>
                                <div className="grid gap-2">
                                    <Label htmlFor="name" className="required">
                                        {t('welcome.appointmentName', 'Nom complet')} *
                                    </Label>
                                    <Input
                                        id="name"
                                        type="text"
                                        required
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        className="border-[#096626] border-2"
                                    />
                                    <InputError message={errors.name} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="email" className="required">
                                        {t('welcome.appointmentEmail', 'Email')} *
                                    </Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        required
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
                                        className="border-[#096626] border-2"
                                    />
                                    <InputError message={errors.email} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="phone" className="required">
                                        {t('welcome.appointmentPhone', 'Téléphone')} *
                                    </Label>
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
                                                autoComplete: "tel"
                                            }}
                                        />
                                    </div>
                                    <InputError message={phoneError || errors.phone} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="country">
                                        {t('welcome.appointmentCountry', 'Pays')}
                                    </Label>
                                    <Select
                                        value={data.country || undefined}
                                        onValueChange={handleCountryChange}
                                        disabled={loadingCountries}
                                    >
                                        <SelectTrigger className="border-[#096626] border-2">
                                            <SelectValue placeholder={loadingCountries ? t('staff.userInfo.loading', 'Chargement...') : t('staff.userInfo.selectCountry', 'Sélectionner un pays')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {countries.map((country) => (
                                                <SelectItem key={country.iso2} value={country.frenchName}>
                                                    {country.frenchName}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.country} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="city">
                                        {t('welcome.appointmentCity', 'Ville')}
                                    </Label>
                                    {!selectedCountryCode ? (
                                        <div className="rounded-lg border border-[#096626] border-2 px-4 py-3 text-sm text-muted-foreground">
                                            {t('staff.userInfo.selectCountryFirst', 'Sélectionnez d\'abord un pays')}
                                        </div>
                                    ) : availableCities.length === 0 ? (
                                        <div className="rounded-lg border border-[#096626] border-2 px-4 py-3 text-sm text-muted-foreground">
                                            Aucune ville disponible
                                        </div>
                                    ) : (
                                        <SearchableSelect
                                            options={cityOptions}
                                            value={data.city}
                                            onValueChange={(value) => setData('city', value)}
                                            placeholder={t('staff.userInfo.selectCity', 'Sélectionner une ville')}
                                            searchPlaceholder="Rechercher une ville..."
                                            emptyMessage="Aucune ville trouvée"
                                            disabled={processing || !selectedCountryCode}
                                        />
                                    )}
                                    <InputError message={errors.city} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="reason" className="required">
                                        {t('welcome.appointmentReason', 'Raison du rendez-vous')} *
                                    </Label>
                                    <Textarea
                                        id="reason"
                                        required
                                        value={data.reason}
                                        onChange={(e) => setData('reason', e.target.value)}
                                        rows={4}
                                        className="border-[#096626] border-2"
                                        placeholder={t('welcome.appointmentReasonPlaceholder', 'Décrivez la raison de votre demande de rendez-vous')}
                                    />
                                    <InputError message={errors.reason} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="preferred_date">
                                        {t('welcome.appointmentPreferredDate', 'Date préférée')} (Lundi-Vendredi, 9h-17h)
                                    </Label>
                                    <Input
                                        id="preferred_date"
                                        type="datetime-local"
                                        value={data.preferred_date}
                                        onChange={handleDateChange}
                                        min={getMinDateTime()}
                                        max={getMaxDateTime()}
                                        step="3600"
                                        className="border-[#096626] border-2"
                                    />
                                    <InputError message={dateError || errors.preferred_date} />
                                    <p className="text-xs text-muted-foreground">
                                        Les rendez-vous sont disponibles uniquement du lundi au vendredi, de 9h à 17h
                                    </p>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="message">
                                        {t('welcome.appointmentMessage', 'Message supplémentaire')}
                                    </Label>
                                    <Textarea
                                        id="message"
                                        value={data.message}
                                        onChange={(e) => setData('message', e.target.value)}
                                        rows={3}
                                        className="border-[#096626] border-2"
                                        placeholder={t('welcome.appointmentMessagePlaceholder', 'Informations supplémentaires (optionnel)')}
                                    />
                                    <InputError message={errors.message} />
                                </div>

                                <Button
                                    type="submit"
                                    className="auth-signup-button mt-1 w-full cursor-pointer"
                                    disabled={processing}
                                >
                                    {processing && <LoaderCircle className="h-4 w-4 animate-spin mr-2" />}
                                    {processing
                                        ? t('welcome.appointmentSubmitting', 'Envoi en cours...')
                                        : t('welcome.appointmentSubmit', 'Envoyer la demande')}
                                </Button>
                            </form>

                            <div className="text-muted-foreground text-center text-sm mt-4">
                                <a
                                    href="https://czm.ma/"
                                    rel="noopener noreferrer"
                                    className="text-foreground underline decoration-neutral-300 underline-offset-4 transition-colors duration-300 ease-out hover:decoration-current dark:decoration-neutral-500"
                                >
                                    {t('common.backToHome', 'Retour à l\'accueil')}
                                </a>
                            </div>
                        </AuthLayout>
                    </div>
                </div>
            </div>
            
            {/* Large Screen Layout */}
            <div className="hidden md:flex flex-1 relative items-center justify-center py-4 px-4">
                <div className="auth-form-modal bottom-0 relative z-10 max-w-md w-full">
                    <AuthLayout
                        className="bg-transparent p-0"
                        title={t('welcome.appointmentRequestTitle', 'Demande de Rendez-vous')}
                        description={t('welcome.appointmentRequestSubtitle', 'Remplissez le formulaire ci-dessous pour demander un rendez-vous')}
                    >
                        {status && <div className="mb-4 text-center text-sm font-medium text-green-600">{status}</div>}

                        <form className="flex flex-col gap-4" onSubmit={submit}>
                            <div className="grid gap-2">
                                <Label htmlFor="name-lg" className="required">
                                    {t('welcome.appointmentName', 'Nom complet')} *
                                </Label>
                                <Input
                                    id="name-lg"
                                    type="text"
                                    required
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    className="border-[#096626] border-2"
                                />
                                <InputError message={errors.name} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="email-lg" className="required">
                                    {t('welcome.appointmentEmail', 'Email')} *
                                </Label>
                                <Input
                                    id="email-lg"
                                    type="email"
                                    required
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    className="border-[#096626] border-2"
                                />
                                <InputError message={errors.email} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="phone-lg" className="required">
                                    {t('welcome.appointmentPhone', 'Téléphone')} *
                                </Label>
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
                                            autoComplete: "tel"
                                        }}
                                    />
                                </div>
                                <InputError message={phoneError || errors.phone} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="country-lg">
                                    {t('welcome.appointmentCountry', 'Pays')}
                                </Label>
                                <Select
                                    value={data.country || undefined}
                                    onValueChange={handleCountryChange}
                                    disabled={loadingCountries}
                                >
                                    <SelectTrigger className="border-[#096626] border-2">
                                        <SelectValue placeholder={loadingCountries ? t('staff.userInfo.loading', 'Chargement...') : t('staff.userInfo.selectCountry', 'Sélectionner un pays')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {countries.map((country) => (
                                            <SelectItem key={country.iso2} value={country.frenchName}>
                                                {country.frenchName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.country} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="city-lg">
                                    {t('welcome.appointmentCity', 'Ville')}
                                </Label>
                                {!selectedCountryCode ? (
                                    <div className="rounded-lg border border-[#096626] border-2 px-4 py-3 text-sm text-muted-foreground">
                                        {t('staff.userInfo.selectCountryFirst', 'Sélectionnez d\'abord un pays')}
                                    </div>
                                ) : availableCities.length === 0 ? (
                                    <div className="rounded-lg border border-[#096626] border-2 px-4 py-3 text-sm text-muted-foreground">
                                        Aucune ville disponible
                                    </div>
                                ) : (
                                    <SearchableSelect
                                        options={cityOptions}
                                        value={data.city}
                                        onValueChange={(value) => setData('city', value)}
                                        placeholder={t('staff.userInfo.selectCity', 'Sélectionner une ville')}
                                        searchPlaceholder="Rechercher une ville..."
                                        emptyMessage="Aucune ville trouvée"
                                        disabled={processing || !selectedCountryCode}
                                    />
                                )}
                                <InputError message={errors.city} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="reason-lg" className="required">
                                    {t('welcome.appointmentReason', 'Raison du rendez-vous')} *
                                </Label>
                                <Textarea
                                    id="reason-lg"
                                    required
                                    value={data.reason}
                                    onChange={(e) => setData('reason', e.target.value)}
                                    rows={4}
                                    className="border-[#096626] border-2"
                                    placeholder={t('welcome.appointmentReasonPlaceholder', 'Décrivez la raison de votre demande de rendez-vous')}
                                />
                                <InputError message={errors.reason} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="preferred_date-lg">
                                    {t('welcome.appointmentPreferredDate', 'Date préférée')} (Lundi-Vendredi, 9h-17h)
                                </Label>
                                <Input
                                    id="preferred_date-lg"
                                    type="datetime-local"
                                    value={data.preferred_date}
                                    onChange={handleDateChange}
                                    min={getMinDateTime()}
                                    max={getMaxDateTime()}
                                    step="3600"
                                    className="border-[#096626] border-2"
                                />
                                <InputError message={dateError || errors.preferred_date} />
                                <p className="text-xs text-muted-foreground">
                                    Les rendez-vous sont disponibles uniquement du lundi au vendredi, de 9h à 17h
                                </p>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="message-lg">
                                    {t('welcome.appointmentMessage', 'Message supplémentaire')}
                                </Label>
                                <Textarea
                                    id="message-lg"
                                    value={data.message}
                                    onChange={(e) => setData('message', e.target.value)}
                                    rows={3}
                                    className="border-[#096626] border-2"
                                    placeholder={t('welcome.appointmentMessagePlaceholder', 'Informations supplémentaires (optionnel)')}
                                />
                                <InputError message={errors.message} />
                            </div>

                            <Button
                                type="submit"
                                className="auth-signup-button mt-1 w-full cursor-pointer"
                                disabled={processing}
                            >
                                {processing && <LoaderCircle className="h-4 w-4 animate-spin mr-2" />}
                                {processing
                                    ? t('welcome.appointmentSubmitting', 'Envoi en cours...')
                                    : t('welcome.appointmentSubmit', 'Envoyer la demande')}
                            </Button>
                        </form>

                        <div className="text-muted-foreground text-center text-sm mt-4">
                            <a
                                href="https://czm.ma/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-foreground underline decoration-neutral-300 underline-offset-4 transition-colors duration-300 ease-out hover:decoration-current dark:decoration-neutral-500"
                            >
                                {t('common.backToHome', 'Retour à l\'accueil')}
                            </a>
                        </div>
                    </AuthLayout>
                </div>
            </div>
        </div>
    );
}

