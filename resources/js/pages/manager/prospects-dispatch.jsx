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
import { CheckCircle, Search } from 'lucide-react';
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
                                            <TableRow key={p.id}>
                                                <TableCell>
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
            </div>
        </AppLayout>
    );
}

