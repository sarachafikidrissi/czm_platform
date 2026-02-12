import { Head, router } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { LayoutGrid, Table2, Search, MapPin, Calendar, Heart, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

const MATCH_PRIMARY = '#8B2635';
const PER_PAGE = 3;

export default function MatchmakingEntry({ prospects, search: initialSearch = '' }) {
    const [searchQuery, setSearchQuery] = useState(initialSearch);
    const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'
    const searchDebounceRef = useRef(null);
    const lastSubmittedSearchRef = useRef(null);

    // Support both paginated (prospects.data, prospects.current_page) and plain array
    const prospectsData = prospects?.data ?? (Array.isArray(prospects) ? prospects : []);
    const currentPage = prospects?.current_page ?? 1;
    const lastPage = prospects?.last_page ?? 1;
    const total = prospects?.total ?? prospectsData.length;
    const from = prospects?.from ?? (prospectsData.length > 0 ? (currentPage - 1) * PER_PAGE + 1 : 0);
    const to = prospects?.to ?? (currentPage - 1) * PER_PAGE + prospectsData.length;
    const hasPagination = lastPage > 1;
    const showPaginationBar = total > 0 || prospectsData.length > 0;

    // Sync local search from server only when this response matches the request we sent.
    // If an older response arrives after a newer one (out-of-order), refetch with the latest search so input and results stay in sync.
    useEffect(() => {
        if (lastSubmittedSearchRef.current === null || lastSubmittedSearchRef.current === initialSearch) {
            setSearchQuery(initialSearch);
            lastSubmittedSearchRef.current = initialSearch;
        } else {
            // Stale response (e.g. we sent "ab" then got response for "a"): refetch with latest search so displayed data matches the input
            const url = new URL(window.location.href);
            url.searchParams.set('page', '1');
            if (lastSubmittedSearchRef.current) url.searchParams.set('search', lastSubmittedSearchRef.current);
            else url.searchParams.delete('search');
            router.visit(url.toString(), { preserveState: true });
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
            lastSubmittedSearchRef.current = trimmed;
            if (trimmed) url.searchParams.set('search', trimmed);
            else url.searchParams.delete('search');
            url.searchParams.set('page', '1');
            router.visit(url.toString(), { preserveState: true });
        }, 400);
        return () => {
            if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        };
    }, [searchQuery]);

    const handlePageChange = (page) => {
        const url = new URL(window.location.href);
        url.searchParams.set('page', String(page));
        if (searchQuery.trim()) url.searchParams.set('search', searchQuery.trim());
        router.visit(url.toString(), { preserveState: true });
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
        const city = user.profile?.ville_residence || '';
        const country = user.profile?.pays_residence || '';
        if (city && country) {
            return `${city}, ${country}`;
        }
        return city || country || 'Non spécifié';
    };

    // Helper function to calculate age
    const getAge = (user) => {
        if (!user.profile?.date_naissance) return null;
        const birthDate = new Date(user.profile.date_naissance);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    // Helper function to get status info (presentation only)
    const getStatusInfo = (status) => {
        switch (status) {
            case 'member':
                return { label: 'Member', className: 'bg-blue-100 text-blue-800 border-0' };
            case 'client':
                return { label: 'Client', className: 'bg-green-100 text-green-800 border-0' };
            case 'client_expire':
                return { label: 'Client Expiré', className: 'bg-orange-100 text-orange-800 border-0' };
            default:
                return { label: status || 'Unknown', className: 'bg-gray-100 text-gray-800 border-0' };
        }
    };

    // Handle "À proposer" button click
    const handlePropose = (userId) => {
        router.visit(`/staff/match/results/${userId}`);
    };

    return (
        <AppLayout>
            <Head title="Recherche de Matchmaking" />
            
            <div className="space-y-6 p-4 md:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">Recherche de Matchmaking</h1>
                        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                            Liste des membres et clients assignés. Cliquez sur <span className="font-medium" style={{ color: MATCH_PRIMARY }}>« À proposer »</span> pour démarrer le processus de matchmaking intelligent.
                        </p>
                    </div>
                    <div className="flex shrink-0 items-center rounded-lg border border-border bg-muted/50 p-0.5">
                        <button
                            type="button"
                            onClick={() => setViewMode('cards')}
                            className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${viewMode === 'cards' ? 'text-white shadow-sm' : 'text-muted-foreground hover:bg-muted'}`}
                            style={viewMode === 'cards' ? { backgroundColor: MATCH_PRIMARY } : {}}
                            aria-pressed={viewMode === 'cards'}
                        >
                            <LayoutGrid className="h-4 w-4" />
                            Cards
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('table')}
                            className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${viewMode === 'table' ? 'text-white shadow-sm' : 'text-muted-foreground hover:bg-muted'}`}
                            style={viewMode === 'table' ? { backgroundColor: MATCH_PRIMARY } : {}}
                            aria-pressed={viewMode === 'table'}
                        >
                            <Table2 className="h-4 w-4" />
                            Table
                        </button>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative rounded-xl border border-border bg-muted/50 shadow-sm">
                    <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                    <Input
                        type="text"
                        placeholder="Rechercher par nom, email, username ou ville..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-11 rounded-lg border-0 bg-transparent pl-10 pr-4 placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0"
                    />
                </div>

                {/* Results Count */}
                {(total > 0 || prospectsData.length > 0) && (
                    <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                        {total > 0 ? total : prospectsData.length} profil{(total || prospectsData.length) !== 1 ? 's' : ''} trouvé{(total || prospectsData.length) !== 1 ? 's' : ''}
                    </p>
                )}

                {/* Cards View */}
                {viewMode === 'cards' && (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {prospectsData.length === 0 ? (
                            <div className="col-span-full py-12 text-center">
                                <p className="text-muted-foreground">
                                    {searchQuery ? 'Aucun profil trouvé pour votre recherche' : 'Aucun membre ou client éligible disponible'}
                                </p>
                            </div>
                        ) : (
                            prospectsData.map((prospect) => {
                                const age = getAge(prospect);
                                const location = getLocation(prospect);
                                const statusInfo = getStatusInfo(prospect.status);
                                const genreBadgeClass = prospect.gender === 'female' ? 'bg-red-100 text-red-800 border-0' : 'bg-gray-100 text-gray-800 border-0';
                                return (
                                    <Card key={prospect.id} className="overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
                                        <CardHeader className="pb-2">
                                            <div className="flex items-start gap-4">
                                                <img
                                                    src={getProfilePicture(prospect)}
                                                    alt={prospect.name}
                                                    className="h-16 w-16 shrink-0 rounded-full object-cover"
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <CardTitle className="truncate text-lg font-semibold">
                                                        {prospect.name}
                                                    </CardTitle>
                                                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                                                        <Badge className={`text-xs ${genreBadgeClass}`}>
                                                            {prospect.gender === 'male' ? 'Homme' : prospect.gender === 'female' ? 'Femme' : 'N/A'}
                                                        </Badge>
                                                        <Badge className={`text-xs ${statusInfo.className}`}>
                                                            {statusInfo.label}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-4 pt-0">
                                            <div className="space-y-2 text-sm">
                                                {age != null && (
                                                    <div className="flex items-center gap-2 text-muted-foreground">
                                                        <Calendar className="h-4 w-4 shrink-0" aria-hidden />
                                                        <span>{age} ans</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <MapPin className="h-4 w-4 shrink-0" aria-hidden />
                                                    <span className="truncate">{location}</span>
                                                </div>
                                                {prospect.profile?.religion && (
                                                    <Badge variant="outline" className="bg-muted/50 text-xs font-normal">
                                                        {prospect.profile.religion}
                                                    </Badge>
                                                )}
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => handlePropose(prospect.id)}
                                                disabled={prospect.proposition_status === 'pending'}
                                                className={`flex w-full items-center justify-center gap-2 rounded-b-xl py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none ${
                                                    prospect.proposition_status === 'pending'
                                                        ? 'bg-amber-50 text-amber-700'
                                                        : 'text-white hover:bg-[#7a2230]'
                                                }`}
                                                style={prospect.proposition_status === 'pending' ? undefined : { backgroundColor: MATCH_PRIMARY }}
                                            >
                                                {prospect.proposition_status === 'pending' ? (
                                                    <Loader2 className="h-4 w-4 shrink-0  text-amber-600" aria-hidden />
                                                ) : (
                                                    <Heart className="h-4 w-4" aria-hidden />
                                                )}
                                                {prospect.proposition_status === 'pending' ? 'Proposition en cours...' : 'À proposer'}
                                            </button>
                                        </CardContent>
                                    </Card>
                                );
                            })
                        )}
                    </div>
                )}

                {/* Table View */}
                {viewMode === 'table' && (
                    <Card className="overflow-hidden rounded-xl border border-border shadow-sm">
                        <CardContent className="p-0">
                            {prospectsData.length === 0 ? (
                                <div className="py-12 text-center">
                                    <p className="text-muted-foreground">
                                        {searchQuery ? 'Aucun profil trouvé pour votre recherche' : 'Aucun membre ou client éligible disponible'}
                                    </p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow className="border-b border-border hover:bg-transparent">
                                            <TableHead className="h-12 px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Profil</TableHead>
                                            <TableHead className="h-12 px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Genre</TableHead>
                                            <TableHead className="h-12 px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Âge</TableHead>
                                            <TableHead className="h-12 px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Localisation</TableHead>
                                            <TableHead className="h-12 px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Statut</TableHead>
                                            <TableHead className="h-12 px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Religion</TableHead>
                                            <TableHead className="h-12 px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {prospectsData.map((prospect) => {
                                            const age = getAge(prospect);
                                            const location = getLocation(prospect);
                                            const statusInfo = getStatusInfo(prospect.status);
                                            const genreBadgeClass = prospect.gender === 'female' ? 'bg-red-100 text-red-800 border-0' : 'bg-gray-100 text-gray-800 border-0';
                                            return (
                                                <TableRow key={prospect.id} className="border-b border-border transition-colors hover:bg-muted/50">
                                                    <TableCell className="px-4 py-3 align-middle">
                                                        <div className="flex items-center gap-3">
                                                            <img
                                                                src={getProfilePicture(prospect)}
                                                                alt={prospect.name}
                                                                className="h-10 w-10 shrink-0 rounded-full object-cover"
                                                            />
                                                            <span className="font-medium text-foreground">{prospect.name}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="px-4 py-3 align-middle">
                                                        <Badge className={genreBadgeClass}>
                                                            {prospect.gender === 'male' ? 'Homme' : prospect.gender === 'female' ? 'Femme' : 'N/A'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="px-4 py-3 align-middle text-sm">
                                                        {age != null ? `${age} ans` : 'N/A'}
                                                    </TableCell>
                                                    <TableCell className="px-4 py-3 align-middle">
                                                        <div className="flex items-center gap-2 text-sm">
                                                            <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                                                            <span>{location}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="px-4 py-3 align-middle">
                                                        <Badge className={statusInfo.className}>
                                                            {statusInfo.label}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="px-4 py-3 align-middle">
                                                        {prospect.profile?.religion ? (
                                                            <Badge variant="outline" className="bg-muted/50 font-normal">
                                                                {prospect.profile.religion}
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-sm text-muted-foreground">N/A</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="px-4 py-3 text-right align-middle">
                                                        <button
                                                            type="button"
                                                            onClick={() => handlePropose(prospect.id)}
                                                            className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:bg-[#7a2230]"
                                                            style={{ backgroundColor: MATCH_PRIMARY }}
                                                        >
                                                            <Heart className="h-4 w-4" aria-hidden />
                                                            À proposer
                                                        </button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Pagination - always show when there are results so range and controls are visible */}
                {showPaginationBar && (
                    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-muted-foreground">
                            Affichage de {from} à {to} sur {total} profil{total !== 1 ? 's' : ''}
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage <= 1}
                                className="h-9 w-9"
                                aria-label="Page précédente"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <div className="flex items-center gap-1">
                                {Array.from({ length: Math.min(5, Math.max(1, lastPage)) }, (_, i) => {
                                    let pageNum;
                                    if (lastPage <= 5) pageNum = i + 1;
                                    else if (currentPage <= 3) pageNum = i + 1;
                                    else if (currentPage >= lastPage - 2) pageNum = lastPage - 4 + i;
                                    else pageNum = currentPage - 2 + i;
                                    return (
                                        <Button
                                            key={pageNum}
                                            variant={currentPage === pageNum ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => handlePageChange(pageNum)}
                                            className="h-9 w-9 min-w-9"
                                            style={currentPage === pageNum ? { backgroundColor: MATCH_PRIMARY, borderColor: MATCH_PRIMARY } : {}}
                                        >
                                            {pageNum}
                                        </Button>
                                    );
                                })}
                                {lastPage > 5 && currentPage < lastPage - 2 && (
                                    <span className="px-2 text-sm text-muted-foreground">…</span>
                                )}
                            </div>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage >= lastPage}
                                className="h-9 w-9"
                                aria-label="Page suivante"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

