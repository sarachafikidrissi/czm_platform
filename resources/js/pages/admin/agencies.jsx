import { Head, router, usePage, useForm } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Pencil, Trash2, Users } from 'lucide-react';

export default function AdminAgencies() {
    const { agencies = [] } = usePage().props;
    const [editingAgency, setEditingAgency] = useState(null);
    const [deletingAgency, setDeletingAgency] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const { data, setData, processing, errors, reset } = useForm({
        name: '',
        country: '',
        city: '',
        address: '',
        image: null,
        map: '',
    });

    const handleEdit = (agency) => {
        setEditingAgency(agency);
    };

    // Update form data when editingAgency changes
    useEffect(() => {
        if (editingAgency) {
            const formData = {
                name: editingAgency.name || '',
                country: editingAgency.country || '',
                city: editingAgency.city || '',
                address: editingAgency.address || '',
                image: null,
                map: editingAgency.map || '',
            };
            console.log('Setting form data:', formData);
            setData(formData);
        } else {
            // Reset form when dialog closes
            reset();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editingAgency]);    

    const handleUpdate = () => {
        if (!editingAgency) return;

        console.log('Updating agency with data:', data);
        
        // Prepare the data to send
        // Note: Using POST route directly, no need for _method spoofing
        const updateData = {
            name: data.name || '',
            country: data.country || '',
            city: data.city || '',
            address: data.address || '',
            map: data.map || '',
        };
        
        // Add image if it's a File object
        if (data.image instanceof File) {
            updateData.image = data.image;
        }
        
        console.log('Prepared updateData:', updateData);
        console.log('Data object:', data);
        console.log('Editing agency ID:', editingAgency.id);
        
        // Use router.post with method spoofing for better compatibility with forceFormData
        router.post(`/admin/agencies/${editingAgency.id}`, updateData, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                setEditingAgency(null);
                reset();
            },
            onError: (errors) => {
                console.error('Update errors:', errors);
            },
        });
    };

    const handleDelete = (agency) => {
        setDeletingAgency(agency);
    };

    const confirmDelete = () => {
        if (!deletingAgency) return;

        setIsDeleting(true);
        router.delete(`/admin/agencies/${deletingAgency.id}`, {
            onSuccess: () => {
                setDeletingAgency(null);
                setIsDeleting(false);
            },
            onError: () => {
                setIsDeleting(false);
            },
        });
    };

    const getImageUrl = (agency) => {
        if (agency.image) {
            return `/storage/${agency.image}`;
        }
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(agency.name)}&background=random&size=128`;
    };

    return (
        <AppLayout>
            <Head title="Manage Agencies" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div>
                            <h1 className="text-2xl font-bold">Manage Agencies</h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                View, edit, and delete agencies
                            </p>
                        </div>
                    </div>
                </div>

                {/* Table View */}
                <Card className="overflow-hidden">
                    <CardHeader>
                        <CardTitle>Agencies</CardTitle>
                        <CardDescription>Manage all agencies in the system</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Image</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead className="hidden md:table-cell">Country</TableHead>
                                        <TableHead className="hidden lg:table-cell">City</TableHead>
                                        <TableHead className="hidden lg:table-cell">Address</TableHead>
                                        <TableHead>Staff</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {agencies.map((agency) => (
                                        <TableRow key={agency.id}>
                                            <TableCell>
                                                <img
                                                    src={getImageUrl(agency)}
                                                    alt={agency.name}
                                                    className="w-12 h-12 rounded-lg object-cover"
                                                    onError={(e) => {
                                                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(agency.name)}&background=random&size=128`;
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell className="font-medium">{agency.name}</TableCell>
                                            <TableCell className="hidden md:table-cell">{agency.country || 'N/A'}</TableCell>
                                            <TableCell className="hidden lg:table-cell">{agency.city || 'N/A'}</TableCell>
                                            <TableCell className="hidden lg:table-cell">
                                                <div className="max-w-xs truncate" title={agency.address || 'N/A'}>
                                                    {agency.address || 'N/A'}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1 text-sm">
                                                    {agency.managers_count > 0 && (
                                                        <div className="flex items-center gap-1">
                                                            <Users className="w-3 h-3 text-muted-foreground" />
                                                            <span className="text-muted-foreground">
                                                                {agency.managers_count} Manager{agency.managers_count !== 1 ? 's' : ''}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {agency.matchmakers_count > 0 && (
                                                        <div className="flex items-center gap-1">
                                                            <Users className="w-3 h-3 text-muted-foreground" />
                                                            <span className="text-muted-foreground">
                                                                {agency.matchmakers_count} Matchmaker{agency.matchmakers_count !== 1 ? 's' : ''}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {(!agency.managers_count && !agency.matchmakers_count) && (
                                                        <span className="text-muted-foreground">No staff</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleEdit(agency)}
                                                    >
                                                        <Pencil className="w-4 h-4 mr-1" />
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() => handleDelete(agency)}
                                                    >
                                                        <Trash2 className="w-4 h-4 mr-1" />
                                                        Delete
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        {agencies.length === 0 && (
                            <div className="text-center py-8">
                                <p className="text-muted-foreground">
                                    No agencies found.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Edit Dialog */}
                <Dialog open={!!editingAgency} onOpenChange={(open) => { if (!open) { setEditingAgency(null); reset(); } }}>
                    <DialogContent className="sm:max-w-[600px] sm:max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Edit Agency</DialogTitle>
                            <DialogDescription>
                                Update agency information for {editingAgency?.name}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    placeholder="Agency name"
                                />
                                {errors.name && <p className="text-error text-sm">{errors.name}</p>}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="country">Country</Label>
                                    <Input
                                        id="country"
                                        value={data.country}
                                        onChange={(e) => setData('country', e.target.value)}
                                        placeholder="Country"
                                    />
                                    {errors.country && <p className="text-error text-sm">{errors.country}</p>}
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="city">City</Label>
                                    <Input
                                        id="city"
                                        value={data.city}
                                        onChange={(e) => setData('city', e.target.value)}
                                        placeholder="City"
                                    />
                                    {errors.city && <p className="text-error text-sm">{errors.city}</p>}
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="address">Address</Label>
                                <Textarea
                                    id="address"
                                    value={data.address}
                                    onChange={(e) => setData('address', e.target.value)}
                                    placeholder="Full address"
                                    rows={3}
                                />
                                {errors.address && <p className="text-error text-sm">{errors.address}</p>}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="image">Image</Label>
                                {editingAgency?.image && (
                                    <div className="mb-2">
                                        <img
                                            src={getImageUrl(editingAgency)}
                                            alt="Current image"
                                            className="w-32 h-32 rounded-lg object-cover border"
                                        />
                                    </div>
                                )}
                                <Input
                                    id="image"
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => e.target.files?.[0] && setData('image', e.target.files[0])}
                                />
                                {errors.image && <p className="text-error text-sm">{errors.image}</p>}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="map">Map (Embed URL)</Label>
                                <Input
                                    id="map"
                                    value={data.map}
                                    onChange={(e) => setData('map', e.target.value)}
                                    placeholder="Map embed URL"
                                />
                                {errors.map && <p className="text-error text-sm">{errors.map}</p>}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => { setEditingAgency(null); reset(); }}>
                                Cancel
                            </Button>
                            <Button onClick={handleUpdate} disabled={processing}>
                                {processing ? 'Updating...' : 'Update Agency'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Delete Confirmation Dialog */}
                <Dialog open={!!deletingAgency} onOpenChange={(open) => { if (!open) { setDeletingAgency(null); } }}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Delete Agency</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete "{deletingAgency?.name}"? This action cannot be undone.
                            </DialogDescription>
                        </DialogHeader>
                        {deletingAgency && (deletingAgency.managers_count > 0 || deletingAgency.matchmakers_count > 0) && (
                            <div className="bg-warning-light p-3 rounded-lg border border-warning">
                                <p className="text-sm font-semibold mb-1">Warning:</p>
                                <p className="text-sm">
                                    This agency has {deletingAgency.managers_count + deletingAgency.matchmakers_count} staff member(s) assigned to it.
                                    You cannot delete an agency that has staff members.
                                </p>
                            </div>
                        )}
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDeletingAgency(null)}>
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={confirmDelete}
                                disabled={isDeleting || (deletingAgency && (deletingAgency.managers_count > 0 || deletingAgency.matchmakers_count > 0))}
                            >
                                {isDeleting ? 'Deleting...' : 'Delete'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}

