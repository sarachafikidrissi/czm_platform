import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { XCircle, CheckCircle, Copy, Check, Mail, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProspectsDispatch() {
    const { t } = useTranslation();
    const { prospects = [], agencies = [], matchmakers = [], filters = {}, statusFilter = 'active' } = usePage().props;
    const isLoading = prospects === null || prospects === undefined;
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
    const [userInfoModalOpen, setUserInfoModalOpen] = useState(false);
    const [selectedUserForInfo, setSelectedUserForInfo] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    
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
                const response = await axios.get('/locations');
                if (!isMounted) return;
                
                const countriesData = Array.isArray(response.data?.countries) ? response.data.countries : [];
                
                // Map: keep iso2 and cities; use existing frenchName from JSON
                const normalized = countriesData
                    .filter((item) => item?.iso2)
                    .map((item) => ({
                        iso2: item.iso2,
                        frenchName: item.frenchName || item.name,
                        cities: Array.isArray(item.cities) ? item.cities : [],
                    }))
                    .sort((a, b) => a.frenchName.localeCompare(b.frenchName, 'fr'));
                const codeToCities = normalized.reduce((acc, item) => {
                    acc[item.iso2] = item.cities;
                    return acc;
                }, {});
                if (isMounted) {
                    setCountries(normalized);
                    setCountryCodeToCities(codeToCities);
                }
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

    // Sync selectedCountryCode with props when countries are loaded or props change
    useEffect(() => {
        if (countries.length === 0) return;
        
        if (prospectsCountry) {
            const country = countries.find((c) => c.frenchName === prospectsCountry);
            const matchingCode = country?.iso2 || '';
            if (selectedCountryCode !== matchingCode) {
                setSelectedCountryCode(matchingCode);
            }
        } else if (selectedCountryCode) {
            setSelectedCountryCode('');
        }
    }, [countries, prospectsCountry]);

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

    // Helper function to get profile picture URL
    const getProfilePicture = (user) => {
        if (user.profile?.profile_picture_path) {
            return `/storage/${user.profile.profile_picture_path}`;
        }
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`;
    };

    // Handle user info modal
    const handleUserInfoClick = (user) => {
        setSelectedUserForInfo(user);
        setUserInfoModalOpen(true);
    };

    // Handle copy link
    const handleCopyLink = () => {
        if (selectedUserForInfo) {
            const profileUrl = `${window.location.origin}/profile/${selectedUserForInfo.username}`;
            navigator.clipboard.writeText(profileUrl).then(() => {
                // You could add a toast notification here
            });
        }
    };

    // Handle view profile
    const handleViewProfile = () => {
        if (selectedUserForInfo) {
            window.open(`/profile/${selectedUserForInfo.username}`, '_blank', 'noopener,noreferrer');
        }
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

    // Filter prospects based on search query
    const filteredProspects = useMemo(() => {
        if (!prospects || prospects.length === 0) return [];
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

    const handleToggleAll = (checked) => {
        setSelectAll(checked);
        if (checked) {
            const filteredIds = filteredProspects.map((p) => p.id);
            setSelectedProspectIds((prev) => [...new Set([...prev, ...filteredIds])]);
        } else {
            // Only unselect filtered prospects
            const filteredIds = filteredProspects.map((p) => p.id);
            setSelectedProspectIds((prev) => prev.filter(id => !filteredIds.includes(id)));
        }
    };

    const toggleProspect = (id) => {
        setSelectedProspectIds((prev) => {
            const newIds = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
            // Update selectAll state based on whether all filtered prospects are selected
            const filteredIds = filteredProspects.map((p) => p.id);
            const allFilteredSelected = filteredIds.length > 0 && filteredIds.every(filteredId => newIds.includes(filteredId));
            setSelectAll(allFilteredSelected);
            return newIds;
        });
    };

    // Sync selectAll state when filtered prospects or selected IDs change
    useEffect(() => {
        if (filteredProspects.length > 0) {
            const filteredIds = filteredProspects.map((p) => p.id);
            const allFilteredSelected = filteredIds.every(id => selectedProspectIds.includes(id));
            setSelectAll(allFilteredSelected);
        } else {
            setSelectAll(false);
        }
    }, [filteredProspects, selectedProspectIds]);

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
            <Head title={t('staff.prospectsDispatch')} />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <Card>
                    <CardHeader>
                        <CardTitle>{t('staff.prospectsDispatch')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap items-end gap-4 mb-4">
                            <div className="grid gap-2 w-[220px]">
                                <Label>{t('staff.country')}</Label>
                                <Select
                                    value={selectedCountryCode || 'all'}
                                    onValueChange={(v) => {
                                        if (v === 'all') {
                                            setSelectedCountryCode('');
                                            handleFilterProspects('', '', dispatchStatus, statusFilter);
                                        } else {
                                            setSelectedCountryCode(v);
                                            const countryName = countries.find((c) => c.iso2 === v)?.frenchName || '';
                                            handleFilterProspects(countryName, '', dispatchStatus, statusFilter);
                                        }
                                    }}
                                    disabled={loadingCountries}
                                >
                                    <SelectTrigger className="h-9"><SelectValue placeholder={loadingCountries ? t('staff.userInfo.loading') : t('staff.userInfo.selectCountry')} /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('staff.all')}</SelectItem>
                                        {countries.map((c) => (
                                            <SelectItem key={c.iso2} value={c.iso2}>{c.frenchName}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2 w-[220px]">
                                <Label>{t('staff.city')}</Label>
                                <Select
                                    value={prospectsCity}
                                    onValueChange={(v) => handleFilterProspects(selectedCountryCode ? (countries.find((c) => c.iso2 === selectedCountryCode)?.frenchName || '') : prospectsCountry, v, dispatchStatus)}
                                    disabled={!selectedCountryCode || availableCities.length === 0}
                                >
                                    <SelectTrigger className="h-9"><SelectValue placeholder={!selectedCountryCode ? t('staff.userInfo.chooseCountryFirst') : (availableCities.length ? t('staff.userInfo.selectCity') : t('staff.userInfo.noCity'))} /></SelectTrigger>
                                    <SelectContent>
                                        {availableCities.map((city) => (
                                            <SelectItem key={city} value={city}>{city}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2 w-[220px]">
                                <Label>{t('staff.dispatch')}</Label>
                                <Select
                                    value={dispatchStatus}
                                    onValueChange={(v) => { setDispatchStatus(v); handleFilterProspects(selectedCountryCode ? (countries.find((c) => c.iso2 === selectedCountryCode)?.frenchName || '') : prospectsCountry, prospectsCity, v); }}
                                >
                                    <SelectTrigger className="h-9"><SelectValue placeholder={t('staff.all')} /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('staff.all')}</SelectItem>
                                        <SelectItem value="not_dispatched">{t('staff.notDispatched')}</SelectItem>
                                        <SelectItem value="dispatched">{t('staff.dispatched')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2 w-[220px]">
                                <Label>{t('common.status')}</Label>
                                <Select
                                    value={statusFilter || 'active'}
                                    onValueChange={(v) => {
                                        handleFilterProspects(
                                            selectedCountryCode ? (countries.find((c) => c.iso2 === selectedCountryCode)?.frenchName || '') : prospectsCountry, 
                                            prospectsCity, 
                                            dispatchStatus, 
                                            v
                                        );
                                    }}
                                >
                                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">{t('staff.userInfo.activeStatus')}</SelectItem>
                                        <SelectItem value="rejected">{t('staff.userInfo.rejectedStatus')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button variant="outline" onClick={() => {
                                setSelectedCountryCode('');
                                setDispatchStatus('all');
                                handleFilterProspects('', '', 'all', 'active');
                            }}>{t('staff.reset')}</Button>
                            <div className="ml-auto flex gap-2">
                                <Button disabled={!hasValidDispatchSelection} onClick={handleDispatchClick}>{t('staff.dispatchProspects')}</Button>
                                <Button disabled={!hasValidReassignSelection} variant="outline" onClick={handleReassignClick}>{t('staff.reassignProspects')}</Button>
                            </div>
                        </div>

                        <div className="mb-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    type="text"
                                    placeholder={t('staff.searchPlaceholder')}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        {filteredProspects.length === 0 && searchQuery.trim() && (
                            <div className="mb-4 p-4 bg-info-light border border-info rounded-lg">
                                <p className="text-info-foreground text-sm">
                                    {t('staff.noResults', { query: searchQuery })}
                                </p>
                            </div>
                        )}

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-10">
                                        <input 
                                            type="checkbox" 
                                            checked={filteredProspects.length > 0 && filteredProspects.every(p => selectedProspectIds.includes(p.id))} 
                                            onChange={(e) => handleToggleAll(e.target.checked)} 
                                        />
                                    </TableHead>
                                    <TableHead>{t('staff.tableHeaders.name')}</TableHead>
                                    <TableHead>{t('staff.tableHeaders.gender')}</TableHead>
                                    <TableHead>{t('staff.tableHeaders.country')}</TableHead>
                                    <TableHead>{t('staff.tableHeaders.city')}</TableHead>
                                    <TableHead>{t('staff.tableHeaders.phone')}</TableHead>
                                    {statusFilter === 'active' && <TableHead>{t('staff.tableHeaders.dispatchedTo')}</TableHead>}
                                    {statusFilter === 'rejected' && <TableHead>{t('staff.tableHeaders.rejectionReason')}</TableHead>}
                                    <TableHead>{t('staff.tableHeaders.accountStatus')}</TableHead>
                                    <TableHead>{t('staff.tableHeaders.date')}</TableHead>
                                    <TableHead>{t('staff.tableHeaders.actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    [1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                            {statusFilter === 'active' && <TableCell><Skeleton className="h-4 w-32" /></TableCell>}
                                            {statusFilter === 'rejected' && <TableCell><Skeleton className="h-4 w-40" /></TableCell>}
                                            <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                            <TableCell>
                                                <div className="flex gap-2">
                                                    <Skeleton className="h-8 w-20" />
                                                    <Skeleton className="h-8 w-16" />
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    filteredProspects.map((p) => (
                                    <TableRow 
                                        key={p.id} 
                                        className={`cursor-pointer hover:bg-muted/50 ${statusFilter === 'rejected' ? 'bg-error-light' : ''}`}
                                        onClick={() => handleUserInfoClick(p)}
                                    >
                                        <TableCell onClick={(e) => e.stopPropagation()}>
                                            <input 
                                                type="checkbox" 
                                                checked={selectedProspectIds.includes(p.id)} 
                                                onChange={(e) => {
                                                    e.stopPropagation();
                                                    toggleProspect(p.id);
                                                }} 
                                            />
                                        </TableCell>
                                        <TableCell className="font-medium">{p.name}</TableCell>
                                        <TableCell>{p.gender || 'N/A'}</TableCell>
                                        <TableCell>{p.country}</TableCell>
                                        <TableCell>{p.city}</TableCell>
                                        <TableCell>{p.phone}</TableCell>
                                        {statusFilter === 'active' ? (
                                            <TableCell>
                                                {p.assigned_matchmaker_id ? (
                                                    <div className="text-sm">
                                                        <div className="font-medium text-success">{t('staff.matchmaker')}: {p.assigned_matchmaker?.name || t('staff.unknown')}</div>
                                                        {p.agency_id && (
                                                            <div className="text-info">{t('staff.agency')}: {p.agency?.name || t('staff.unknown')}</div>
                                                        )}
                                                    </div>
                                                ) : p.agency_id ? (
                                                    <span className="text-info">{t('staff.agency')}: {p.agency?.name || t('staff.unknown')}</span>
                                                ) : (
                                                    <span className="text-muted-foreground">{t('staff.notDispatchedLabel')}</span>
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
                                                {p.profile?.account_status === 'desactivated' ? t('staff.desactivated') : t('staff.active')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{new Date(p.created_at ?? Date.now()).toLocaleDateString()}</TableCell>
                                        <TableCell>
                                            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                                {statusFilter === 'active' ? (
                                                    <>
                                                        {p.status === 'prospect' && (
                                                            <Button
                                                                size="sm"
                                                                variant="destructive"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleReject(p);
                                                                }}
                                                            >
                                                                <XCircle className="w-4 h-4 mr-1" />
                                                                {t('staff.reject')}
                                                            </Button>
                                                        )}
                                                        {p.profile?.account_status === 'desactivated' ? (
                                                            <Button
                                                                size="sm"
                                                                variant="default"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedProspect(p);
                                                                    setReason('');
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
                                                                    setSelectedProspect(p);
                                                                    setReason('');
                                                                    setDeactivateDialogOpen(true);
                                                                }}
                                                            >
                                                                {t('staff.deactivate')}
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
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleAccept(p);
                                                                }}
                                                            >
                                                                <CheckCircle className="w-4 h-4 mr-1" />
                                                                {t('staff.accept')}
                                                            </Button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                    </TableCell>
                                </TableRow>
                                ))
                            )}
                            {filteredProspects.length === 0 && !searchQuery.trim() && !isLoading && (
                                <TableRow>
                                    <TableCell colSpan={statusFilter === 'active' ? 9 : 9} className="text-center py-8">
                                        <p className="text-muted-foreground">{t('staff.noProspectsAvailable')}</p>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={dispatchOpen} onOpenChange={setDispatchOpen}>
                <DialogContent className="sm:max-w-[520px]">
                    <DialogHeader>
                        <DialogTitle>{t('staff.dispatchDialog.title')}</DialogTitle>
                        <DialogDescription>
                            {t('staff.dispatchDialog.description')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-2">
                        <div className="grid gap-2">
                            <Label>{t('staff.dispatchDialog.dispatchType')}</Label>
                            <Select value={dispatchType} onValueChange={(value) => {
                                setDispatchType(value);
                                setSelectedAgencyId('');
                                setSelectedMatchmakerId('');
                            }}>
                                <SelectTrigger className="h-9"><SelectValue placeholder={t('staff.dispatchDialog.selectDispatchType')} /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="agency">{t('staff.agency')}</SelectItem>
                                    <SelectItem value="matchmaker">{t('staff.matchmaker')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {dispatchType === 'agency' && (
                            <div className="grid gap-2">
                                <Label>{t('staff.agency')}</Label>
                                <Select value={selectedAgencyId} onValueChange={setSelectedAgencyId}>
                                    <SelectTrigger className="h-9"><SelectValue placeholder={t('staff.dispatchDialog.selectAgency')} /></SelectTrigger>
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
                                <Label>{t('staff.matchmaker')}</Label>
                                <Select value={selectedMatchmakerId} onValueChange={setSelectedMatchmakerId}>
                                    <SelectTrigger className="h-9"><SelectValue placeholder={t('staff.dispatchDialog.selectMatchmaker')} /></SelectTrigger>
                                    <SelectContent>
                                        {matchmakers.map((m) => (
                                            <SelectItem key={m.id} value={m.id.toString()}>{m.name} ({m.agency?.name || t('staff.noAgency')})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDispatchOpen(false)}>{t('common.cancel')}</Button>
                        <Button onClick={submitDispatch} disabled={
                            selectedProspectIds.length === 0 || 
                            (dispatchType === 'agency' && !selectedAgencyId) || 
                            (dispatchType === 'matchmaker' && !selectedMatchmakerId)
                        }>{t('staff.dispatchDialog.submit')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={reassignOpen} onOpenChange={setReassignOpen}>
                <DialogContent className="sm:max-w-[520px]">
                    <DialogHeader>
                        <DialogTitle>{t('staff.reassignDialog.title')}</DialogTitle>
                        <DialogDescription>
                            {t('staff.reassignDialog.description')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-2">
                        <div className="grid gap-2">
                            <Label>{t('staff.reassignDialog.reassignType')}</Label>
                            <Select value={reassignType} onValueChange={(value) => {
                                setReassignType(value);
                                setSelectedReassignAgencyId('');
                                setSelectedReassignMatchmakerId('');
                            }}>
                                <SelectTrigger className="h-9"><SelectValue placeholder={t('staff.reassignDialog.selectReassignType')} /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="agency">{t('staff.agency')}</SelectItem>
                                    <SelectItem value="matchmaker">{t('staff.matchmaker')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {reassignType === 'agency' && (
                            <div className="grid gap-2">
                                <Label>{t('staff.agency')}</Label>
                                <Select value={selectedReassignAgencyId} onValueChange={setSelectedReassignAgencyId}>
                                    <SelectTrigger className="h-9"><SelectValue placeholder={t('staff.dispatchDialog.selectAgency')} /></SelectTrigger>
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
                                <Label>{t('staff.matchmaker')}</Label>
                                <Select value={selectedReassignMatchmakerId} onValueChange={setSelectedReassignMatchmakerId}>
                                    <SelectTrigger className="h-9"><SelectValue placeholder={t('staff.dispatchDialog.selectMatchmaker')} /></SelectTrigger>
                                    <SelectContent>
                                        {matchmakers.map((m) => (
                                            <SelectItem key={m.id} value={m.id.toString()}>{m.name} ({m.agency?.name || t('staff.noAgency')})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setReassignOpen(false)}>{t('common.cancel')}</Button>
                        <Button onClick={submitReassign} disabled={
                            selectedProspectIds.length === 0 || 
                            (reassignType === 'agency' && !selectedReassignAgencyId) || 
                            (reassignType === 'matchmaker' && !selectedReassignMatchmakerId)
                        }>{t('staff.reassignProspects')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Activate Account Dialog */}
            <Dialog open={activateDialogOpen} onOpenChange={setActivateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('staff.activateDialog.title')}</DialogTitle>
                        <DialogDescription>
                            {t('staff.activateDialog.description', { name: selectedProspect?.name })}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="activation-reason">{t('staff.activateDialog.activationReason')}</Label>
                            <Textarea
                                id="activation-reason"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
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
                            {submitting ? t('staff.activateDialog.activating') : t('staff.activateDialog.activateButton')}
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
                            {t('staff.deactivateDialog.description', { name: selectedProspect?.name })}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="deactivation-reason">{t('staff.deactivateDialog.deactivationReason')}</Label>
                            <Textarea
                                id="deactivation-reason"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
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
                            {submitting ? t('staff.deactivateDialog.deactivating') : t('staff.deactivateDialog.deactivateButton')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            {/* Rejection Dialog */}
            <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('staff.rejectDialog.title')}</DialogTitle>
                        <DialogDescription>
                            {t('staff.rejectDialog.description', { name: selectedProspect?.name || t('staff.prospectsDispatch') })}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="rejection-reason">{t('staff.rejectDialog.rejectionReason')}</Label>
                            <Textarea
                                id="rejection-reason"
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder={t('staff.rejectDialog.rejectionReasonPlaceholder')}
                                rows={4}
                                required
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={submitRejection}
                            disabled={!rejectionReason.trim() || rejecting}
                        >
                            {rejecting ? t('staff.rejectDialog.rejecting') : t('staff.rejectDialog.rejectButton')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* User Info Modal - Read Only */}
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
                                            <Copy className="w-4 h-4" />
                                            {t('staff.userInfo.copyLink')}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleViewProfile}
                                            className="flex items-center justify-center gap-2 w-full sm:w-auto"
                                        >
                                            {t('staff.userInfo.viewProfile')}
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Form Fields Section - Read Only */}
                            <div className="space-y-6 py-4 px-2 sm:px-0">
                                {/* Name Fields */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="firstName">{t('staff.userInfo.firstName')}</Label>
                                        <Input
                                            id="firstName"
                                            value={(selectedUserForInfo.name || '').split(' ')[0] || ''}
                                            disabled
                                            className="bg-muted"
                                            placeholder={t('staff.userInfo.firstName')}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="lastName" className="opacity-0">{t('staff.userInfo.lastName')}</Label>
                                        <Input
                                            id="lastName"
                                            value={(selectedUserForInfo.name || '').split(' ').slice(1).join(' ') || ''}
                                            disabled
                                            className="bg-muted"
                                            placeholder={t('staff.userInfo.lastName')}
                                        />
                                    </div>
                                </div>

                                {/* Email Address */}
                                <div className="space-y-2">
                                    <Label htmlFor="email">{t('staff.userInfo.email')}</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            id="email"
                                            type="email"
                                            value={selectedUserForInfo.email || ''}
                                            disabled
                                            className="pl-10 bg-muted"
                                            placeholder="Email address"
                                        />
                                    </div>
                                </div>

                                {/* Username */}
                                <div className="space-y-2">
                                    <Label htmlFor="username">{t('staff.userInfo.username')}</Label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                                            untitledui.com/
                                        </div>
                                        <Input
                                            id="username"
                                            value={selectedUserForInfo.username || ''}
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
                                    <Label>{t('profile.profilePicture')}</Label>
                                    <div className="flex items-center gap-4">
                                        <img
                                            src={getProfilePicture(selectedUserForInfo)}
                                            alt={selectedUserForInfo.name}
                                            className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                                            onError={(e) => {
                                                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUserForInfo.name)}&background=random`;
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Footer Buttons */}
                            <DialogFooter className="flex justify-end">
                                <Button
                                    variant="outline"
                                    onClick={() => setUserInfoModalOpen(false)}
                                >
                                    {t('common.cancel')}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}


