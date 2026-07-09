import AppLayout from '@/layouts/app-layout';
import { Head, router, usePage } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import ConfirmDialog from '@/components/ConfirmDialog';
import MatchmakerFeedbackModal from '@/components/rdv/MatchmakerFeedbackModal';
import CreateRdvModal from '@/components/rdv/CreateRdvModal';
import { useToast } from '@/hooks/use-toast';
import { getRdvStatusConfirmConfig } from '@/lib/rdv-status-confirm';
import { rdvToastFr } from '@/lib/proposition-toast-messages';
import {
    Calendar,
    CalendarPlus,
    CheckCircle,
    ChevronLeft,
    ChevronRight,
    Clock,
    Heart,
    MessageSquare,
    User,
    XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import axios from 'axios';

const PER_PAGE = 10;

const STATUS_META = {
    en_cours: {
        label: 'En cours',
        className: 'bg-blue-50 text-blue-700 border border-blue-100',
        Icon: Clock,
    },
    reussi: {
        label: 'Réussi',
        className: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
        Icon: CheckCircle,
    },
    echec: {
        label: 'Échec',
        className: 'bg-rose-50 text-rose-700 border border-rose-100',
        Icon: XCircle,
    },
};

const TABS = [
    { key: 'en_cours', label: 'En cours' },
    { key: 'reussi', label: 'Réussis' },
    { key: 'echec', label: 'Échecs' },
];

const getProfilePicture = (user) => {
    if (user?.profile?.profile_picture_path) return `/storage/${user.profile.profile_picture_path}`;
    if (!user?.name) return 'https://ui-avatars.com/api/?name=User&background=random';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`;
};

const formatRdvDate = (createdAt) => {
    if (!createdAt) return '—';
    return new Date(createdAt).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
};

function RdvStatusBadge({ status }) {
    const statusMeta = STATUS_META[status] ?? STATUS_META.en_cours;
    const StatusIcon = statusMeta.Icon;

    return (
        <Badge className={`inline-flex items-center gap-1.5 ${statusMeta.className}`}>
            <StatusIcon className="h-3.5 w-3.5 shrink-0" />
            {statusMeta.label}
        </Badge>
    );
}

function ProfileHero({ referenceUser, compatibleUser, compact = false }) {
    const avatarSize = compact ? 'h-9 w-9' : 'h-11 w-11';
    const nameClass = compact ? 'text-sm font-semibold' : 'text-base font-semibold';

    return (
        <div className="flex items-center gap-2 sm:gap-3">
            {[referenceUser, compatibleUser].map((u, i) =>
                u ? (
                    <div key={i} className="flex min-w-0 flex-1 items-center gap-2">
                        {i === 1 && (
                            <Heart className="hidden h-4 w-4 shrink-0 text-rose-400 sm:block" aria-hidden />
                        )}
                        <img
                            src={getProfilePicture(u)}
                            alt={u.name}
                            className={`${avatarSize} shrink-0 rounded-full object-cover ring-2 ring-white`}
                        />
                        <div className="min-w-0">
                            <div className={`truncate text-slate-900 ${nameClass}`}>{u.name}</div>
                            <div className="text-xs text-muted-foreground">{i === 0 ? 'Référence' : 'Compatible'}</div>
                        </div>
                    </div>
                ) : null,
            )}
        </div>
    );
}

function FeedbackCount({ count }) {
    const label = count === 1 ? '1 feedback' : `${count} feedbacks`;

    return (
        <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
            <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
            {label}
        </span>
    );
}

function RdvRowActions({
    rdv,
    isParticipant,
    alreadySubmitted,
    canRecreate,
    hasRecreateProp,
    hasRecreateFailed,
    recreatePropId,
    recreateFromFailedId,
    canUpdateRdvStatus,
    statusUpdatingId,
    onFeedback,
    onRecreate,
    onRequestStatusUpdate,
    layout = 'column',
}) {
    const stopClick = (e) => e.stopPropagation();
    const containerClass =
        layout === 'row'
            ? 'flex flex-wrap items-center gap-2'
            : 'flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center';

    return (
        <div className={containerClass} onClick={stopClick} onKeyDown={stopClick} role="presentation">
            {isParticipant && (
                <Button
                    size="sm"
                    variant="outline"
                    className="min-h-11 border-rose-200 text-rose-700 hover:bg-rose-50 disabled:opacity-50 sm:min-h-8"
                    disabled={alreadySubmitted}
                    onClick={() => onFeedback(rdv.id)}
                >
                    {alreadySubmitted ? 'Feedback envoyé' : 'Ajouter un feedback'}
                </Button>
            )}

            {canRecreate && (
                <Button
                    size="sm"
                    type="button"
                    className="min-h-11 border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 sm:min-h-8"
                    variant="outline"
                    onClick={() =>
                        onRecreate({
                            rdvId: rdv.id,
                            propositionId: hasRecreateFailed ? null : hasRecreateProp ? recreatePropId : null,
                            fromFailedRdvId: hasRecreateFailed ? recreateFromFailedId : null,
                        })
                    }
                >
                    <CalendarPlus className="mr-1.5 h-3.5 w-3.5" />
                    Re-créer un RDV
                </Button>
            )}

            {rdv.status === 'en_cours' && canUpdateRdvStatus(rdv) && (
                <div className="flex gap-1.5">
                    <Button
                        size="sm"
                        className="min-h-11 bg-emerald-600 text-white hover:bg-emerald-700 sm:min-h-8"
                        disabled={statusUpdatingId === rdv.id}
                        onClick={() => onRequestStatusUpdate(rdv, 'reussi')}
                    >
                        <CheckCircle className="mr-1 h-3.5 w-3.5" />
                        Réussi
                    </Button>
                    <Button
                        size="sm"
                        className="min-h-11 bg-rose-600 text-white hover:bg-rose-700 sm:min-h-8"
                        disabled={statusUpdatingId === rdv.id}
                        onClick={() => onRequestStatusUpdate(rdv, 'echec')}
                    >
                        <XCircle className="mr-1 h-3.5 w-3.5" />
                        Échec
                    </Button>
                </div>
            )}

            {rdv.status === 'echec' && canUpdateRdvStatus(rdv) && (
                <Button
                    size="sm"
                    className="min-h-11 bg-emerald-600 text-white hover:bg-emerald-700 sm:min-h-8"
                    disabled={statusUpdatingId === rdv.id}
                    onClick={() => onRequestStatusUpdate(rdv, 'reussi')}
                >
                    <CheckCircle className="mr-1 h-3.5 w-3.5" />
                    Marquer réussi
                </Button>
            )}

            {rdv.status === 'reussi' && canUpdateRdvStatus(rdv) && (
                <Button
                    size="sm"
                    className="min-h-11 bg-rose-600 text-white hover:bg-rose-700 sm:min-h-8"
                    disabled={statusUpdatingId === rdv.id}
                    onClick={() => onRequestStatusUpdate(rdv, 'echec')}
                >
                    <XCircle className="mr-1 h-3.5 w-3.5" />
                    Annuler le match
                </Button>
            )}
        </div>
    );
}

export default function RdvList() {
    const { rdvs = [], status_filter, pagination = {}, scope, role, auth } = usePage().props;
    const { showToast } = useToast();
    const isManager = role === 'manager';
    const isAdmin = role === 'admin';
    const rdvScope = scope === 'agency' ? 'agency' : 'mine';
    const showMatchmaker = isAdmin || rdvScope === 'agency';
    const [feedbackModal, setFeedbackModal] = useState(null);
    const [recreateModal, setRecreateModal] = useState(null);
    const [localRdvs, setLocalRdvs] = useState(rdvs);
    const [statusUpdatingId, setStatusUpdatingId] = useState(null);
    const [statusConfirm, setStatusConfirm] = useState(null);

    const canUpdateRdvStatus = (rdv) =>
        isAdmin || Number(rdv.matchmaker?.id) === Number(auth?.user?.id);

    useEffect(() => {
        setLocalRdvs(rdvs);
    }, [rdvs]);

    const activeTab = status_filter || 'en_cours';

    const currentPage = pagination.current_page || 1;
    const lastPage = pagination.last_page || 1;
    const total = pagination.total ?? localRdvs.length;
    const showingStart = total === 0 ? 0 : (currentPage - 1) * PER_PAGE + 1;
    const showingEnd = Math.min(currentPage * PER_PAGE, total);

    const switchTab = (tab) => {
        const params = { status: tab };
        if (isManager && rdvScope === 'agency') {
            params.scope = 'agency';
        }
        router.get('/staff/rdv', params, { preserveScroll: false });
    };

    const switchRdvScope = (newScope) => {
        const params = { status: activeTab };
        if (newScope === 'agency') {
            params.scope = 'agency';
        }
        router.get('/staff/rdv', params, { preserveScroll: true, preserveState: true, replace: true });
    };

    const goToRdvDetail = (rdvId) => {
        router.visit(`/staff/rdv/${rdvId}`);
    };

    const handleStatusUpdate = async (rdvId, status) => {
        setStatusUpdatingId(rdvId);
        try {
            const { data } = await axios.patch(`/staff/rdv/${rdvId}/status`, { status });
            const newStatus = data.rdv.status;
            setLocalRdvs((prev) => {
                if (newStatus !== activeTab) {
                    return prev.filter((r) => r.id !== rdvId);
                }
                return prev.map((r) => (r.id === rdvId ? { ...r, status: newStatus } : r));
            });
            if (status === 'reussi') {
                showToast(rdvToastFr.restoreMatchSuccess, undefined, 'success');
            } else if (status === 'echec') {
                showToast(rdvToastFr.cancelMatchSuccess, undefined, 'success');
            }
        } catch (err) {
            const httpStatus = err?.response?.status;
            if (httpStatus === 403) {
                showToast(
                    status === 'reussi' ? rdvToastFr.restoreMatchUnauthorized : rdvToastFr.cancelMatchUnauthorized,
                    undefined,
                    'error',
                );
            } else {
                showToast(
                    status === 'reussi' ? rdvToastFr.restoreMatchError : rdvToastFr.cancelMatchError,
                    undefined,
                    'error',
                );
            }
        } finally {
            setStatusUpdatingId(null);
        }
    };

    const requestStatusUpdate = (rdv, newStatus) => {
        const config = getRdvStatusConfirmConfig(rdv.status, newStatus);
        setStatusConfirm({
            rdvId: rdv.id,
            newStatus,
            ...config,
        });
    };

    const handleConfirmStatusUpdate = async () => {
        if (!statusConfirm) return;

        const { rdvId, newStatus } = statusConfirm;
        await handleStatusUpdate(rdvId, newStatus);
        setStatusConfirm(null);
    };

    const buildPaginationParams = (page) => {
        const params = { status: activeTab, page };
        if (isManager && rdvScope === 'agency') {
            params.scope = 'agency';
        }
        return params;
    };

    const renderRdvRow = (rdv) => {
        const feedbackCount = rdv.feedbacks?.length ?? 0;
        const isParticipant = Boolean(rdv.is_participant);
        const alreadySubmitted = isParticipant && !rdv.can_add_feedback;
        const recreatePropId = Number(rdv.recreate_proposition_id);
        const recreateFromFailedId = Number(rdv.recreate_from_failed_rdv_id);
        const hasRecreateProp = Number.isFinite(recreatePropId) && recreatePropId > 0;
        const hasRecreateFailed = Number.isFinite(recreateFromFailedId) && recreateFromFailedId > 0;
        const canRecreate = Boolean(rdv.can_recreate_rdv) && (hasRecreateProp || hasRecreateFailed);
        const formattedDate = formatRdvDate(rdv.created_at);

        const actionProps = {
            rdv,
            isParticipant,
            alreadySubmitted,
            canRecreate,
            hasRecreateProp,
            hasRecreateFailed,
            recreatePropId,
            recreateFromFailedId,
            canUpdateRdvStatus,
            statusUpdatingId,
            onFeedback: setFeedbackModal,
            onRecreate: setRecreateModal,
            onRequestStatusUpdate: requestStatusUpdate,
        };

        return (
            <div key={rdv.id}>
                {/* Mobile card layout (< md) */}
                <div
                    className="cursor-pointer rounded-xl border border-rose-100/80 bg-white p-4 shadow-sm transition-colors hover:bg-rose-50/30 md:hidden"
                    onClick={() => goToRdvDetail(rdv.id)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            goToRdvDetail(rdv.id);
                        }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`Voir le RDV entre ${rdv.reference_user?.name ?? ''} et ${rdv.compatible_user?.name ?? ''}`}
                >
                    <div className="mb-3 flex items-start justify-between gap-3">
                        <ProfileHero referenceUser={rdv.reference_user} compatibleUser={rdv.compatible_user} compact />
                        <RdvStatusBadge status={rdv.status} />
                    </div>

                    <div className="space-y-2.5 border-t border-rose-50 pt-3">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date</span>
                            <span className="inline-flex items-center gap-1.5 text-sm text-slate-700">
                                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                {formattedDate}
                            </span>
                        </div>

                        {showMatchmaker && (
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Matchmaker
                                </span>
                                <span className="inline-flex items-center gap-1.5 text-sm text-slate-700">
                                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                                    {rdv.matchmaker?.name ?? '—'}
                                </span>
                            </div>
                        )}

                        <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Feedbacks
                            </span>
                            <FeedbackCount count={feedbackCount} />
                        </div>

                        {rdv.message && (
                            <div>
                                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Message</span>
                                <p className="mt-1 text-sm italic text-muted-foreground">&ldquo;{rdv.message}&rdquo;</p>
                            </div>
                        )}
                    </div>

                    <div className="mt-3 border-t border-rose-50 pt-3">
                        <RdvRowActions {...actionProps} layout="column" />
                    </div>
                </div>

                {/* Desktop card row (≥ md) */}
                <div
                    className="hidden cursor-pointer rounded-xl border border-rose-100/80 bg-white p-4 shadow-sm transition-colors hover:bg-rose-50/30 md:block"
                    onClick={() => goToRdvDetail(rdv.id)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            goToRdvDetail(rdv.id);
                        }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`Voir le RDV entre ${rdv.reference_user?.name ?? ''} et ${rdv.compatible_user?.name ?? ''}`}
                >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1 space-y-3">
                            <ProfileHero referenceUser={rdv.reference_user} compatibleUser={rdv.compatible_user} />

                            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                                <span className="inline-flex items-center gap-1.5">
                                    <Calendar className="h-3.5 w-3.5" />
                                    {formattedDate}
                                </span>
                                {showMatchmaker && (
                                    <span className="inline-flex items-center gap-1.5">
                                        <User className="h-3.5 w-3.5" />
                                        {rdv.matchmaker?.name ?? '—'}
                                    </span>
                                )}
                                <FeedbackCount count={feedbackCount} />
                            </div>

                            {rdv.message && (
                                <p className="line-clamp-2 text-sm italic text-muted-foreground">&ldquo;{rdv.message}&rdquo;</p>
                            )}
                        </div>

                        <div className="flex shrink-0 flex-col items-start gap-3 lg:items-end">
                            <RdvStatusBadge status={rdv.status} />
                            <RdvRowActions {...actionProps} layout="row" />
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <AppLayout>
            <Head title="RDV" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-rose-900">RDV</h1>
                        <p className="text-sm text-muted-foreground">Gérez vos rendez-vous et leurs retours.</p>
                    </div>
                </div>

                {isManager && (
                    <div className="flex items-center gap-2">
                        <Button
                            variant={rdvScope === 'mine' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => switchRdvScope('mine')}
                        >
                            Mes RDV
                        </Button>
                        <Button
                            variant={rdvScope === 'agency' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => switchRdvScope('agency')}
                        >
                            RDV d&apos;agence
                        </Button>
                    </div>
                )}

                <div className="flex gap-2 border-b border-rose-100">
                    {TABS.map(({ key, label }) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => switchTab(key)}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === key
                                    ? 'border-rose-800 text-rose-900'
                                    : 'border-transparent text-muted-foreground hover:text-rose-700'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {total > 0 && (
                    <p className="text-sm text-muted-foreground">
                        Affichage de {showingStart} à {showingEnd} sur {total} RDV
                    </p>
                )}

                {localRdvs.length === 0 ? (
                    <Card className="border border-rose-100/60 shadow-sm">
                        <CardContent className="flex flex-col items-center gap-3 px-6 py-12 text-center">
                            <Calendar className="h-12 w-12 text-muted-foreground/40" />
                            <p className="text-sm font-medium text-slate-700">
                                Aucun RDV {STATUS_META[activeTab]?.label.toLowerCase() || ''} pour le moment.
                            </p>
                            <p className="max-w-sm text-xs text-muted-foreground">
                                Les rendez-vous apparaîtront ici dès qu&apos;un match aboutit à un RDV.
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-3">{localRdvs.map(renderRdvRow)}</div>
                )}

                {lastPage > 1 && (
                    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-rose-100/60 bg-white px-4 py-3 sm:flex-row sm:justify-between">
                        <span className="text-sm text-muted-foreground">
                            Affichage de {showingStart} à {showingEnd} sur {total} RDV — page {currentPage} / {lastPage}
                        </span>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={currentPage <= 1}
                                onClick={() => router.get('/staff/rdv', buildPaginationParams(currentPage - 1), { preserveScroll: false })}
                            >
                                <ChevronLeft className="mr-1 h-4 w-4" />
                                Précédent
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={currentPage >= lastPage}
                                onClick={() => router.get('/staff/rdv', buildPaginationParams(currentPage + 1), { preserveScroll: false })}
                            >
                                Suivant
                                <ChevronRight className="ml-1 h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {feedbackModal && (
                <MatchmakerFeedbackModal
                    open={Boolean(feedbackModal)}
                    rdvId={feedbackModal}
                    onClose={() => setFeedbackModal(null)}
                    onSuccess={() => {
                        setLocalRdvs((prev) =>
                            prev.map((r) => (r.id === feedbackModal ? { ...r, can_add_feedback: false } : r)),
                        );
                        setFeedbackModal(null);
                    }}
                />
            )}

            {recreateModal && (
                <CreateRdvModal
                    open={Boolean(recreateModal)}
                    propositionId={recreateModal.propositionId}
                    fromFailedRdvId={recreateModal.fromFailedRdvId}
                    isRecreationContext
                    onClose={() => setRecreateModal(null)}
                    onSuccess={() => {
                        setRecreateModal(null);
                        router.reload({ only: ['rdvs', 'pagination', 'status_filter'] });
                    }}
                />
            )}

            <ConfirmDialog
                open={Boolean(statusConfirm)}
                onOpenChange={(open) => {
                    if (!open && !statusUpdatingId) {
                        setStatusConfirm(null);
                    }
                }}
                title={statusConfirm?.title ?? ''}
                description={statusConfirm?.description ?? ''}
                confirmLabel={statusConfirm?.confirmLabel}
                loading={Boolean(statusConfirm && statusUpdatingId === statusConfirm.rdvId)}
                onConfirm={() => void handleConfirmStatusUpdate()}
            />
        </AppLayout>
    );
}
