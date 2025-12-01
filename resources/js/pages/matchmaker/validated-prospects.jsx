import { Head, router, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { useState, useEffect, useMemo } from 'react';
import { LayoutGrid, Table2, Mail, MapPin, CheckCircle, Pencil, TestTube, Link as LinkIcon, Copy, Check, Search, Phone } from 'lucide-react';

export default function ValidatedProspects() {
    const { t } = useTranslation();
    const { prospects, status, assignedMatchmaker, auth } = usePage().props;
    const [loading, setLoading] = useState({});
    const [subscriptionOpen, setSubscriptionOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [subscriptionData, setSubscriptionData] = useState({
        matrimonial_pack_id: '',
        pack_price: '',
        pack_advantages: [],
        payment_mode: ''
    });
    const [matrimonialPacks, setMatrimonialPacks] = useState([]);
    const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 24;
    const [testExpirationOpen, setTestExpirationOpen] = useState(false);
    const [testUser, setTestUser] = useState(null);
    const [activateDialogOpen, setActivateDialogOpen] = useState(false);
    const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
    const [selectedUserForStatus, setSelectedUserForStatus] = useState(null);
    const [statusReason, setStatusReason] = useState('');
    const [statusSubmitting, setStatusSubmitting] = useState(false);
    const [userInfoModalOpen, setUserInfoModalOpen] = useState(false);
    const [selectedUserForInfo, setSelectedUserForInfo] = useState(null);
    const [userFormData, setUserFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        username: ''
    });
    const [searchQuery, setSearchQuery] = useState('');
    
    // Reset page when prospects change (e.g., filter changes)
    useEffect(() => {
        setCurrentPage(1);
    }, [prospects.length, status]);
    
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

    const handleMarkAsClient = (userId) => {
        setLoading(prev => ({ ...prev, [userId]: true }));
        
        router.post('/staff/mark-as-client', {
            user_id: userId
        }, {
            onSuccess: () => {
                setLoading(prev => ({ ...prev, [userId]: false }));
            },
            onError: () => {
                setLoading(prev => ({ ...prev, [userId]: false }));
            }
        });
    };

    const handleCreateSubscription = (user) => {
        setSelectedUser(user);
        setSubscriptionOpen(true);
        
        // Fetch subscription form data
        fetch(`/staff/subscription-form-data/${user.id}`)
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    alert(data.error);
                    return;
                }
                
                setMatrimonialPacks(data.matrimonial_packs);
                
                // Pre-fill form with existing data
                setSubscriptionData({
                    matrimonial_pack_id: data.profile.matrimonial_pack_id || '',
                    pack_price: data.profile.pack_price || '',
                    pack_advantages: data.profile.pack_advantages || [],
                    payment_mode: data.profile.payment_mode || ''
                });
            })
            .catch(error => {
                console.error('Error fetching subscription data:', error);
                alert('Error loading subscription data');
            });
    };

    const handleBillSubmit = () => {
        if (!selectedUser) return;
        
        setLoading(prev => ({ ...prev, bill: true }));
        
        router.post('/staff/create-bill', {
            user_id: selectedUser.id,
            ...subscriptionData
        }, {
            onSuccess: () => {
                setLoading(prev => ({ ...prev, bill: false }));
                setSubscriptionOpen(false);
                setSelectedUser(null);
                setSubscriptionData({
                    matrimonial_pack_id: '',
                    pack_price: '',
                    pack_advantages: [],
                    payment_mode: ''
                });
                // Reload page to refresh prospect data and show updated buttons
                router.reload({ only: ['prospects'] });
            },
            onError: () => {
                setLoading(prev => ({ ...prev, bill: false }));
            }
        });
    };

    const confirmTestExpiration = () => {
        if (!testUser) return;
        
        setLoading(prev => ({ ...prev, [`test_${testUser.id}`]: true }));
        
        router.post('/staff/test-subscription-expiration', {
            user_id: testUser.id
        }, {
            onSuccess: () => {
                setLoading(prev => ({ ...prev, [`test_${testUser.id}`]: false }));
                setTestExpirationOpen(false);
                setTestUser(null);
                router.reload({ only: ['prospects'] });
            },
            onError: () => {
                setLoading(prev => ({ ...prev, [`test_${testUser.id}`]: false }));
            }
        });
    };

    const handleAdvantageChange = (advantage, checked) => {
        if (checked) {
            setSubscriptionData(prev => ({
                ...prev,
                pack_advantages: [...prev.pack_advantages, advantage]
            }));
        } else {
            setSubscriptionData(prev => ({
                ...prev,
                pack_advantages: prev.pack_advantages.filter(a => a !== advantage)
            }));
        }
    };
    
    // Helper function to get profile picture URL
    const getProfilePicture = (user) => {
        if (user.profile?.profile_picture_path) {
            return `/storage/${user.profile.profile_picture_path}`;
        }
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`;
    };

    // Helper function to get location
    const getLocation = (user) => {
        const city = user.profile?.ville_residence || user.profile?.pays_residence || '';
        const district = user.profile?.heard_about_reference || '';
        if (city && district && district !== '-') {
            return `${city}, ${district}`;
        }
        return city || 'Other, None';
    };

    // Helper function to get step/status
    const getStep = (user) => {
        // Use matrimonial pack name or service name as step
        // Default to 'coding school' if none available
        return user.profile?.matrimonial_pack?.name || 
               (user.profile?.service_id ? 'Service' : null) || 
               'coding school';
    };

    // Helper function to get status label and variant
    const getStatusInfo = (userStatus) => {
        switch (userStatus) {
            case 'member':
                return { label: 'Member', variant: 'default', className: 'bg-blue-500 text-white' };
            case 'client':
                return { label: 'Client', variant: 'default', className: 'bg-green-500 text-white' };
            case 'client_expire':
                return { label: 'Client Expiré', variant: 'default', className: 'bg-orange-500 text-white' };
            default:
                return { label: userStatus || 'Unknown', variant: 'default', className: 'bg-gray-500 text-white' };
        }
    };

    // Helper function to check if current user can edit profile (for incomplete profiles)
    const canEditProfile = (user) => {
        if (!auth?.user || !user) {
            return false;
        }

        // Only allow editing if profile is incomplete
        if (user.profile?.is_completed) {
            return false;
        }

        const viewerRole = auth?.user?.roles?.[0]?.name || 'user';
        const userId = auth?.user?.id;

        // Admin should NOT see edit profile button
        if (viewerRole === 'admin') {
            return false;
        }

        // Matchmaker can edit if:
        // 1. User is assigned to them, OR
        // 2. User was approved by them
        if (viewerRole === 'matchmaker') {
            return user.assigned_matchmaker_id === userId || user.approved_by === userId;
        }

        // Manager can edit if:
        // 1. Prospect is not dispatched yet (assigned_matchmaker_id is null) and from their agency, OR
        // 2. They are the one that validated/approved the member/client
        if (viewerRole === 'manager') {
            // If prospect is not dispatched and from manager's agency, manager can edit
            if (user.status === 'prospect' && !user.assigned_matchmaker_id && user.agency_id === auth?.user?.agency_id) {
                return true;
            }
            // For members/clients, only if they validated them
            return user.validated_by_manager_id === userId;
        }

        return false;
    };

    // Handle user info modal
    const handleUserInfoClick = (user) => {
        const nameParts = (user.name || '').split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        setSelectedUserForInfo(user);
        setUserFormData({
            firstName: firstName,
            lastName: lastName,
            email: user.email || '',
            username: user.username || ''
        });
        setUserInfoModalOpen(true);
    };

    // Handle copy link
    const handleCopyLink = () => {
        if (selectedUserForInfo) {
            const profileUrl = `${window.location.origin}/profile/${selectedUserForInfo.username || selectedUserForInfo.id}`;
            navigator.clipboard.writeText(profileUrl).then(() => {
                // You could add a toast notification here
            });
        }
    };

    // Handle view profile
    const handleViewProfile = () => {
        if (selectedUserForInfo) {
            router.visit(`/profile/${selectedUserForInfo.username || selectedUserForInfo.id}`);
        }
    };
    
    // Check if user can mark as "A rappeler" (only for expired clients)
    const canMarkAsRappeler = (user) => {
        if (!auth?.user || !user) return false;
        
        // Only allow for expired clients
        if (user.status !== 'client_expire') return false;
        
        const userId = auth?.user?.id;
        const userRole = auth?.user?.roles?.[0]?.name || 'user';
        
        if (userRole === 'admin') return true;
        
        // For matchmakers: can mark if they validated the user or if assigned to them
        if (userRole === 'matchmaker') {
            return user.approved_by === userId || user.assigned_matchmaker_id === userId;
        }
        
        // For managers: can mark if user is from their agency or they validated them
        if (userRole === 'manager') {
            return user.agency_id === auth?.user?.agency_id || user.validated_by_manager_id === userId;
        }
        
        return false;
    };
    
    const handleMarkAsRappeler = (user) => {
        router.post(`/staff/prospects/${user.id}/rappeler`, {}, {
            onSuccess: () => {
                router.reload({ only: ['prospects'] });
            },
            onError: () => {
                // Error handled by redirect
            }
        });
    };

    return (
        <AppLayout>
            <Head title="Participants" />
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
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setTestExpirationOpen(true)}
                                className="flex items-center gap-2 border-warning text-warning hover:bg-warning-light"
                            >
                                <TestTube className="w-4 h-4" />
                                Test Expiration
                            </Button>
                        </div>
                        
                        {/* Pagination Info */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 text-sm text-muted-foreground">
                            <div>
                                Showing {showingStart} to {showingEnd} of {filteredProspects.length} participants
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
                            <Select value={status || 'all'} onValueChange={(v) => {
                                router.visit(`/staff/validated-prospects?status=${v}`, { preserveScroll: true, preserveState: true, replace: true });
                            }}>
                                <SelectTrigger className="h-9 w-[160px]"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All</SelectItem>
                                    <SelectItem value="member">Member</SelectItem>
                                    <SelectItem value="client">Client</SelectItem>
                                    <SelectItem value="client_expire">Client Expiré</SelectItem>
                                    <SelectItem value="rappeler">A rappeler</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {/* Cards View */}
                {viewMode === 'cards' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {paginatedProspects.map((u) => (
                            <Card key={u.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                                <div className="relative">
                                    <img
                                        src={getProfilePicture(u)}
                                        alt={u.name}
                                        className="w-full h-48 object-cover"
                                        onError={(e) => {
                                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random`;
                                        }}
                                    />
                                    {/* Overlay Tags */}
                                    <div className="absolute top-2 right-2 flex flex-col gap-2">
                                        <div className="flex gap-2">
                                            <Badge className="bg-foreground text-background text-xs px-2 py-1">
                                                {getStep(u)}
                                            </Badge>
                                            <Badge className="bg-success text-success-foreground text-xs px-2 py-1 flex items-center gap-1">
                                                <CheckCircle className="w-3 h-3" />
                                                Confirmed
                                            </Badge>
                                        </div>
                                        <div className="flex gap-2">
                                            <Badge className={`${getStatusInfo(u.status).className} text-xs px-2 py-1`}>
                                                {getStatusInfo(u.status).label}
                                            </Badge>
                                            {u.to_rappeler && (
                                                <Badge className="bg-warning text-warning-foreground text-xs px-2 py-1">
                                                    A rappeler
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <CardContent className="p-4 space-y-3">
                                    <div>
                                        <h3 className="font-semibold text-lg">{u.name}</h3>
                                    </div>
                                    
                                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                                        <Mail className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                        <span className="truncate">{u.email || 'N/A'}</span>
                                    </div>
                                    
                                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                                        <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                        <span className="truncate">{getLocation(u)}</span>
                                    </div>
                                    
                                    <div className="flex items-start gap-2 text-sm">
                                        <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-600" />
                                        <span>Approved by {u.approvedBy?.name || u.approved_by?.name || 'Unknown'}</span>
                                    </div>
                                    
                                    <div className="pt-2 space-y-2">
                                        {u.profile?.account_status === 'desactivated' ? (
                                            <Button
                                                variant="default"
                                                size="sm"
                                                className="w-full"
                                                onClick={() => {
                                                    setSelectedUserForStatus(u);
                                                    setStatusReason('');
                                                    setActivateDialogOpen(true);
                                                }}
                                            >
                                                {t('staff.activate')}
                                            </Button>
                                        ) : (
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                className="w-full"
                                                onClick={() => {
                                                    setSelectedUserForStatus(u);
                                                    setStatusReason('');
                                                    setDeactivateDialogOpen(true);
                                                }}
                                            >
                                                {t('staff.deactivate')}
                                            </Button>
                                        )}
                                        {canMarkAsRappeler(u) && !u.to_rappeler && (
                                            <Button
                                                variant="default"
                                                size="sm"
                                                className="w-full bg-warning hover:opacity-90"
                                                onClick={() => handleMarkAsRappeler(u)}
                                            >
                                                <Phone className="w-4 h-4 mr-1" />
                                                A rappeler
                                            </Button>
                                        )}
                                        {(u.status === 'member' || u.status === 'client_expire') && !u.has_bill && (
                                            <Button
                                                variant="default"
                                                size="sm"
                                                className="w-full bg-info hover:opacity-90"
                                                onClick={() => handleCreateSubscription(u)}
                                            >
                                                {t('staff.validatedProspects.createSubscription')}
                                            </Button>
                                        )}
                                        {(u.status === 'member' || u.status === 'client_expire') && u.has_bill && (
                                            <Button
                                                variant="default"
                                                size="sm"
                                                className="w-full bg-success hover:opacity-90"
                                                onClick={() => handleMarkAsClient(u.id)}
                                                disabled={loading[u.id]}
                                            >
                                                {loading[u.id] ? t('staff.validatedProspects.processing') : t('staff.validatedProspects.markAsClient')}
                                            </Button>
                                        )}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full  hover:bg-[#096725]!  hover:text-white"
                                            onClick={() => router.visit(`/profile/${u.username || u.id}`)}
                                        >
                                            {t('staff.validatedProspects.findStory')}
                                        </Button>
                                        {canEditProfile(u) && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="w-full border-blue-500 text-blue-600 hover:bg-blue-50"
                                                onClick={() => router.visit(`/staff/prospects/${u.id}/profile/edit`)}
                                            >
                                                <Pencil className="w-4 h-4 mr-1" />
                                                {t('staff.editProfile', { defaultValue: 'Edit Profile' })}
                                            </Button>
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
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead className="hidden md:table-cell">Phone</TableHead>
                                            <TableHead className="hidden lg:table-cell">City</TableHead>
                                            <TableHead>Step</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Account Status</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedProspects.map((u) => (
                                            <TableRow 
                                                key={u.id}
                                                className="cursor-pointer hover:bg-muted/50"
                                                onClick={() => handleUserInfoClick(u)}
                                            >
                                                <TableCell className="font-medium">{u.name}</TableCell>
                                                <TableCell>{u.email || 'N/A'}</TableCell>
                                                <TableCell className="hidden md:table-cell">{u.phone || 'N/A'}</TableCell>
                                                <TableCell className="hidden lg:table-cell">{getLocation(u)}</TableCell>
                                                <TableCell>
                                                    <Badge className="bg-foreground text-background">
                                                        {getStep(u)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col gap-1">
                                                        <Badge className="bg-success-bg text-success flex items-center gap-1 w-fit">
                                                            <CheckCircle className="w-3 h-3" />
                                                            Approved
                                                        </Badge>
                                                        <Badge className={`${getStatusInfo(u.status).className} w-fit text-xs`}>
                                                            {getStatusInfo(u.status).label}
                                                        </Badge>
                                                        {u.to_rappeler && (
                                                            <Badge className="bg-warning text-warning-foreground w-fit text-xs">
                                                                A rappeler
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={u.profile?.account_status === 'desactivated' ? 'destructive' : 'default'}>
                                                        {u.profile?.account_status === 'desactivated' ? 'Désactivé' : 'Actif'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                        {u.profile?.account_status === 'desactivated' ? (
                                                            <Button
                                                                size="sm"
                                                                variant="default"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedUserForStatus(u);
                                                                    setStatusReason('');
                                                                    setActivateDialogOpen(true);
                                                                }}
                                                            >
                                                                {t('staff.activate')}
                                                            </Button>
                                                        ) : (
                                                            <Button
                                                                size="sm"
                                                                variant="destructive"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedUserForStatus(u);
                                                                    setStatusReason('');
                                                                    setDeactivateDialogOpen(true);
                                                                }}
                                                            >
                                                                {t('staff.deactivate')}
                                                            </Button>
                                                        )}
                                                        {canMarkAsRappeler(u) && !u.to_rappeler && (
                                                            <Button
                                                                variant="default"
                                                                size="sm"
                                                                className="bg-warning hover:opacity-90"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleMarkAsRappeler(u);
                                                                }}
                                                            >
                                                                <Phone className="w-4 h-4 mr-1" />
                                                                A rappeler
                                                            </Button>
                                                        )}
                                                        {(u.status === 'member' || u.status === 'client_expire') && !u.has_bill && (
                                                            <Button
                                                                variant="default"
                                                                size="sm"
                                                                className="bg-info hover:opacity-90"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleCreateSubscription(u);
                                                                }}
                                                            >
                                                                {t('staff.validatedProspects.createSubscription')}
                                                            </Button>
                                                        )}
                                                        {(u.status === 'member' || u.status === 'client_expire') && u.has_bill && (
                                                            <Button
                                                                variant="default"
                                                                size="sm"
                                                                className="bg-success hover:opacity-90"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleMarkAsClient(u.id);
                                                                }}
                                                                disabled={loading[u.id]}
                                                            >
                                                                {loading[u.id] ? t('staff.validatedProspects.processing') : t('staff.validatedProspects.markAsClient')}
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                router.visit(`/profile/${u.username || u.id}`);
                                                            }}
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </Button>
                                                        {canEditProfile(u) && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="border-blue-500 text-blue-600 hover:bg-blue-50"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    router.visit(`/staff/prospects/${u.id}/profile/edit`);
                                                                }}
                                                            >
                                                                <Pencil className="w-4 h-4 mr-1" />
                                                                {t('staff.editProfile', { defaultValue: 'Edit Profile' })}
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            
                            {paginatedProspects.length === 0 && !searchQuery.trim() && (
                                <div className="text-center py-8">
                                    <p className="text-gray-500">No participants found.</p>
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

            {/* Subscription Form Dialog */}
            <Dialog open={subscriptionOpen} onOpenChange={setSubscriptionOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{t('staff.validatedProspects.createInvoice')}</DialogTitle>
                        <DialogDescription>
                            {t('staff.validatedProspects.createInvoiceDescription', { name: selectedUser?.name })}
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                        {/* Matrimonial Pack Selection */}
                        <div className="space-y-2">
                            <Label htmlFor="matrimonial_pack">Pack Matrimonial</Label>
                            <Select 
                                value={subscriptionData.matrimonial_pack_id} 
                                onValueChange={(value) => setSubscriptionData(prev => ({ ...prev, matrimonial_pack_id: value }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Sélectionner un pack" />
                                </SelectTrigger>
                                <SelectContent>
                                    {matrimonialPacks.map((pack) => (
                                        <SelectItem key={pack.id} value={pack.id.toString()}>
                                            {pack.name} - {pack.duration}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Pack Price */}
                        <div className="space-y-2">
                            <Label htmlFor="pack_price">Prix du Pack (MAD)</Label>
                            <Input
                                id="pack_price"
                                type="number"
                                value={subscriptionData.pack_price}
                                onChange={(e) => setSubscriptionData(prev => ({ ...prev, pack_price: e.target.value }))}
                                placeholder="Entrez le prix"
                            />
                        </div>

                        {/* Pack Advantages */}
                        <div className="space-y-2">
                            <Label>Avantages du Pack</Label>
                            <div className="grid grid-cols-2 gap-2">
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
                                    <div key={advantage} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={advantage}
                                            checked={subscriptionData.pack_advantages.includes(advantage)}
                                            onCheckedChange={(checked) => handleAdvantageChange(advantage, checked)}
                                        />
                                        <Label htmlFor={advantage} className="text-sm">
                                            {advantage}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Payment Mode */}
                        <div className="space-y-2">
                            <Label htmlFor="payment_mode">Mode de Paiement</Label>
                            <Select 
                                value={subscriptionData.payment_mode} 
                                onValueChange={(value) => setSubscriptionData(prev => ({ ...prev, payment_mode: value }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Sélectionner un mode de paiement" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Virement">Virement</SelectItem>
                                    <SelectItem value="Caisse agence">Caisse agence</SelectItem>
                                    <SelectItem value="Chèque">Chèque</SelectItem>
                                    <SelectItem value="CMI">CMI</SelectItem>
                                    <SelectItem value="TPE">TPE</SelectItem>
                                    <SelectItem value="Avance">Avance</SelectItem>
                                    <SelectItem value="Reliquat">Reliquat</SelectItem>
                                    <SelectItem value="RDV">RDV</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end space-x-2 pt-4">
                            <Button
                                variant="outline"
                                onClick={() => setSubscriptionOpen(false)}
                            >
                                Annuler
                            </Button>
                            <Button
                                onClick={handleBillSubmit}
                                disabled={loading.bill}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                {loading.bill ? 'Création...' : 'Créer la Facture'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Test Subscription Expiration Dialog */}
            <Dialog open={testExpirationOpen} onOpenChange={setTestExpirationOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Test Subscription Expiration</DialogTitle>
                        <DialogDescription>
                            Select a client to test subscription expiration. This will:
                            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                                <li>Set subscription end date to today</li>
                                <li>Change user status to "client_expire"</li>
                                <li>Send expiration email</li>
                            </ul>
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="test-user">Select Client</Label>
                            <Select 
                                value={testUser?.id?.toString() || ''} 
                                onValueChange={(value) => {
                                    const user = prospects.find(u => u.id.toString() === value);
                                    setTestUser(user);
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a client to test" />
                                </SelectTrigger>
                                <SelectContent>
                                    {prospects
                                        .filter(u => (u.status === 'client' || u.status === 'client_expire') && u.subscriptions?.some(s => s.status === 'active'))
                                        .map((user) => {
                                            const activeSub = user.subscriptions?.find(s => s.status === 'active');
                                            return (
                                                <SelectItem key={user.id} value={user.id.toString()}>
                                                    {user.name} - Expires: {activeSub?.subscription_end ? new Date(activeSub.subscription_end).toLocaleDateString('fr-FR') : 'N/A'}
                                                </SelectItem>
                                            );
                                        })}
                                </SelectContent>
                            </Select>
                        </div>

                        {testUser && (
                            <div className="bg-warning-light border border-warning rounded-lg p-3">
                                    <p className="text-sm text-warning-foreground">
                                    <strong>Warning:</strong> This will modify the subscription end date for <strong>{testUser.name}</strong> and send an email. This is a test action.
                                </p>
                            </div>
                        )}

                        <div className="flex justify-end space-x-2 pt-4">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setTestExpirationOpen(false);
                                    setTestUser(null);
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={confirmTestExpiration}
                                disabled={!testUser || loading[`test_${testUser?.id}`]}
                                className="bg-warning hover:opacity-90"
                            >
                                {loading[`test_${testUser?.id}`] ? 'Testing...' : 'Test Expiration'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Activate Account Dialog */}
            <Dialog open={activateDialogOpen} onOpenChange={setActivateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('staff.activateDialog.title')}</DialogTitle>
                        <DialogDescription>
                            {t('staff.activateDialog.description', { name: selectedUserForStatus?.name })}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="activation-reason">{t('staff.activateDialog.activationReason')}</Label>
                            <Textarea
                                id="activation-reason"
                                value={statusReason}
                                onChange={(e) => setStatusReason(e.target.value)}
                                placeholder={t('staff.activateDialog.activationReasonPlaceholder')}
                                rows={4}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setActivateDialogOpen(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button
                            onClick={() => {
                                if (!statusReason.trim()) return;
                                setStatusSubmitting(true);
                                router.post(`/staff/users/${selectedUserForStatus.id}/activate`, {
                                    reason: statusReason
                                }, {
                                    onSuccess: () => {
                                        setActivateDialogOpen(false);
                                        setStatusReason('');
                                        setSelectedUserForStatus(null);
                                        setStatusSubmitting(false);
                                    },
                                    onError: () => {
                                        setStatusSubmitting(false);
                                    }
                                });
                            }}
                            disabled={!statusReason.trim() || statusSubmitting}
                        >
                            {statusSubmitting ? t('staff.activateDialog.activating') : t('staff.activateDialog.activateButton')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Deactivate Account Dialog */}
            <Dialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('staff.deactivateDialog.title')}</DialogTitle>
                        <DialogDescription>
                            {t('staff.deactivateDialog.description', { name: selectedUserForStatus?.name })}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="deactivation-reason">{t('staff.deactivateDialog.deactivationReason')}</Label>
                            <Textarea
                                id="deactivation-reason"
                                value={statusReason}
                                onChange={(e) => setStatusReason(e.target.value)}
                                placeholder={t('staff.deactivateDialog.deactivationReasonPlaceholder')}
                                rows={4}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeactivateDialogOpen(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                if (!statusReason.trim()) return;
                                setStatusSubmitting(true);
                                router.post(`/staff/users/${selectedUserForStatus.id}/deactivate`, {
                                    reason: statusReason
                                }, {
                                    onSuccess: () => {
                                        setDeactivateDialogOpen(false);
                                        setStatusReason('');
                                        setSelectedUserForStatus(null);
                                        setStatusSubmitting(false);
                                    },
                                    onError: () => {
                                        setStatusSubmitting(false);
                                    }
                                });
                            }}
                            disabled={!statusReason.trim() || statusSubmitting}
                        >
                            {statusSubmitting ? t('staff.deactivateDialog.deactivating') : t('staff.deactivateDialog.deactivateButton')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* User Info Modal */}
            <Dialog open={userInfoModalOpen} onOpenChange={setUserInfoModalOpen}>
                <DialogContent className="w-[95vw] sm:w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                    {selectedUserForInfo && (
                        <>
                            {/* Header Section with Profile Picture */}
                            <div className="flex flex-col items-center gap-4 pb-6 border-b">
                                <div className="relative">
                                    <img
                                        src={getProfilePicture(selectedUserForInfo)}
                                        alt={selectedUserForInfo.name}
                                        className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover"
                                        onError={(e) => {
                                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUserForInfo.name)}&background=random`;
                                        }}
                                    />
                                    <div className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-1.5 border-2 border-white">
                                        <Check className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                                    </div>
                                </div>
                                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 w-full px-2 sm:px-0">
                                    <div className="text-center sm:text-left flex-1">
                                        <h2 className="text-lg sm:text-xl font-semibold break-words">{selectedUserForInfo.name}</h2>
                                        <p className="text-xs sm:text-sm text-muted-foreground break-all">{selectedUserForInfo.email}</p>
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleCopyLink}
                                            className="flex items-center justify-center gap-2 w-full sm:w-auto"
                                        >
                                            <LinkIcon className="w-4 h-4" />
                                            Copy link
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleViewProfile}
                                            className="flex items-center justify-center gap-2 w-full sm:w-auto"
                                        >
                                            View profile
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Form Fields Section - Read Only */}
                            <div className="space-y-6 py-4 px-2 sm:px-0">
                                {/* Name Fields */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="firstName">Name</Label>
                                        <Input
                                            id="firstName"
                                            value={userFormData.firstName}
                                            disabled
                                            className="bg-muted"
                                            placeholder="First name"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="lastName" className="opacity-0">Name</Label>
                                        <Input
                                            id="lastName"
                                            value={userFormData.lastName}
                                            disabled
                                            className="bg-muted"
                                            placeholder="Last name"
                                        />
                                    </div>
                                </div>

                                {/* Email Address */}
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email address</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            id="email"
                                            type="email"
                                            value={userFormData.email}
                                            disabled
                                            className="pl-10 bg-muted"
                                            placeholder="Email address"
                                        />
                                    </div>
                                </div>

                                {/* Username */}
                                <div className="space-y-2">
                                    <Label htmlFor="username">Username</Label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                                            untitledui.com/
                                        </div>
                                        <Input
                                            id="username"
                                            value={userFormData.username}
                                            disabled
                                            className="pl-[120px] sm:pl-[140px] pr-10 bg-muted text-sm sm:text-base"
                                            placeholder="username"
                                        />
                                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                            <Check className="w-4 h-4 text-blue-600" />
                                        </div>
                                    </div>
                                </div>

                                {/* Profile Photo */}
                                <div className="space-y-2">
                                    <Label>Profile photo</Label>
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                        <img
                                            src={getProfilePicture(selectedUserForInfo)}
                                            alt={selectedUserForInfo.name}
                                            className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                                            onError={(e) => {
                                                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUserForInfo.name)}&background=random`;
                                            }}
                                        />
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                // Handle profile photo replacement
                                                const input = document.createElement('input');
                                                input.type = 'file';
                                                input.accept = 'image/*';
                                                input.onchange = (e) => {
                                                    // Handle file upload here
                                                };
                                                input.click();
                                            }}
                                            className="w-full sm:w-auto"
                                        >
                                            Click to replace
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Footer Buttons */}
                            <DialogFooter className="flex justify-end">
                                <Button
                                    variant="outline"
                                    onClick={() => setUserInfoModalOpen(false)}
                                >
                                    Cancel
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}


