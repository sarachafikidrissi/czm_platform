import { useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';

export default function CreateServiceButton({ buttonLabel = 'Create Service', className = '' }: { buttonLabel?: string; className?: string }) {
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
                    {buttonLabel}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create Service</DialogTitle>
                    <DialogDescription>Create a service selectable during validation.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                    <div className="grid gap-2">
                        <Label htmlFor="service-name">Service Name</Label>
                        <Input id="service-name" value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder="Ex: Consultation" />
                        {errors.name && <p className="text-error text-sm">{errors.name}</p>}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => reset()}>Cancel</Button>
                    <Button onClick={submit} disabled={processing || !data.name.trim()}>Create</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


