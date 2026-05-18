import { router, usePage, Link } from '@inertiajs/react';
import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserCheck, Crown, UserPlus, X } from 'lucide-react';
import CreatePost from '@/components/posts/CreatePost';
import PostCard from '@/components/posts/PostCard';
import { Skeleton } from '@/components/ui/skeleton';
import KpiStatsGrid from '@/components/stats/KpiStatsGrid';
import MonthSelector from '@/components/stats/MonthSelector';
import { SearchableSelect } from '@/components/ui/searchable-select';

export default function ManagerDashboardContent({ stats = { prospectsReceived: 0, activeClients: 0, members: 0 }, posts = null }) {
    const isLoading = stats === null || stats === undefined;
    const { props } = usePage();
    const kpiStats = props.kpiStats;

    const personal = kpiStats?.personal;
    const agency   = kpiStats?.agency;
    const matchmakers = kpiStats?.matchmakers ?? [];
    const agencyName  = kpiStats?.agencyName ?? '';
    const month = kpiStats?.month ?? new Date().getMonth() + 1;
    const year  = kpiStats?.year  ?? new Date().getFullYear();

    const activeMatchmakerId = agency?.activeMatchmakerId ?? null;

    const mmOptions = matchmakers.map((m) => ({ value: String(m.id), label: m.name }));

    const handleMatchmakerFilter = useCallback((val) => {
        const params = { month, year };
        if (val) params.agency_matchmaker_id = val;
        router.get(route('dashboard'), params, {
            preserveState: true, preserveScroll: true, only: ['kpiStats'],
        });
    }, [month, year]);

    const handleClearMatchmakerFilter = useCallback(() => {
        router.get(route('dashboard'), { month, year }, {
            preserveState: true, preserveScroll: true, only: ['kpiStats'],
        });
    }, [month, year]);

    return (
        <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Tableau de bord Manager</h1>
            </div>

            {/* ── Section 1: Ma performance ─────────────────────────────── */}
            {personal && (
                <div className="mb-2">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">Ma performance</h2>
                            <p className="text-xs text-muted-foreground mt-0.5">En tant que conseiller</p>
                        </div>
                        <MonthSelector month={month} year={year} />
                    </div>
                    <KpiStatsGrid
                        cards={personal.cards}
                        loading={false}
                        error={personal.error}
                        month={month}
                        year={year}
                    />
                </div>
            )}

            {/* ── Section 2: Mon agence (tinted block) ──────────────────── */}
            {agency && (
                <div
                    className="rounded-xl border-l-4 p-5 mb-6"
                    style={{
                        backgroundColor: 'rgba(137, 5, 5, 0.04)',
                        borderLeftColor: 'rgba(137, 5, 5, 0.3)',
                    }}
                >
                    {/* Agency section header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">
                                Mon agence{agencyName ? ` — ${agencyName}` : ''}
                            </h2>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* Matchmaker filter dropdown */}
                            <div className="w-52">
                                <SearchableSelect
                                    options={[{ value: '', label: 'Tous les conseillers' }, ...mmOptions]}
                                    value={activeMatchmakerId ? String(activeMatchmakerId) : ''}
                                    onValueChange={handleMatchmakerFilter}
                                    placeholder="Tous les conseillers"
                                />
                            </div>
                            <MonthSelector
                                month={month}
                                year={year}
                                extraParams={
                                    activeMatchmakerId
                                        ? { agency_matchmaker_id: activeMatchmakerId }
                                        : {}
                                }
                            />
                        </div>
                    </div>

                    {/* Active filter chip */}
                    {activeMatchmakerId && (
                        <div className="mb-3 flex items-center gap-2 text-sm animate-in slide-in-from-top-1 duration-200">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[rgba(137,5,5,0.3)] px-3 py-1 text-xs font-medium text-[#890505]">
                                Filtre actif : {matchmakers.find((m) => m.id === activeMatchmakerId)?.name ?? ''}
                                <button onClick={handleClearMatchmakerFilter} className="hover:text-red-700 transition-colors">
                                    <X className="size-3" />
                                </button>
                            </span>
                        </div>
                    )}

                    <KpiStatsGrid
                        cards={agency.cards}
                        loading={false}
                        error={agency.error}
                        month={month}
                        year={year}
                    />
                </div>
            )}

            {/* Statistics Cards (existing legacy cards) */}
            <div className="grid gap-6 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Prospects reçus</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <>
                                <Skeleton className="h-8 w-16 mb-2" />
                                <Skeleton className="h-3 w-40" />
                            </>
                        ) : (
                            <>
                                <div className="text-2xl font-bold">{stats.prospectsReceived || 0}</div>
                                <p className="text-xs text-muted-foreground">
                                    Prospects dans votre agence
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Clients actifs</CardTitle>
                        <Crown className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <>
                                <Skeleton className="h-8 w-16 mb-2" />
                                <Skeleton className="h-3 w-32" />
                            </>
                        ) : (
                            <>
                                <div className="text-2xl font-bold">{stats.activeClients || 0}</div>
                                <p className="text-xs text-muted-foreground">
                                    Clients actifs
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Membres</CardTitle>
                        <UserCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <>
                                <Skeleton className="h-8 w-16 mb-2" />
                                <Skeleton className="h-3 w-32" />
                            </>
                        ) : (
                            <>
                                <div className="text-2xl font-bold">{stats.members || 0}</div>
                                <p className="text-xs text-muted-foreground">
                                    Membres actifs
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid gap-6 md:grid-cols-1">
                <Card>
                    <CardHeader>
                        <CardTitle>Actions rapides</CardTitle>
                        <CardDescription>
                            Actions fréquemment utilisées
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Link href="/staff/prospects/create">
                            <Button className="w-full sm:w-auto">
                                <UserPlus className="w-4 h-4 mr-2" />
                                Ajouter prospect
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>

            {/* Agency Posts Section */}
            <div className="grid gap-6 md:grid-cols-1">
                <Card>
                    <CardHeader>
                        <CardTitle>Posts de l'agence</CardTitle>
                        <CardDescription>
                            Créez et gérez les posts de votre agence
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Create Post Form */}
                        <CreatePost />

                        {/* Posts Feed */}
                        {posts === null || posts === undefined ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="space-y-3">
                                        <Skeleton className="h-4 w-3/4" />
                                        <Skeleton className="h-4 w-1/2" />
                                        <Skeleton className="h-32 w-full" />
                                    </div>
                                ))}
                            </div>
                        ) : posts && posts.data && posts.data.length > 0 ? (
                            <div className="space-y-4">
                                {posts.data.map((post) => (
                                    <PostCard key={post.id} post={post} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <p className="text-muted-foreground">Aucun post pour le moment. Créez votre premier post ci-dessus.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
