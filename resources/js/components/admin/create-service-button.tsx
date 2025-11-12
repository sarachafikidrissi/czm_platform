import { useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';

export default function CreateServiceButton({ buttonLabel, className = '' }: { buttonLabel?: string; className?: string }) {
    const { t } = useTranslation();
    const defaultButtonLabel = buttonLabel || t('admin.createService.newService');
    const { data, setData, post, processing, reset, errors } = useForm({
        name: '',
    });

    const submit = () => {
        post('/admin/services', {
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
                    <DialogTitle>{t('admin.createService.title')}</DialogTitle>
                    <DialogDescription>{t('admin.createService.description')}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                    <div className="grid gap-2">
                        <Label htmlFor="service-name">{t('admin.createService.serviceName')}</Label>
                        <Input id="service-name" value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder={t('admin.createService.serviceNamePlaceholder')} />
                        {errors.name && <p className="text-error text-sm">{errors.name}</p>}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => reset()}>{t('common.cancel')}</Button>
                    <Button onClick={submit} disabled={processing || !data.name.trim()}>{processing ? t('admin.createService.creating') : t('admin.createService.create')}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


