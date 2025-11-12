import { useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Building } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function CreateAgencyButton({ buttonLabel, className = '' }: { buttonLabel?: string; className?: string }) {
    const { t } = useTranslation();
    const defaultButtonLabel = buttonLabel || t('admin.createAgency.newAgency');
    const [open, setOpen] = useState(false);
    const { data, setData, post, processing, reset, errors } = useForm({
        name: '',
        country: '',
        city: '',
        address: '',
        image: null as File | null,
        map: '',
    });

    const [countries, setCountries] = useState<Array<{ iso2: string; frenchName: string; cities: string[] }>>([]);
    const [countryCodeToCities, setCountryCodeToCities] = useState<Record<string, string[]>>({});
    const [selectedCountryCode, setSelectedCountryCode] = useState('');
    const [loadingCountries, setLoadingCountries] = useState(false);
    const [errorCountries, setErrorCountries] = useState('');

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
                const regionNamesFr = new Intl.DisplayNames(['fr'], { type: 'region' });
                const normalized = list
                    .filter((item: any) => item?.iso2)
                    .map((item: any) => ({
                        iso2: item.iso2 as string,
                        frenchName: (regionNamesFr.of(item.iso2) as string) || (item.country as string),
                        cities: Array.isArray(item.cities) ? (item.cities as string[]) : [],
                    }))
                    .sort((a: any, b: any) => a.frenchName.localeCompare(b.frenchName, 'fr'));
                const codeToCities = normalized.reduce((acc: Record<string, string[]>, item: any) => {
                    acc[item.iso2] = item.cities;
                    return acc;
                }, {} as Record<string, string[]>);
                setCountries(normalized);
                setCountryCodeToCities(codeToCities);
            } catch (e) {
                if (!isMounted) return;
                setErrorCountries(t('admin.createAgency.errorLoadingCountries'));
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
        if (!selectedCountryCode) return [] as string[];
        return countryCodeToCities[selectedCountryCode] || [];
    }, [selectedCountryCode, countryCodeToCities]);

    const submit = () => {
        const formData = new FormData();
        formData.append('name', data.name);
        formData.append('address', data.address);
        formData.append('country', data.country);
        formData.append('city', data.city);
        if (data.image) {
            formData.append('image', data.image);
        }
        formData.append('map', data.map);

        post('/admin/agencies', { 
            data: formData,
            forceFormData: true,
            onSuccess: () => {
                reset();
                setOpen(false);
            }
        });
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setData('image', e.target.files[0]);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className={className}>
                    <Building className="w-4 h-4 mr-2" />
                    {defaultButtonLabel}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{t('admin.createAgency.title')}</DialogTitle>
                    <DialogDescription>{t('admin.createAgency.description')}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">{t('admin.createAgency.agencyName')}</Label>
                        <Input 
                            id="name" 
                            value={data.name} 
                            onChange={(e) => setData('name', e.target.value)}
                            placeholder={t('admin.createAgency.enterAgencyName')}
                            required
                        />
                        {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
                    </div>
                    
                    <div className="grid gap-2">
                        <Label htmlFor="country">{t('admin.createAgency.country')}</Label>
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
                            <SelectTrigger className="h-9"><SelectValue placeholder={loadingCountries ? t('admin.createAgency.loadingCountries') : t('admin.createAgency.selectCountry')} /></SelectTrigger>
                            <SelectContent>
                                {countries.map((c) => (
                                    <SelectItem key={c.iso2} value={c.iso2}>{c.frenchName}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errorCountries && <p className="text-red-500 text-sm">{errorCountries}</p>}
                        {errors.country && <p className="text-red-500 text-sm">{errors.country}</p>}
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="city">{t('admin.createAgency.city')}</Label>
                        <Select
                            value={data.city}
                            onValueChange={(v) => setData('city', v)}
                            disabled={processing || !selectedCountryCode || availableCities.length === 0}
                        >
                            <SelectTrigger className="h-9"><SelectValue placeholder={!selectedCountryCode ? t('admin.createAgency.selectCountryFirst') : (availableCities.length ? t('admin.createAgency.selectCity') : t('admin.createAgency.noCitiesAvailable'))} /></SelectTrigger>
                            <SelectContent>
                                {availableCities.map((city) => (
                                    <SelectItem key={city} value={city}>{city}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.city && <p className="text-red-500 text-sm">{errors.city}</p>}
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="address">{t('admin.createAgency.address')}</Label>
                        <Textarea 
                            id="address" 
                            value={data.address} 
                            onChange={(e) => setData('address', e.target.value)}
                            placeholder={t('admin.createAgency.enterAgencyAddress')}
                            required
                        />
                        {errors.address && <p className="text-red-500 text-sm">{errors.address}</p>}
                    </div>
                    
                    <div className="grid gap-2">
                        <Label htmlFor="image">{t('admin.createAgency.agencyImage')}</Label>
                        <Input 
                            id="image" 
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                        />
                        {errors.image && <p className="text-red-500 text-sm">{errors.image}</p>}
                    </div>
                    
                    <div className="grid gap-2">
                        <Label htmlFor="map">{t('admin.createAgency.mapUrlCoordinates')}</Label>
                        <Input 
                            id="map" 
                            value={data.map} 
                            onChange={(e) => setData('map', e.target.value)}
                            placeholder={t('admin.createAgency.enterMapUrlOrCoordinates')}
                        />
                        {errors.map && <p className="text-red-500 text-sm">{errors.map}</p>}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => { reset(); setOpen(false); }}>{t('common.cancel')}</Button>
                    <Button disabled={processing} onClick={submit}>
                        {processing ? t('admin.createAgency.creating') : t('admin.createAgency.createAgency')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
