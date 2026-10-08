import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import AppLayout from '@/layouts/app-layout';
import { ProspectProfileActionsModals } from '@/components/prospect-profile-actions-modals';
import { ProspectTraiteBadge } from '@/components/prospect-traite-badge';
import { UntreatedProspectsBanner, UntreatedProspectsClearPill } from '@/components/untreated-prospects-banner';
import { withUntreatedCount } from '@/components/untreated-prospect-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getCommercialCodeDisplay } from '@/lib/heard-about';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useProspectProfileActions } from '@/hooks/use-prospect-profile-actions';
import { Search, ChevronLeft, ChevronRight, UserCog } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

const TABLE_HEAD_CLASS = 'px-5 py-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500';
const PRIMARY_BUTTON_CLASS = 'bg-rose-800 text-white hover:bg-rose-900';

export default function ProspectsDispatch() {
    const { t } = useTranslation();
    const {
        prospects = [],
        agencies = [],
        matchmakers = [],
        managers = [],
        filterMatchmakers = [],
        filters = {},
        agency_id = null,
        matchmaker_id = null,
        statusFilter = 'active',
        commercialOnly = false,
        search: initialSearch = '',
        services = [],
        matrimonialPacks = [],
        untreatedSummary = { count: 0, oldest_days: null, overdue_48h_count: 0 },
        untreatedByAgency = [],
        untreatedByStaff = [],
        auth,
        role: userRole,
    } = usePage().props;
    const prospectProfileActions = useProspectProfileActions({ services, matrimonialPacks, auth, userRole });
    const { handleOpenActions } = prospectProfileActions;
    const [isLoading, setIsLoading] = useState(false);

    const withLoadingVisit = (options = {}) => ({
        onStart: () => setIsLoading(true),
        onFinish: () => setIsLoading(false),
        ...options,
    });

    const showDispatchedColumn = statusFilter === 'active' || statusFilter === 'traite' || statusFilter === 'non_traite';
    const showRejectionColumn = statusFilter === 'rejected' || statusFilter === 'rappeler';

    const DEFAULT_PER_PAGE = 5;
    const isServerPaginated = Array.isArray(prospects?.data);
    const allProspects = isServerPaginated ? prospects.data : Array.isArray(prospects) ? prospects : [];
    const perPage = isServerPaginated ? prospects?.per_page || DEFAULT_PER_PAGE : DEFAULT_PER_PAGE;
    const currentPageNum = isServerPaginated ? prospects?.current_page || 1 : 1;
    const lastPage = isServerPaginated ? prospects?.last_page || 1 : 1;
    const prospectsData = allProspects;
    const hasPagination = lastPage > 1;
    const showingStart = isServerPaginated ? (prospects?.from ?? 0) : (allProspects.length ? 1 : 0);
    const showingEnd = isServerPaginated ? (prospects?.to ?? 0) : allProspects.length;
    const total = isServerPaginated ? (prospects?.total ?? 0) : allProspects.length;
    const [countries, setCountries] = useState([]);
    const [countryCodeToCities, setCountryCodeToCities] = useState({});
    const [selectedCountryCode, setSelectedCountryCode] = useState('');
    const [loadingCountries, setLoadingCountries] = useState(false);
    const [errorCountries, setErrorCountries] = useState('');

    const [selectedProspectIds, setSelectedProspectIds] = useState([]);
    const [prospectDispatchById, setProspectDispatchById] = useState({});
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
    const [searchQuery, setSearchQuery] = useState(initialSearch);
    const searchDebounceRef = useRef(null);
    const lastSubmittedSearchRef = useRef(null);
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

    const buildFilterParams = (overrides = {}) => {
        const params = { ...overrides };

        const countryName =
            'country' in overrides
                ? overrides.country
                : selectedCountryCode
                  ? countries.find((c) => c.iso2 === selectedCountryCode)?.frenchName || ''
                  : prospectsCountry;
        const cityName = 'city' in overrides ? overrides.city : prospectsCity;
        const dispatchVal = 'dispatch' in overrides ? overrides.dispatch : dispatchStatus;
        const statusVal = 'status_filter' in overrides ? overrides.status_filter : statusFilter;
        const commercialVal = 'commercial_only' in overrides ? overrides.commercial_only : commercialOnly;

        if (countryName) params.country = countryName;
        else delete params.country;

        if (cityName) params.city = cityName;
        else delete params.city;

        if (dispatchVal && dispatchVal !== 'all') params.dispatch = dispatchVal;
        else delete params.dispatch;

        if (statusVal && statusVal !== 'active') params.status_filter = statusVal;
        else delete params.status_filter;

        if (commercialVal) params.commercial_only = 1;
        else delete params.commercial_only;

        if (!('agency_id' in overrides) && agency_id) params.agency_id = agency_id;
        if (!('matchmaker_id' in overrides) && matchmaker_id) params.matchmaker_id = matchmaker_id;

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

    const visitProspects = (overrides = {}) => {
        router.get(
            '/admin/prospects',
            buildFilterParams(overrides),
            withLoadingVisit({
                preserveScroll: true,
                preserveState: true,
                replace: true,
            }),
        );
    };

    const handleFilterProspects = (
        countryName,
        cityName,
        dispatchVal = dispatchStatus,
        statusVal = statusFilter,
        commercialVal = commercialOnly,
        extraOverrides = {},
    ) => {
        visitProspects({
            country: countryName || undefined,
            city: cityName || undefined,
            dispatch: dispatchVal,
            status_filter: statusVal,
            commercial_only: commercialVal ? 1 : undefined,
            ...extraOverrides,
        });
    };

    const handlePageChange = (page) => {
        visitProspects({ page });
    };

    const filterToUntreated = () => {
        visitProspects({ status_filter: 'non_traite', page: 1 });
    };

    useEffect(() => {
        if (lastSubmittedSearchRef.current === null || lastSubmittedSearchRef.current === initialSearch) {
            setSearchQuery(initialSearch);
            lastSubmittedSearchRef.current = initialSearch;
        } else {
            const params = buildFilterParams({
                page: 1,
                search: lastSubmittedSearchRef.current || undefined,
            });
            if (!lastSubmittedSearchRef.current) delete params.search;
            else params.search = lastSubmittedSearchRef.current;
            router.get(
                '/admin/prospects',
                params,
                withLoadingVisit({ preserveScroll: true, preserveState: true, replace: true }),
            );
        }
    }, [initialSearch]);

    useEffect(() => {
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        const trimmed = searchQuery.trim();
        searchDebounceRef.current = setTimeout(() => {
            const url = new URL(window.location.href);
            const currentSearch = url.searchParams.get('search') ?? '';
            if (currentSearch === trimmed) return;
            lastSubmittedSearchRef.current = trimmed;
            visitProspects({ page: 1, search: trimmed || undefined });
        }, 400);
        return () => {
            if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        };
    }, [searchQuery]);

    const agencyCounts = useMemo(
        () => Object.fromEntries((untreatedByAgency || []).map((agency) => [String(agency.id), agency.count])),
        [untreatedByAgency],
    );

    const staffCounts = useMemo(
        () => Object.fromEntries((untreatedByStaff || []).map((member) => [String(member.id), member.count])),
        [untreatedByStaff],
    );

    const agencyOptions = useMemo(
        () => agencies.map((agency) => ({
            value: String(agency.id),
            label: withUntreatedCount(agency.name, agencyCounts[String(agency.id)] ?? 0),
        })),
        [agencies, agencyCounts],
    );

    const filteredFilterMatchmakers = useMemo(() => {
        if (!agency_id) {
            return filterMatchmakers;
        }
        return filterMatchmakers.filter((matchmaker) => Number(matchmaker.agency_id) === Number(agency_id));
    }, [filterMatchmakers, agency_id]);

    const matchmakerFilterOptions = useMemo(() => {
        const conseillers = filteredFilterMatchmakers.filter((m) => m.role !== 'manager');
        const mgrs = filteredFilterMatchmakers.filter((m) => m.role === 'manager');

        return [
            ...conseillers.map((m) => ({
                value: String(m.id),
                label: withUntreatedCount(`${m.name} [MM]`, staffCounts[String(m.id)] ?? 0),
            })),
            ...mgrs.map((m) => ({
                value: String(m.id),
                label: withUntreatedCount(`${m.name} [MGR]`, staffCounts[String(m.id)] ?? 0),
            })),
        ];
    }, [filteredFilterMatchmakers, staffCounts]);

    // Helper function to check if a prospect is dispatched
    const isDispatched = (prospect) => {
        return prospect.agency_id !== null || prospect.assigned_matchmaker_id !== null;
    };

    const cacheProspectDispatch = (prospect) => {
        setProspectDispatchById((prev) => ({ ...prev, [prospect.id]: isDispatched(prospect) }));
    };

    const handleToggleAll = (checked) => {
        setSelectAll(checked);
        if (checked) {
            prospectsData.forEach((p) => cacheProspectDispatch(p));
            const ids = prospectsData.map((p) => p.id);
            setSelectedProspectIds((prev) => [...new Set([...prev, ...ids])]);
        } else {
            const ids = prospectsData.map((p) => p.id);
            setSelectedProspectIds((prev) => prev.filter((id) => !ids.includes(id)));
        }
    };

    const toggleProspect = (prospect) => {
        cacheProspectDispatch(prospect);
        const id = prospect.id;
        setSelectedProspectIds((prev) => {
            const newIds = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
            const pageIds = prospectsData.map((p) => p.id);
            const allSelected = pageIds.length > 0 && pageIds.every((pageId) => newIds.includes(pageId));
            setSelectAll(allSelected);
            return newIds;
        });
    };

    // Sync selectAll state when page prospects or selected IDs change
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
        const validIds = selectedProspectIds.filter((id) => !prospectDispatchById[id]);
        if (validIds.length !== selectedProspectIds.length) {
            setSelectedProspectIds(validIds);
            setSelectAll(false);
        }
        setDispatchOpen(true);
    };

    const handleReassignClick = () => {
        const validIds = selectedProspectIds.filter((id) => prospectDispatchById[id]);
        if (validIds.length !== selectedProspectIds.length) {
            setSelectedProspectIds(validIds);
            setSelectAll(false);
        }
        setReassignOpen(true);
    };

    const hasValidDispatchSelection = useMemo(() => {
        return selectedProspectIds.length > 0 && selectedProspectIds.every((id) => !prospectDispatchById[id]);
    }, [selectedProspectIds, prospectDispatchById]);

    const hasValidReassignSelection = useMemo(() => {
        return selectedProspectIds.length > 0 && selectedProspectIds.every((id) => prospectDispatchById[id]);
    }, [selectedProspectIds, prospectDispatchById]);

    const submitDispatch = () => {
        if (selectedProspectIds.length === 0) return;
        if (dispatchType === 'agency' && !selectedAgencyId) return;
        if (dispatchType === 'matchmaker' && !selectedMatchmakerId) return;
        
        // Only send non-dispatched prospects
        const validIds = selectedProspectIds.filter((id) => !prospectDispatchById[id]);
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
        const validIds = selectedProspectIds.filter((id) => prospectDispatchById[id]);
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
                        <UntreatedProspectsBanner
                            summary={untreatedSummary}
                            onFilterUntreated={filterToUntreated}
                        />
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
                                        <SelectItem value="non_traite">Non traités</SelectItem>
                                        <SelectItem value="rejected">{t('staff.userInfo.rejectedStatus')}</SelectItem>
                                        <SelectItem value="rappeler">A rappeler</SelectItem>
                                        <SelectItem value="traite">Traité</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2 w-[220px]">
                                <Label>{t('profile.heardAboutCommercialCode')}</Label>
                                <Select
                                    value={commercialOnly ? 'commercial' : 'all'}
                                    onValueChange={(v) => {
                                        const only = v === 'commercial';
                                        handleFilterProspects(
                                            selectedCountryCode ? (countries.find((c) => c.iso2 === selectedCountryCode)?.frenchName || '') : prospectsCountry,
                                            prospectsCity,
                                            dispatchStatus,
                                            statusFilter,
                                            only
                                        );
                                    }}
                                >
                                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('profile.filterAll')}</SelectItem>
                                        <SelectItem value="commercial">{t('profile.filterCommercialOnly')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="w-[220px]">
                                <Label className="mb-2 block">{t('staff.agency')}</Label>
                                <SearchableSelect
                                    options={[{ value: '', label: t('staff.all') }, ...agencyOptions]}
                                    value={agency_id ? String(agency_id) : ''}
                                    onValueChange={(value) =>
                                        visitProspects({
                                            agency_id: value || undefined,
                                            matchmaker_id: undefined,
                                        })
                                    }
                                    placeholder={t('staff.all')}
                                />
                            </div>
                            <div className="w-[240px]">
                                <Label className="mb-2 block">{t('staff.matchmaker')}</Label>
                                <SearchableSelect
                                    options={[{ value: '', label: 'Tous les matchmakers / managers' }, ...matchmakerFilterOptions]}
                                    value={matchmaker_id ? String(matchmaker_id) : ''}
                                    onValueChange={(value) =>
                                        visitProspects({
                                            matchmaker_id: value || undefined,
                                        })
                                    }
                                    placeholder="Tous les matchmakers / managers"
                                />
                            </div>
                            <Button variant="outline" onClick={() => {
                                setSelectedCountryCode('');
                                setDispatchStatus('all');
                                visitProspects({
                                    country: undefined,
                                    city: undefined,
                                    dispatch: 'all',
                                    status_filter: 'active',
                                    commercial_only: undefined,
                                    agency_id: undefined,
                                    matchmaker_id: undefined,
                                });
                            }}>{t('staff.reset')}</Button>
                            <div className="ml-auto flex gap-2">
                                <Button disabled={!hasValidDispatchSelection} className={PRIMARY_BUTTON_CLASS} onClick={handleDispatchClick}>{t('staff.dispatchProspects')}</Button>
                                <Button disabled={!hasValidReassignSelection} variant="outline" className="text-rose-700 hover:text-rose-800" onClick={handleReassignClick}>{t('staff.reassignProspects')}</Button>
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

                        {prospectsData.length === 0 && (initialSearch || '').trim() && (
                            <div className="mb-4 p-4 bg-info-light border border-info rounded-lg">
                                <p className="text-info-foreground text-sm">
                                    {t('staff.noResults', { query: initialSearch })}
                                </p>
                            </div>
                        )}

                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow className="border-b border-slate-200/80">
                                    <TableHead className={`w-10 ${TABLE_HEAD_CLASS}`}>
                                        <Checkbox
                                            checked={prospectsData.length > 0 && prospectsData.every((p) => selectedProspectIds.includes(p.id))}
                                            onCheckedChange={handleToggleAll}
                                        />
                                    </TableHead>
                                    <TableHead className={TABLE_HEAD_CLASS}>{t('staff.tableHeaders.name')}</TableHead>
                                    <TableHead className={TABLE_HEAD_CLASS}>{t('staff.tableHeaders.gender')}</TableHead>
                                    <TableHead className={TABLE_HEAD_CLASS}>{t('staff.tableHeaders.country')}</TableHead>
                                    <TableHead className={TABLE_HEAD_CLASS}>{t('staff.tableHeaders.city')}</TableHead>
                                    <TableHead className={TABLE_HEAD_CLASS}>{t('staff.tableHeaders.phone')}</TableHead>
                                    {showDispatchedColumn && <TableHead className={TABLE_HEAD_CLASS}>{t('staff.tableHeaders.dispatchedTo')}</TableHead>}
                                    {showRejectionColumn && <TableHead className={TABLE_HEAD_CLASS}>{t('staff.tableHeaders.rejectionReason')}</TableHead>}
                                    <TableHead className={TABLE_HEAD_CLASS}>Traitement</TableHead>
                                    <TableHead className={TABLE_HEAD_CLASS}>{t('staff.tableHeaders.accountStatus')}</TableHead>
                                    <TableHead className={`hidden xl:table-cell ${TABLE_HEAD_CLASS}`}>{t('profile.heardAboutCommercialCode')}</TableHead>
                                    <TableHead className={TABLE_HEAD_CLASS}>{t('staff.tableHeaders.date')}</TableHead>
                                    <TableHead className={TABLE_HEAD_CLASS}>{t('staff.tableHeaders.actions')}</TableHead>
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
                                            {showDispatchedColumn && <TableCell><Skeleton className="h-4 w-32" /></TableCell>}
                                            {showRejectionColumn && <TableCell><Skeleton className="h-4 w-40" /></TableCell>}
                                            <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                                            <TableCell className="hidden xl:table-cell"><Skeleton className="h-4 w-28" /></TableCell>
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
                                    prospectsData.map((p) => (
                                    <TableRow 
                                        key={p.id} 
                                        className={showRejectionColumn ? 'bg-error-light' : ''}
                                    >
                                        <TableCell onClick={(e) => e.stopPropagation()} className="px-5">
                                            <Checkbox
                                                checked={selectedProspectIds.includes(p.id)}
                                                onCheckedChange={() => toggleProspect(p)}
                                            />
                                        </TableCell>
                                        <TableCell className="px-5 font-medium">{p.name}</TableCell>
                                        <TableCell className="px-5">{p.gender || 'N/A'}</TableCell>
                                        <TableCell className="px-5">{p.country}</TableCell>
                                        <TableCell className="px-5">{p.city}</TableCell>
                                        <TableCell className="px-5">{p.phone}</TableCell>
                                        {showDispatchedColumn ? (
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
                                        ) : showRejectionColumn ? (
                                            <TableCell className="max-w-xs">
                                                <p className="text-sm text-error truncate" title={p.rejection_reason}>
                                                    {p.rejection_reason || 'N/A'}
                                                </p>
                                            </TableCell>
                                        ) : null}
                                        <TableCell className="px-5">
                                            <ProspectTraiteBadge isTraite={Boolean(p.is_traite)} />
                                        </TableCell>
                                        <TableCell>
                                            {p.profile?.account_status === 'desactivated' ? (
                                                <Badge variant="destructive">{t('staff.desactivated')}</Badge>
                                            ) : p.rejection_reason ? (
                                                <Badge className="bg-error text-error-foreground">Rejeté</Badge>
                                            ) : (
                                                <Badge variant="default">{t('staff.active')}</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="hidden xl:table-cell px-5 text-sm">{getCommercialCodeDisplay(p)}</TableCell>
                                        <TableCell className="px-5">{new Date(p.created_at ?? Date.now()).toLocaleDateString()}</TableCell>
                                        <TableCell className="px-5">
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    className="gap-2 bg-rose-800 text-white hover:bg-rose-900"
                                                    onClick={() => handleOpenActions(p)}
                                                >
                                                    <UserCog className="h-4 w-4" />
                                                    Gérer le profil
                                                </Button>
                                                {statusFilter === 'active' && (
                                                    <>
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
                                                                {t('staff.activate')}
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
                                                                {t('staff.deactivate')}
                                                            </Button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                    </TableCell>
                                </TableRow>
                                ))
                            )}
                            {prospectsData.length === 0 && !(initialSearch || '').trim() && !isLoading && (
                                <TableRow>
                                    <TableCell colSpan={12} className="text-center py-8">
                                        <p className="text-muted-foreground">{t('staff.noProspectsAvailable')}</p>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>

                    <div className="mt-4 flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="text-sm text-slate-500 flex flex-wrap items-center gap-2">
                                <UntreatedProspectsClearPill summary={untreatedSummary} />
                                <span>Affichage de {showingStart} à {showingEnd} sur {total} prospects</span>
                            </div>
                            {hasPagination && (
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
                            )}
                        </div>
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
                                        {matchmakers.length > 0 && (
                                            <SelectGroup>
                                                <SelectLabel>Matchmakers</SelectLabel>
                                                {matchmakers.map((m) => (
                                                    <SelectItem key={m.id} value={m.id.toString()}>
                                                        {m.name} ({m.agency?.name || t('staff.noAgency')}) <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0">MM</Badge>
                                                    </SelectItem>
                                                ))}
                                            </SelectGroup>
                                        )}
                                        {managers.length > 0 && (
                                            <SelectGroup>
                                                <SelectLabel>Managers</SelectLabel>
                                                {managers.map((m) => (
                                                    <SelectItem key={m.id} value={m.id.toString()}>
                                                        {m.name} ({m.agency?.name || t('staff.noAgency')}) <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0">MGR</Badge>
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
                        <Button variant="outline" onClick={() => setDispatchOpen(false)}>{t('common.cancel')}</Button>
                        <Button className={PRIMARY_BUTTON_CLASS} onClick={submitDispatch} disabled={
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
                                        {matchmakers.length > 0 && (
                                            <SelectGroup>
                                                <SelectLabel>Matchmakers</SelectLabel>
                                                {matchmakers.map((m) => (
                                                    <SelectItem key={m.id} value={m.id.toString()}>
                                                        {m.name} ({m.agency?.name || t('staff.noAgency')}) <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0">MM</Badge>
                                                    </SelectItem>
                                                ))}
                                            </SelectGroup>
                                        )}
                                        {managers.length > 0 && (
                                            <SelectGroup>
                                                <SelectLabel>Managers</SelectLabel>
                                                {managers.map((m) => (
                                                    <SelectItem key={m.id} value={m.id.toString()}>
                                                        {m.name} ({m.agency?.name || t('staff.noAgency')}) <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0">MGR</Badge>
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
                        <Button variant="outline" onClick={() => setReassignOpen(false)}>{t('common.cancel')}</Button>
                        <Button className={PRIMARY_BUTTON_CLASS} onClick={submitReassign} disabled={
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
                            className={PRIMARY_BUTTON_CLASS}
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
            
            <ProspectProfileActionsModals {...prospectProfileActions} />
        </AppLayout>
    );
}


