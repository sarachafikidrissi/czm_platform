import { Head, router, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, User, XCircle } from 'lucide-react';
import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';

export default function MatchmakerProspects() {
    const { prospects = [], filter, statusFilter = 'active', services = [], matrimonialPacks = [], auth } = usePage().props;
    const [selectedProspect, setSelectedProspect] = useState(null);
    const [notes, setNotes] = useState('');
    const [serviceId, setServiceId] = useState('');
    const [matrimonialPackId, setMatrimonialPackId] = useState('');
    const [packPrice, setPackPrice] = useState('');
    const [packAdvantages, setPackAdvantages] = useState([]);
    const [paymentMode, setPaymentMode] = useState('');
    const [cin, setCin] = useState('');
    const [cinError, setCinError] = useState(null);
    const [front, setFront] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState({ notes: null, recommendations: null, cin: null, identity_card_front: null, payment_mode: null, general: null });
    
    // Rejection dialog state
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [rejecting, setRejecting] = useState(false);
    
    // Acceptance dialog state
    const [acceptDialogOpen, setAcceptDialogOpen] = useState(false);
    const [acceptanceReason, setAcceptanceReason] = useState('');
    const [accepting, setAccepting] = useState(false);
    const [selectedProspectForAccept, setSelectedProspectForAccept] = useState(null);
    
    const { role: userRole } = usePage().props; // Get role from shared props
    const currentUser = auth?.user;
    const userId = currentUser?.id || null;
    const userAgencyId = currentUser?.agency_id || null;
    
    // Check if current user can reject a prospect
    const canRejectProspect = (prospect) => {
        if (!prospect || prospect.status !== 'prospect') return false;
        if (!userRole || !userId) return false;
        if (userRole === 'admin') return true;
        // Matchmaker can reject if assigned to them OR if prospect is from their agency and was added by manager
        if (userRole === 'matchmaker') {
            if (prospect.assigned_matchmaker_id === userId) return true;
            if (prospect.agency_id === userAgencyId && prospect.assigned_matchmaker_id === null) return true;
        }
        if (userRole === 'manager' && prospect.agency_id === userAgencyId) return true;
        return false;
    };
    
    const handleReject = (prospect) => {
        setSelectedProspect(prospect);
        setRejectionReason('');
        setRejectDialogOpen(true);
    };
    
    const submitRejection = () => {
        if (!selectedProspect || !rejectionReason.trim()) return;
        
        setRejecting(true);
        router.post(`/staff/prospects/${selectedProspect.id}/reject`, {
            rejection_reason: rejectionReason
        }, {
            onSuccess: () => {
                setRejectDialogOpen(false);
                setRejectionReason('');
                setSelectedProspect(null);
                setRejecting(false);
            },
            onError: () => {
                setRejecting(false);
            }
        });
    };
    
    const handleAccept = (prospect) => {
        setSelectedProspectForAccept(prospect);
        setAcceptanceReason('');
        setAcceptDialogOpen(true);
    };
    
    const submitAcceptance = () => {
        if (!selectedProspectForAccept || !acceptanceReason.trim()) return;
        
        setAccepting(true);
        router.post(`/staff/prospects/${selectedProspectForAccept.id}/accept`, {
            acceptance_reason: acceptanceReason
        }, {
            onSuccess: () => {
                setAcceptDialogOpen(false);
                setAcceptanceReason('');
                setSelectedProspectForAccept(null);
                setAccepting(false);
            },
            onError: () => {
                setAccepting(false);
            }
        });
    };
    
    // Check if user can accept a rejected prospect (same authorization as reject)
    const canAcceptProspect = (prospect) => {
        if (!prospect || !prospect.rejection_reason) return false;
        if (!userRole || !userId) return false;
        if (userRole === 'admin') return true;
        // Matchmaker can accept if assigned to them OR if prospect is from their agency and was added by manager
        if (userRole === 'matchmaker') {
            if (prospect.assigned_matchmaker_id === userId) return true;
            if (prospect.agency_id === userAgencyId && prospect.assigned_matchmaker_id === null) return true;
        }
        if (userRole === 'manager' && prospect.agency_id === userAgencyId) return true;
        return false;
    };
    
    console.log(prospects);
    

    const handleValidate = (prospect) => {
        setSelectedProspect(prospect);
        setNotes(prospect.profile?.notes || '');
        setServiceId(prospect.profile?.service_id || '');
        setMatrimonialPackId(prospect.profile?.matrimonial_pack_id || '');
        setPackPrice(prospect.profile?.pack_price || '');
        setPackAdvantages(prospect.profile?.pack_advantages || []);
        setPaymentMode(prospect.profile?.payment_mode || '');
        
        // Pre-fill CNI if user already provided it
        // Backend sends cin_decrypted for display (we show masked version)
        if (prospect.profile?.cin && prospect.profile?.cin_decrypted) {
            // Show masked CNI (e.g., A1****6)
            const decryptedCin = prospect.profile.cin_decrypted;
            const masked = decryptedCin.length > 3 
                ? decryptedCin.substring(0, 2) + '****' + decryptedCin.substring(decryptedCin.length - 1)
                : '****';
            setCin(masked);
        } else {
            setCin('');
        }
        
        // If user already uploaded front, we won't show it but mark that it exists
        setFront(null);
    };

    const submitValidation = () => {
        const hasExistingCin = selectedProspect?.profile?.cin;
        const hasExistingFront = selectedProspect?.profile?.identity_card_front_path;
        const needsCin = !hasExistingCin;
        const needsFront = !hasExistingFront;
        // Validate CNI only if needed and provided
        let cinOk = true;
        let cinValue = null;
        if (needsCin) {
            if (!cin || cin.trim() === '' || cin.includes('****')) {
                setCinError('CIN est requis');
                cinOk = false;
            } else {
                const re = /^[A-Za-z]{1,2}\d{4,6}$/;
                cinOk = re.test(cin.trim());
                setCinError(cinOk ? null : 'CIN invalide. Ex: A123456 ou AB1234');
                if (cinOk) {
                    cinValue = cin.trim();
                }
            }
        } else {
            // User already provided CNI, use existing decrypted value from profile
            // Backend sends cin_decrypted for display purposes
            cinValue = selectedProspect?.profile?.cin_decrypted || hasExistingCin;
            setCinError(null);
        }
        
        setErrors({ 
            notes: null, 
            recommendations: null, 
            cin: cinOk ? null : (needsCin ? 'CIN est requis' : 'CIN invalide. Ex: A123456 ou AB1234'), 
            identity_card_front: (needsFront && !front) ? 'Front image is required' : null, 
            payment_mode: null, 
            general: null 
        });
        
        if (!cinOk || (needsFront && !front)) return;

        const fd = new FormData();
        fd.append('notes', notes);
        fd.append('service_id', serviceId);
        fd.append('matrimonial_pack_id', matrimonialPackId);
        fd.append('pack_price', packPrice);
        fd.append('pack_advantages', JSON.stringify(packAdvantages));
        fd.append('payment_mode', paymentMode);
        
        // Only send CNI if matchmaker needs to fill it (user didn't provide it)
        // Backend will use existing value if user already provided it
        if (needsCin && cinValue) {
            fd.append('cin', cinValue);
        }
        
        // Only send front if matchmaker needs to fill it (user didn't provide it)
        // Backend will use existing path if user already provided it
        if (needsFront && front) {
            fd.append('identity_card_front', front);
        }

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
                    payment_mode: err?.payment_mode || null,
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
                setPaymentMode('');
                setCin('');
                setFront(null);
                setErrors({ notes: null, recommendations: null, cin: null, identity_card_front: null, payment_mode: null, general: null });
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
                <div className="flex flex-wrap items-center gap-3 bg-card rounded-lg p-3 border">
                    <div className="flex items-center gap-2">
                        <Label className="text-sm text-muted-foreground">View</Label>
                        <Select value={filter || 'all'} onValueChange={(v) => router.visit(`/staff/prospects?filter=${v}&status_filter=${statusFilter}`, { preserveScroll: true, preserveState: true, replace: true })}>
                            <SelectTrigger className="h-9 w-[160px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="complete">Profile Complete</SelectItem>
                                <SelectItem value="incomplete">Incomplete</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center gap-2">
                        <Label className="text-sm text-muted-foreground">Status</Label>
                        <Select value={statusFilter || 'active'} onValueChange={(v) => router.visit(`/staff/prospects?filter=${filter || 'all'}&status_filter=${v}`, { preserveScroll: true, preserveState: true, replace: true })}>
                            <SelectTrigger className="h-9 w-[160px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="active">Actifs</SelectItem>
                                <SelectItem value="rejected">Rejetés</SelectItem>
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
                    <CardTitle>
                        {statusFilter === 'rejected' ? 'Prospects Rejetés' : 'Available Prospects'}
                    </CardTitle>
                    <CardDescription>
                        {statusFilter === 'rejected' 
                            ? 'Prospects précédemment rejetés. Vous pouvez les accepter pour les remettre dans la liste de validation.'
                            : 'Review and validate prospects to assign them to your care'}
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
                                {statusFilter === 'rejected' && <TableHead>Raison du rejet</TableHead>}
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {prospects.map((prospect) => (
                                <TableRow key={prospect.id} className={statusFilter === 'rejected' ? 'bg-error-light' : ''}>
                                    <TableCell><input type="checkbox" className="accent-primary" /></TableCell>
                                    <TableCell className="font-medium">{prospect.name}</TableCell>
                                    <TableCell className="text-muted-foreground">{new Date(prospect.created_at ?? Date.now()).toLocaleDateString()}</TableCell>
                                    <TableCell>{prospect.phone}</TableCell>
                                    <TableCell>
                                        {statusFilter === 'rejected' ? (
                                            <Badge className="bg-error text-error-foreground">
                                                Rejeté
                                            </Badge>
                                        ) : (
                                            prospect.profile.is_completed == 1 ? (
                                                <Badge className="bg-success text-success-foreground">
                                                    Profile Complete
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-warning-light text-warning-foreground">
                                                    Profile Incomplete
                                                </Badge>
                                            )
                                        )}
                                    </TableCell>
                                    {statusFilter === 'rejected' && (
                                        <TableCell className="max-w-xs">
                                            <p className="text-sm text-error truncate" title={prospect.rejection_reason}>
                                                {prospect.rejection_reason || 'N/A'}
                                            </p>
                                        </TableCell>
                                    )}
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            {statusFilter === 'active' ? (
                                                <>
                                                    {canRejectProspect(prospect) && (
                                                        <Button
                                                            size="sm"
                                                            variant="destructive"
                                                            onClick={() => handleReject(prospect)}
                                                        >
                                                            <XCircle className="w-4 h-4 mr-2" />
                                                            Rejeter
                                                        </Button>
                                                    )}
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
                                                        {errors.service_id && <p className="text-error text-sm">{errors.service_id}</p>}
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
                                                        {errors.pack_advantages && <p className="text-error text-sm">{errors.pack_advantages}</p>}
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="payment_mode">Mode de Paiement</Label>
                                                        <Select value={paymentMode} onValueChange={setPaymentMode}>
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
                                                        {errors.payment_mode && <p className="text-error text-sm">{errors.payment_mode}</p>}
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="cin">
                                                            CIN {!selectedProspect?.profile?.cin && '*'}
                                                            {selectedProspect?.profile?.cin && (
                                                                <span className="text-xs text-muted-foreground ml-2">(Déjà rempli par le prospect)</span>
                                                            )}
                                                        </Label>
                                                        {selectedProspect?.profile?.cin ? (
                                                            <Input 
                                                                id="cin" 
                                                                value={cin} 
                                                                disabled 
                                                                className="bg-muted"
                                                            />
                                                        ) : (
                                                            <Input 
                                                                id="cin" 
                                                                value={cin} 
                                                                onChange={(e) => setCin(e.target.value)} 
                                                                placeholder="Ex: A123456 or AB1234" 
                                                            />
                                                        )}
                                                        {cinError && <p className="text-error text-sm">{cinError}</p>}
                                                        {errors.cin && <p className="text-error text-sm">{errors.cin}</p>}
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="grid gap-2">
                                                            <Label htmlFor="front">
                                                                Identity Card Front {!selectedProspect?.profile?.identity_card_front_path && '*'}
                                                                {selectedProspect?.profile?.identity_card_front_path && (
                                                                    <span className="text-xs text-muted-foreground ml-2">(Déjà téléchargée)</span>
                                                                )}
                                                            </Label>
                                                            {selectedProspect?.profile?.identity_card_front_path ? (
                                                                <div className="space-y-2">
                                                                    <div className="relative inline-block rounded-lg border-2 border-border overflow-hidden bg-muted">
                                                                        <img 
                                                                            src={`/storage/${selectedProspect.profile.identity_card_front_path}`}
                                                                            alt="CNI Front Preview"
                                                                            className="max-w-full h-auto max-h-48 object-contain"
                                                                            onError={(e) => {
                                                                                e.target.onerror = null;
                                                                                e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="150"%3E%3Crect fill="%23e5e7eb" width="200" height="150"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle" fill="%239ca3af" font-family="Arial" font-size="14"%3EImage non disponible%3C/text%3E%3C/svg%3E';
                                                                            }}
                                                                        />
                                                                    </div>
                                                                    <a 
                                                                        href={`/storage/${selectedProspect.profile.identity_card_front_path}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="text-xs text-primary hover:underline inline-block"
                                                                    >
                                                                        Ouvrir dans un nouvel onglet
                                                                    </a>
                                                                </div>
                                                            ) : (
                                                                <Input id="front" type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && setFront(e.target.files[0])} />
                                                            )}
                                                            {errors.identity_card_front && <p className="text-error text-sm">{errors.identity_card_front}</p>}
                                                        </div>
                                                    </div>
                                                    {errors.general && (
                                                        <div className="text-error text-sm">{errors.general}</div>
                                                    )}
                                                </div>
                                                <DialogFooter>
                                                    <Button onClick={submitValidation} disabled={submitting}>
                                                        Validate & Assign
                                                    </Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                                </>
                                            ) : (
                                                <>
                                                    {canAcceptProspect(prospect) && (
                                                        <Button
                                                            size="sm"
                                                            variant="default"
                                                            className="bg-success hover:opacity-90"
                                                            onClick={() => handleAccept(prospect)}
                                                        >
                                                            <CheckCircle className="w-4 h-4 mr-2" />
                                                            Accepter
                                                        </Button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    
                    {prospects.length === 0 && (
                        <div className="text-center py-8">
                            <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">
                                {statusFilter === 'rejected' 
                                    ? 'Aucun prospect rejeté pour le moment.'
                                    : 'No prospects available at the moment.'}
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
            
            {/* Rejection Dialog */}
            <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rejeter le prospect</DialogTitle>
                        <DialogDescription>
                            Veuillez fournir une raison pour le rejet de {selectedProspect?.name || 'ce prospect'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="rejection-reason">Raison du rejet *</Label>
                            <Textarea
                                id="rejection-reason"
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="Expliquez pourquoi vous rejetez ce prospect..."
                                rows={4}
                                required
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                            Annuler
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={submitRejection}
                            disabled={!rejectionReason.trim() || rejecting}
                        >
                            {rejecting ? 'Envoi...' : 'Rejeter'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            {/* Acceptance Dialog */}
            <Dialog open={acceptDialogOpen} onOpenChange={setAcceptDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Accepter le prospect</DialogTitle>
                        <DialogDescription>
                            Veuillez fournir une raison pour l'acceptation de {selectedProspectForAccept?.name || 'ce prospect'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {selectedProspectForAccept?.rejection_reason && (
                            <div className="bg-error-light p-3 rounded-lg border border-error">
                                <p className="text-sm font-semibold mb-2">Raison du rejet précédent:</p>
                                <p className="text-sm text-error">{selectedProspectForAccept.rejection_reason}</p>
                            </div>
                        )}
                        <div className="grid gap-2">
                            <Label htmlFor="acceptance-reason">Raison de l'acceptation *</Label>
                            <Textarea
                                id="acceptance-reason"
                                value={acceptanceReason}
                                onChange={(e) => setAcceptanceReason(e.target.value)}
                                placeholder="Expliquez pourquoi vous acceptez ce prospect..."
                                rows={4}
                                required
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAcceptDialogOpen(false)}>
                            Annuler
                        </Button>
                        <Button
                            variant="default"
                            onClick={submitAcceptance}
                            disabled={!acceptanceReason.trim() || accepting}
                            className="bg-success hover:opacity-90"
                        >
                            {accepting ? 'Envoi...' : 'Accepter'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            </div>
        </AppLayout>
    );
}
