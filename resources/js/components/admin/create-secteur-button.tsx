import { useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';

export default function CreateSecteurButton({ buttonLabel, className = '' }: { buttonLabel?: string; className?: string }) {
    const { t } = useTranslation();
    const defaultButtonLabel = buttonLabel || 'Ajouter un secteur';
    const { data, setData, post, processing, reset, errors } = useForm({
        name: '',
    });

    const submit = () => {
        post('/admin/secteurs', {
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
                    <DialogTitle>Ajouter un secteur d'activité</DialogTitle>
                    <DialogDescription>Créez un nouveau secteur d'activité qui sera disponible dans le formulaire de profil.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                    <div className="grid gap-2">
                        <Label htmlFor="secteur-name">Nom du secteur *</Label>
                        <Input 
                            id="secteur-name" 
                            value={data.name} 
                            onChange={(e) => setData('name', e.target.value)} 
                            placeholder="Ex: Agriculture" 
                        />
                        {errors.name && <p className="text-error text-sm">{errors.name}</p>}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => reset()}>Annuler</Button>
                    <Button onClick={submit} disabled={processing || !data.name.trim()}>
                        {processing ? 'Création...' : 'Créer'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

