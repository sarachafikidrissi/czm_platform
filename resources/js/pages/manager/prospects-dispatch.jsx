import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Search, Copy, Check, Mail } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

export default function ManagerProspectsDispatch() {
    const { t } = useTranslation();
    const { prospects = [], matchmakers = [], statusFilter = 'active' } = usePage().props;
    const [selectedProspectIds, setSelectedProspectIds] = useState([]);
    const [selectAll, setSelectAll] = useState(false);
    const [dispatchOpen, setDispatchOpen] = useState(false);
    const [selectedMatchmakerId, setSelectedMatchmakerId] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [userInfoModalOpen, setUserInfoModalOpen] = useState(false);
    const [selectedUserForInfo, setSelectedUserForInfo] = useState(null);

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

    // Filter selections when opening dispatch dialog
    const handleDispatchClick = () => {
        if (selectedProspectIds.length === 0) return;
        setDispatchOpen(true);
    };

    // Check if selected prospects are valid for dispatch
    const hasValidDispatchSelection = useMemo(() => {
        return selectedProspectIds.length > 0;
    }, [selectedProspectIds]);

    const submitDispatch = () => {
        if (selectedProspectIds.length === 0) return;
        if (!selectedMatchmakerId) return;
        
        const payload = {
            prospect_ids: selectedProspectIds.map(id => parseInt(id)),
            matchmaker_id: parseInt(selectedMatchmakerId),
        };
        
        router.post('/manager/prospects/dispatch', payload, {
            onSuccess: () => {
                setDispatchOpen(false);
                setSelectedMatchmakerId('');
                setSelectedProspectIds([]);
                setSelectAll(false);
            }
        });
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

    return (
        <AppLayout>
            <Head title={t('staff.prospectsDispatch')} />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <Card>
                    <CardHeader>
                        <CardTitle>{t('staff.prospectsDispatch')}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Dispatch prospects received by admin to matchmakers in your agency
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Search Bar */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Search by name, email or username..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        {/* Status Filter */}
                        <div className="flex items-center gap-2">
                            <Label>Status</Label>
                            <Select 
                                value={statusFilter || 'active'} 
                                onValueChange={(v) => router.visit(`/manager/prospects-dispatch?status_filter=${v}`, { preserveScroll: true, preserveState: true, replace: true })}
                            >
                                <SelectTrigger className="h-9 w-[160px]"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="rejected">Rejected</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Dispatch Button */}
                        <div className="flex justify-end">
                            <Button 
                                disabled={!hasValidDispatchSelection} 
                                onClick={handleDispatchClick}
                            >
                                {t('staff.dispatchProspects')}
                            </Button>
                        </div>

                        {/* Prospects Table */}
                        <div className="border rounded-lg">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12">
                                            <Checkbox
                                                checked={selectAll}
                                                onCheckedChange={handleToggleAll}
                                            />
                                        </TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead className="hidden md:table-cell">Phone</TableHead>
                                        <TableHead className="hidden lg:table-cell">City</TableHead>
                                        <TableHead className="hidden lg:table-cell">Country</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredProspects.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                                {searchQuery.trim() 
                                                    ? 'No prospects found matching your search.'
                                                    : statusFilter === 'rejected'
                                                    ? 'No rejected prospects available.'
                                                    : 'No prospects available for dispatch. All prospects have been dispatched to matchmakers.'}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredProspects.map((p) => (
                                            <TableRow 
                                                key={p.id}
                                                className="cursor-pointer hover:bg-muted/50"
                                                onClick={() => handleUserInfoClick(p)}
                                            >
                                                <TableCell onClick={(e) => e.stopPropagation()}>
                                                    <Checkbox
                                                        checked={selectedProspectIds.includes(p.id)}
                                                        onCheckedChange={() => toggleProspect(p.id)}
                                                    />
                                                </TableCell>
                                                <TableCell className="font-medium">{p.name}</TableCell>
                                                <TableCell>{p.email || 'N/A'}</TableCell>
                                                <TableCell className="hidden md:table-cell">{p.phone || 'N/A'}</TableCell>
                                                <TableCell className="hidden lg:table-cell">{p.city || 'N/A'}</TableCell>
                                                <TableCell className="hidden lg:table-cell">{p.country || 'N/A'}</TableCell>
                                                <TableCell>
                                                    {p.assigned_matchmaker_id ? (
                                                        <Badge className="bg-success text-white">
                                                            <CheckCircle className="w-3 h-3 mr-1" />
                                                            Assigned
                                                        </Badge>
                                                    ) : p.agency_id ? (
                                                        <Badge className="bg-info text-white">
                                                            <CheckCircle className="w-3 h-3 mr-1" />
                                                            Dispatched to Agency
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="bg-muted-foreground text-white">
                                                            Not Dispatched
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                {/* Dispatch Dialog */}
                <Dialog open={dispatchOpen} onOpenChange={setDispatchOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{t('staff.dispatchDialog.title')}</DialogTitle>
                            <DialogDescription>
                                Select a matchmaker from your agency to dispatch {selectedProspectIds.length} prospect(s)
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            {matchmakers.length === 0 ? (
                                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                    <p className="text-yellow-800 text-sm">
                                        No approved matchmakers available in your agency. Please contact admin to add matchmakers to your agency.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid gap-2">
                                    <Label>{t('staff.dispatchDialog.selectMatchmaker')}</Label>
                                    <Select value={selectedMatchmakerId} onValueChange={setSelectedMatchmakerId}>
                                        <SelectTrigger className="h-9">
                                            <SelectValue placeholder="Select a matchmaker" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {matchmakers.map((m) => (
                                                <SelectItem key={m.id} value={String(m.id)}>
                                                    {m.name} ({m.email})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDispatchOpen(false)}>
                                {t('common.cancel')}
                            </Button>
                            <Button 
                                onClick={submitDispatch} 
                                disabled={!selectedMatchmakerId || selectedProspectIds.length === 0 || matchmakers.length === 0}
                            >
                                Dispatch
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
            </div>
        </AppLayout>
    );
}

