import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { XCircle, CheckCircle } from 'lucide-react';

export default function ProspectsDispatch() {
    const { prospects = [], agencies = [], matchmakers = [], filters = {}, statusFilter = 'active' } = usePage().props;
    const [countries, setCountries] = useState([]);
    const [countryCodeToCities, setCountryCodeToCities] = useState({});
    const [selectedCountryCode, setSelectedCountryCode] = useState('');
    const [loadingCountries, setLoadingCountries] = useState(false);
    const [errorCountries, setErrorCountries] = useState('');

    const [selectedProspectIds, setSelectedProspectIds] = useState([]);
    const [selectAll, setSelectAll] = useState(false);
    const [dispatchOpen, setDispatchOpen] = useState(false);
    const [reassignOpen, setReassignOpen] = useState(false);
    const [dispatchType, setDispatchType] = useState('agency');
    const [reassignType, setReassignType] = useState('agency');
    const [selectedAgencyId, setSelectedAgencyId] = useState('');
    const [selectedMatchmakerId, setSelectedMatchmakerId] = useState('');
    const [selectedReassignAgencyId, setSelectedReassignAgencyId] = useState('');
    const [selectedReassignMatchmakerId, setSelectedReassignMatchmakerId] = useState('');
    const [dispatchStatus, setDispatchStatus] = useState(filters?.dispatch || 'all');
    const [activateDialogOpen, setActivateDialogOpen] = useState(false);
    const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
    const [selectedProspect, setSelectedProspect] = useState(null);
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [rejecting, setRejecting] = useState(false);
    
    const handleReject = (prospect) => {
        if (prospect.status !== 'prospect') return;
        setSelectedProspect(prospect);
        setRejectionReason('');
        setRejectDialogOpen(true);
    };
    
    const handleAccept = (prospect) => {
        if (!prospect) return;
        router.post(`/admin/prospects/${prospect.id}/accept`, {}, {
            onSuccess: () => {
                // Prospect will be removed from rejected list and added back to prospects
            },
            onError: () => {
                // Error handling
            }
        });
    };
    
    const canAcceptProspect = (prospect) => {
        if (!prospect || !prospect.rejection_reason) return false;
        // Admin can accept any rejected prospect
        return true;
    };
    
    const submitRejection = () => {
        if (!selectedProspect || !rejectionReason.trim()) return;
        
        setRejecting(true);
        router.post(`/admin/prospects/${selectedProspect.id}/reject`, {
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

    useEffect(() => {
        let isMounted = true;
        const fetchCountries = async () => {
            try {
                setLoadingCountries(true);
                setErrorCountries('');
                const response = await fetch('https://countriesnow.space/api/v0.1/countries');
                if (!response.ok) throw new Error('Failed to fetch countries');
                const json = await response.json();
                const list = Array.isArray(json?.data) ? json.data : [];
                if (!isMounted) return;
                const regionNamesFr = new Intl.DisplayNames(['fr'], { type: 'region' });
                const normalized = list
                    .filter((item) => item?.iso2)
                    .map((item) => ({
                        iso2: item.iso2,
                        frenchName: regionNamesFr.of(item.iso2) || item.country,
                        cities: Array.isArray(item.cities) ? item.cities : [],
                    }))
                    .sort((a, b) => a.frenchName.localeCompare(b.frenchName, 'fr'));
                const codeToCities = normalized.reduce((acc, item) => {
                    acc[item.iso2] = item.cities;
                    return acc;
                }, {});
                setCountries(normalized);
                setCountryCodeToCities(codeToCities);
            } catch (e) {
                if (!isMounted) return;
                setErrorCountries('Impossible de charger la liste des pays.');
            } finally {
                if (isMounted) setLoadingCountries(false);
            }
        };
        fetchCountries();
        return () => { isMounted = false; };
    }, []);

    const availableCities = useMemo(() => {
        if (!selectedCountryCode) return [];
        return countryCodeToCities[selectedCountryCode] || [];
    }, [selectedCountryCode, countryCodeToCities]);

    // no agency country/city filters anymore

    const prospectsCountry = filters?.country || '';
    const prospectsCity = filters?.city || '';

    const handleFilterProspects = (countryName, cityName, dispatchVal = dispatchStatus, statusVal = statusFilter) => {
        const params = new URLSearchParams();
        if (countryName) params.set('country', countryName);
        if (cityName) params.set('city', cityName);
        if (dispatchVal && dispatchVal !== 'all') params.set('dispatch', dispatchVal);
        if (statusVal && statusVal !== 'active') params.set('status_filter', statusVal);
        router.visit(`/admin/prospects?${params.toString()}`, { preserveScroll: true, preserveState: true, replace: true });
    };

    // Helper function to check if a prospect is dispatched
    const isDispatched = (prospect) => {
        return prospect.agency_id !== null || prospect.assigned_matchmaker_id !== null;
    };

    // Get dispatched and non-dispatched prospects
    const dispatchedProspects = useMemo(() => 
        prospects.filter(p => isDispatched(p)).map(p => p.id), 
        [prospects]
    );
    const nonDispatchedProspects = useMemo(() => 
        prospects.filter(p => !isDispatched(p)).map(p => p.id), 
        [prospects]
    );

    const handleToggleAll = (checked) => {
        setSelectAll(checked);
        if (checked) {
            setSelectedProspectIds(prospects.map((p) => p.id));
        } else {
            setSelectedProspectIds([]);
        }
    };

    const toggleProspect = (id) => {
        setSelectedProspectIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
    };

    // Filter selections when opening dispatch dialog - only allow non-dispatched
    const handleDispatchClick = () => {
        const validIds = selectedProspectIds.filter(id => nonDispatchedProspects.includes(id));
        if (validIds.length !== selectedProspectIds.length) {
            setSelectedProspectIds(validIds);
            setSelectAll(false);
        }
        setDispatchOpen(true);
    };

    // Filter selections when opening reassign dialog - only allow dispatched
    const handleReassignClick = () => {
        const validIds = selectedProspectIds.filter(id => dispatchedProspects.includes(id));
        if (validIds.length !== selectedProspectIds.length) {
            setSelectedProspectIds(validIds);
            setSelectAll(false);
        }
        setReassignOpen(true);
    };

    // Check if selected prospects are valid for dispatch (non-dispatched)
    const hasValidDispatchSelection = useMemo(() => {
        return selectedProspectIds.length > 0 && 
               selectedProspectIds.every(id => nonDispatchedProspects.includes(id));
    }, [selectedProspectIds, nonDispatchedProspects]);

    // Check if selected prospects are valid for reassign (dispatched)
    const hasValidReassignSelection = useMemo(() => {
        return selectedProspectIds.length > 0 && 
               selectedProspectIds.every(id => dispatchedProspects.includes(id));
    }, [selectedProspectIds, dispatchedProspects]);

    const agencyOptions = agencies;

    const submitDispatch = () => {
        if (selectedProspectIds.length === 0) return;
        if (dispatchType === 'agency' && !selectedAgencyId) return;
        if (dispatchType === 'matchmaker' && !selectedMatchmakerId) return;
        
        // Only send non-dispatched prospects
        const validIds = selectedProspectIds.filter(id => nonDispatchedProspects.includes(id));
        if (validIds.length === 0) return;
        
        const payload = {
            prospect_ids: validIds.map(id => parseInt(id)),
            dispatch_type: dispatchType,
        };
        
        if (dispatchType === 'agency') {
            payload.agency_id = parseInt(selectedAgencyId);
        } else {
            payload.matchmaker_id = parseInt(selectedMatchmakerId);
        }
        
        router.post('/admin/prospects/dispatch', payload, {
            onSuccess: () => {
                setDispatchOpen(false);
                setSelectedAgencyId('');
                setSelectedMatchmakerId('');
                setSelectedProspectIds([]);
                setSelectAll(false);
                setDispatchType('agency');
            }
        });
    };

    const submitReassign = () => {
        if (selectedProspectIds.length === 0) return;
        if (reassignType === 'agency' && !selectedReassignAgencyId) return;
        if (reassignType === 'matchmaker' && !selectedReassignMatchmakerId) return;
        
        // Only send dispatched prospects
        const validIds = selectedProspectIds.filter(id => dispatchedProspects.includes(id));
        if (validIds.length === 0) return;
        
        const payload = {
            prospect_ids: validIds.map(id => parseInt(id)),
            reassign_type: reassignType,
        };
        
        if (reassignType === 'agency') {
            payload.agency_id = parseInt(selectedReassignAgencyId);
        } else {
            payload.matchmaker_id = parseInt(selectedReassignMatchmakerId);
        }
        
        router.post('/admin/prospects/reassign', payload, {
            onSuccess: () => {
                setReassignOpen(false);
                setSelectedReassignAgencyId('');
                setSelectedReassignMatchmakerId('');
                setSelectedProspectIds([]);
                setSelectAll(false);
                setReassignType('agency');
            }
        });
    };

    return (
        <AppLayout>
            <Head title="Dispatch Prospects" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Prospects Dispatch</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap items-end gap-4 mb-4">
                            <div className="grid gap-2 w-[220px]">
                                <Label>Pays</Label>
                                <Select
                                    value={selectedCountryCode}
                                    onValueChange={(v) => setSelectedCountryCode(v)}
                                    disabled={loadingCountries}
                                >
                                    <SelectTrigger className="h-9"><SelectValue placeholder={loadingCountries ? 'Chargement…' : 'Sélectionner'} /></SelectTrigger>
                                    <SelectContent>
                                        {countries.map((c) => (
                                            <SelectItem key={c.iso2} value={c.iso2}>{c.frenchName}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2 w-[220px]">
                                <Label>Ville</Label>
                                <Select
                                    value={prospectsCity}
                                    onValueChange={(v) => handleFilterProspects(selectedCountryCode ? (countries.find((c) => c.iso2 === selectedCountryCode)?.frenchName || '') : prospectsCountry, v, dispatchStatus)}
                                    disabled={!selectedCountryCode || availableCities.length === 0}
                                >
                                    <SelectTrigger className="h-9"><SelectValue placeholder={!selectedCountryCode ? 'Choisir pays d’abord' : (availableCities.length ? 'Sélectionner ville' : 'Aucune ville')} /></SelectTrigger>
                                    <SelectContent>
                                        {availableCities.map((city) => (
                                            <SelectItem key={city} value={city}>{city}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2 w-[220px]">
                                <Label>Dispatch</Label>
                                <Select
                                    value={dispatchStatus}
                                    onValueChange={(v) => { setDispatchStatus(v); handleFilterProspects(selectedCountryCode ? (countries.find((c) => c.iso2 === selectedCountryCode)?.frenchName || '') : prospectsCountry, prospectsCity, v); }}
                                >
                                    <SelectTrigger className="h-9"><SelectValue placeholder="All" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All</SelectItem>
                                        <SelectItem value="not_dispatched">Not Dispatched</SelectItem>
                                        <SelectItem value="dispatched">Dispatched</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2 w-[220px]">
                                <Label>Status</Label>
                                <Select
                                    value={statusFilter || 'active'}
                                    onValueChange={(v) => handleFilterProspects(selectedCountryCode ? (countries.find((c) => c.iso2 === selectedCountryCode)?.frenchName || '') : prospectsCountry, prospectsCity, dispatchStatus, v)}
                                >
                                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Actifs</SelectItem>
                                        <SelectItem value="rejected">Rejetés</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button variant="outline" onClick={() => handleFilterProspects(selectedCountryCode ? (countries.find((c) => c.iso2 === selectedCountryCode)?.frenchName || '') : '', '', dispatchStatus, 'active')}>Réinitialiser</Button>
                            <div className="ml-auto flex gap-2">
                                <Button disabled={!hasValidDispatchSelection} onClick={handleDispatchClick}>Dispatch Prospects</Button>
                                <Button disabled={!hasValidReassignSelection} variant="outline" onClick={handleReassignClick}>Reassign Prospects</Button>
                            </div>
                        </div>

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-10"><input type="checkbox" checked={selectAll} onChange={(e) => handleToggleAll(e.target.checked)} /></TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Country</TableHead>
                                    <TableHead>City</TableHead>
                                    <TableHead>Phone</TableHead>
                                    {statusFilter === 'active' && <TableHead>Dispatched To</TableHead>}
                                    {statusFilter === 'rejected' && <TableHead>Raison du rejet</TableHead>}
                                    <TableHead>Account Status</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {prospects.map((p) => (
                                    <TableRow key={p.id} className={statusFilter === 'rejected' ? 'bg-error-light' : ''}>
                                        <TableCell><input type="checkbox" checked={selectedProspectIds.includes(p.id)} onChange={() => toggleProspect(p.id)} /></TableCell>
                                        <TableCell className="font-medium">{p.name}</TableCell>
                                        <TableCell>{p.country}</TableCell>
                                        <TableCell>{p.city}</TableCell>
                                        <TableCell>{p.phone}</TableCell>
                                        {statusFilter === 'active' ? (
                                            <TableCell>
                                                {p.assigned_matchmaker_id ? (
                                                    <div className="text-sm">
                                                        <div className="font-medium text-success">Matchmaker: {p.assigned_matchmaker?.name || 'Unknown'}</div>
                                                        {p.agency_id && (
                                                            <div className="text-info">Agency: {p.agency?.name || 'Unknown'}</div>
                                                        )}
                                                    </div>
                                                ) : p.agency_id ? (
                                                    <span className="text-info">Agency: {p.agency?.name || 'Unknown'}</span>
                                                ) : (
                                                    <span className="text-muted-foreground">Not dispatched</span>
                                                )}
                                            </TableCell>
                                        ) : (
                                            <TableCell className="max-w-xs">
                                                <p className="text-sm text-error truncate" title={p.rejection_reason}>
                                                    {p.rejection_reason || 'N/A'}
                                                </p>
                                            </TableCell>
                                        )}
                                        <TableCell>
                                            <Badge variant={p.profile?.account_status === 'desactivated' ? 'destructive' : 'default'}>
                                                {p.profile?.account_status === 'desactivated' ? 'Désactivé' : 'Actif'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{new Date(p.created_at ?? Date.now()).toLocaleDateString()}</TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                {statusFilter === 'active' ? (
                                                    <>
                                                        {p.status === 'prospect' && (
                                                            <Button
                                                                size="sm"
                                                        variant="destructive"
                                                        onClick={() => handleReject(p)}
                                                    >
                                                        <XCircle className="w-4 h-4 mr-1" />
                                                        Rejeter
                                                    </Button>
                                                )}
                                                {p.profile?.account_status === 'desactivated' ? (
                                                    <Button
                                                        size="sm"
                                                        variant="default"
                                                        onClick={() => {
                                                            setSelectedProspect(p);
                                                            setReason('');
                                                            setActivateDialogOpen(true);
                                                        }}
                                                    >
                                                        Activer
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() => {
                                                            setSelectedProspect(p);
                                                            setReason('');
                                                            setDeactivateDialogOpen(true);
                                                        }}
                                                    >
                                                        Désactiver
                                                    </Button>
                                                )}
                                                    </>
                                                ) : (
                                                    <>
                                                        {canAcceptProspect(p) && (
                                                            <Button
                                                                size="sm"
                                                                variant="default"
                                                                className="bg-success hover:opacity-90"
                                                                onClick={() => handleAccept(p)}
                                                            >
                                                                <CheckCircle className="w-4 h-4 mr-1" />
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
                    </CardContent>
                </Card>
            </div>

            <Dialog open={dispatchOpen} onOpenChange={setDispatchOpen}>
                <DialogContent className="sm:max-w-[520px]">
                    <DialogHeader>
                        <DialogTitle>Dispatch Prospects</DialogTitle>
                        <DialogDescription>
                            Select dispatch type: Agency only or Matchmaker (automatically assigns to both matchmaker and their agency).
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-2">
                        <div className="grid gap-2">
                            <Label>Dispatch Type</Label>
                            <Select value={dispatchType} onValueChange={(value) => {
                                setDispatchType(value);
                                setSelectedAgencyId('');
                                setSelectedMatchmakerId('');
                            }}>
                                <SelectTrigger className="h-9"><SelectValue placeholder="Select dispatch type" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="agency">Agency</SelectItem>
                                    <SelectItem value="matchmaker">Matchmaker</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {dispatchType === 'agency' && (
                            <div className="grid gap-2">
                                <Label>Agency</Label>
                                <Select value={selectedAgencyId} onValueChange={setSelectedAgencyId}>
                                    <SelectTrigger className="h-9"><SelectValue placeholder="Select agency" /></SelectTrigger>
                                    <SelectContent>
                                        {agencies.map((a) => (
                                            <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        {dispatchType === 'matchmaker' && (
                            <div className="grid gap-2">
                                <Label>Matchmaker</Label>
                                <Select value={selectedMatchmakerId} onValueChange={setSelectedMatchmakerId}>
                                    <SelectTrigger className="h-9"><SelectValue placeholder="Select matchmaker" /></SelectTrigger>
                                    <SelectContent>
                                        {matchmakers.map((m) => (
                                            <SelectItem key={m.id} value={m.id.toString()}>{m.name} ({m.agency?.name || 'No Agency'})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDispatchOpen(false)}>Cancel</Button>
                        <Button onClick={submitDispatch} disabled={
                            selectedProspectIds.length === 0 || 
                            (dispatchType === 'agency' && !selectedAgencyId) || 
                            (dispatchType === 'matchmaker' && !selectedMatchmakerId)
                        }>Submit</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={reassignOpen} onOpenChange={setReassignOpen}>
                <DialogContent className="sm:max-w-[520px]">
                    <DialogHeader>
                        <DialogTitle>Reassign Prospects</DialogTitle>
                        <DialogDescription>
                            Reassign prospects to a different agency or matchmaker. Original agency assignment is preserved for tracking purposes.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-2">
                        <div className="grid gap-2">
                            <Label>Reassign Type</Label>
                            <Select value={reassignType} onValueChange={(value) => {
                                setReassignType(value);
                                setSelectedReassignAgencyId('');
                                setSelectedReassignMatchmakerId('');
                            }}>
                                <SelectTrigger className="h-9"><SelectValue placeholder="Select reassign type" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="agency">Agency</SelectItem>
                                    <SelectItem value="matchmaker">Matchmaker</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {reassignType === 'agency' && (
                            <div className="grid gap-2">
                                <Label>Agency</Label>
                                <Select value={selectedReassignAgencyId} onValueChange={setSelectedReassignAgencyId}>
                                    <SelectTrigger className="h-9"><SelectValue placeholder="Select agency" /></SelectTrigger>
                                    <SelectContent>
                                        {agencies.map((a) => (
                                            <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        {reassignType === 'matchmaker' && (
                            <div className="grid gap-2">
                                <Label>Matchmaker</Label>
                                <Select value={selectedReassignMatchmakerId} onValueChange={setSelectedReassignMatchmakerId}>
                                    <SelectTrigger className="h-9"><SelectValue placeholder="Select matchmaker" /></SelectTrigger>
                                    <SelectContent>
                                        {matchmakers.map((m) => (
                                            <SelectItem key={m.id} value={m.id.toString()}>{m.name} ({m.agency?.name || 'No Agency'})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setReassignOpen(false)}>Cancel</Button>
                        <Button onClick={submitReassign} disabled={
                            selectedProspectIds.length === 0 || 
                            (reassignType === 'agency' && !selectedReassignAgencyId) || 
                            (reassignType === 'matchmaker' && !selectedReassignMatchmakerId)
                        }>Reassign</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Activate Account Dialog */}
            <Dialog open={activateDialogOpen} onOpenChange={setActivateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Activer le compte</DialogTitle>
                        <DialogDescription>
                            Motif d'activation pour {selectedProspect?.name}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="activation-reason">Motif d'activation *</Label>
                            <Textarea
                                id="activation-reason"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Expliquez pourquoi vous activez ce compte..."
                                rows={4}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setActivateDialogOpen(false)}>
                            Annuler
                        </Button>
                        <Button
                            onClick={() => {
                                if (!reason.trim()) return;
                                setSubmitting(true);
                                router.post(`/admin/users/${selectedProspect.id}/activate`, {
                                    reason: reason
                                }, {
                                    onSuccess: () => {
                                        setActivateDialogOpen(false);
                                        setReason('');
                                        setSelectedProspect(null);
                                        setSubmitting(false);
                                    },
                                    onError: () => {
                                        setSubmitting(false);
                                    }
                                });
                            }}
                            disabled={!reason.trim() || submitting}
                        >
                            {submitting ? 'Envoi...' : 'Activer'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Deactivate Account Dialog */}
            <Dialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Désactiver le compte</DialogTitle>
                        <DialogDescription>
                            Motif de désactivation pour {selectedProspect?.name}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="deactivation-reason">Motif de désactivation *</Label>
                            <Textarea
                                id="deactivation-reason"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Expliquez pourquoi vous désactivez ce compte..."
                                rows={4}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeactivateDialogOpen(false)}>
                            Annuler
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                if (!reason.trim()) return;
                                setSubmitting(true);
                                router.post(`/admin/users/${selectedProspect.id}/deactivate`, {
                                    reason: reason
                                }, {
                                    onSuccess: () => {
                                        setDeactivateDialogOpen(false);
                                        setReason('');
                                        setSelectedProspect(null);
                                        setSubmitting(false);
                                    },
                                    onError: () => {
                                        setSubmitting(false);
                                    }
                                });
                            }}
                            disabled={!reason.trim() || submitting}
                        >
                            {submitting ? 'Envoi...' : 'Désactiver'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
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
        </AppLayout>
    );
}


