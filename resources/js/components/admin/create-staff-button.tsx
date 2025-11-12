import { useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { MOROCCO_CITIES } from '@/lib/morocco-cities';

interface Agency {
    id: number;
    name: string;
    address: string;
    image?: string;
    map?: string;
}

export default function CreateStaffButton({ buttonLabel, className = '', agencies = [] }: { buttonLabel?: string; className?: string; agencies?: Agency[] }) {
    const { t } = useTranslation();
    const defaultButtonLabel = buttonLabel || t('admin.createStaff.newStaff');
    const { data, setData, post, processing, reset, errors } = useForm({
        name: '',
        email: '',
        phone: '',
        city: '',
        gender: '',
        role: 'manager',
        agency_id: '',
        profile_picture: null as File | null,
        identity_card_front: null as File | null,
        identity_card_back: null as File | null,
        cin: '',
    });

    const [cinError, setCinError] = useState<string | null>(null);

    const validateCin = (value: string) => {
        const re = /^[A-Za-z]{1,2}\d{4,6}$/;
        return re.test(value.trim());
    };

    const submit = () => {
        // useForm automatically builds FormData when it detects File values
        post('/admin/create-staff', {
            forceFormData: true,
            onSuccess: () => reset(),
        });
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button className={className}>
                    <Plus className="w-4 h-4 mr-2" />
                    {defaultButtonLabel}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{t('admin.createStaff.title')}</DialogTitle>
                    <DialogDescription>{t('admin.createStaff.description')}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                    <div className="grid gap-2">
                        <Label htmlFor="name">{t('admin.createStaff.fullName')}</Label>
                        <Input id="name" value={data.name} onChange={(e) => setData('name', e.target.value)} />
                        {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="email">{t('admin.createStaff.email')}</Label>
                        <Input id="email" type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} />
                        {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="phone">{t('admin.createStaff.phone')}</Label>
                        <Input id="phone" value={data.phone} onChange={(e) => setData('phone', e.target.value)} />
                        {errors.phone && <p className="text-red-500 text-sm">{errors.phone}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-2">
                            <Label htmlFor="city">{t('admin.createStaff.city')}</Label>
                            <Select value={data.city} onValueChange={(v) => setData('city', v)}>
                                <SelectTrigger className="h-9"><SelectValue placeholder={t('admin.createStaff.selectCity')} /></SelectTrigger>
                                <SelectContent>
                                    {MOROCCO_CITIES.map((c) => (
                                        <SelectItem key={c} value={c}>{c}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.city && <p className="text-red-500 text-sm">{errors.city}</p>}
                        </div>
                        <div className="grid gap-2">
                            <Label>{t('admin.createStaff.gender')}</Label>
                            <Select value={data.gender} onValueChange={(v) => setData('gender', v)}>
                                <SelectTrigger className="h-9"><SelectValue placeholder={t('admin.createStaff.selectGender')} /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="male">{t('admin.createStaff.male')}</SelectItem>
                                    <SelectItem value="female">{t('admin.createStaff.female')}</SelectItem>
                                </SelectContent>
                            </Select>
                            {errors.gender && <p className="text-red-500 text-sm">{errors.gender}</p>}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-2">
                            <Label>{t('admin.createStaff.role')}</Label>
                            <Select value={data.role} onValueChange={(v) => setData('role', v)}>
                                <SelectTrigger className="h-9"><SelectValue placeholder={t('admin.createStaff.selectRole')} /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="manager">{t('admin.dashboard.manager')}</SelectItem>
                                    <SelectItem value="matchmaker">{t('admin.dashboard.matchmaker')}</SelectItem>
                                </SelectContent>
                            </Select>
                            {errors.role && <p className="text-red-500 text-sm">{errors.role}</p>}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="agency_id">{t('admin.createStaff.agency')}</Label>
                            <Select value={data.agency_id} onValueChange={(v) => setData('agency_id', v)}>
                                <SelectTrigger className="h-9"><SelectValue placeholder={t('admin.createStaff.selectAgency')} /></SelectTrigger>
                                <SelectContent>
                                    {agencies.map((agency) => (
                                        <SelectItem key={agency.id} value={agency.id.toString()}>{agency.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.agency_id && <p className="text-red-500 text-sm">{errors.agency_id}</p>}
                        </div>
                    </div>
                    
                    <div className="grid gap-2">
                        <Label htmlFor="profile_picture">{t('admin.createStaff.profilePicture')}</Label>
                        <Input 
                            id="profile_picture" 
                            type="file" 
                            accept="image/*"
                            onChange={(e) => e.target.files?.[0] && setData('profile_picture', e.target.files[0])}
                        />
                        {errors.profile_picture && <p className="text-red-500 text-sm">{errors.profile_picture}</p>}
                    </div>
                    
                    <div className="grid gap-2">
                        <Label htmlFor="cin">{t('admin.createStaff.cinNumber')}</Label>
                        <Input 
                            id="cin" 
                            value={data.cin} 
                            onChange={(e) => {
                                const v = e.target.value;
                                setData('cin', v);
                                setCinError(validateCin(v) ? null : t('admin.createStaff.invalidCin'));
                            }}
                            placeholder={t('admin.createStaff.enterCinNumber')}
                        />
                        {cinError && <p className="text-red-500 text-sm">{cinError}</p>}
                        {errors.cin && <p className="text-red-500 text-sm">{errors.cin}</p>}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-2">
                            <Label htmlFor="identity_card_front">{t('admin.createStaff.identityCardFront')}</Label>
                            <Input 
                                id="identity_card_front" 
                                type="file" 
                                accept="image/*"
                                onChange={(e) => e.target.files?.[0] && setData('identity_card_front', e.target.files[0])}
                            />
                            {errors.identity_card_front && <p className="text-red-500 text-sm">{errors.identity_card_front}</p>}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="identity_card_back">{t('admin.createStaff.identityCardBack')}</Label>
                            <Input 
                                id="identity_card_back" 
                                type="file" 
                                accept="image/*"
                                onChange={(e) => e.target.files?.[0] && setData('identity_card_back', e.target.files[0])}
                            />
                            {errors.identity_card_back && <p className="text-red-500 text-sm">{errors.identity_card_back}</p>}
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => reset()}>{t('common.cancel')}</Button>
                    <Button disabled={processing} onClick={submit}>{processing ? t('admin.createStaff.creating') : t('admin.createStaff.create')}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


