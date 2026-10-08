import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SearchableSelect } from '@/components/ui/searchable-select';
import AppLayout from '@/layouts/app-layout';
import { getProfilePicture } from '@/lib/matchmaking-result-display';
import { getPropositionStatusMeta } from '@/lib/proposition-status';
import { Head, router, usePage } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

const STATUS_TABS = [
    { key: 'all', label: 'Toutes' },
    { key: 'pending', label: 'En attente' },
    { key: 'accepted', label: 'Acceptées' },
    { key: 'closed', label: 'Clôturées' },
    { key: 'expired', label: 'Expirées' },
];

export default function PropositionsList() {
    const { t } = useTranslation();
    const {
        role: viewerRole = '',
        entries = [],
        pagination = {},
        status_filter = 'all',
        agency_id = null,
        matchmaker_id = null,
        agencies = [],
        matchmakers = [],
    } = usePage().props;

    const isAdmin = viewerRole === 'admin';
    const isManager = viewerRole === 'manager';
    const showAgencyFilter = isAdmin;
    const showMatchmakerFilter = isAdmin || isManager;

    const buildListParams = (overrides = {}) => {
        const params = { ...overrides };

        if (!('status' in overrides) && status_filter && status_filter !== 'all') {
            params.status = status_filter;
        }

        if (!('agency_id' in overrides) && agency_id) {
            params.agency_id = agency_id;
        }

        if (!('matchmaker_id' in overrides) && matchmaker_id) {
            params.matchmaker_id = matchmaker_id;
        }

        return params;
    };

    const visitList = (overrides = {}) => {
        router.get('/staff/matchmaker/propositions', buildListParams(overrides), {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    };

    const agencyOptions = useMemo(
        () => agencies.map((agency) => ({ value: String(agency.id), label: agency.name })),
        [agencies],
    );

    const filteredMatchmakers = useMemo(() => {
        if (!agency_id) {
            return matchmakers;
        }
        return matchmakers.filter((matchmaker) => Number(matchmaker.agency_id) === Number(agency_id));
    }, [matchmakers, agency_id]);

    const matchmakerOptions = useMemo(() => {
        const conseillers = filteredMatchmakers.filter((m) => m.role !== 'manager');
        const managers = filteredMatchmakers.filter((m) => m.role === 'manager');

        return [
            ...conseillers.map((m) => ({ value: String(m.id), label: `${m.name} [MM]` })),
            ...managers.map((m) => ({ value: String(m.id), label: `${m.name} [MGR]` })),
        ];
    }, [filteredMatchmakers]);

    return (
        <AppLayout>
            <Head title={t('navigation.propositionsList')} />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="text-2xl font-semibold text-rose-900">
                            {t('navigation.propositionsList', { defaultValue: 'Liste des propositions' })}
                        </div>
                        <p className="text-muted-foreground text-sm">Gérez les mises en relation et les retours des candidats.</p>
                    </div>
                    <Button size="sm" className="bg-rose-800 text-white hover:bg-rose-900" onClick={() => router.visit('/staff/match/search')}>
                        <Plus className="h-4 w-4" />
                        Nouvelle proposition
                    </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                    {STATUS_TABS.map((tab) => (
                        <Button
                            key={tab.key}
                            size="sm"
                            variant={status_filter === tab.key ? 'default' : 'outline'}
                            className={status_filter === tab.key ? 'bg-rose-800 text-white hover:bg-rose-900' : ''}
                            onClick={() => visitList({ status: tab.key === 'all' ? undefined : tab.key, page: undefined })}
                        >
                            {tab.label}
                        </Button>
                    ))}
                </div>

                {(showAgencyFilter || showMatchmakerFilter) && (
                    <div className="flex flex-wrap items-center gap-3">
                        {showAgencyFilter && (
                            <div className="w-52">
                                <SearchableSelect
                                    options={[{ value: '', label: 'Toutes les agences' }, ...agencyOptions]}
                                    value={agency_id ? String(agency_id) : ''}
                                    onValueChange={(value) =>
                                        visitList({
                                            agency_id: value || undefined,
                                            matchmaker_id: undefined,
                                            page: undefined,
                                        })
                                    }
                                    placeholder="Toutes les agences"
                                />
                            </div>
                        )}
                        {showMatchmakerFilter && (
                            <div className="w-56">
                                <SearchableSelect
                                    options={[{ value: '', label: 'Tous les matchmakers / managers' }, ...matchmakerOptions]}
                                    value={matchmaker_id ? String(matchmaker_id) : ''}
                                    onValueChange={(value) =>
                                        visitList({
                                            matchmaker_id: value || undefined,
                                            page: undefined,
                                        })
                                    }
                                    placeholder="Tous les matchmakers / managers"
                                />
                            </div>
                        )}
                    </div>
                )}

                {entries.length === 0 ? (
                    <Card className="border border-rose-100/60 shadow-sm">
                        <CardContent className="p-6 text-sm text-neutral-600">
                            Aucune proposition envoyée pour le moment.
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="border border-rose-100/60 shadow-sm">
                        <CardContent className="p-0">
                            <div className="hidden grid-cols-[120px_1fr_1fr_160px_140px] gap-4 border-b bg-rose-50/60 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-rose-900 lg:grid">
                                <div>Date</div>
                                <div>Profil référence</div>
                                <div>Profil compatible</div>
                                <div>Statut agrégé</div>
                                <div>Action</div>
                            </div>
                            <div className="divide-y">
                                {entries.map((entry) => {
                                    const refUser = entry.reference_user;
                                    const compUser = entry.compatible_user;
                                    const aggregateMeta = getPropositionStatusMeta(entry.aggregate_status);

                                    return (
                                        <div
                                            key={entry.key}
                                            className="grid cursor-pointer grid-cols-1 gap-3 px-5 py-4 transition-colors hover:bg-rose-50/40 lg:grid-cols-[120px_1fr_1fr_160px_140px]"
                                            onClick={() => router.visit(`/staff/propositions/${entry.id}`)}
                                        >
                                            <div className="text-sm text-slate-700">
                                                {new Date(entry.created_at).toLocaleDateString('fr-FR')}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <img
                                                    src={
                                                        refUser
                                                            ? getProfilePicture(refUser, refUser.profile)
                                                            : 'https://ui-avatars.com/api/?name=User&background=random'
                                                    }
                                                    alt={refUser?.name}
                                                    className="h-8 w-8 rounded-full object-cover"
                                                />
                                                <div>
                                                    <div className="text-sm font-medium text-slate-900">{refUser?.name || '—'}</div>
                                                    {refUser?.username && (
                                                        <div className="text-xs text-muted-foreground">@{refUser.username}</div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <img
                                                    src={
                                                        compUser
                                                            ? getProfilePicture(compUser, compUser.profile)
                                                            : 'https://ui-avatars.com/api/?name=User&background=random'
                                                    }
                                                    alt={compUser?.name}
                                                    className="h-8 w-8 rounded-full object-cover"
                                                />
                                                <div>
                                                    <div className="text-sm font-medium text-slate-900">{compUser?.name || '—'}</div>
                                                    {compUser?.username && (
                                                        <div className="text-xs text-muted-foreground">@{compUser.username}</div>
                                                    )}
                                                </div>
                                            </div>

                                            <div>
                                                <Badge className={aggregateMeta.className}>{aggregateMeta.label}</Badge>
                                            </div>

                                            <div>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 border-rose-200 text-rose-700 hover:bg-rose-50"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        router.visit(`/staff/propositions/${entry.id}`);
                                                    }}
                                                >
                                                    Voir détail
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {pagination.last_page > 1 && (
                    <div className="flex items-center justify-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={pagination.current_page <= 1}
                            onClick={() => visitList({ page: pagination.current_page - 1 })}
                        >
                            Précédent
                        </Button>
                        <span className="text-sm text-muted-foreground">
                            Page {pagination.current_page} / {pagination.last_page}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={pagination.current_page >= pagination.last_page}
                            onClick={() => visitList({ page: pagination.current_page + 1 })}
                        >
                            Suivant
                        </Button>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
