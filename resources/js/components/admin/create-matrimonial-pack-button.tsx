import { useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';

export default function CreateMatrimonialPackButton({ buttonLabel, className = '' }: { buttonLabel?: string; className?: string }) {
    const { t } = useTranslation();
    const defaultButtonLabel = buttonLabel || t('admin.createMatrimonialPack.newMatrimonialPack');
    const { data, setData, post, processing, reset, errors } = useForm({
        name: '',
        duration: '',
    });

    const submit = () => {
        post('/admin/matrimonial-packs', {
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
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t('admin.createMatrimonialPack.title')}</DialogTitle>
                    <DialogDescription>{t('admin.createMatrimonialPack.description')}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                    <div className="grid gap-2">
                        <Label htmlFor="pack-name">{t('admin.createMatrimonialPack.packName')}</Label>
                        <Input 
                            id="pack-name" 
                            value={data.name} 
                            onChange={(e) => setData('name', e.target.value)} 
                            placeholder={t('admin.createMatrimonialPack.packNamePlaceholder')} 
                        />
                        {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="pack-duration">{t('admin.createMatrimonialPack.duration')} (en mois)</Label>
                        <Input 
                            id="pack-duration" 
                            type="number"
                            min="1"
                            max="120"
                            value={data.duration} 
                            onChange={(e) => setData('duration', e.target.value)} 
                            placeholder="Ex: 6"
                        />
                        {errors.duration && <p className="text-red-500 text-sm">{errors.duration}</p>}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => reset()}>{t('common.cancel')}</Button>
                    <Button onClick={submit} disabled={processing || !data.name.trim() || !data.duration}>{processing ? t('admin.createMatrimonialPack.creating') : t('admin.createMatrimonialPack.create')}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

