import { Head, router, usePage, useForm } from '@inertiajs/react';
import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

export default function AgencyProspects() {
    const { prospects = [], services = [] } = usePage().props;
    const { data, setData, post, processing, errors, reset } = useForm({
        notes: '',
        cin: '',
        identity_card_front: null,
        identity_card_back: null,
        service_id: '',
    });
    const [validatingProspect, setValidatingProspect] = useState(null);

    return (
        <AppLayout>
            <Head title="Agency Prospects" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-bold">Prospects</h1>
                        <Badge variant="outline">{prospects.length} users</Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 bg-white rounded-lg p-3 border">
                        <div className="flex items-center gap-2">
                            <Label className="text-sm text-muted-foreground">View</Label>
                            <Select value={'all'} onValueChange={() => {}}>
                                <SelectTrigger className="h-9 w-[160px]"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Separator orientation="vertical" className="h-6" />
                        <div className="ml-auto flex items-center gap-2">
                            <Button variant="outline" className="h-9">
                                Date Range
                            </Button>
                            <Button variant="outline" className="h-9">
                                Filter
                            </Button>
                        </div>
                    </div>
                </div>

                <Card className="overflow-hidden">
                    <CardHeader>
                        <CardTitle>Prospects for Your Agency</CardTitle>
                        <CardDescription>Review and validate prospects assigned to your agency</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Country</TableHead>
                                    <TableHead>City</TableHead>
                                    <TableHead>Phone</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {prospects.map((p) => (
                                    <TableRow key={p.id}>
                                        <TableCell className="font-medium">{p.name}</TableCell>
                                        <TableCell>{p.country}</TableCell>
                                        <TableCell>{p.city}</TableCell>
                                        <TableCell>{p.phone}</TableCell>
                                        <TableCell>{new Date(p.created_at ?? Date.now()).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-right">
                                            <Button size="sm" onClick={() => setValidatingProspect(p)}>Validate</Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        {prospects.length === 0 && (
                            <div className="text-sm text-muted-foreground mt-4">No prospects assigned to your agency yet.</div>
                        )}
                    </CardContent>
                </Card>
            </div>
            <Dialog open={!!validatingProspect} onOpenChange={(open) => { if (!open) { setValidatingProspect(null); reset(); } }}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Validate Prospect</DialogTitle>
                        <DialogDescription>
                            Complete validation for {validatingProspect?.name}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-2">
                        <div className="grid gap-2">
                            <Label htmlFor="cin">CIN</Label>
                            <Input id="cin" value={data.cin} onChange={(e) => setData('cin', e.target.value)} placeholder="Ex: A123456 or AB1234" />
                            {errors.cin && <p className="text-red-500 text-sm">{errors.cin}</p>}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="grid gap-2">
                                <Label htmlFor="front">Identity Card Front</Label>
                                <Input id="front" type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && setData('identity_card_front', e.target.files[0])} />
                                {errors.identity_card_front && <p className="text-red-500 text-sm">{errors.identity_card_front}</p>}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="back">Identity Card Back</Label>
                                <Input id="back" type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && setData('identity_card_back', e.target.files[0])} />
                                {errors.identity_card_back && <p className="text-red-500 text-sm">{errors.identity_card_back}</p>}
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="service">Service</Label>
                            <Select value={data.service_id} onValueChange={(v) => setData('service_id', v)}>
                                <SelectTrigger className="h-9 w-full"><SelectValue placeholder="Choose a service" /></SelectTrigger>
                                <SelectContent>
                                    {services.map((s) => (
                                        <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.service_id && <p className="text-red-500 text-sm">{errors.service_id}</p>}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea id="notes" value={data.notes} onChange={(e) => setData('notes', e.target.value)} placeholder="Add your notes about this prospect..." />
                            {errors.notes && <p className="text-red-500 text-sm">{errors.notes}</p>}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setValidatingProspect(null); reset(); }}>Cancel</Button>
                        <Button
                            onClick={() => {
                                const fd = new FormData();
                                fd.append('notes', data.notes || '');
                                fd.append('cin', data.cin || '');
                                if (data.identity_card_front) fd.append('identity_card_front', data.identity_card_front);
                                if (data.identity_card_back) fd.append('identity_card_back', data.identity_card_back);
                                fd.append('service_id', data.service_id);
                                router.post(`/staff/prospects/${validatingProspect?.id}/validate`, fd, {
                                    forceFormData: true,
                                    onSuccess: () => { setValidatingProspect(null); reset(); },
                                });
                            }}
                            disabled={processing}
                        >
                            Validate & Assign
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}


