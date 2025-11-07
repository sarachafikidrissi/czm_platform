import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AddProspect() {
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
        post(route('staff.prospects.store'), {
            onFinish: () => reset(),
        });
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Ajouter un prospect', href: '/staff/prospects/create' }]}>
            <Head title="Ajouter un prospect" />
            
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Ajouter un nouveau prospect</CardTitle>
                        <CardDescription>
                            Remplissez le formulaire ci-dessous pour créer un compte prospect. Un mot de passe sera généré automatiquement et envoyé par email avec les identifiants.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submit} className="space-y-4">
                            <div className="flex flex-col gap-y-1.5">
                                <div className="flex flex-col gap-y-1">
                                    <Label htmlFor="name">
                                        Identifiant
                                    </Label>
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
                                    />
                                    <InputError message={errors.name} className="mt-0.5" />
                                </div>

                                <div>
                                    <Label htmlFor="email">
                                        Adresse Email
                                    </Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        required
                                        autoComplete="email"
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
                                        disabled={processing}
                                        placeholder="email@example.com"
                                    />
                                    <InputError message={errors.email} />
                                </div>

                                <div>
                                    <Label htmlFor="phone">
                                        Numéro de téléphone
                                    </Label>
                                    <Input
                                        id="phone"
                                        type="tel"
                                        required
                                        autoComplete="tel"
                                        value={data.phone}
                                        onChange={(e) => setData('phone', e.target.value)}
                                        disabled={processing}
                                        placeholder="+212 6-XX-XX-XX-XX"
                                    />
                                    <InputError message={errors.phone} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="gender">
                                        Sexe
                                    </Label>
                                    <Select value={data.gender} onValueChange={(value) => setData('gender', value)} disabled={processing}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Choisir le sexe" />
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
                                        <Label htmlFor="country">
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
                                            <SelectTrigger>
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
                                        {errorCountries && <p className="text-destructive text-sm">{errorCountries}</p>}
                                        <InputError message={errors.country} />
                                    </div>

                                    <div className="grid w-full gap-2">
                                        <Label htmlFor="city">
                                            Ville
                                        </Label>
                                        <Select
                                            value={data.city}
                                            onValueChange={(value) => setData('city', value)}
                                            disabled={processing || !selectedCountryCode || availableCities.length === 0}
                                        >
                                            <SelectTrigger>
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
                                        <InputError message={errors.city} />
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    className="mt-1 w-full"
                                    disabled={processing}
                                >
                                    {processing && <LoaderCircle className="h-4 w-4 animate-spin mr-2" />}
                                    Créer le prospect
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

