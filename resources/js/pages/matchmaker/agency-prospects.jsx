import { Head, router, usePage, useForm } from '@inertiajs/react';
import { useState, useEffect, useMemo } from 'react';
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
import { LayoutGrid, Table2, Mail, MapPin, CheckCircle, Pencil, XCircle, Search } from 'lucide-react';

export default function AgencyProspects() {
    const { prospects = [], statusFilter = 'active', services = [], matrimonialPacks = [], auth } = usePage().props;
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
    const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 24;
    
    // Rejection dialog state
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [rejecting, setRejecting] = useState(false);
    const [selectedProspectForReject, setSelectedProspectForReject] = useState(null);
    
    // Acceptance dialog state
    const [acceptDialogOpen, setAcceptDialogOpen] = useState(false);
    const [acceptanceReason, setAcceptanceReason] = useState('');
    const [accepting, setAccepting] = useState(false);
    const [selectedProspectForAccept, setSelectedProspectForAccept] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    
    const { role: userRole } = usePage().props; // Get role from shared props
    const currentUser = auth?.user;
    const userId = currentUser?.id || null;
    const userAgencyId = currentUser?.agency_id || null;
    
    // Check if current user can reject a prospect
    const canRejectProspect = (prospect) => {
        if (!prospect || prospect.status !== 'prospect') {
            return false;
        }
        if (!userRole || !userId) {
            return false;
        }
        // Admin can reject any prospect
        if (userRole === 'admin') {
            return true;
        }
        // Matchmaker can reject if assigned to them OR if prospect is from their agency and was added by manager
        if (userRole === 'matchmaker') {
            if (prospect.assigned_matchmaker_id === userId) {
                return true;
            }
            if (prospect.agency_id === userAgencyId && prospect.assigned_matchmaker_id === null) {
                return true;
            }
        }
        // Manager can reject if prospect is from their agency
        if (userRole === 'manager' && prospect.agency_id === userAgencyId) {
            return true;
        }
        return false;
    };
    
    const handleReject = (prospect) => {
        setSelectedProspectForReject(prospect);
        setRejectionReason('');
        setRejectDialogOpen(true);
    };
    
    const submitRejection = () => {
        if (!selectedProspectForReject || !rejectionReason.trim()) return;
        
        setRejecting(true);
        router.post(`/staff/prospects/${selectedProspectForReject.id}/reject`, {
            rejection_reason: rejectionReason
        }, {
            onSuccess: () => {
                setRejectDialogOpen(false);
                setRejectionReason('');
                setSelectedProspectForReject(null);
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
    
    // Reset page when prospects change
    useEffect(() => {
        setCurrentPage(1);
    }, [prospects.length]);
    
    // Filter prospects based on search query
    const filteredProspects = useMemo(() => {
        if (!searchQuery.trim()) {
            return prospects;
        }
        const query = searchQuery.toLowerCase().trim();
        return prospects.filter(p => {
            const name = (p.name || '').toLowerCase();
            const email = (p.email || '').toLowerCase();
            const username = (p.username || '').toLowerCase();
            return name.includes(query) || email.includes(query) || username.includes(query);
        });
    }, [prospects, searchQuery]);
    
    // Pagination logic
    const totalPages = Math.ceil(filteredProspects.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedProspects = filteredProspects.slice(startIndex, endIndex);
    const showingStart = filteredProspects.length > 0 ? startIndex + 1 : 0;
    const showingEnd = Math.min(endIndex, filteredProspects.length);
    
    // Helper function to get profile picture URL
    const getProfilePicture = (prospect) => {
        if (prospect.profile?.profile_picture_path) {
            return `/storage/${prospect.profile.profile_picture_path}`;
        }
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(prospect.name)}&background=random`;
    };

    // Helper function to get location
    const getLocation = (prospect) => {
        const city = prospect.city || prospect.profile?.ville_residence || prospect.profile?.pays_residence || '';
        const country = prospect.country || '';
        if (city && country) {
            return `${city}, ${country}`;
        }
        return city || country || 'Other, None';
    };    
    // Pre-fill form when prospect is selected
    const handleValidateClick = (prospect) => {
        setValidatingProspect(prospect);
        
        // Pre-fill from profile if user already provided
        const profile = prospect.profile;
        
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
            <Head title="Prospects" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header with View Toggle and Pagination Info */}
                <div className="flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        {/* View Toggle */}
                        <div className="flex items-center gap-2">
                            <Button
                                variant={viewMode === 'cards' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setViewMode('cards')}
                                className="flex items-center gap-2"
                            >
                                <LayoutGrid className="w-4 h-4" />
                                Cards
                            </Button>
                            <Button
                                variant={viewMode === 'table' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setViewMode('table')}
                                className="flex items-center gap-2"
                            >
                                <Table2 className="w-4 h-4" />
                                Table
                            </Button>
                        </div>
                        
                        {/* Pagination Info */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 text-sm text-muted-foreground">
                            <div>
                                Showing {showingStart} to {showingEnd} of {filteredProspects.length} prospects
                            </div>
                            {totalPages > 1 && (
                                <div>
                                    Page {currentPage} of {totalPages}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="mb-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Rechercher par nom, email ou username..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setCurrentPage(1); // Reset to first page when searching
                                }}
                                className="pl-10"
                            />
                        </div>
                    </div>

                    {filteredProspects.length === 0 && searchQuery.trim() && (
                        <div className="mb-4 p-4 bg-info-light border border-info rounded-lg">
                            <p className="text-info-foreground text-sm">
                                Aucun résultat trouvé pour "{searchQuery}". Veuillez essayer une autre recherche.
                            </p>
                        </div>
                    )}

                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-3 bg-card rounded-lg p-3 border">
                        <div className="flex items-center gap-2">
                            <Label className="text-sm text-muted-foreground">Status</Label>
                            <Select value={statusFilter || 'active'} onValueChange={(v) => router.visit(`/staff/agency-prospects?status_filter=${v}`, { preserveScroll: true, preserveState: true, replace: true })}>
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

                {/* Cards View */}
                {viewMode === 'cards' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {paginatedProspects.map((p) => (
                            <Card key={p.id} className={`overflow-hidden hover:shadow-lg transition-shadow ${statusFilter === 'rejected' ? 'border-error' : ''}`}>
                                <div className="relative">
                                    <img
                                        src={getProfilePicture(p)}
                                        alt={p.name}
                                        className={`w-full h-48 object-cover ${statusFilter === 'rejected' ? 'opacity-75' : ''}`}
                                        onError={(e) => {
                                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=random`;
                                        }}
                                    />
                                    {/* Overlay Tags */}
                                    <div className="absolute top-2 right-2 flex gap-2">
                                        {statusFilter === 'rejected' ? (
                                            <Badge className="bg-error text-error-foreground text-xs px-2 py-1">
                                                Rejeté
                                            </Badge>
                                        ) : (
                                            <>
                                                <Badge className="bg-foreground text-background text-xs px-2 py-1">
                                                    Prospect
                                                </Badge>
                                                <Badge className={`text-white text-xs px-2 py-1 flex items-center gap-1 ${
                                                    p.assigned_matchmaker_id ? 'bg-success' : 
                                                    p.agency_id ? 'bg-info' : 
                                                    'bg-muted-foreground'
                                                }`}>
                                                    <CheckCircle className="w-3 h-3" />
                                                    {p.assigned_matchmaker_id ? 'Assigned' : 
                                                     p.agency_id ? 'Dispatched' : 
                                                     'Pending'}
                                                </Badge>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <CardContent className="p-4 space-y-3">
                                    <div>
                                        <h3 className="font-semibold text-lg">{p.name}</h3>
                                        {statusFilter === 'rejected' && p.rejection_reason && (
                                            <p className="text-xs text-error mt-1 line-clamp-2" title={p.rejection_reason}>
                                                {p.rejection_reason}
                                            </p>
                                        )}
                                    </div>
                                    
                                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                                        <Mail className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                        <span className="truncate">{p.email || 'N/A'}</span>
                                    </div>
                                    
                                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                                        <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                        <span className="truncate">{getLocation(p)}</span>
                                    </div>
                                    
                                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                                        <span className="truncate">Phone: {p.phone || 'N/A'}</span>
                                    </div>
                                    
                                    {p.assigned_matchmaker_id && (
                                        <div className="text-sm">
                                            <span className="text-success font-medium">Matchmaker: {p.assigned_matchmaker?.name || 'Unknown'}</span>
                                        </div>
                                    )}
                                    
                                    <div className="pt-2 flex gap-2">
                                        {statusFilter === 'active' ? (
                                            <>
                                                {canRejectProspect(p) && (
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        className="flex-1"
                                                        onClick={() => handleReject(p)}
                                                    >
                                                        <XCircle className="w-4 h-4 mr-1" />
                                                        Rejeter
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="flex-1"
                                                    onClick={() => router.visit(`/staff/prospects/${p.id}/profile/edit`)}
                                                >
                                                    <Pencil className="w-4 h-4 mr-1" />
                                                    Profil
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="flex-1"
                                                    onClick={() => handleValidateClick(p)}
                                                >
                                                    Validate
                                                </Button>
                                            </>
                                        ) : (
                                            <>
                                                {canAcceptProspect(p) && (
                                                    <Button
                                                        variant="default"
                                                        size="sm"
                                                        className="w-full bg-success hover:opacity-90"
                                                        onClick={() => handleAccept(p)}
                                                    >
                                                        <CheckCircle className="w-4 h-4 mr-1" />
                                                        Accepter
                                                    </Button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Table View */}
                {viewMode === 'table' && (
                    <Card className="overflow-hidden">
                        <CardHeader>
                            <CardTitle>Prospects for Your Agency</CardTitle>
                            <CardDescription>Review and validate prospects assigned to your agency</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead className="hidden md:table-cell">Phone</TableHead>
                                            <TableHead className="hidden lg:table-cell">City</TableHead>
                                            <TableHead className="hidden lg:table-cell">Country</TableHead>
                                            <TableHead>Dispatched To</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedProspects.map((p) => (
                                            <TableRow key={p.id}>
                                                <TableCell className="font-medium">{p.name}</TableCell>
                                                <TableCell>{p.email || 'N/A'}</TableCell>
                                                <TableCell className="hidden md:table-cell">{p.phone || 'N/A'}</TableCell>
                                                <TableCell className="hidden lg:table-cell">{p.city || 'N/A'}</TableCell>
                                                <TableCell className="hidden lg:table-cell">{p.country || 'N/A'}</TableCell>
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
                                                <TableCell>
                                                    <div className="flex gap-2">
                                                        {canRejectProspect(p) && (
                                                            <Button
                                                                size="sm"
                                                                variant="destructive"
                                                                onClick={() => handleReject(p)}
                                                            >
                                                                <XCircle className="w-4 h-4 mr-1" />
                                                                Rejeter
                                                            </Button>
                                                        )}
                                                        <Button 
                                                            size="sm" 
                                                            variant="outline"
                                                            onClick={() => router.visit(`/staff/prospects/${p.id}/profile/edit`)}
                                                        >
                                                            <Pencil className="w-4 h-4 mr-1" />
                                                            Profil
                                                        </Button>
                                                        <Button size="sm" onClick={() => handleValidateClick(p)}>Validate</Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            
                            {paginatedProspects.length === 0 && !searchQuery.trim() && (
                                <div className="text-center py-8">
                                    <p className="text-muted-foreground">
                                        {statusFilter === 'rejected' 
                                            ? 'Aucun prospect rejeté pour le moment.'
                                            : 'No prospects assigned to your agency yet.'}
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                        >
                            Previous
                        </Button>
                        <div className="flex gap-1">
                            {[...Array(totalPages)].map((_, i) => {
                                const pageNum = i + 1;
                                if (
                                    pageNum === 1 ||
                                    pageNum === totalPages ||
                                    (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                                ) {
                                    return (
                                        <Button
                                            key={pageNum}
                                            variant={currentPage === pageNum ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setCurrentPage(pageNum)}
                                            className="w-10"
                                        >
                                            {pageNum}
                                        </Button>
                                    );
                                } else if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                                    return <span key={pageNum} className="px-2">...</span>;
                                }
                                return null;
                            })}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                        >
                            Next
                        </Button>
                    </div>
                )}
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
                                    <span className="text-xs text-muted-foreground ml-2">(Déjà rempli par le prospect)</span>
                                )}
                            </Label>
                            {validatingProspect?.profile?.cin ? (
                                <Input 
                                    id="cin" 
                                    value={data.cin} 
                                    disabled 
                                    className="bg-muted"
                                />
                            ) : (
                                <Input 
                                    id="cin" 
                                    value={data.cin} 
                                    onChange={(e) => setData('cin', e.target.value)} 
                                    placeholder="Ex: A123456 or AB1234" 
                                />
                            )}
                            {errors.cin && <p className="text-error text-sm">{errors.cin}</p>}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="front">
                                Identity Card Front {!validatingProspect?.profile?.identity_card_front_path && '*'}
                                {validatingProspect?.profile?.identity_card_front_path && (
                                    <span className="text-xs text-muted-foreground ml-2">(Déjà téléchargée - vous pouvez la remplacer)</span>
                                )}
                            </Label>
                            {validatingProspect?.profile?.identity_card_front_path ? (
                                <div className="space-y-2">
                                    <div className="relative rounded-lg border-2 border-border overflow-hidden bg-muted">
                                        {data.identity_card_front ? (
                                            <img 
                                                src={URL.createObjectURL(data.identity_card_front)}
                                                alt="Nouvelle CNI Front Preview"
                                                className="w-full h-auto max-h-48 object-cover"
                                            />
                                        ) : (
                                            <img 
                                                src={`/storage/${validatingProspect.profile.identity_card_front_path}`}
                                                alt="CNI Front Preview"
                                                className="w-full h-auto max-h-48 object-cover"
                                                onError={(e) => {
                                                    e.target.onerror = null;
                                                    e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="150"%3E%3Crect fill="%23e5e7eb" width="200" height="150"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle" fill="%239ca3af" font-family="Arial" font-size="14"%3EImage non disponible%3C/text%3E%3C/svg%3E';
                                                }}
                                            />
                                        )}
                                    </div>
                                    {!data.identity_card_front && (
                                        <a 
                                            href={`/storage/${validatingProspect.profile.identity_card_front_path}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-primary hover:underline inline-block"
                                        >
                                            Ouvrir dans un nouvel onglet
                                        </a>
                                    )}
                                    {data.identity_card_front && (
                                        <p className="text-xs text-success">✓ Nouvelle image sélectionnée: {data.identity_card_front.name}</p>
                                    )}
                                    <Input 
                                        id="front" 
                                        type="file" 
                                        accept="image/*" 
                                        onChange={(e) => e.target.files?.[0] && setData('identity_card_front', e.target.files[0])} 
                                        className="mt-2"
                                    />
                                    {data.identity_card_front && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setData('identity_card_front', null)}
                                            className="w-full"
                                        >
                                            Annuler le remplacement
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <Input 
                                    id="front" 
                                    type="file" 
                                    accept="image/*" 
                                    onChange={(e) => e.target.files?.[0] && setData('identity_card_front', e.target.files[0])} 
                                />
                            )}
                            {errors.identity_card_front && <p className="text-error text-sm">{errors.identity_card_front}</p>}
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
                            
                            {errors.service_id && <p className="text-error text-sm">{errors.service_id}</p>}
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
                            {errors.matrimonial_pack_id && <p className="text-error text-sm">{errors.matrimonial_pack_id}</p>}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="pack_price">Pack Price (MAD)</Label>
                            <Input id="pack_price" type="number" value={data.pack_price} onChange={(e) => setData('pack_price', e.target.value)} placeholder="Enter price" />
                            {errors.pack_price && <p className="text-error text-sm">{errors.pack_price}</p>}
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
                            {errors.pack_advantages && <p className="text-error text-sm">{errors.pack_advantages}</p>}
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
                                    // Note: identity_card_front is only required if user didn't upload one
                                    // If user uploaded one, matchmaker can optionally replace it
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
            
            {/* Rejection Dialog */}
            <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rejeter le prospect</DialogTitle>
                        <DialogDescription>
                            Veuillez fournir une raison pour le rejet de {selectedProspectForReject?.name || 'ce prospect'}
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
        </AppLayout>
    );
}


