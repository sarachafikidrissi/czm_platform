import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Search, Copy, Check, Mail, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Skeleton } from '@/components/ui/skeleton';
import { getCommercialCodeDisplay } from '@/lib/heard-about';
import { ProspectTraiteBadge } from '@/components/prospect-traite-badge';

const TABLE_HEAD_CLASS = 'px-5 py-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500';
const PRIMARY_BUTTON_CLASS = 'bg-rose-800 text-white hover:bg-rose-900';

export default function ManagerProspectsDispatch() {
    const { t } = useTranslation();
    const {
        prospects = [],
        matchmakers = [],
        managers = [],
        filterMatchmakers = [],
        matchmaker_id = null,
        statusFilter = 'active',
        commercialOnly = false,
        search: initialSearch = '',
    } = usePage().props;
    const assignees = [...matchmakers, ...managers];
    const [isLoading, setIsLoading] = useState(false);

    const withLoadingVisit = (options = {}) => {
        const { onFinish: userOnFinish, ...rest } = options;
        return {
            onStart: () => setIsLoading(true),
            onFinish: () => {
                setIsLoading(false);
                userOnFinish?.();
            },
            ...rest,
        };
    };

    const DEFAULT_PER_PAGE = 5;
    const isServerPaginated = Array.isArray(prospects?.data);
    const allProspects = isServerPaginated ? prospects.data : Array.isArray(prospects) ? prospects : [];
    const currentPageNum = isServerPaginated ? prospects?.current_page || 1 : 1;
    const lastPage = isServerPaginated ? prospects?.last_page || 1 : 1;
    const prospectsData = allProspects;
    const hasPagination = lastPage > 1;
    const showingStart = isServerPaginated ? (prospects?.from ?? 0) : (allProspects.length ? 1 : 0);
    const showingEnd = isServerPaginated ? (prospects?.to ?? 0) : allProspects.length;
    const total = isServerPaginated ? (prospects?.total ?? 0) : allProspects.length;

    const [selectedProspectIds, setSelectedProspectIds] = useState([]);
    const [selectAll, setSelectAll] = useState(false);
    const [dispatchOpen, setDispatchOpen] = useState(false);
    const [selectedMatchmakerId, setSelectedMatchmakerId] = useState('');
    const [searchQuery, setSearchQuery] = useState(initialSearch);
    const searchDebounceRef = useRef(null);
    const pendingSearchRef = useRef(null);
    const [userInfoModalOpen, setUserInfoModalOpen] = useState(false);
    const [selectedUserForInfo, setSelectedUserForInfo] = useState(null);

    const buildListParams = (overrides = {}) => {
        const params = { ...overrides };

        if (!('status_filter' in overrides) && statusFilter && statusFilter !== 'active') {
            params.status_filter = statusFilter;
        }

        if (!('commercial_only' in overrides) && commercialOnly) {
            params.commercial_only = 1;
        }

        if (!('matchmaker_id' in overrides) && matchmaker_id) {
            params.matchmaker_id = matchmaker_id;
        }

        if (!('search' in overrides)) {
            const trimmedSearch = searchQuery.trim();
            if (trimmedSearch) params.search = trimmedSearch;
        }

        if (!('page' in overrides)) delete params.page;

        Object.keys(params).forEach((key) => {
            if (params[key] === undefined || params[key] === null || params[key] === '') {
                delete params[key];
            }
        });

        return params;
    };

    const visitList = (overrides = {}, visitOptions = {}) => {
        router.get(
            '/manager/prospects-dispatch',
            buildListParams(overrides),
            withLoadingVisit({
                preserveScroll: true,
                preserveState: true,
                replace: true,
                ...visitOptions,
            }),
        );
    };

    const handlePageChange = (page) => {
        visitList({ page });
    };

    useEffect(() => {
        const pending = pendingSearchRef.current;
        if (pending !== null && pending !== initialSearch) {
            visitList({ page: 1, search: pending || undefined }, {
                onFinish: () => {
                    pendingSearchRef.current = null;
                },
            });
        } else {
            setSearchQuery(initialSearch);
        }
    }, [initialSearch]);

    useEffect(() => {
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        const trimmed = searchQuery.trim();
        searchDebounceRef.current = setTimeout(() => {
            const url = new URL(window.location.href);
            const currentSearch = url.searchParams.get('search') ?? '';
            if (currentSearch === trimmed) return;
            pendingSearchRef.current = trimmed;
            visitList({ page: 1, search: trimmed || undefined }, {
                onFinish: () => {
                    pendingSearchRef.current = null;
                },
            });
        }, 400);
        return () => {
            if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        };
    }, [searchQuery]);

    const matchmakerFilterOptions = useMemo(() => {
        const conseillers = filterMatchmakers.filter((m) => m.role !== 'manager');
        const mgrs = filterMatchmakers.filter((m) => m.role === 'manager');

        return [
            ...conseillers.map((m) => ({ value: String(m.id), label: `${m.name} [MM]` })),
            ...mgrs.map((m) => ({ value: String(m.id), label: `${m.name} [MGR]` })),
        ];
    }, [filterMatchmakers]);

    const handleToggleAll = (checked) => {
        setSelectAll(checked);
        if (checked) {
            const ids = prospectsData.map((p) => p.id);
            setSelectedProspectIds((prev) => [...new Set([...prev, ...ids])]);
        } else {
            const ids = prospectsData.map((p) => p.id);
            setSelectedProspectIds((prev) => prev.filter((id) => !ids.includes(id)));
        }
    };

    const toggleProspect = (id) => {
        setSelectedProspectIds((prev) => {
            const newIds = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
            const pageIds = prospectsData.map((p) => p.id);
            const allSelected = pageIds.length > 0 && pageIds.every((pageId) => newIds.includes(pageId));
            setSelectAll(allSelected);
            return newIds;
        });
    };

    useEffect(() => {
        if (prospectsData.length > 0) {
            const pageIds = prospectsData.map((p) => p.id);
            const allSelected = pageIds.every((id) => selectedProspectIds.includes(id));
            setSelectAll(allSelected);
        } else {
            setSelectAll(false);
        }
    }, [prospectsData, selectedProspectIds]);

    const handleDispatchClick = () => {
        if (selectedProspectIds.length === 0) return;
        setDispatchOpen(true);
    };

    const hasValidDispatchSelection = useMemo(() => selectedProspectIds.length > 0, [selectedProspectIds]);

    const submitDispatch = () => {
        if (selectedProspectIds.length === 0) return;
        if (!selectedMatchmakerId) return;

        const payload = {
            prospect_ids: selectedProspectIds.map((id) => parseInt(id, 10)),
            matchmaker_id: parseInt(selectedMatchmakerId, 10),
        };

        router.post('/manager/prospects/dispatch', payload, {
            onSuccess: () => {
                setDispatchOpen(false);
                setSelectedMatchmakerId('');
                setSelectedProspectIds([]);
                setSelectAll(false);
            },
        });
    };

    const getProfilePicture = (user) => {
        if (user.profile?.profile_picture_path) {
            return `/storage/${user.profile.profile_picture_path}`;
        }
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`;
    };

    const handleUserInfoClick = (user) => {
        setSelectedUserForInfo(user);
        setUserInfoModalOpen(true);
    };

    const handleCopyLink = () => {
        if (selectedUserForInfo) {
            const profileUrl = `${window.location.origin}/profile/${selectedUserForInfo.username || selectedUserForInfo.id}`;
            navigator.clipboard.writeText(profileUrl).then(() => {});
        }
    };

    const handleViewProfile = () => {
        if (selectedUserForInfo) {
            window.open(`/profile/${selectedUserForInfo.username || selectedUserForInfo.id}`, '_blank', 'noopener,noreferrer');
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
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Search by name, email or username..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        <div className="flex flex-wrap items-end gap-4">
                            <div className="grid gap-2">
                                <Label>{t('common.status')}</Label>
                                <Select
                                    value={statusFilter || 'active'}
                                    onValueChange={(v) => visitList({ status_filter: v === 'active' ? undefined : v })}
                                >
                                    <SelectTrigger className="h-9 w-[160px]"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">{t('staff.userInfo.activeStatus')}</SelectItem>
                                        <SelectItem value="rejected">{t('staff.userInfo.rejectedStatus')}</SelectItem>
                                        <SelectItem value="rappeler">A rappeler</SelectItem>
                                        <SelectItem value="traite">Traité</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>{t('profile.heardAboutCommercialCode')}</Label>
                                <Select
                                    value={commercialOnly ? 'commercial' : 'all'}
                                    onValueChange={(v) => visitList({ commercial_only: v === 'commercial' ? 1 : undefined })}
                                >
                                    <SelectTrigger className="h-9 w-[200px]"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('profile.filterAll')}</SelectItem>
                                        <SelectItem value="commercial">{t('profile.filterCommercialOnly')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="w-56">
                                <Label className="mb-2 block">{t('staff.matchmaker')}</Label>
                                <SearchableSelect
                                    options={[{ value: '', label: 'Tous les conseillers / managers' }, ...matchmakerFilterOptions]}
                                    value={matchmaker_id ? String(matchmaker_id) : ''}
                                    onValueChange={(value) => visitList({ matchmaker_id: value || undefined })}
                                    placeholder="Tous les conseillers / managers"
                                />
                            </div>
                            <div className="ml-auto">
                                <Button
                                    disabled={!hasValidDispatchSelection}
                                    className={PRIMARY_BUTTON_CLASS}
                                    onClick={handleDispatchClick}
                                >
                                    {t('staff.dispatchProspects')}
                                </Button>
                            </div>
                        </div>

                        <div className="overflow-hidden rounded-lg border border-slate-200/80">
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow className="border-b border-slate-200/80">
                                        <TableHead className={`w-12 ${TABLE_HEAD_CLASS}`}>
                                            <Checkbox checked={selectAll} onCheckedChange={handleToggleAll} />
                                        </TableHead>
                                        <TableHead className={TABLE_HEAD_CLASS}>{t('staff.tableHeaders.name')}</TableHead>
                                        <TableHead className={TABLE_HEAD_CLASS}>Email</TableHead>
                                        <TableHead className={`hidden md:table-cell ${TABLE_HEAD_CLASS}`}>{t('staff.tableHeaders.phone')}</TableHead>
                                        <TableHead className={`hidden lg:table-cell ${TABLE_HEAD_CLASS}`}>{t('staff.tableHeaders.city')}</TableHead>
                                        <TableHead className={`hidden lg:table-cell ${TABLE_HEAD_CLASS}`}>{t('staff.tableHeaders.country')}</TableHead>
                                        <TableHead className={`hidden xl:table-cell ${TABLE_HEAD_CLASS}`}>{t('profile.heardAboutCommercialCode')}</TableHead>
                                        <TableHead className={TABLE_HEAD_CLASS}>Traitement</TableHead>
                                        <TableHead className={TABLE_HEAD_CLASS}>{t('common.status')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        [1, 2, 3, 4, 5].map((i) => (
                                            <TableRow key={i}>
                                                <TableCell className="px-5"><Skeleton className="h-4 w-4" /></TableCell>
                                                <TableCell className="px-5"><Skeleton className="h-4 w-32" /></TableCell>
                                                <TableCell className="px-5"><Skeleton className="h-4 w-40" /></TableCell>
                                                <TableCell className="hidden px-5 md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                                                <TableCell className="hidden px-5 lg:table-cell"><Skeleton className="h-4 w-28" /></TableCell>
                                                <TableCell className="hidden px-5 lg:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                                                <TableCell className="hidden px-5 xl:table-cell"><Skeleton className="h-4 w-28" /></TableCell>
                                                <TableCell className="px-5"><Skeleton className="h-6 w-20" /></TableCell>
                                                <TableCell className="px-5"><Skeleton className="h-6 w-20" /></TableCell>
                                            </TableRow>
                                        ))
                                    ) : prospectsData.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={9} className="px-5 py-8 text-center text-muted-foreground">
                                                {(initialSearch || '').trim()
                                                    ? 'No prospects found matching your search.'
                                                    : statusFilter === 'rejected'
                                                      ? 'No rejected prospects available.'
                                                      : statusFilter === 'rappeler'
                                                        ? 'Aucun prospect marqué comme "A rappeler" pour le moment.'
                                                        : statusFilter === 'traite'
                                                          ? 'Aucun prospect traité pour le moment.'
                                                          : 'No prospects available for dispatch. All prospects have been dispatched to matchmakers.'}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        prospectsData.map((p) => (
                                            <TableRow
                                                key={p.id}
                                                className="cursor-pointer hover:bg-slate-50/70"
                                                onClick={() => handleUserInfoClick(p)}
                                            >
                                                <TableCell className="px-5" onClick={(e) => e.stopPropagation()}>
                                                    <Checkbox
                                                        checked={selectedProspectIds.includes(p.id)}
                                                        onCheckedChange={() => toggleProspect(p.id)}
                                                    />
                                                </TableCell>
                                                <TableCell className="px-5 font-medium">{p.name}</TableCell>
                                                <TableCell className="px-5">{p.email || 'N/A'}</TableCell>
                                                <TableCell className="hidden px-5 md:table-cell">{p.phone || 'N/A'}</TableCell>
                                                <TableCell className="hidden px-5 lg:table-cell">{p.city || 'N/A'}</TableCell>
                                                <TableCell className="hidden px-5 lg:table-cell">{p.country || 'N/A'}</TableCell>
                                                <TableCell className="hidden px-5 text-sm xl:table-cell">{getCommercialCodeDisplay(p)}</TableCell>
                                                <TableCell className="px-5">
                                                    <ProspectTraiteBadge isTraite={Boolean(p.is_traite)} />
                                                </TableCell>
                                                <TableCell className="px-5">
                                                    {p.assigned_matchmaker_id ? (
                                                        <Badge className="bg-success text-white">
                                                            <CheckCircle className="mr-1 h-3 w-3" />
                                                            Assigned
                                                        </Badge>
                                                    ) : p.agency_id ? (
                                                        <Badge className="bg-info text-white">
                                                            <CheckCircle className="mr-1 h-3 w-3" />
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

                        {hasPagination && (
                            <div className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="text-sm text-slate-500">
                                    Affichage de {showingStart} à {showingEnd} sur {total} prospects
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => handlePageChange(currentPageNum - 1)}
                                        disabled={currentPageNum === 1}
                                        className="h-9 w-9"
                                        aria-label="Previous page"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <div className="flex items-center gap-1">
                                        {Array.from({ length: Math.min(5, lastPage) }, (_, i) => {
                                            let pageNum;
                                            if (lastPage <= 5) {
                                                pageNum = i + 1;
                                            } else if (currentPageNum <= 3) {
                                                pageNum = i + 1;
                                            } else if (currentPageNum >= lastPage - 2) {
                                                pageNum = lastPage - 4 + i;
                                            } else {
                                                pageNum = currentPageNum - 2 + i;
                                            }

                                            return (
                                                <Button
                                                    key={pageNum}
                                                    variant={currentPageNum === pageNum ? 'default' : 'outline'}
                                                    size="sm"
                                                    onClick={() => handlePageChange(pageNum)}
                                                    className={`h-9 w-9 ${currentPageNum === pageNum ? PRIMARY_BUTTON_CLASS : ''}`}
                                                >
                                                    {pageNum}
                                                </Button>
                                            );
                                        })}
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => handlePageChange(currentPageNum + 1)}
                                        disabled={currentPageNum === lastPage}
                                        className="h-9 w-9"
                                        aria-label="Next page"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Dialog open={dispatchOpen} onOpenChange={setDispatchOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{t('staff.dispatchDialog.title')}</DialogTitle>
                            <DialogDescription>
                                Select a matchmaker from your agency to dispatch {selectedProspectIds.length} prospect(s)
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            {assignees.length === 0 ? (
                                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                                    <p className="text-sm text-yellow-800">
                                        No approved assignees available in your agency. Please contact admin to add staff to your agency.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid gap-2">
                                    <Label>{t('staff.dispatchDialog.selectMatchmaker')}</Label>
                                    <Select value={selectedMatchmakerId} onValueChange={setSelectedMatchmakerId}>
                                        <SelectTrigger className="h-9">
                                            <SelectValue placeholder="Select an assignee" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {matchmakers.length > 0 && (
                                                <SelectGroup>
                                                    <SelectLabel>Conseillers</SelectLabel>
                                                    {matchmakers.map((m) => (
                                                        <SelectItem key={m.id} value={String(m.id)}>
                                                            {m.name} ({m.email}) <Badge variant="outline" className="ml-1 px-1 py-0 text-[10px]">MM</Badge>
                                                        </SelectItem>
                                                    ))}
                                                </SelectGroup>
                                            )}
                                            {managers.length > 0 && (
                                                <SelectGroup>
                                                    <SelectLabel>Managers</SelectLabel>
                                                    {managers.map((m) => (
                                                        <SelectItem key={m.id} value={String(m.id)}>
                                                            {m.name} ({m.email}) <Badge variant="outline" className="ml-1 px-1 py-0 text-[10px]">MGR</Badge>
                                                        </SelectItem>
                                                    ))}
                                                </SelectGroup>
                                            )}
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
                                className={PRIMARY_BUTTON_CLASS}
                                onClick={submitDispatch}
                                disabled={!selectedMatchmakerId || selectedProspectIds.length === 0 || assignees.length === 0}
                            >
                                Dispatch
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={userInfoModalOpen} onOpenChange={setUserInfoModalOpen}>
                    <DialogContent className="max-h-[90vh] w-[95vw] max-w-2xl overflow-y-auto sm:w-full">
                        {selectedUserForInfo && (
                            <>
                                <div className="flex flex-col items-center gap-4 border-b pb-6">
                                    <div className="relative">
                                        <img
                                            src={getProfilePicture(selectedUserForInfo)}
                                            alt={selectedUserForInfo.name}
                                            className="h-24 w-24 rounded-full object-cover sm:h-32 sm:w-32"
                                            onError={(e) => {
                                                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUserForInfo.name)}&background=random`;
                                            }}
                                        />
                                        <div className="absolute bottom-0 right-0 rounded-full border-2 border-white bg-blue-600 p-1.5">
                                            <Check className="h-3 w-3 text-white sm:h-4 sm:w-4" />
                                        </div>
                                    </div>
                                    <div className="flex w-full flex-col items-center gap-4 px-2 sm:flex-row sm:items-start sm:px-0">
                                        <div className="flex-1 text-center sm:text-left">
                                            <h2 className="break-words text-lg font-semibold sm:text-xl">{selectedUserForInfo.name}</h2>
                                            <p className="break-all text-xs text-muted-foreground sm:text-sm">{selectedUserForInfo.email}</p>
                                        </div>
                                        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleCopyLink}
                                                className="flex w-full items-center justify-center gap-2 sm:w-auto"
                                            >
                                                <Copy className="h-4 w-4" />
                                                {t('staff.userInfo.copyLink')}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleViewProfile}
                                                className="flex w-full items-center justify-center gap-2 sm:w-auto"
                                            >
                                                {t('staff.userInfo.viewProfile')}
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6 px-2 py-4 sm:px-0">
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

                                    <div className="space-y-2">
                                        <Label htmlFor="email">{t('staff.userInfo.email')}</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
                                            <Input
                                                id="email"
                                                type="email"
                                                value={selectedUserForInfo.email || ''}
                                                disabled
                                                className="bg-muted pl-10"
                                                placeholder="Email address"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="username">{t('staff.userInfo.username')}</Label>
                                        <div className="relative">
                                            <div className="absolute left-3 top-1/2 -translate-y-1/2 transform whitespace-nowrap text-xs text-muted-foreground sm:text-sm">
                                                untitledui.com/
                                            </div>
                                            <Input
                                                id="username"
                                                value={selectedUserForInfo.username || ''}
                                                disabled
                                                className="bg-muted pl-[120px] pr-10 text-sm sm:pl-[140px] sm:text-base"
                                                placeholder="username"
                                            />
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 transform">
                                                <Check className="h-4 w-4 text-blue-600" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>{t('profile.profilePicture')}</Label>
                                        <div className="flex items-center gap-4">
                                            <img
                                                src={getProfilePicture(selectedUserForInfo)}
                                                alt={selectedUserForInfo.name}
                                                className="h-16 w-16 flex-shrink-0 rounded-full object-cover"
                                                onError={(e) => {
                                                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUserForInfo.name)}&background=random`;
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <DialogFooter className="flex justify-end">
                                    <Button variant="outline" onClick={() => setUserInfoModalOpen(false)}>
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
