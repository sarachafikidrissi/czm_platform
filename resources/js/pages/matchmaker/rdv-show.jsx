import AppLayout from '@/layouts/app-layout';
import { Head, router, usePage } from '@inertiajs/react';
import ConfirmDialog from '@/components/ConfirmDialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { getAge, getProfilePicture } from '@/lib/matchmaking-result-display';
import { getRdvStatusConfirmConfig } from '@/lib/rdv-status-confirm';
import { rdvToastFr } from '@/lib/proposition-toast-messages';
import {
    ArrowLeft,
    Building,
    Calendar,
    CheckCircle,
    Heart,
    Mail,
    MapPin,
    MessageSquare,
    Phone,
    User,
    XCircle,
} from 'lucide-react';
import { useState } from 'react';
import axios from 'axios';

const STATUS_META = {
    en_cours: { label: 'En cours', className: 'bg-blue-50 text-blue-700 border border-blue-100' },
    reussi: { label: 'Réussi', className: 'bg-emerald-50 text-emerald-700 border border-emerald-100' },
    echec: { label: 'Échec', className: 'bg-rose-50 text-rose-700 border border-rose-100' },
};

const MEMBER_STATUS_LABELS = {
    member: 'Membre',
    client: 'Client',
    client_expire: 'Client expiré',
    prospect: 'Prospect',
};

const AVIS_LABELS = {
    liked: 'Apprécié',
    not_liked: 'Non apprécié',
};

const ESPACE_LABELS = {
    agence: 'Agence',
    espace_public: 'Espace public',
    autre: 'Autre',
};

const SIGNE_LABELS = {
    positif: 'Positif',
    negatif: 'Négatif',
};

function getInitials(name) {
    if (!name) return '?';
    return name
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
}

function formatFeedbackDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

function FeedbackEntry({ feedback }) {
    const isMatchmakerFeedback = feedback.author_role === 'matchmaker';

    return (
        <div className="space-y-2 rounded-lg border border-rose-100/60 bg-white p-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium text-slate-900">
                    {feedback.author?.name || 'Auteur inconnu'}
                </span>
                {feedback.created_at && (
                    <span className="text-muted-foreground">{formatFeedbackDate(feedback.created_at)}</span>
                )}
            </div>

            {isMatchmakerFeedback ? (
                <div className="space-y-1.5 text-sm text-slate-700">
                    {feedback.espace_de_rdv && (
                        <p>
                            <span className="font-medium text-slate-900">Espace : </span>
                            {ESPACE_LABELS[feedback.espace_de_rdv] || feedback.espace_de_rdv}
                            {feedback.espace_de_rdv === 'autre' && feedback.espace_autre_detail
                                ? ` — ${feedback.espace_autre_detail}`
                                : ''}
                        </p>
                    )}
                    {feedback.signe_de_rdv && (
                        <p>
                            <span className="font-medium text-slate-900">Signe du RDV : </span>
                            {SIGNE_LABELS[feedback.signe_de_rdv] || feedback.signe_de_rdv}
                        </p>
                    )}
                    {feedback.avis_matchmaker && (
                        <p>
                            <span className="font-medium text-slate-900">Avis : </span>
                            {feedback.avis_matchmaker}
                        </p>
                    )}
                    {feedback.evaluation_de_rdv && (
                        <p>
                            <span className="font-medium text-slate-900">Évaluation : </span>
                            {feedback.evaluation_de_rdv}
                        </p>
                    )}
                    {feedback.feedback_message && (
                        <p>
                            <span className="font-medium text-slate-900">Message : </span>
                            {feedback.feedback_message}
                        </p>
                    )}
                </div>
            ) : (
                <div className="space-y-1.5 text-sm text-slate-700">
                    {feedback.avis && (
                        <p>
                            <span className="font-medium text-slate-900">Avis : </span>
                            {AVIS_LABELS[feedback.avis] || feedback.avis}
                        </p>
                    )}
                    {feedback.feedback_message && <p>{feedback.feedback_message}</p>}
                </div>
            )}
        </div>
    );
}

function FeedbackSection({ title, feedbacks = [], emptyMessage = 'Aucun feedback pour le moment', className = '', action = null }) {
    return (
        <div className={className}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-rose-900">{title}</h3>
                {action}
            </div>
            {feedbacks.length === 0 ? (
                <p className="text-sm text-muted-foreground">{emptyMessage}</p>
            ) : (
                <div className="space-y-3">
                    {feedbacks.map((feedback) => (
                        <FeedbackEntry key={feedback.id} feedback={feedback} />
                    ))}
                </div>
            )}
        </div>
    );
}

function RdvDetailsCard({ rdvDetails, updatedAt }) {
    if (!rdvDetails) return null;

    return (
        <Card className="border border-rose-100/60 shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-rose-900">Détails du rendez-vous</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Règles du rendez-vous
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-slate-700">{rdvDetails.regle || '—'}</p>
                </div>

                {rdvDetails.message && (
                    <>
                        <Separator />
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Message aux profils
                            </p>
                            <p className="mt-1 whitespace-pre-wrap text-slate-700">{rdvDetails.message}</p>
                        </div>
                    </>
                )}

                <Separator />

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Partage du téléphone
                        </p>
                        <p className="mt-1 font-medium text-slate-900">
                            {rdvDetails.share_phone ? 'Oui' : 'Non'}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Date de création
                        </p>
                        <p className="mt-1 font-medium text-slate-900">{rdvDetails.created_at || '—'}</p>
                    </div>
                    {updatedAt && (
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Dernière mise à jour
                            </p>
                            <p className="mt-1 font-medium text-slate-900">{updatedAt}</p>
                        </div>
                    )}
                </div>

                {rdvDetails.is_recreation && rdvDetails.motif_de_recreation && (
                    <>
                        <Separator />
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Motif de re-création
                            </p>
                            <p className="mt-1 whitespace-pre-wrap text-slate-700">{rdvDetails.motif_de_recreation}</p>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}

function MatchmakerContactBar({ matchmaker }) {
    if (!matchmaker) {
        return (
            <Card className="border border-rose-100/60 bg-rose-50/20 shadow-sm">
                <CardContent className="py-4 text-sm text-muted-foreground">
                    Aucun conseiller assigné.
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border border-rose-100/60 bg-rose-50/20 shadow-sm">
            <CardContent className="py-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Conseiller responsable
                        </p>
                        <p className="mt-1 text-base font-semibold text-slate-900">{matchmaker.name}</p>
                        {matchmaker.agency?.name && (
                            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                                <Building className="h-3.5 w-3.5 shrink-0" />
                                {matchmaker.agency.name}
                            </p>
                        )}
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
                        {matchmaker.email && (
                            <a
                                href={`mailto:${matchmaker.email}`}
                                className="inline-flex items-center gap-2 rounded-md border border-rose-100 bg-white px-3 py-2 text-sm text-[#890505] transition-colors hover:bg-rose-50"
                            >
                                <Mail className="h-4 w-4 shrink-0" />
                                <span className="truncate">{matchmaker.email}</span>
                            </a>
                        )}
                        {matchmaker.phone && (
                            <a
                                href={`tel:${matchmaker.phone}`}
                                className="inline-flex items-center gap-2 rounded-md border border-rose-100 bg-white px-3 py-2 text-sm text-[#890505] transition-colors hover:bg-rose-50"
                            >
                                <Phone className="h-4 w-4 shrink-0" />
                                {matchmaker.phone}
                            </a>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function ProfileRow({ user, label, showPhone = true }) {
    if (!user) return null;

    const profile = user.profile;
    const age = getAge(profile);
    const location = [profile?.ville_residence, profile?.pays_residence].filter(Boolean).join(', ');
    const picture = getProfilePicture(user, profile);
    const genderLabel = user.gender === 'male' ? 'Homme' : user.gender === 'female' ? 'Femme' : null;
    const genderIcon = user.gender === 'male' ? '♂' : user.gender === 'female' ? '♀' : null;

    return (
        <div className="min-w-0 rounded-lg bg-slate-50/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
            <div className="mt-3 flex items-start gap-3">
                <Avatar className="h-12 w-12 shrink-0">
                    <AvatarImage src={picture} alt={user.name} />
                    <AvatarFallback className="bg-rose-50 text-rose-800">{getInitials(user.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="break-words text-base font-semibold leading-snug text-slate-900">{user.name}</h3>
                        {user.status && (
                            <Badge variant="outline" className="shrink-0 text-xs">
                                {MEMBER_STATUS_LABELS[user.status] || user.status}
                            </Badge>
                        )}
                    </div>
                    {user.username && (
                        <p className="truncate text-sm text-muted-foreground">@{user.username}</p>
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        {genderLabel && (
                            <span className="flex items-center gap-1">
                                <User className="h-3.5 w-3.5 shrink-0" />
                                {genderLabel} {genderIcon}
                            </span>
                        )}
                        {age != null && (
                            <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5 shrink-0" />
                                {age} ans
                            </span>
                        )}
                        {location && (
                            <span className="flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5 shrink-0" />
                                <span className="break-words">{location}</span>
                            </span>
                        )}
                    </div>
                    {showPhone && user.phone && (
                        <a
                            href={`tel:${user.phone}`}
                            className="inline-flex items-center gap-1 text-sm text-[#890505] hover:underline"
                        >
                            <Phone className="h-3.5 w-3.5 shrink-0" />
                            {user.phone}
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function RdvShow({ rdv, canUpdateStatus, viewerRole = 'matchmaker', canAddFeedback = false }) {
    const { auth } = usePage().props;
    const currentUserId = auth?.user?.id;

    const [status, setStatus] = useState(rdv.status);
    const [updating, setUpdating] = useState(false);
    const [statusError, setStatusError] = useState('');
    const [pendingStatus, setPendingStatus] = useState(null);

    const statusMeta = STATUS_META[status] ?? STATUS_META.en_cours;
    const statusConfirmConfig = pendingStatus
        ? getRdvStatusConfirmConfig(status, pendingStatus)
        : null;

    const isMemberViewer = viewerRole === 'user';
    const backUrl = isMemberViewer ? '/mes-rdvs' : `/staff/rdv?status=${status}`;

    const isReferenceViewer = Number(rdv.reference_user_id) === Number(currentUserId);
    const isCompatibleViewer = Number(rdv.compatible_user_id) === Number(currentUserId);

    const viewerFeedbackKey = isReferenceViewer
        ? 'reference_user'
        : isCompatibleViewer
          ? 'compatible_user'
          : null;

    const feedbacks = rdv.feedbacks ?? {
        reference_user: [],
        compatible_user: [],
        matchmaker: [],
    };

    const executeStatusUpdate = async (newStatus) => {
        setUpdating(true);
        setStatusError('');
        try {
            const { data } = await axios.patch(`/staff/rdv/${rdv.id}/status`, { status: newStatus });
            setStatus(data.rdv?.status ?? newStatus);
            setPendingStatus(null);
        } catch (err) {
            const httpStatus = err?.response?.status;
            if (httpStatus === 403) {
                setStatusError(
                    newStatus === 'reussi'
                        ? rdvToastFr.restoreMatchUnauthorized
                        : rdvToastFr.cancelMatchUnauthorized,
                );
            } else {
                setStatusError(
                    newStatus === 'reussi' ? rdvToastFr.restoreMatchError : rdvToastFr.cancelMatchError,
                );
            }
        } finally {
            setUpdating(false);
        }
    };

    const requestStatusUpdate = (newStatus) => {
        setStatusError('');
        setPendingStatus(newStatus);
    };

    const addFeedbackAction = canAddFeedback ? (
        <Button
            size="sm"
            variant="outline"
            className="h-8 border-rose-200 text-rose-700 hover:bg-rose-50"
            onClick={() => router.visit(`/mes-rdvs/${rdv.id}/feedback`)}
        >
            <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
            Ajouter un feedback
        </Button>
    ) : null;

    return (
        <AppLayout>
            <Head title={`RDV #${rdv.id} — CZM`} />

            <div className="flex h-full flex-1 flex-col gap-5 rounded-xl p-4 md:p-6">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-3">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-muted-foreground hover:text-[#890505]"
                            onClick={() => router.visit(backUrl)}
                        >
                            <ArrowLeft className="mr-1.5 h-4 w-4" />
                            {isMemberViewer ? 'Retour à mes RDVs' : 'Retour aux RDVs'}
                        </Button>
                        <h1 className="text-2xl font-semibold text-rose-900">Détail du RDV #{rdv.id}</h1>
                    </div>

                    <div className="flex flex-col items-start gap-3 sm:items-end">
                        <Badge className={statusMeta.className}>{statusMeta.label}</Badge>

                        {!isMemberViewer && canUpdateStatus && (
                            <div className="flex flex-wrap gap-2">
                                {status !== 'reussi' && (
                                    <Button
                                        size="sm"
                                        className="bg-emerald-600 text-white hover:bg-emerald-700"
                                        disabled={updating}
                                        onClick={() => requestStatusUpdate('reussi')}
                                    >
                                        <CheckCircle className="mr-1.5 h-4 w-4" />
                                        Marquer réussi
                                    </Button>
                                )}
                                {status !== 'echec' && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="border-rose-300 text-rose-700 hover:bg-rose-50"
                                        disabled={updating}
                                        onClick={() => requestStatusUpdate('echec')}
                                    >
                                        <XCircle className="mr-1.5 h-4 w-4" />
                                        Marquer échec
                                    </Button>
                                )}
                            </div>
                        )}
                        {statusError && <p className="text-sm text-rose-600">{statusError}</p>}
                    </div>
                </div>

                <RdvDetailsCard rdvDetails={rdv.rdvDetails} updatedAt={rdv.updated_at} />

                <Card className="border border-rose-100/60 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base font-semibold text-rose-900">
                            <Heart className="h-4 w-4 text-[#890505]" aria-hidden />
                            Profils en rendez-vous
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
                            <ProfileRow
                                user={rdv.reference_user}
                                label="Profil référence"
                                showPhone={
                                    !isMemberViewer ||
                                    isReferenceViewer ||
                                    Boolean(rdv.share_phone)
                                }
                            />
                            <ProfileRow
                                user={rdv.compatible_user}
                                label="Profil compatible"
                                showPhone={
                                    !isMemberViewer ||
                                    isCompatibleViewer ||
                                    Boolean(rdv.share_phone)
                                }
                            />
                        </div>
                    </CardContent>
                </Card>

                <MatchmakerContactBar matchmaker={rdv.matchmaker} />

                {/* Feedbacks */}
                <Card className="border border-rose-100/60 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold text-rose-900">Retours &amp; Feedbacks</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isMemberViewer ? (
                            <div className="space-y-8">
                                <FeedbackSection
                                    title="Votre feedback"
                                    feedbacks={viewerFeedbackKey ? feedbacks[viewerFeedbackKey] : []}
                                    action={
                                        viewerFeedbackKey &&
                                        (feedbacks[viewerFeedbackKey]?.length ?? 0) === 0
                                            ? addFeedbackAction
                                            : null
                                    }
                                />
                                <FeedbackSection
                                    title="Feedback de votre conseiller"
                                    feedbacks={feedbacks.matchmaker ?? []}
                                />
                            </div>
                        ) : (
                            <div className="space-y-8">
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                    <FeedbackSection
                                        title={`Feedback — ${rdv.reference_user?.name || 'Profil référence'}`}
                                        feedbacks={feedbacks.reference_user ?? []}
                                    />
                                    <FeedbackSection
                                        title={`Feedback — ${rdv.compatible_user?.name || 'Profil compatible'}`}
                                        feedbacks={feedbacks.compatible_user ?? []}
                                    />
                                </div>
                                <div className="rounded-xl bg-rose-50/50 p-4 md:p-5">
                                    <FeedbackSection
                                        title={
                                            rdv.matchmaker?.name
                                                ? `Feedback du conseiller — ${rdv.matchmaker.name}`
                                                : 'Feedback du conseiller'
                                        }
                                        feedbacks={feedbacks.matchmaker ?? []}
                                    />
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <ConfirmDialog
                open={Boolean(pendingStatus)}
                onOpenChange={(open) => {
                    if (!open && !updating) {
                        setPendingStatus(null);
                    }
                }}
                title={statusConfirmConfig?.title ?? ''}
                description={statusConfirmConfig?.description ?? ''}
                confirmLabel={statusConfirmConfig?.confirmLabel}
                loading={updating}
                onConfirm={() => void executeStatusUpdate(pendingStatus)}
            />
        </AppLayout>
    );
}
