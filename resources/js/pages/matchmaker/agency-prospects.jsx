import { ProspectProfileActionsModals } from '@/components/prospect-profile-actions-modals';
import { ProspectTraiteBadge } from '@/components/prospect-traite-badge';
import { UntreatedProspectsBanner, UntreatedProspectsClearPill } from '@/components/untreated-prospects-banner';
import { withUntreatedCount } from '@/components/untreated-prospect-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getProspectProfilePicture, useProspectProfileActions } from '@/hooks/use-prospect-profile-actions';
import AppLayout from '@/layouts/app-layout';
import { getCommercialCodeDisplay } from '@/lib/heard-about';
import { Head, router, usePage } from '@inertiajs/react';
import { CheckCircle, ChevronLeft, ChevronRight, LayoutGrid, Mail, MapPin, Search, Table2, UserCog } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function AgencyProspects() {
    const { t } = useTranslation();
    const {
        prospects = [],
        statusFilter = 'active',
        commercialOnly = false,
        scope = 'agency',
        search: initialSearch = '',
        services = [],
        matrimonialPacks = [],
        matchmaker_id = null,
        filterMatchmakers = [],
        untreatedSummary = { count: 0, oldest_days: null, overdue_48h_count: 0 },
        untreatedUnassigned = 0,
        untreatedByStaff = [],
        auth,
        role: userRole,
    } = usePage().props;
    const prospectProfileActions = useProspectProfileActions({ services, matrimonialPacks, auth, userRole });
    const { handleOpenActions } = prospectProfileActions;
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

    // Handle pagination data structure (server or client fallback)
    const DEFAULT_PER_PAGE = 5;
    const isServerPaginated = Array.isArray(prospects?.data);
    const allProspects = isServerPaginated ? prospects.data : Array.isArray(prospects) ? prospects : [];
    const urlPage = Number(new URLSearchParams(window.location.search).get('page')) || 1;
    const perPage = isServerPaginated ? prospects?.per_page || DEFAULT_PER_PAGE : DEFAULT_PER_PAGE;
    const currentPageNum = isServerPaginated ? prospects?.current_page || 1 : Math.max(1, urlPage);
    const lastPage = isServerPaginated ? prospects?.last_page || 1 : Math.max(1, Math.ceil(allProspects.length / perPage));
    const startIndex = isServerPaginated ? 0 : (currentPageNum - 1) * perPage;
    const prospectsData = isServerPaginated ? allProspects : allProspects.slice(startIndex, startIndex + perPage);
    const pagination = isServerPaginated ? prospects?.links || null : null;
    const hasPagination = lastPage > 1 || (pagination && pagination.length > 1);

    const [viewMode, setViewMode] = useState('table'); // 'cards' or 'table'
    const [searchQuery, setSearchQuery] = useState(initialSearch);
    const searchDebounceRef = useRef(null);
    const pendingSearchRef = useRef(null);

    const isManager = userRole === 'manager';
    const showDispatchedTo = userRole === 'admin' || userRole === 'manager';
    const prospectScope = scope === 'mine' ? 'mine' : 'agency';

    const buildProspectsUrlParams = (overrides = {}) => {
        const params = { ...overrides };

        if (!('status_filter' in overrides) && statusFilter && statusFilter !== 'active') {
            params.status_filter = statusFilter;
        }

        if (!('commercial_only' in overrides) && commercialOnly) {
            params.commercial_only = 1;
        }

        if (!('scope' in overrides) && isManager && prospectScope === 'mine') {
            params.scope = 'mine';
        }

        if (!('matchmaker_id' in overrides) && isManager && prospectScope === 'agency' && matchmaker_id) {
            params.matchmaker_id = matchmaker_id;
        }

        if (!('search' in overrides)) {
            const trimmedSearch = searchQuery.trim();
            if (trimmedSearch) {
                params.search = trimmedSearch;
            }
        }

        if (!('page' in overrides)) {
            delete params.page;
        }

        Object.keys(params).forEach((key) => {
            if (params[key] === undefined || params[key] === null || params[key] === '') {
                delete params[key];
            }
        });

        return params;
    };

    const visitProspects = (overrides = {}, visitOptions = {}) => {
        router.get(
            '/staff/agency-prospects',
            buildProspectsUrlParams(overrides),
            withLoadingVisit({
                preserveScroll: true,
                preserveState: true,
                replace: true,
                ...visitOptions,
            }),
        );
    };

    const switchProspectScope = (newScope) => {
        visitProspects(
            newScope === 'mine'
                ? { scope: 'mine', page: 1, matchmaker_id: undefined }
                : { scope: undefined, page: 1, matchmaker_id: undefined },
        );
    };

    const staffFilterOptions = useMemo(() => {
        const counts = Object.fromEntries((untreatedByStaff || []).map((member) => [String(member.id), member.count]));
        const conseillers = (filterMatchmakers || []).filter((m) => m.role !== 'manager');
        const mgrs = (filterMatchmakers || []).filter((m) => m.role === 'manager');

        return [
            ...conseillers.map((m) => ({
                value: String(m.id),
                label: withUntreatedCount(`${m.name} [MM]`, counts[String(m.id)] ?? 0),
            })),
            ...mgrs.map((m) => ({
                value: String(m.id),
                label: withUntreatedCount(`${m.name} [MGR]`, counts[String(m.id)] ?? 0),
            })),
        ];
    }, [filterMatchmakers, untreatedByStaff]);

    const agencyUntreatedTotal = (untreatedByStaff || []).reduce((sum, member) => sum + (Number(member.count) || 0), 0) + (Number(untreatedUnassigned) || 0);

    // Sync local search from server when the response matches what we submitted; otherwise refetch.
    useEffect(() => {
        const pending = pendingSearchRef.current;
        if (pending !== null && pending !== initialSearch) {
            visitProspects({ page: 1, search: pending || undefined }, {
                onFinish: () => {
                    pendingSearchRef.current = null;
                },
            });
        } else {
            setSearchQuery(initialSearch);
        }
    }, [initialSearch]);

    // Debounced server-side search: visit with search and page=1 after user stops typing
    useEffect(() => {
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        const trimmed = searchQuery.trim();
        searchDebounceRef.current = setTimeout(() => {
            const url = new URL(window.location.href);
            const currentSearch = url.searchParams.get('search') ?? '';
            if (currentSearch === trimmed) return;
            pendingSearchRef.current = trimmed;
            visitProspects({ page: 1, search: trimmed || undefined }, {
                onFinish: () => {
                    pendingSearchRef.current = null;
                },
            });
        }, 400);
        return () => {
            if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        };
    }, [searchQuery]);

    // Pagination handlers
    const handlePageChange = (page) => {
        visitProspects({ page }, {
            preserveState: true,
            preserveScroll: false,
            replace: true,
        });
    };

    const filterToUntreated = () => {
        visitProspects({ status_filter: 'non_traite', page: 1 });
    };

    const showingStart = isServerPaginated ? (prospects?.from ?? 0) : allProspects.length ? startIndex + 1 : 0;
    const showingEnd = isServerPaginated ? (prospects?.to ?? 0) : Math.min(startIndex + prospectsData.length, allProspects.length);
    const total = isServerPaginated ? (prospects?.total ?? 0) : allProspects.length;

    const getLocation = (prospect) => {
        const city = prospect.city || prospect.profile?.ville_residence || prospect.profile?.pays_residence || '';
        const country = prospect.country || '';
        if (city && country) {
            return `${city}, ${country}`;
        }
        return city || country || 'Other, None';
    };

    return (
        <AppLayout>
            <Head title="Prospects" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {isManager && (
                    <div className="flex items-center gap-2">
                        <Button variant={prospectScope === 'mine' ? 'default' : 'outline'} size="sm" onClick={() => switchProspectScope('mine')}>
                            Mes prospects
                        </Button>
                        <Button variant={prospectScope === 'agency' ? 'default' : 'outline'} size="sm" onClick={() => switchProspectScope('agency')}>
                            Prospects d&apos;agence
                        </Button>
                    </div>
                )}
                <UntreatedProspectsBanner
                    summary={untreatedSummary}
                    onFilterUntreated={filterToUntreated}
                />
                {/* Header with View Toggle and Pagination Info */}
                <div className="flex flex-col gap-3">
                    <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                        {/* View Toggle */}
                        <div className="flex items-center gap-2">
                            <Button
                                variant={viewMode === 'cards' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setViewMode('cards')}
                                className="flex items-center gap-2"
                            >
                                <LayoutGrid className="h-4 w-4" />
                                Cards
                            </Button>
                            <Button
                                variant={viewMode === 'table' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setViewMode('table')}
                                className="flex items-center gap-2"
                            >
                                <Table2 className="h-4 w-4" />
                                Table
                            </Button>
                        </div>

                        {/* Pagination Info */}
                        <div className="text-muted-foreground flex flex-col items-start gap-2 text-sm sm:flex-row sm:items-center">
                            <UntreatedProspectsClearPill summary={untreatedSummary} />
                            <div>
                                Affichage de {showingStart} à {showingEnd} sur {total} prospects
                            </div>
                            {lastPage > 1 && (
                                <div>
                                    Page {currentPageNum} sur {lastPage}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="mb-3">
                        <div className="relative">
                            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
                            <Input
                                type="text"
                                placeholder="Rechercher par nom, email, username, téléphone, document ou code commercial..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                }}
                                className="pl-10"
                            />
                        </div>
                    </div>

                    {prospectsData.length === 0 && (initialSearch || '').trim() && (
                        <div className="bg-info-light border-info mb-4 rounded-lg border p-4">
                            <p className="text-info-foreground text-sm">
                                Aucun résultat trouvé pour "{initialSearch}". Veuillez essayer une autre recherche.
                            </p>
                        </div>
                    )}

                    {/* Filters */}
                    <div className="bg-card flex flex-wrap items-center gap-3 rounded-lg border p-3">
                        <div className="flex items-center gap-2">
                            <Label className="text-muted-foreground text-sm">Status</Label>
                            <Select
                                value={statusFilter || 'active'}
                                onValueChange={(v) => {
                                    const params = buildProspectsUrlParams({ status_filter: v });
                                    if (v === 'active') {
                                        delete params.status_filter;
                                    }
                                    router.get(
                                        '/staff/agency-prospects',
                                        params,
                                        withLoadingVisit({ preserveScroll: true, preserveState: true, replace: true }),
                                    );
                                }}
                            >
                                <SelectTrigger className="h-9 w-[160px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Actifs</SelectItem>
                                    <SelectItem value="non_traite">Non traités</SelectItem>
                                    <SelectItem value="rejected">Rejetés</SelectItem>
                                    <SelectItem value="rappeler">A rappeler</SelectItem>
                                    <SelectItem value="traite">Traité</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {isManager && prospectScope === 'agency' && (
                            <div className="flex items-center gap-2">
                                <Label className="text-muted-foreground text-sm">Matchmaker</Label>
                                <div className="w-[240px]">
                                    <SearchableSelect
                                        options={[
                                            {
                                                value: '',
                                                label: withUntreatedCount('Tous les matchmakers', agencyUntreatedTotal),
                                            },
                                            ...staffFilterOptions,
                                        ]}
                                        value={matchmaker_id ? String(matchmaker_id) : ''}
                                        onValueChange={(value) =>
                                            visitProspects({
                                                matchmaker_id: value || undefined,
                                                page: 1,
                                            })
                                        }
                                        placeholder="Tous les matchmakers"
                                    />
                                </div>
                                {!matchmaker_id && untreatedUnassigned > 0 && (
                                    <span className="text-muted-foreground text-xs">
                                        dont {untreatedUnassigned} non assigné{untreatedUnassigned === 1 ? '' : 's'}
                                    </span>
                                )}
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            <Label className="text-muted-foreground text-sm">{t('profile.heardAboutCommercialCode')}</Label>
                            <Select
                                value={commercialOnly ? 'commercial' : 'all'}
                                onValueChange={(v) => {
                                    const params = buildProspectsUrlParams();
                                    if (v === 'commercial') {
                                        params.commercial_only = 1;
                                    } else {
                                        delete params.commercial_only;
                                    }
                                    router.get(
                                        '/staff/agency-prospects',
                                        params,
                                        withLoadingVisit({ preserveScroll: true, preserveState: true, replace: true }),
                                    );
                                }}
                            >
                                <SelectTrigger className="h-9 w-[200px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('profile.filterAll')}</SelectItem>
                                    <SelectItem value="commercial">{t('profile.filterCommercialOnly')}</SelectItem>
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
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {isLoading
                            ? [1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                                  <Card key={i} className="overflow-hidden">
                                      <Skeleton className="h-48 w-full" />
                                      <CardContent className="space-y-3 p-4">
                                          <Skeleton className="h-6 w-3/4" />
                                          <Skeleton className="h-4 w-full" />
                                          <Skeleton className="h-4 w-2/3" />
                                          <Skeleton className="h-10 w-full" />
                                      </CardContent>
                                  </Card>
                              ))
                            : prospectsData.map((p) => (
                                  <Card
                                      key={p.id}
                                      className={`overflow-hidden transition-shadow hover:shadow-lg ${statusFilter === 'rejected' || statusFilter === 'rappeler' ? 'border-error' : ''}`}
                                  >
                                      <div className="relative">
                                          <img
                                              src={getProspectProfilePicture(p)}
                                              alt={p.name}
                                              className={`h-48 w-full object-cover ${statusFilter === 'rejected' || statusFilter === 'rappeler' ? 'opacity-75' : ''}`}
                                              onError={(e) => {
                                                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=random`;
                                              }}
                                          />
                                          {/* Overlay Tags */}
                                          <div className="absolute top-2 right-2 flex gap-2">
                                              {statusFilter === 'rappeler' || p.to_rappeler ? (
                                                  <Badge className="bg-warning text-warning-foreground px-2 py-1 text-xs">A rappeler</Badge>
                                              ) : p.profile?.account_status === 'desactivated' ? (
                                                  <Badge variant="destructive" className="px-2 py-1 text-xs">Désactivé</Badge>
                                              ) : p.rejection_reason ? (
                                                  <Badge className="bg-error text-error-foreground px-2 py-1 text-xs">Rejeté</Badge>
                                              ) : (
                                                  <>
                                                      <Badge className="bg-foreground text-background px-2 py-1 text-xs">Prospect</Badge>
                                                      {showDispatchedTo && (
                                                          <Badge
                                                              className={`flex items-center gap-1 px-2 py-1 text-xs text-white ${
                                                                  p.assigned_matchmaker_id
                                                                      ? 'bg-success'
                                                                      : p.agency_id
                                                                        ? 'bg-info'
                                                                        : 'bg-muted-foreground'
                                                              }`}
                                                          >
                                                              <CheckCircle className="h-3 w-3" />
                                                              {p.assigned_matchmaker_id ? 'Assigned' : p.agency_id ? 'Dispatched' : 'Pending'}
                                                          </Badge>
                                                      )}
                                                  </>
                                              )}
                                          </div>
                                      </div>
                                      <CardContent className="space-y-3 p-4">
                                          <div>
                                              <h3 className="text-lg font-semibold">{p.name}</h3>
                                              {p.rejection_reason && (
                                                  <p className="text-error mt-1 line-clamp-2 text-xs" title={p.rejection_reason}>
                                                      {p.rejection_reason}
                                                  </p>
                                              )}
                                          </div>

                                          <div className="text-muted-foreground flex items-start gap-2 text-sm">
                                              <Mail className="mt-0.5 h-4 w-4 flex-shrink-0" />
                                              <span className="truncate">{p.email || 'N/A'}</span>
                                          </div>

                                          <div className="text-muted-foreground flex items-start gap-2 text-sm">
                                              <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" />
                                              <span className="truncate">{getLocation(p)}</span>
                                          </div>

                                          <div className="text-muted-foreground flex items-start gap-2 text-sm">
                                              <span className="truncate">Phone: {p.phone || 'N/A'}</span>
                                          </div>

                                          <div className="flex items-center gap-2">
                                              <ProspectTraiteBadge isTraite={Boolean(p.is_traite)} />
                                          </div>

                                          {showDispatchedTo && p.assigned_matchmaker_id && (
                                              <div className="text-sm">
                                                  <span className="text-success font-medium">
                                                      Matchmaker: {p.assigned_matchmaker?.name || 'Unknown'}
                                                  </span>
                                              </div>
                                          )}

                                          <div className="pt-2">
                                              <Button
                                                  size="sm"
                                                  className="w-full gap-2 bg-rose-800 text-white hover:bg-rose-900"
                                                  onClick={() => handleOpenActions(p)}
                                              >
                                                  <UserCog className="h-4 w-4" />
                                                  Gérer le profil
                                              </Button>
                                          </div>
                                      </CardContent>
                                  </Card>
                              ))}
                    </div>
                )}

                {/* Table View */}
                {viewMode === 'table' && (
                    <Card className="overflow-hidden border border-slate-200/80 bg-white shadow-sm">
                        <CardHeader className="border-b border-slate-200/80 bg-slate-50/70">
                            <CardTitle className="text-base font-semibold text-slate-900">Prospects for Your Agency</CardTitle>
                            <CardDescription className="text-sm text-slate-500">
                                Review and validate prospects assigned to your agency
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table className="min-w-[1040px]">
                                    <TableHeader className="bg-slate-50">
                                        <TableRow className="border-b border-slate-200/80">
                                            <TableHead className="px-5 py-4 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                                                Name
                                            </TableHead>
                                            <TableHead className="px-5 py-4 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                                                {t('staff.tableHeaders.gender')}
                                            </TableHead>
                                            <TableHead className="px-5 py-4 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                                                Email
                                            </TableHead>
                                            <TableHead className="hidden px-5 py-4 text-[11px] font-semibold tracking-wider text-slate-500 uppercase md:table-cell">
                                                Phone
                                            </TableHead>
                                            <TableHead className="hidden px-5 py-4 text-[11px] font-semibold tracking-wider text-slate-500 uppercase lg:table-cell">
                                                City
                                            </TableHead>
                                            <TableHead className="hidden px-5 py-4 text-[11px] font-semibold tracking-wider text-slate-500 uppercase lg:table-cell">
                                                Country
                                            </TableHead>
                                            <TableHead className="hidden px-5 py-4 text-[11px] font-semibold tracking-wider text-slate-500 uppercase xl:table-cell">
                                                {t('profile.heardAboutCommercialCode')}
                                            </TableHead>
                                            {showDispatchedTo && (
                                                <TableHead className="px-5 py-4 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                                                    Dispatched To
                                                </TableHead>
                                            )}
                                            <TableHead className="px-5 py-4 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                                                Traitement
                                            </TableHead>
                                            <TableHead className="px-5 py-4 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                                                Actions
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody className="divide-y divide-slate-100">
                                        {isLoading
                                            ? [1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                                                  <TableRow key={i} className="h-16">
                                                      <TableCell className="px-5">
                                                          <Skeleton className="h-4 w-32" />
                                                      </TableCell>
                                                      <TableCell className="px-5">
                                                          <Skeleton className="h-4 w-20" />
                                                      </TableCell>
                                                      <TableCell className="px-5">
                                                          <Skeleton className="h-4 w-40" />
                                                      </TableCell>
                                                      <TableCell className="hidden px-5 md:table-cell">
                                                          <Skeleton className="h-4 w-24" />
                                                      </TableCell>
                                                      <TableCell className="hidden px-5 lg:table-cell">
                                                          <Skeleton className="h-4 w-28" />
                                                      </TableCell>
                                                      <TableCell className="hidden px-5 lg:table-cell">
                                                          <Skeleton className="h-4 w-24" />
                                                      </TableCell>
                                                      <TableCell className="hidden px-5 xl:table-cell">
                                                          <Skeleton className="h-4 w-28" />
                                                      </TableCell>
                                                      {showDispatchedTo && (
                                                          <TableCell className="px-5">
                                                              <Skeleton className="h-4 w-32" />
                                                          </TableCell>
                                                      )}
                                                      <TableCell className="px-5">
                                                          <Skeleton className="h-6 w-20" />
                                                      </TableCell>
                                                      <TableCell className="px-5">
                                                          <div className="flex items-center gap-2">
                                                              <Skeleton className="h-8 w-20" />
                                                              <Skeleton className="h-8 w-16" />
                                                          </div>
                                                      </TableCell>
                                                  </TableRow>
                                              ))
                                            : prospectsData.map((p) => (
                                                  <TableRow key={p.id} className="h-16 border-b border-slate-100 hover:bg-slate-50/70">
                                                      <TableCell className="px-5 font-medium text-slate-900">{p.name}</TableCell>
                                                      <TableCell className="px-5 text-slate-600">{p.gender || 'N/A'}</TableCell>
                                                      <TableCell className="px-5 text-slate-600">{p.email || 'N/A'}</TableCell>
                                                      <TableCell className="hidden px-5 text-slate-600 md:table-cell">{p.phone || 'N/A'}</TableCell>
                                                      <TableCell className="hidden px-5 text-slate-600 lg:table-cell">{p.city || 'N/A'}</TableCell>
                                                      <TableCell className="hidden px-5 text-slate-600 lg:table-cell">{p.country || 'N/A'}</TableCell>
                                                      <TableCell className="hidden px-5 text-sm text-slate-600 xl:table-cell">
                                                          {getCommercialCodeDisplay(p)}
                                                      </TableCell>
                                                      {showDispatchedTo && (
                                                          <TableCell className="px-5">
                                                              {p.assigned_matchmaker_id ? (
                                                                  <div className="text-sm text-slate-600">
                                                                      <div className="text-success font-medium">
                                                                          Matchmaker: {p.assigned_matchmaker?.name || 'Unknown'}
                                                                      </div>
                                                                      {p.agency_id && (
                                                                          <div className="text-info">Agency: {p.agency?.name || 'Unknown'}</div>
                                                                      )}
                                                                  </div>
                                                              ) : p.agency_id ? (
                                                                  <span className="text-info text-sm">Agency: {p.agency?.name || 'Unknown'}</span>
                                                              ) : (
                                                                  <span className="text-muted-foreground text-sm">Not dispatched</span>
                                                              )}
                                                          </TableCell>
                                                      )}
                                                      <TableCell className="px-5">
                                                          <div className="flex flex-wrap items-center gap-1.5">
                                                              <ProspectTraiteBadge isTraite={Boolean(p.is_traite)} />
                                                              {p.profile?.account_status === 'desactivated' ? (
                                                                  <Badge variant="destructive" className="text-xs">Désactivé</Badge>
                                                              ) : p.rejection_reason ? (
                                                                  <Badge className="bg-error text-error-foreground text-xs">Rejeté</Badge>
                                                              ) : null}
                                                          </div>
                                                      </TableCell>
                                                      <TableCell className="px-5">
                                                          <Button
                                                              size="sm"
                                                              className="gap-2 bg-rose-800 text-white hover:bg-rose-900"
                                                              onClick={() => handleOpenActions(p)}
                                                          >
                                                              <UserCog className="h-4 w-4" />
                                                              Gérer le profil
                                                          </Button>
                                                      </TableCell>
                                                  </TableRow>
                                              ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {prospectsData.length === 0 && !(initialSearch || '').trim() && !isLoading && (
                                <div className="border-t border-slate-100 px-6 py-10 text-center">
                                    <p className="text-sm text-slate-500">
                                        {statusFilter === 'rejected'
                                            ? 'Aucun prospect rejeté pour le moment.'
                                            : statusFilter === 'rappeler'
                                              ? 'Aucun prospect marqué comme "A rappeler" pour le moment.'
                                              : 'Aucun prospect assigné à votre agence pour le moment.'}
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Pagination Controls */}
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
                                            className="h-9 w-9"
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
            </div>
            <ProspectProfileActionsModals {...prospectProfileActions} />
        </AppLayout>
    );
}
