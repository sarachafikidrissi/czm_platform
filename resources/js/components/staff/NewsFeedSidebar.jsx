import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertTriangle, ArrowRightLeft, Calendar, ClipboardList, HandCoins, Hourglass, User } from 'lucide-react';

const fmtMAD = (n) => {
    if (n == null || !isFinite(Number(n))) return '— MAD';
    return n >= 1000 ? (n / 1000).toFixed(0) + ' k MAD' : n + ' MAD';
};

const fmtPct = (n) => Number(n ?? 0).toFixed(2);

const pctColor = (pct) => {
    if (pct >= 80) return '#1D9E75';
    if (pct >= 50) return '#BA7517';
    if (pct >= 20) return '#993C1D';
    if (pct > 0) return '#A32D2D';
    return '#9ca3af';
};

const MONTH_NAMES = [
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

const monthYearLabel = (source, suffix = '') => {
    const month = source?.month;
    const year = source?.year;
    if (month && year) {
        return `${MONTH_NAMES[month - 1]} ${year}${suffix}`;
    }
    const now = new Date();
    return `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}${suffix}`;
};

function VentesBar({ percentage, muted = false }) {
    const color = muted ? '#d4d4d8' : pctColor(percentage);
    return (
        <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-200/90">
            <div
                className="h-full rounded-full transition-all"
                style={{
                    width: muted ? '0%' : `${Math.min(100, percentage)}%`,
                    backgroundColor: muted ? 'transparent' : color,
                }}
            />
        </div>
    );
}

function PersonalProductionCard({ title, data }) {
    const target = data?.target_ventes ?? 0;
    const realized = data?.realized_ventes ?? 0;
    const pct = data?.progress?.ventes ?? 0;
    const hasObjective = target > 0;

    return (
        <Card className="rounded-[18px] border border-black/[0.06] bg-white shadow-sm">
            <CardHeader className="px-6 pb-2 pt-6">
                <CardTitle className="font-serif text-xl font-bold tracking-tight text-neutral-900">
                    {title}
                </CardTitle>
                <p className="text-muted-foreground text-xs">{monthYearLabel(data)}</p>
            </CardHeader>
            <CardContent className="px-6 pb-6 pt-0">
                {!hasObjective ? (
                    <p className="text-muted-foreground text-sm">Aucun objectif défini ce mois</p>
                ) : (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="font-medium text-slate-600">Ventes</span>
                            <span
                                className="shrink-0 font-bold tabular-nums"
                                style={{ color: pctColor(pct) }}
                            >
                                {fmtPct(pct)}%
                            </span>
                        </div>
                        <VentesBar percentage={pct} />
                        <p className="text-muted-foreground text-[11px] tabular-nums">
                            {fmtMAD(realized)} / {fmtMAD(target)}
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default function NewsFeedSidebar({ statistics, role }) {
    if (!statistics) {
        return null;
    }

    return (
        <div className="w-full space-y-6">
            {/* Admin: Production par agence */}
            {role === 'admin' && statistics.productionByAgency && statistics.productionByAgency.length > 0 && (() => {
                const sorted = [...statistics.productionByAgency].sort((a, b) => b.percentage - a.percentage);
                const active = sorted.filter((a) => a.percentage > 0);
                const inactive = sorted.filter((a) => a.percentage === 0);

                return (
                    <Card className="rounded-[18px] border border-black/[0.06] bg-white shadow-sm">
                        <CardHeader className="px-6 pb-2 pt-6">
                            <CardTitle className="font-serif text-xl font-bold tracking-tight text-neutral-900">
                                Production par agence
                            </CardTitle>
                            <p className="text-muted-foreground text-xs">
                                {monthYearLabel(statistics.objectivesAgency, ' · classement par ventes')}
                            </p>
                        </CardHeader>
                        <CardContent className="space-y-4 px-6 pb-6 pt-0">
                            {active.map((agency, index) => {
                                const rank = index + 1;
                                const color = pctColor(agency.percentage);
                                return (
                                    <div key={agency.name} className="space-y-1.5">
                                        <div className="flex items-center justify-between gap-3 text-sm">
                                            <div className="flex min-w-0 items-center gap-2">
                                                <span
                                                    className={`shrink-0 w-5 text-center font-bold tabular-nums ${rank <= 3 ? '' : 'text-slate-500'}`}
                                                    style={rank <= 3 ? { color: '#B47A17' } : undefined}
                                                >
                                                    {rank}
                                                </span>
                                                <span className="truncate font-medium text-slate-600" title={agency.name}>
                                                    {agency.name}
                                                </span>
                                            </div>
                                            <span className="shrink-0 font-bold tabular-nums" style={{ color }}>
                                                {fmtPct(agency.percentage)}%
                                            </span>
                                        </div>
                                        <VentesBar percentage={agency.percentage} />
                                        {agency.target_ventes != null && agency.realized_ventes != null && (
                                            <p className="text-muted-foreground text-[11px] tabular-nums">
                                                {fmtMAD(agency.realized_ventes)} / {fmtMAD(agency.target_ventes)}
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                            {inactive.length > 0 && (
                                <>
                                    <p className="text-muted-foreground pt-1 text-[11px] font-medium uppercase tracking-wider">
                                        {inactive.length} agence{inactive.length > 1 ? 's' : ''} sans objectif de ventes
                                    </p>
                                    {inactive.map((agency) => (
                                        <div key={agency.name} className="space-y-1.5">
                                            <div className="flex items-center justify-between gap-3 text-sm">
                                                <div className="flex min-w-0 items-center gap-2">
                                                    <span className="text-muted-foreground w-5 shrink-0 text-center">—</span>
                                                    <span className="text-muted-foreground truncate" title={agency.name}>
                                                        {agency.name}
                                                    </span>
                                                </div>
                                                <span className="text-muted-foreground shrink-0 tabular-nums">{fmtPct(0)}%</span>
                                            </div>
                                            <div className="h-1 w-full rounded-full bg-zinc-200/90" />
                                        </div>
                                    ))}
                                </>
                            )}
                        </CardContent>
                    </Card>
                );
            })()}

            {/* Manager: Ma production + Production de l'équipe */}
            {role === 'manager' && statistics.objectivesManager && (
                <PersonalProductionCard title="Ma production" data={statistics.objectivesManager} />
            )}

            {role === 'manager' && (() => {
                const team = statistics.teamProduction;
                if (!team || team.length === 0) {
                    return (
                        <Card className="rounded-[18px] border border-black/[0.06] bg-white shadow-sm">
                            <CardHeader className="px-6 pb-2 pt-6">
                                <CardTitle className="font-serif text-xl font-bold tracking-tight text-neutral-900">
                                    Production de l'équipe
                                </CardTitle>
                                <p className="text-muted-foreground text-xs">
                                    {monthYearLabel(statistics.objectivesManager)}
                                </p>
                            </CardHeader>
                            <CardContent className="px-6 pb-6 pt-0">
                                <p className="text-muted-foreground text-sm">Aucun membre d'équipe trouvé</p>
                            </CardContent>
                        </Card>
                    );
                }

                const sorted = [...team].sort((a, b) => b.percentage - a.percentage);
                const active = sorted.filter((m) => m.percentage > 0 || m.has_objective);
                const noObjective = sorted.filter((m) => !m.has_objective && m.percentage === 0);

                return (
                    <Card className="rounded-[18px] border border-black/[0.06] bg-white shadow-sm">
                        <CardHeader className="px-6 pb-2 pt-6">
                            <CardTitle className="font-serif text-xl font-bold tracking-tight text-neutral-900">
                                Production de l'équipe
                            </CardTitle>
                            <p className="text-muted-foreground text-xs">
                                {monthYearLabel(statistics.objectivesManager)}
                            </p>
                        </CardHeader>
                        <CardContent className="space-y-4 px-6 pb-6 pt-0">
                            {active.map((member, index) => {
                                const rank = index + 1;
                                const isZeroWithObjective = member.has_objective && member.percentage === 0;
                                const color = isZeroWithObjective ? '#9ca3af' : pctColor(member.percentage);
                                return (
                                    <div key={member.id} className="space-y-1.5">
                                        <div className="flex items-center justify-between gap-3 text-sm">
                                            <div className="flex min-w-0 items-center gap-2">
                                                <span
                                                    className={`w-5 shrink-0 text-center font-bold tabular-nums ${rank <= 3 && !isZeroWithObjective ? '' : 'text-slate-500'}`}
                                                    style={rank <= 3 && !isZeroWithObjective ? { color: '#B47A17' } : undefined}
                                                >
                                                    {rank}
                                                </span>
                                                <span className="truncate font-medium text-slate-600" title={member.name}>
                                                    {member.name}
                                                </span>
                                                <span
                                                    className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                                                        member.role === 'manager'
                                                            ? 'bg-blue-100 text-blue-700'
                                                            : 'bg-zinc-200 text-zinc-600'
                                                    }`}
                                                >
                                                    {member.role === 'manager' ? 'MGR' : 'MM'}
                                                </span>
                                            </div>
                                            <span
                                                className="shrink-0 font-bold tabular-nums"
                                                style={{ color }}
                                            >
                                                {fmtPct(member.percentage)}%
                                            </span>
                                        </div>
                                        <VentesBar percentage={member.percentage} muted={isZeroWithObjective} />
                                        <p className="text-muted-foreground text-[11px] tabular-nums">
                                            {fmtMAD(member.realized_ventes)} / {fmtMAD(member.target_ventes)}
                                        </p>
                                    </div>
                                );
                            })}
                            {noObjective.length > 0 && (
                                <>
                                    <p className="text-muted-foreground pt-1 text-[11px] font-medium uppercase tracking-wider">
                                        {noObjective.length} conseiller{noObjective.length > 1 ? 's' : ''} sans objectif ce mois
                                    </p>
                                    {noObjective.map((member) => (
                                        <div key={member.id} className="flex items-center justify-between gap-3 text-sm">
                                            <div className="flex min-w-0 items-center gap-2">
                                                <span className="text-muted-foreground w-5 shrink-0 text-center">—</span>
                                                <span className="text-muted-foreground truncate" title={member.name}>
                                                    {member.name}
                                                </span>
                                                <span className="shrink-0 rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-zinc-600">
                                                    {member.role === 'manager' ? 'MGR' : 'MM'}
                                                </span>
                                            </div>
                                            <span className="text-muted-foreground shrink-0 text-[11px]">— MAD</span>
                                        </div>
                                    ))}
                                </>
                            )}
                        </CardContent>
                    </Card>
                );
            })()}

            {/* Matchmaker: Ma production */}
            {role === 'matchmaker' && statistics.objectives && (
                <PersonalProductionCard title="Ma production" data={statistics.objectives} />
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
            {['matchmaker', 'manager'].includes(role) && statistics.activities && (
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

                            <div className="flex items-center gap-4 px-5 py-4">
                                <div className="bg-muted/60 flex h-12 w-12 items-center justify-center rounded-full">
                                    <HandCoins  className="text-muted-foreground h-5 w-5" />
                                </div>
                                <div className="text-foreground min-w-0 flex-1 text-base font-medium">Clients en attente de paiement</div>
                                <div className="rounded-full bg-orange-100 px-3 py-1 text-sm font-semibold text-orange-700 tabular-nums">
                                    {String(statistics.activities.clientsAwaitingPayment ?? 0).padStart(2, '0')}
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
