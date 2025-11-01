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
    const { prospects = [], services = [], matrimonialPacks = [] } = usePage().props;
    const { data, setData, post, processing, errors, reset } = useForm({
        notes: '',
        cin: '',
        identity_card_front: null,
        service_id: '',
        matrimonial_pack_id: '',
        pack_price: '',
        pack_advantages: [],
        payment_mode: '',
    });
    const [validatingProspect, setValidatingProspect] = useState(null);    
    // Pre-fill form when prospect is selected
    const handleValidateClick = (prospect) => {
        setValidatingProspect(prospect);
        
        // Pre-fill from profile if user already provided
        const profile = prospect.profile;
        console.log(profile);
        
        if (profile) {
            // Pre-fill CNI if user already provided it (show masked version)
            if (profile.cin && profile.cin_decrypted) {
                const decryptedCin = profile.cin_decrypted;
                const masked = decryptedCin.length > 3 
                    ? decryptedCin.substring(0, 4) + '****' + decryptedCin.substring(decryptedCin.length - 1)
                    : '****';
                setData('cin', decryptedCin);
            } else {
                setData('cin', '');
            }
            
            // Other fields
            setData('notes', profile.notes || '');
            setData('service_id', profile.service_id || '');
            setData('matrimonial_pack_id', profile.matrimonial_pack_id || '');
            setData('pack_price', profile.pack_price || '');
            setData('pack_advantages', profile.pack_advantages || []);
            setData('payment_mode', profile.payment_mode || '');
        }
    };
    
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
                                    <TableHead>Dispatched To</TableHead>
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
                                        <TableCell>
                                            {p.assigned_matchmaker_id ? (
                                                <div className="text-sm">
                                                    <div className="font-medium text-green-600">Matchmaker: {p.assigned_matchmaker?.name || 'Unknown'}</div>
                                                    {p.agency_id && (
                                                        <div className="text-blue-600">Agency: {p.agency?.name || 'Unknown'}</div>
                                                    )}
                                                </div>
                                            ) : p.agency_id ? (
                                                <span className="text-blue-600">Agency: {p.agency?.name || 'Unknown'}</span>
                                            ) : (
                                                <span className="text-gray-500">Not dispatched</span>
                                            )}
                                        </TableCell>
                                        <TableCell>{new Date(p.created_at ?? Date.now()).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-right">
                                            <Button size="sm" onClick={() => handleValidateClick(p)}>Validate</Button>
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
                <DialogContent className="sm:w-[500px]   sm:max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Validate Prospect</DialogTitle>
                        <DialogDescription>
                            Complete validation for {validatingProspect?.name}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-2">
                        <div className="grid gap-2">
                            <Label htmlFor="cin">
                                CIN {!validatingProspect?.profile?.cin && '*'}
                                {validatingProspect?.profile?.cin && (
                                    <span className="text-xs text-gray-500 ml-2">(Déjà rempli par le prospect)</span>
                                )}
                            </Label>
                            {validatingProspect?.profile?.cin ? (
                                <Input 
                                    id="cin" 
                                    value={data.cin} 
                                    disabled 
                                    className="bg-gray-100"
                                />
                            ) : (
                                <Input 
                                    id="cin" 
                                    value={data.cin} 
                                    onChange={(e) => setData('cin', e.target.value)} 
                                    placeholder="Ex: A123456 or AB1234" 
                                />
                            )}
                            {errors.cin && <p className="text-red-500 text-sm">{errors.cin}</p>}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="front">
                                Identity Card Front {!validatingProspect?.profile?.identity_card_front_path && '*'}
                                {validatingProspect?.profile?.identity_card_front_path && (
                                    <span className="text-xs text-gray-500 ml-2">(Déjà téléchargée)</span>
                                )}
                            </Label>
                            {validatingProspect?.profile?.identity_card_front_path ? (
                                <div className="space-y-2">
                                    <div className="relative rounded-lg border-2 border-gray-200 overflow-hidden bg-gray-50">
                                        <img 
                                            src={`/storage/${validatingProspect.profile.identity_card_front_path}`}
                                            alt="CNI Front Preview"
                                            className="w-full h-auto max-h-48 object-cover"
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="150"%3E%3Crect fill="%23e5e7eb" width="200" height="150"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle" fill="%239ca3af" font-family="Arial" font-size="14"%3EImage non disponible%3C/text%3E%3C/svg%3E';
                                            }}
                                        />
                                    </div>
                                    <a 
                                        href={`/storage/${validatingProspect.profile.identity_card_front_path}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-600 hover:underline inline-block"
                                    >
                                        Ouvrir dans un nouvel onglet
                                    </a>
                                </div>
                            ) : (
                                <Input 
                                    id="front" 
                                    type="file" 
                                    accept="image/*" 
                                    onChange={(e) => e.target.files?.[0] && setData('identity_card_front', e.target.files[0])} 
                                />
                            )}
                            {errors.identity_card_front && <p className="text-red-500 text-sm">{errors.identity_card_front}</p>}
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
                            <Label htmlFor="matrimonial_pack">Matrimonial Pack</Label>
                            <Select value={data.matrimonial_pack_id} onValueChange={(v) => setData('matrimonial_pack_id', v)}>
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
                            <Input id="pack_price" type="number" value={data.pack_price} onChange={(e) => setData('pack_price', e.target.value)} placeholder="Enter price" />
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
                                            checked={data.pack_advantages.includes(advantage)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setData('pack_advantages', [...data.pack_advantages, advantage]);
                                                } else {
                                                    setData('pack_advantages', data.pack_advantages.filter(a => a !== advantage));
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
                            <Label htmlFor="payment_mode">Mode de Paiement</Label>
                            <Select value={data.payment_mode} onValueChange={(v) => setData('payment_mode', v)}>
                                <SelectTrigger className="h-9 w-full"><SelectValue placeholder="Choisir un mode de paiement" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Virement">Virement</SelectItem>
                                    <SelectItem value="Caisse agence">Caisse agence</SelectItem>
                                    <SelectItem value="Chèque">Chèque</SelectItem>
                                    <SelectItem value="CMI">CMI</SelectItem>
                                    <SelectItem value="Avance">Avance</SelectItem>
                                    <SelectItem value="Reliquat">Reliquat</SelectItem>
                                    <SelectItem value="RDV">RDV</SelectItem>
                                </SelectContent>
                            </Select>
                            {errors.payment_mode && <p className="text-red-500 text-sm">{errors.payment_mode}</p>}
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
                                    // Check if CNI and front are needed
                                    const hasExistingCin = validatingProspect?.profile?.cin;
                                    const hasExistingFront = validatingProspect?.profile?.identity_card_front_path;
                                    const needsCin = !hasExistingCin;
                                    const needsFront = !hasExistingFront;
                                    
                                    // Basic validation
                                    if ((needsCin && !data.cin) || (needsFront && !data.identity_card_front) || !data.service_id || !data.matrimonial_pack_id || !data.pack_price || !data.payment_mode || data.pack_advantages.length === 0) {
                                        alert('Please fill in all required fields');
                                        return;
                                    }

                                    // Use useForm's post method instead of manual FormData
                                    post(`/staff/prospects/${validatingProspect?.id}/validate`, {
                                        forceFormData: true,
                                        onError: (err) => {
                                            console.error('Validation error:', err);
                                            alert('Validation failed: ' + (err.message || 'Please check all fields'));
                                        },
                                        onSuccess: () => { 
                                            setValidatingProspect(null); 
                                            reset(); 
                                        },
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


