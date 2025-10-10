import { Head, router, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, User } from 'lucide-react';
import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';

export default function MatchmakerProspects() {
    const { prospects, filter, services = [], matrimonialPacks = [] } = usePage().props;
    const [selectedProspect, setSelectedProspect] = useState(null);
    const [notes, setNotes] = useState('');
    const [serviceId, setServiceId] = useState('');
    const [matrimonialPackId, setMatrimonialPackId] = useState('');
    const [packPrice, setPackPrice] = useState('');
    const [packAdvantages, setPackAdvantages] = useState([]);
    const [cin, setCin] = useState('');
    const [cinError, setCinError] = useState(null);
    const [front, setFront] = useState(null);
    const [back, setBack] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState({ notes: null, recommendations: null, cin: null, identity_card_front: null, identity_card_back: null, general: null });
    console.log(prospects);
    

    const handleValidate = (prospect) => {
        setSelectedProspect(prospect);
        setNotes('');
        setServiceId('');
        setMatrimonialPackId('');
        setPackPrice('');
        setPackAdvantages([]);
    };

    const submitValidation = () => {
        const re = /^[A-Za-z]{1,2}\d{4,6}$/;
        const ok = re.test(cin.trim());
        setCinError(ok ? null : 'CIN invalide. Ex: A123456 ou AB1234');
        setErrors({ notes: null, recommendations: null, cin: ok ? null : 'CIN invalide. Ex: A123456 ou AB1234', identity_card_front: front ? null : 'Front image is required', identity_card_back: back ? null : 'Back image is required', general: null });
        if (!ok || !front || !back) return;

        const fd = new FormData();
        fd.append('notes', notes);
        fd.append('service_id', serviceId);
        fd.append('matrimonial_pack_id', matrimonialPackId);
        fd.append('pack_price', packPrice);
        fd.append('pack_advantages', JSON.stringify(packAdvantages));
        fd.append('cin', cin);
        fd.append('identity_card_front', front);
        fd.append('identity_card_back', back);

        setSubmitting(true);
        router.post(`/staff/prospects/${selectedProspect.id}/validate`, fd, {
            forceFormData: true,
            onError: (err) => {
                setSubmitting(false);
                setErrors((prev) => ({
                    ...prev,
                    notes: err?.notes || null,
                    recommendations: err?.recommendations || null,
                    cin: err?.cin || prev.cin,
                    identity_card_front: err?.identity_card_front || null,
                    identity_card_back: err?.identity_card_back || null,
                    general: err?.message || 'Une erreur est survenue. Veuillez réessayer.'
                }));
            },
            onSuccess: () => {
                setSubmitting(false);
                setSelectedProspect(null);
                setNotes('');
                setServiceId('');
                setMatrimonialPackId('');
                setPackPrice('');
                setPackAdvantages([]);
                setCin('');
                setFront(null);
                setBack(null);
                setErrors({ notes: null, recommendations: null, cin: null, identity_card_front: null, identity_card_back: null, general: null });
            }
        });
    };

    return (
        <AppLayout>
            <Head title="Prospects" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
            <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Prospects</h1>
                    <Badge variant="outline">{prospects.length} prospects</Badge>
                </div>
                <div className="flex flex-wrap items-center gap-3 bg-white rounded-lg p-3 border">
                    <div className="flex items-center gap-2">
                        <Label className="text-sm text-muted-foreground">View</Label>
                        <Select value={filter || 'all'} onValueChange={(v) => router.visit(`/staff/prospects?filter=${v}`, { preserveScroll: true, preserveState: true, replace: true })}>
                            <SelectTrigger className="h-9 w-[160px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="complete">Profile Complete</SelectItem>
                                <SelectItem value="incomplete">Incomplete</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {/* removed status filter per requirements */}
                    <Separator orientation="vertical" className="h-6" />
                    {/* removed search per requirements */}
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
                    <CardTitle>Available Prospects</CardTitle>
                    <CardDescription>
                        Review and validate prospects to assign them to your care
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-10"></TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Profile</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {prospects.map((prospect) => (
                                <TableRow key={prospect.id}>
                                    <TableCell><input type="checkbox" className="accent-neutral-800" /></TableCell>
                                    <TableCell className="font-medium">{prospect.name}</TableCell>
                                    <TableCell className="text-muted-foreground">{new Date(prospect.created_at ?? Date.now()).toLocaleDateString()}</TableCell>
                                    <TableCell>{prospect.phone}</TableCell>
                                    <TableCell>
                                        {prospect.profile.is_completed == 1 ? (
                                            <Badge className="bg-green-100 text-green-800">
                                                Profile Complete
                                            </Badge>
                                        ) : (
                                            <Badge className="bg-yellow-100 text-yellow-800">
                                                Profile Incomplete
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleValidate(prospect)}
                                                >
                                                    <CheckCircle className="w-4 h-4 mr-2" />
                                                    Validate
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="sm:max-w-[425px]">
                                                <DialogHeader>
                                                    <DialogTitle>Validate Prospect</DialogTitle>
                                                <DialogDescription>
                                                    Add notes and select a service for {prospect.name}
                                                </DialogDescription>
                                                </DialogHeader>
                                                <div className="grid gap-4 py-4">
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="notes">Notes</Label>
                                                        <Textarea
                                                            id="notes"
                                                            value={notes}
                                                            onChange={(e) => setNotes(e.target.value)}
                                                            placeholder="Add your notes about this prospect..."
                                                        />
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="service">Service</Label>
                                                        <Select value={serviceId} onValueChange={setServiceId}>
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
                                                        <Label htmlFor="matrimonial_pack">Matrimonial Pack</Label>
                                                        <Select value={matrimonialPackId} onValueChange={setMatrimonialPackId}>
                                                            <SelectTrigger className="h-9 w-full"><SelectValue placeholder="Choose a pack" /></SelectTrigger>
                                                            <SelectContent>
                                                                {matrimonialPacks.map((pack) => (
                                                                    <SelectItem key={pack.id} value={String(pack.id)}>{pack.name} - {pack.duration}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        {errors.matrimonial_pack_id && <p className="text-red-500 text-sm">{errors.matrimonial_pack_id}</p>}
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="pack_price">Pack Price (MAD)</Label>
                                                        <Input id="pack_price" type="number" value={packPrice} onChange={(e) => setPackPrice(e.target.value)} placeholder="Enter price" />
                                                        {errors.pack_price && <p className="text-red-500 text-sm">{errors.pack_price}</p>}
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <Label>Pack Advantages</Label>
                                                        <div className="grid gap-2 max-h-40 overflow-y-auto border rounded p-2">
                                                            {[
                                                                'Suivi et accompagnement personnalisé',
                                                                'Suivi et accompagnement approfondi',
                                                                'Suivi et accompagnement premium',
                                                                'Suivi et accompagnement exclusif avec assistance personnalisée',
                                                                'Rendez-vous avec des profils compatibles',
                                                                'Rendez-vous avec des profils correspondant à vos attentes',
                                                                'Rendez-vous avec des profils soigneusement sélectionnés',
                                                                'Rendez-vous illimités avec des profils rigoureusement sélectionnés',
                                                                'Formations pré-mariage avec le profil choisi',
                                                                'Formations pré-mariage avancées avec le profil choisi',
                                                                'Accès prioritaire aux nouveaux profils',
                                                                'Accès prioritaire aux profils VIP',
                                                                'Réduction à vie sur les séances de conseil conjugal et coaching familial (-10% à -25%)'
                                                            ].map((advantage) => (
                                                                <label key={advantage} className="flex items-center gap-2">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={packAdvantages.includes(advantage)}
                                                                        onChange={(e) => {
                                                                            if (e.target.checked) {
                                                                                setPackAdvantages([...packAdvantages, advantage]);
                                                                            } else {
                                                                                setPackAdvantages(packAdvantages.filter(a => a !== advantage));
                                                                            }
                                                                        }}
                                                                    />
                                                                    <span className="text-sm">{advantage}</span>
                                                                </label>
                                                            ))}
                                                        </div>
                                                        {errors.pack_advantages && <p className="text-red-500 text-sm">{errors.pack_advantages}</p>}
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="cin">CIN</Label>
                                                        <Input id="cin" value={cin} onChange={(e) => setCin(e.target.value)} placeholder="Ex: A123456 or AB1234" />
                                                        {cinError && <p className="text-red-500 text-sm">{cinError}</p>}
                                                        {errors.cin && <p className="text-red-500 text-sm">{errors.cin}</p>}
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="grid gap-2">
                                                            <Label htmlFor="front">Identity Card Front</Label>
                                                            <Input id="front" type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && setFront(e.target.files[0])} />
                                                            {errors.identity_card_front && <p className="text-red-500 text-sm">{errors.identity_card_front}</p>}
                                                        </div>
                                                        <div className="grid gap-2">
                                                            <Label htmlFor="back">Identity Card Back</Label>
                                                            <Input id="back" type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && setBack(e.target.files[0])} />
                                                            {errors.identity_card_back && <p className="text-red-500 text-sm">{errors.identity_card_back}</p>}
                                                        </div>
                                                    </div>
                                                    {errors.general && (
                                                        <div className="text-red-600 text-sm">{errors.general}</div>
                                                    )}
                                                </div>
                                                <DialogFooter>
                                                    <Button onClick={submitValidation} disabled={submitting}>
                                                        Validate & Assign
                                                    </Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    
                    {prospects.length === 0 && (
                        <div className="text-center py-8">
                            <User className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                            <p className="text-gray-500">No prospects available at the moment.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
            </div>
        </AppLayout>
    );
}
