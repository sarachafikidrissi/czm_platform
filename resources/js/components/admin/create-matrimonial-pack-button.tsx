import { useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';

export default function CreateMatrimonialPackButton({ buttonLabel = 'Create Matrimonial Pack', className = '' }: { buttonLabel?: string; className?: string }) {
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
                    {buttonLabel}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create Matrimonial Pack</DialogTitle>
                    <DialogDescription>Create a matrimonial pack selectable during validation.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                    <div className="grid gap-2">
                        <Label htmlFor="pack-name">Pack Name</Label>
                        <Input 
                            id="pack-name" 
                            value={data.name} 
                            onChange={(e) => setData('name', e.target.value)} 
                            placeholder="Ex: Pack Gold" 
                        />
                        {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="pack-duration">Duration</Label>
                        <Input 
                            id="pack-duration" 
                            value={data.duration} 
                            onChange={(e) => setData('duration', e.target.value)} 
                            placeholder="Ex: 6 mois dont 1 mois intensif" 
                        />
                        {errors.duration && <p className="text-red-500 text-sm">{errors.duration}</p>}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => reset()}>Cancel</Button>
                    <Button onClick={submit} disabled={processing || !data.name.trim() || !data.duration.trim()}>Create</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

