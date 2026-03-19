import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, ArrowRightLeft, Calendar, ClipboardList, Hourglass } from 'lucide-react';

export default function NewsFeedSidebar({ statistics, role }) {
    if (!statistics) {
        return null;
    }

    return (
        <div className="w-full space-y-6">
            {/* Production par agence */}
            {statistics.productionByAgency && statistics.productionByAgency.length > 0 && (
                <Card className="rounded-2xl border border-black/5 bg-white shadow-sm">
                    <CardHeader className="px-5 pt-4 pb-2">
                        <CardTitle className="text-lg font-semibold tracking-tight text-[#4b2a24]">Production par agence</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 px-5 pt-1 pb-5">
                        {statistics.productionByAgency.map((agency, index) => (
                            <div key={index} className="space-y-1">
                                <div className="text-muted-foreground flex items-center justify-between gap-3 text-xs">
                                    <span className="truncate">{agency.name}</span>
                                    <span className="text-foreground font-medium tabular-nums">{agency.percentage}%</span>
                                </div>
                                <Progress value={agency.percentage} className="h-2 rounded-full" />
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Mes prospects */}
            {statistics.prospects && (
                <Card className="rounded-2xl border border-black/5 bg-white shadow-sm">
                    <CardHeader className="px-5 pt-4 pb-2">
                        <CardTitle className="text-lg font-semibold tracking-tight text-[#4b2a24]">
                            Mes prospects <span className="text-foreground ml-1 font-semibold tabular-nums">{statistics.prospects.total || 0}</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 px-5 pt-1 pb-5 text-sm">
                        <div className="rounded-xl border border-black/5 bg-[#fbfaf9] px-4 py-3">
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-muted-foreground">Prospects en retard :</span>
                                <span className="font-semibold text-[#b42318] tabular-nums">{statistics.prospects.late || 0}</span>
                            </div>
                        </div>
                        <div className="rounded-xl border border-black/5 bg-[#fbfaf9] px-4 py-3">
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-muted-foreground">Prospects non traités :</span>
                                <span className="font-semibold text-[#b42318] tabular-nums">{statistics.prospects.untreated || 0}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Mes Clients */}
            {statistics.clients && (
                <Card className="rounded-2xl border border-black/5 bg-white shadow-sm">
                    <CardHeader className="px-5 pt-4 pb-2">
                        <CardTitle className="text-lg font-semibold tracking-tight text-[#4b2a24]">
                            Mes Clients <span className="text-foreground ml-1 font-semibold tabular-nums">{statistics.clients.total || 0}</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 px-5 pt-1 pb-5 text-sm">
                        <div className="flex items-center justify-between gap-3 rounded-xl border border-black/5 bg-[#fbfaf9] px-4 py-3">
                            <span className="text-muted-foreground">En RDV :</span>
                            <span className="font-semibold text-[#067647] tabular-nums">{statistics.clients.inAppointment || 0} 😊</span>
                        </div>
                        <div className="flex items-center justify-between gap-3 rounded-xl border border-black/5 bg-[#fbfaf9] px-4 py-3">
                            <span className="text-muted-foreground">Pas en RDV :</span>
                            <span className="font-semibold text-[#b42318] tabular-nums">{statistics.clients.notInAppointment || 0} 😐</span>
                        </div>
                        <div className="flex items-center justify-between gap-3 rounded-xl border border-black/5 bg-[#fbfaf9] px-4 py-3">
                            <span className="text-muted-foreground">Les clients non contactés pour plus d'une semaine :</span>
                            <span className="font-semibold text-[#b42318] tabular-nums">{statistics.clients.notContacted || 0}</span>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Mes Membres Actifs */}
            {statistics.activeMembers && (
                <Card className="rounded-2xl border-0 bg-[#b42318] text-white shadow-sm">
                    <CardHeader className="px-5 pt-4 pb-2">
                        <CardTitle className="text-lg font-semibold tracking-tight text-white">Mes Membres Actifs</CardTitle>
                    </CardHeader>
                    <CardContent className="px-5 pt-2 pb-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <div className="text-sm/5 text-white/80">Vous avez </div>
                                <div className="text-3xl leading-none font-semibold text-white tabular-nums">
                                    {statistics.activeMembers.total || 0}
                                </div>
                                <div className="text-sm/5 text-white/80">membres</div>
                            </div>
                            <div className="space-y-1 border-l border-white/15 pl-4">
                                <div className="text-sm/5 text-white/80">&gt; </div>
                                <div className="text-3xl leading-none font-semibold text-[#f5c84c] tabular-nums">
                                    {statistics.activeMembers.notUpToDate || 0}
                                </div>
                                <div className="text-sm/5 text-white/80">ne sont pas à jour.</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
            {/* Mes Activités */}
            {role === 'matchmaker' && statistics.activities && (
                <Card className="rounded-2xl border border-black/5 bg-white shadow-sm">
                    <CardHeader className="px-5 pt-4 pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-xl font-semibold tracking-tight text-[#4b2a24]">Mes Activités</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="px-0 pt-0 pb-2">
                        <div className="divide-y divide-black/5">
                            <div className="flex items-center gap-4 px-5 py-4">
                                <div className="bg-muted/60 flex h-12 w-12 items-center justify-center rounded-full">
                                    <Calendar className="text-muted-foreground h-5 w-5" />
                                </div>
                                <div className="text-foreground min-w-0 flex-1 text-base font-medium">Mes RDV en cours</div>
                                <div className="bg-muted text-foreground rounded-full px-3 py-1 text-sm font-semibold tabular-nums">
                                    {String(statistics.activities.appointmentsInProgress ?? 0).padStart(2, '0')}
                                </div>
                            </div>

                            <div className="flex items-center gap-4 px-5 py-4">
                                <div className="bg-muted/60 flex h-12 w-12 items-center justify-center rounded-full">
                                    <Hourglass className="text-muted-foreground h-5 w-5" />
                                </div>
                                <div className="text-foreground min-w-0 flex-1 text-base font-medium">Propositions en attente</div>
                                <div className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-700 tabular-nums">
                                    {String(statistics.activities.pendingPropositions ?? 0).padStart(2, '0')}
                                </div>
                            </div>

                            <div className="flex items-center gap-4 px-5 py-4">
                                <div className="bg-muted/60 flex h-12 w-12 items-center justify-center rounded-full">
                                    <ClipboardList className="text-muted-foreground h-5 w-5" />
                                </div>
                                <div className="text-foreground min-w-0 flex-1 text-base font-medium">Demandes en cours</div>
                                <div className="bg-muted text-foreground rounded-full px-3 py-1 text-sm font-semibold tabular-nums">
                                    {statistics.activities.pendingRequests ?? 0}
                                </div>
                            </div>

                            <div className="flex items-center gap-4 px-5 py-4">
                                <div className="bg-muted/60 flex h-12 w-12 items-center justify-center rounded-full">
                                    <ArrowRightLeft className="text-muted-foreground h-5 w-5" />
                                </div>
                                <div className="text-foreground min-w-0 flex-1 text-base font-medium">Demandes changement</div>
                                <div className="bg-muted rounded-full px-3 py-1 text-sm font-semibold text-[#4b2a24] tabular-nums">
                                    {String(statistics.activities.pendingTransferRequests ?? 0).padStart(2, '0')}
                                </div>
                            </div>

                            <div className="flex items-center gap-4 px-5 py-4">
                                <div className="bg-muted/60 flex h-12 w-12 items-center justify-center rounded-full">
                                    <AlertTriangle className="text-muted-foreground h-5 w-5" />
                                </div>
                                <div className="text-foreground min-w-0 flex-1 text-base font-medium">Clients expirés</div>
                                <div className="rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-600 tabular-nums">
                                    {String(statistics.activities.expiredClients ?? 0).padStart(2, '0')}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Objectifs (tableau) */}
            {role !== 'manager' && statistics.objectives && (
                <div className="overflow-hidden rounded-lg border border-black/5 bg-white shadow-sm">
                    <div className="bg-black px-4 py-2">
                        <div className="grid grid-cols-4 items-center gap-2 text-xs font-semibold text-white">
                            <div className="text-left">Métrique</div>
                            <div className="text-center">Objectif</div>
                            <div className="text-center">Réalisé</div>
                            <div className="text-center">% Atteint</div>
                        </div>
                    </div>
                    <div className="divide-y  divide-black/5">
                        {[
                            {
                                key: 'ventes',
                                label: 'Ventes',
                                target: statistics.objectives.target_ventes ?? 0,
                                realized: statistics.objectives.realized_ventes ?? 0,
                                progress: statistics.objectives.progress?.ventes ?? 0,
                            },
                            {
                                key: 'membres',
                                label: 'Membres',
                                target: statistics.objectives.target_membres ?? 0,
                                realized: statistics.objectives.realized_membres ?? 0,
                                progress: statistics.objectives.progress?.membres ?? 0,
                            },
                            {
                                key: 'rdv',
                                label: 'RDV',
                                target: statistics.objectives.target_rdv ?? 0,
                                realized: statistics.objectives.realized_rdv ?? 0,
                                progress: statistics.objectives.progress?.rdv ?? 0,
                            },
                            {
                                key: 'match',
                                label: 'Match',
                                target: statistics.objectives.target_match ?? 0,
                                realized: statistics.objectives.realized_match ?? 0,
                                progress: statistics.objectives.progress?.match ?? 0,
                            },
                        ].map((row, idx) => (
                            <div
                                key={row.key}
                                className={`grid grid-cols-4 items-center gap-2 px-4 py-2 text-sm ${
                                    idx % 2 === 0 ? 'bg-white' : 'bg-black/[0.03]'
                                }`}
                            >
                                <div className="text-left font-medium text-foreground">{row.label}</div>
                                <div className="text-center">
                                    <span className="inline-flex min-w-[70px] items-center justify-center rounded-md bg-[#e9dfe0] px-3 py-1 text-sm font-medium text-[#4b2a24] shadow-inner">
                                        {row.target}
                                    </span>
                                </div>
                                <div className="text-center font-medium tabular-nums text-foreground">{row.realized}</div>
                                <div className="text-center font-medium tabular-nums text-[#4b2a24]">
                                    {Math.round(Number(row.progress) || 0)}%
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Manager: Ma production + Production d'agence */}
            {role === 'manager' && statistics.objectivesManager && (
                <div className="space-y-3">
                    <div className="text-sm font-semibold text-[#4b2a24]">Ma production</div>
                    <div className="overflow-hidden rounded-lg border border-black/5 bg-white shadow-sm">
                        <div className="bg-black px-4 py-2">
                            <div className="grid grid-cols-4 items-center gap-2 text-xs font-semibold text-white">
                                <div className="text-left">Métrique</div>
                                <div className="text-center">Objectif</div>
                                <div className="text-center">Réalisé</div>
                                <div className="text-center">% Atteint</div>
                            </div>
                        </div>
                        <div className="divide-y  divide-black/5">
                            {[
                                {
                                    key: 'ventes',
                                    label: 'Ventes',
                                    target: statistics.objectivesManager.target_ventes ?? 0,
                                    realized: statistics.objectivesManager.realized_ventes ?? 0,
                                    progress: statistics.objectivesManager.progress?.ventes ?? 0,
                                },
                                {
                                    key: 'membres',
                                    label: 'Membres',
                                    target: statistics.objectivesManager.target_membres ?? 0,
                                    realized: statistics.objectivesManager.realized_membres ?? 0,
                                    progress: statistics.objectivesManager.progress?.membres ?? 0,
                                },
                                {
                                    key: 'rdv',
                                    label: 'RDV',
                                    target: statistics.objectivesManager.target_rdv ?? 0,
                                    realized: statistics.objectivesManager.realized_rdv ?? 0,
                                    progress: statistics.objectivesManager.progress?.rdv ?? 0,
                                },
                                {
                                    key: 'match',
                                    label: 'Match',
                                    target: statistics.objectivesManager.target_match ?? 0,
                                    realized: statistics.objectivesManager.realized_match ?? 0,
                                    progress: statistics.objectivesManager.progress?.match ?? 0,
                                },
                            ].map((row, idx) => (
                                <div
                                    key={row.key}
                                    className={`grid grid-cols-4 items-center gap-2 px-4 py-2 text-sm ${
                                        idx % 2 === 0 ? 'bg-white' : 'bg-black/[0.03]'
                                    }`}
                                >
                                    <div className="text-left font-medium text-foreground">{row.label}</div>
                                    <div className="text-center">
                                        <span className="inline-flex min-w-[70px] items-center justify-center rounded-md bg-[#e9dfe0] px-3 py-1 text-sm font-medium text-[#4b2a24] shadow-inner">
                                            {row.target}
                                        </span>
                                    </div>
                                    <div className="text-center font-medium tabular-nums text-foreground">{row.realized}</div>
                                    <div className="text-center font-medium tabular-nums text-[#4b2a24]">
                                        {Math.round(Number(row.progress) || 0)}%
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {role === 'manager' && statistics.objectivesAgency && (
                <div className="space-y-3">
                    <div className="text-sm font-semibold text-[#4b2a24]">Production d'agence</div>
                    <div className="overflow-hidden rounded-lg border border-black/5 bg-white shadow-sm">
                        <div className="bg-black px-4 py-2">
                            <div className="grid grid-cols-4 items-center gap-2 text-xs font-semibold text-white">
                                <div className="text-left">Métrique</div>
                                <div className="text-center">Objectif</div>
                                <div className="text-center">Réalisé</div>
                                <div className="text-center">% Atteint</div>
                            </div>
                        </div>
                        <div className="divide-y  divide-black/5">
                            {[
                                {
                                    key: 'ventes',
                                    label: 'Ventes',
                                    target: statistics.objectivesAgency.target_ventes ?? 0,
                                    realized: statistics.objectivesAgency.realized_ventes ?? 0,
                                    progress: statistics.objectivesAgency.progress?.ventes ?? 0,
                                },
                                {
                                    key: 'membres',
                                    label: 'Membres',
                                    target: statistics.objectivesAgency.target_membres ?? 0,
                                    realized: statistics.objectivesAgency.realized_membres ?? 0,
                                    progress: statistics.objectivesAgency.progress?.membres ?? 0,
                                },
                                {
                                    key: 'rdv',
                                    label: 'RDV',
                                    target: statistics.objectivesAgency.target_rdv ?? 0,
                                    realized: statistics.objectivesAgency.realized_rdv ?? 0,
                                    progress: statistics.objectivesAgency.progress?.rdv ?? 0,
                                },
                                {
                                    key: 'match',
                                    label: 'Match',
                                    target: statistics.objectivesAgency.target_match ?? 0,
                                    realized: statistics.objectivesAgency.realized_match ?? 0,
                                    progress: statistics.objectivesAgency.progress?.match ?? 0,
                                },
                            ].map((row, idx) => (
                                <div
                                    key={row.key}
                                    className={`grid grid-cols-4 items-center gap-2 px-4 py-2 text-sm ${
                                        idx % 2 === 0 ? 'bg-white' : 'bg-black/[0.03]'
                                    }`}
                                >
                                    <div className="text-left font-medium text-foreground">{row.label}</div>
                                    <div className="text-center">
                                        <span className="inline-flex min-w-[70px] items-center justify-center rounded-md bg-[#e9dfe0] px-3 py-1 text-sm font-medium text-[#4b2a24] shadow-inner">
                                            {row.target}
                                        </span>
                                    </div>
                                    <div className="text-center font-medium tabular-nums text-foreground">{row.realized}</div>
                                    <div className="text-center font-medium tabular-nums text-[#4b2a24]">
                                        {Math.round(Number(row.progress) || 0)}%
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Derniers Membres */}
            {statistics.latestMembers && statistics.latestMembers.length > 0 && (
                <Card className="rounded-2xl border border-black/5 bg-white shadow-sm">
                    <CardHeader className="px-5 pt-4 pb-2">
                        <CardTitle className="text-lg font-semibold tracking-tight text-[#4b2a24]">Derniers Membres</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 px-5 pt-1 pb-5">
                        {statistics.latestMembers.map((member) => {
                            const formatDate = (dateString) => {
                                if (!dateString) return 'N/A';
                                return new Date(dateString).toLocaleDateString('fr-FR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                });
                            };

                            return (
                                <div
                                    key={member.id}
                                    className="flex items-start gap-3 rounded-2xl border border-black/5 bg-[#fbfaf9] p-3 shadow-sm transition-colors hover:bg-[#f7f4f2]"
                                >
                                    <div className="bg-muted h-12 w-12 flex-shrink-0 overflow-hidden rounded-full">
                                        {member.profile_picture ? (
                                            <img
                                                src={`/storage/${member.profile_picture}`}
                                                alt={member.name}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center">
                                                <span className="text-muted-foreground text-xs font-semibold">
                                                    {member.name?.charAt(0)?.toUpperCase() || 'U'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1 space-y-1">
                                        <div>
                                            <p className="text-foreground text-sm font-semibold">{member.name}</p>
                                            {member.username && <p className="text-muted-foreground text-xs">@{member.username}</p>}
                                        </div>
                                        <div className="space-y-0.5">
                                            <p className="text-muted-foreground truncate text-xs">{member.email}</p>
                                            {member.created_at && (
                                                <p className="text-muted-foreground text-xs">Inscrit le: {formatDate(member.created_at)}</p>
                                            )}
                                            {member.assigned_matchmaker_name && (
                                                <p className="text-muted-foreground text-xs">Matchmaker: {member.assigned_matchmaker_name}</p>
                                            )}
                                            {member.agency_name && <p className="text-muted-foreground text-xs">Agence: {member.agency_name}</p>}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>
            )}

            {/* Mes Matchmakers */}
            {statistics.matchmakers && statistics.matchmakers.length > 0 && (
                <Card className="rounded-2xl border border-black/5 bg-white shadow-sm">
                    <CardHeader className="px-5 pt-4 pb-2">
                        <CardTitle className="text-lg font-semibold tracking-tight text-[#4b2a24]">Mes Matchmakers</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 px-5 pt-1 pb-5">
                        {statistics.matchmakers.map((matchmaker) => (
                            <div key={matchmaker.id} className="flex items-center gap-3 rounded-xl border border-black/5 bg-[#fbfaf9] px-3 py-2">
                                <div className="bg-muted h-10 w-10 overflow-hidden rounded-full">
                                    {matchmaker.profile_picture ? (
                                        <img
                                            src={`/storage/${matchmaker.profile_picture}`}
                                            alt={matchmaker.name}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center">
                                            <span className="text-muted-foreground text-xs font-semibold">
                                                {matchmaker.name?.charAt(0)?.toUpperCase() || 'M'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-foreground truncate text-sm font-semibold">{matchmaker.name}</p>
                                    <p className="text-muted-foreground truncate text-xs">{matchmaker.email}</p>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
