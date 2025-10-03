import { useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Building } from 'lucide-react';
import { useState } from 'react';

export default function CreateAgencyButton({ buttonLabel = 'New Agency', className = '' }: { buttonLabel?: string; className?: string }) {
    const [open, setOpen] = useState(false);
    const { data, setData, post, processing, reset, errors } = useForm({
        name: '',
        address: '',
        image: null as File | null,
        map: '',
    });

    const submit = () => {
        const formData = new FormData();
        formData.append('name', data.name);
        formData.append('address', data.address);
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
                    {buttonLabel}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Create New Agency</DialogTitle>
                    <DialogDescription>Add a new agency to the system. Fill in all the required information.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Agency Name</Label>
                        <Input 
                            id="name" 
                            value={data.name} 
                            onChange={(e) => setData('name', e.target.value)}
                            placeholder="Enter agency name"
                            required
                        />
                        {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
                    </div>
                    
                    <div className="grid gap-2">
                        <Label htmlFor="address">Address</Label>
                        <Textarea 
                            id="address" 
                            value={data.address} 
                            onChange={(e) => setData('address', e.target.value)}
                            placeholder="Enter agency address"
                            required
                        />
                        {errors.address && <p className="text-red-500 text-sm">{errors.address}</p>}
                    </div>
                    
                    <div className="grid gap-2">
                        <Label htmlFor="image">Agency Image</Label>
                        <Input 
                            id="image" 
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                        />
                        {errors.image && <p className="text-red-500 text-sm">{errors.image}</p>}
                    </div>
                    
                    <div className="grid gap-2">
                        <Label htmlFor="map">Map URL/Coordinates</Label>
                        <Input 
                            id="map" 
                            value={data.map} 
                            onChange={(e) => setData('map', e.target.value)}
                            placeholder="Enter map URL or coordinates"
                        />
                        {errors.map && <p className="text-red-500 text-sm">{errors.map}</p>}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => { reset(); setOpen(false); }}>Cancel</Button>
                    <Button disabled={processing} onClick={submit}>
                        {processing ? 'Creating...' : 'Create Agency'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
