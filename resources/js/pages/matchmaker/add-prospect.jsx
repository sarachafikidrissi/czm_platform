import { Head, useForm } from '@inertiajs/react';
import { CheckCircle, CircleAlert, LoaderCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';

export default function AddProspect() {
    const { t } = useTranslation();
    const [countries, setCountries] = useState([]);
    const [countryCodeToCities, setCountryCodeToCities] = useState({});
    const [selectedCountryCode, setSelectedCountryCode] = useState('');
    const [loadingCountries, setLoadingCountries] = useState(false);
    const [errorCountries, setErrorCountries] = useState('');

    const { data, setData, post, processing, errors, reset, recentlySuccessful } = useForm({
        name: '',
        email: '',
        phone: '',
        gender: '',
        country: '',
        city: '',
    });
    const [successOpen, setSuccessOpen] = useState(false);
    const [createdProspect, setCreatedProspect] = useState(null);

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
        return list;
    }, [selectedCountryCode, countryCodeToCities]);

    const submit = (e) => {
        e.preventDefault();
        setCreatedProspect({
            name: data.name,
            username: data.name,
            email: data.email,
            phone: data.phone,
            city: data.city,
            country: data.country,
        });
        post(route('staff.prospects.store'), {
            onFinish: () => reset(),
        });
    };

    useEffect(() => {
        if (recentlySuccessful) {
            setSuccessOpen(true);
        }
    }, [recentlySuccessful]);

    const getFieldState = (field) => ({
        hasError: Boolean(errors[field]),
        hasValue: Boolean(data[field]),
    });

    const getInputClassName = (field) => {
        const { hasError, hasValue } = getFieldState(field);
        return [
            'h-11 rounded-lg border bg-white px-3 text-sm shadow-sm transition-colors',
            'placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-offset-0',
            hasError
                ? 'border-red-500 focus-visible:ring-red-200'
                : hasValue
                  ? 'border-emerald-500 focus-visible:ring-emerald-200'
                  : 'border-slate-200 focus-visible:ring-slate-200',
        ].join(' ');
    };

    const getSelectTriggerClassName = (field) => {
        const { hasError, hasValue } = getFieldState(field);
        return [
            'h-11 rounded-lg border bg-white px-3 text-sm shadow-sm transition-colors',
            'focus-visible:ring-2 focus-visible:ring-offset-0',
            hasError
                ? 'border-red-500 focus-visible:ring-red-200'
                : hasValue
                  ? 'border-emerald-500 focus-visible:ring-emerald-200'
                  : 'border-slate-200 focus-visible:ring-slate-200',
        ].join(' ');
    };

    return (
        <AppLayout breadcrumbs={[{ title: t('breadcrumbs.addProspect'), href: '/staff/prospects/create' }]}>
            <Head title={t('breadcrumbs.addProspect')} />
            
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <Card className="border border-slate-200/80 bg-white shadow-sm">
                    <CardHeader className="border-b border-slate-200/80 bg-slate-50/70">
                        <CardTitle className="text-lg font-semibold text-slate-900">Ajouter un nouveau prospect</CardTitle>
                        <CardDescription className="text-sm text-slate-600">
                            Remplissez le formulaire ci-dessous pour créer un compte prospect. Un mot de passe sera généré automatiquement et envoyé par email avec les identifiants.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                        <form onSubmit={submit} className="space-y-6">
                            <div className="grid gap-5">
                                <div className="flex flex-col gap-2">
                                    <Label htmlFor="name" className="text-sm font-medium text-slate-700">
                                        Identifiant
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            id="name"
                                            type="text"
                                            required
                                            autoFocus
                                            autoComplete="name"
                                            value={data.name}
                                            onChange={(e) => setData('name', e.target.value)}
                                            disabled={processing}
                                            placeholder="Entrer l'identifiant ex:hajar05"
                                            className={getInputClassName('name')}
                                        />
                                        {getFieldState('name').hasError && (
                                            <CircleAlert className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-red-500" />
                                        )}
                                        {!getFieldState('name').hasError && getFieldState('name').hasValue && (
                                            <CheckCircle className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500" />
                                        )}
                                    </div>
                                    <InputError message={errors.name} className="mt-0.5 text-xs" />
                                </div>

                                <div className="grid gap-5 md:grid-cols-2">
                                    <div className="flex flex-col gap-2">
                                        <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                                            Adresse Email
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                id="email"
                                                type="email"
                                                required
                                                autoComplete="email"
                                                value={data.email}
                                                onChange={(e) => setData('email', e.target.value)}
                                                disabled={processing}
                                                placeholder="email@example.com"
                                                className={getInputClassName('email')}
                                            />
                                            {getFieldState('email').hasError && (
                                                <CircleAlert className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-red-500" />
                                            )}
                                            {!getFieldState('email').hasError && getFieldState('email').hasValue && (
                                                <CheckCircle className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500" />
                                            )}
                                        </div>
                                        <InputError message={errors.email} className="text-xs" />
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <Label htmlFor="phone" className="text-sm font-medium text-slate-700">
                                            Numéro de téléphone
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                id="phone"
                                                type="tel"
                                                required
                                                autoComplete="tel"
                                                value={data.phone}
                                                onChange={(e) => setData('phone', e.target.value)}
                                                disabled={processing}
                                                placeholder="+212 6-XX-XX-XX-XX"
                                                className={getInputClassName('phone')}
                                            />
                                            {getFieldState('phone').hasError && (
                                                <CircleAlert className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-red-500" />
                                            )}
                                            {!getFieldState('phone').hasError && getFieldState('phone').hasValue && (
                                                <CheckCircle className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500" />
                                            )}
                                        </div>
                                        <InputError message={errors.phone} className="text-xs" />
                                    </div>
                                </div>

                                <div className="grid gap-5 md:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="gender" className="text-sm font-medium text-slate-700">
                                            Sexe
                                        </Label>
                                        <Select value={data.gender} onValueChange={(value) => setData('gender', value)} disabled={processing}>
                                            <SelectTrigger className={getSelectTriggerClassName('gender')}>
                                                <SelectValue placeholder="Choisir le sexe" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="male">Homme</SelectItem>
                                                <SelectItem value="female">Femme</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <InputError message={errors.gender} className="text-xs" />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="country" className="text-sm font-medium text-slate-700">
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
                                            <SelectTrigger className={getSelectTriggerClassName('country')}>
                                                <SelectValue placeholder={loadingCountries ? 'Chargement des pays…' : 'Sélectionnez le pays'} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {countries.map((c) => (
                                                    <SelectItem key={c.iso2} value={c.iso2}>
                                                        {c.frenchName}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {errorCountries && <p className="text-xs text-destructive">{errorCountries}</p>}
                                        <InputError message={errors.country} className="text-xs" />
                                    </div>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="city" className="text-sm font-medium text-slate-700">
                                        Ville
                                    </Label>
                                    <Select
                                        value={data.city}
                                        onValueChange={(value) => setData('city', value)}
                                        disabled={processing || !selectedCountryCode || availableCities.length === 0}
                                    >
                                        <SelectTrigger className={getSelectTriggerClassName('city')}>
                                            <SelectValue
                                                placeholder={
                                                    !selectedCountryCode
                                                        ? "Sélectionnez d'abord un pays"
                                                        : availableCities.length
                                                          ? 'Sélectionnez la ville'
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
                                    <InputError message={errors.city} className="text-xs" />
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 border-t border-slate-200/70 pt-5">
                                <Button
                                    type="submit"
                                    className="h-11 w-full rounded-lg bg-slate-900 text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                    disabled={processing}
                                >
                                    {processing && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                                    Créer le prospect
                                </Button>
                                <p className="text-center text-xs text-slate-500">
                                    Veuillez corriger les erreurs pour activer le bouton
                                </p>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
            <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
                <DialogContent className="max-w-md rounded-2xl border border-emerald-200/70 bg-white p-6 shadow-2xl">
                    <div className="flex flex-col items-center gap-4 text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
                            <CheckCircle className="h-7 w-7 text-emerald-500" />
                        </div>
                        <DialogHeader className="space-y-2">
                            <DialogTitle className="text-lg font-semibold text-slate-900">
                                Prospect créé avec succès
                            </DialogTitle>
                            <DialogDescription className="text-sm text-slate-600">
                                Le nouveau profil est prêt pour la suite du traitement. Vous pouvez consulter le profil ou ajouter un autre prospect.
                            </DialogDescription>
                        </DialogHeader>
                        {createdProspect?.name && (
                            <div className="w-full rounded-xl border border-slate-200/70 bg-slate-50 px-4 py-3 text-left">
                                <p className="text-sm font-semibold text-slate-900">{createdProspect.name}</p>
                                <p className="text-xs text-slate-500">
                                    {createdProspect.city || 'Ville'}{createdProspect.country ? ` • ${createdProspect.country}` : ''}
                                </p>
                            </div>
                        )}
                        <div className="grid w-full gap-3">
                            <Button
                                type="button"
                                className="h-11 w-full rounded-lg bg-emerald-600 text-white shadow-sm transition hover:bg-emerald-700"
                                onClick={() => {
                                    if (createdProspect?.username) {
                                        window.open(`/profile/${createdProspect.username}`, '_blank', 'noopener,noreferrer');
                                    }
                                }}
                                disabled={!createdProspect?.username}
                            >
                                Voir le profil
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                className="h-11 w-full rounded-lg border-slate-200 text-slate-700"
                                onClick={() => setSuccessOpen(false)}
                            >
                                Ajouter un autre
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

