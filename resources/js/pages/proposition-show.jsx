import PropositionRespondForm from '@/components/proposition/PropositionRespondForm';
import ConfirmDialog from '@/components/ConfirmDialog';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import CreateRdvModal from '@/components/rdv/CreateRdvModal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import AppLayout from '@/layouts/app-layout';
import { getAge, getProfilePicture } from '@/lib/matchmaking-result-display';
import {
    getPropositionResponseLabel,
    getPropositionStatusMeta,
    normalizePropositionStatus,
} from '@/lib/proposition-status';
import { propositionToastFr } from '@/lib/proposition-toast-messages';
import { Head, Link, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import {
    ArrowLeft,
    Building,
    Calendar,
    CalendarPlus,
    Heart,
    Mail,
    MapPin,
    Phone,
    User,
} from 'lucide-react';
import { useMemo, useState } from 'react';

const MEMBER_STATUS_LABELS = {
    member: 'Membre',
    client: 'Client',
    client_expire: 'Client expiré',
    prospect: 'Prospect',
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

function MatchmakerContactBar({ matchmaker }) {
    if (!matchmaker) {
        return (
            <Card className="border border-rose-100/60 bg-rose-50/20 shadow-sm">
                <CardContent className="py-4 text-sm text-muted-foreground">Aucun matchmaker assigné.</CardContent>
            </Card>
        );
    }

    return (
        <Card className="border border-rose-100/60 bg-rose-50/20 shadow-sm">
            <CardContent className="py-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Matchmaker responsable
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

function ProfileRow({ user, label }) {
    if (!user) return null;

    const profile = user.profile;
    const age = getAge(profile);
    const location = [profile?.ville_residence, profile?.pays_residence].filter(Boolean).join(', ');
    const picture = getProfilePicture(user, profile);
    const genderLabel = user.gender === 'male' ? 'Homme' : user.gender === 'female' ? 'Femme' : null;
    const profileUrl = user.username || user.id ? `/profile/${user.username || user.id}` : null;

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
                        {profileUrl ? (
                            <Link
                                href={profileUrl}
                                className="break-words text-base font-semibold leading-snug text-slate-900 transition-colors hover:text-[#890505] hover:underline"
                            >
                                {user.name}
                            </Link>
                        ) : (
                            <h3 className="break-words text-base font-semibold leading-snug text-slate-900">{user.name}</h3>
                        )}
                        {user.status && (
                            <Badge variant="outline" className="shrink-0 text-xs">
                                {MEMBER_STATUS_LABELS[user.status] || user.status}
                            </Badge>
                        )}
                    </div>
                    {user.username && (
                        profileUrl ? (
                            <Link
                                href={profileUrl}
                                className="block truncate text-sm text-muted-foreground transition-colors hover:text-[#890505] hover:underline"
                            >
                                @{user.username}
                            </Link>
                        ) : (
                            <p className="truncate text-sm text-muted-foreground">@{user.username}</p>
                        )
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        {genderLabel && (
                            <span className="flex items-center gap-1">
                                <User className="h-3.5 w-3.5 shrink-0" />
                                {genderLabel}
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
                    {profileUrl && (
                        <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="mt-2 h-8 border-rose-200 text-rose-700 hover:bg-rose-50"
                        >
                            <Link href={profileUrl}>
                                <User className="mr-1.5 h-3.5 w-3.5" />
                                Voir le profil
                            </Link>
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

function RecipientResponseSection({ title, row }) {
    if (!row) {
        return (
            <div>
                <h3 className="mb-2 text-sm font-semibold text-rose-900">{title}</h3>
                <p className="text-sm text-muted-foreground">Proposition non envoyée à ce profil.</p>
            </div>
        );
    }

    const meta = getPropositionStatusMeta(row.status, row.is_expired, row.user_response);

    return (
        <div className="rounded-lg border border-rose-100/60 bg-white p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-rose-900">{title}</h3>
                <Badge className={meta.className}>{meta.label}</Badge>
            </div>
            <p className="text-sm text-slate-700">
                {getPropositionResponseLabel(row.user_response, row.response_message || row.user_comment)}
            </p>
            {row.responded_at && (
                <p className="mt-1 text-xs text-muted-foreground">
                    Répondu le {new Date(row.responded_at).toLocaleDateString('fr-FR')}
                </p>
            )}
        </div>
    );
}

export default function PropositionShow({ proposition: initialProposition, viewerRole = 'user', canRespond = false }) {
    const { auth } = usePage().props;
    const { showToast } = useToast();
    const [proposition, setProposition] = useState(initialProposition);
    const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [rdvModalOpen, setRdvModalOpen] = useState(false);
    const [staffRespondTarget, setStaffRespondTarget] = useState(null);
    const [staffRespondMessage, setStaffRespondMessage] = useState('');
    const [staffRespondProcessing, setStaffRespondProcessing] = useState(false);

    const isMemberViewer = viewerRole === 'user';
    const backUrl = isMemberViewer ? '/propositions' : `/staff/matchmaker/propositions?status=${proposition.aggregate_status === 'accepted' ? 'accepted' : proposition.aggregate_status || 'all'}`;

    const statusMeta = getPropositionStatusMeta(
        proposition.aggregate_status,
        proposition.aggregate_status === 'expired',
    );

    const recipientRows = useMemo(() => Object.values(proposition.recipients || {}), [proposition.recipients]);

    const refRow = proposition.recipients?.[String(proposition.reference_user_id)] ?? null;
    const compRow = proposition.recipients?.[String(proposition.compatible_user_id)] ?? null;

    const myRow =
        proposition.my_recipient_row ||
        proposition.recipients?.[String(auth?.user?.id)] ||
        null;

    const canSendToOther = useMemo(() => {
        if (isMemberViewer) return false;
        const refId = proposition.reference_user_id;
        const compId = proposition.compatible_user_id;
        const hasRef = Boolean(proposition.recipients?.[String(refId)]);
        const hasComp = Boolean(proposition.recipients?.[String(compId)]);
        if (hasRef === hasComp) return false;
        const current = hasRef ? refRow : compRow;
        return normalizePropositionStatus(current?.status, current?.is_expired, current?.user_response) === 'accepted';
    }, [isMemberViewer, proposition, refRow, compRow]);

    const handleCancel = async () => {
        if (!proposition.cancellable_proposition_id) return;
        setCancelling(true);
        try {
            const { data } = await axios.patch(`/staff/propositions/${proposition.cancellable_proposition_id}/cancel`);
            showToast(
                data?.pair_was_cancelled ? propositionToastFr.cancelSuccessPaired : propositionToastFr.cancelSuccess,
                undefined,
                'success',
            );
            router.reload();
        } catch (error) {
            const status = error?.response?.status;
            const backendMsg = error?.response?.data?.message;
            if (status === 403) {
                showToast(propositionToastFr.cancelUnauthorized, undefined, 'error');
            } else if (status === 422 && backendMsg === propositionToastFr.cancelExpired) {
                showToast(propositionToastFr.cancelExpired, undefined, 'warning');
            } else if (status === 422 && backendMsg === propositionToastFr.cancelInvalidState) {
                showToast(propositionToastFr.cancelInvalidState, undefined, 'warning');
            } else {
                showToast(propositionToastFr.cancelError, undefined, 'error');
            }
        } finally {
            setCancelling(false);
            setCancelConfirmOpen(false);
        }
    };

    const handleSendToOther = async () => {
        const refId = proposition.reference_user_id;
        const compId = proposition.compatible_user_id;
        const hasRef = Boolean(proposition.recipients?.[String(refId)]);
        const recipientId = hasRef ? compId : refId;
        try {
            await axios.post('/staff/propositions/send-to-other', {
                reference_user_id: refId,
                compatible_user_id: compId,
                recipient_user_id: recipientId,
                message: proposition.message,
            });
            showToast(propositionToastFr.sendSuccess, undefined, 'success');
            router.reload();
        } catch (error) {
            const backendMsg = error?.response?.data?.message;
            if (backendMsg === propositionToastFr.sendBlockedActive) {
                showToast(propositionToastFr.sendBlockedActive, undefined, 'warning');
            } else if (backendMsg === propositionToastFr.sendBlockedRdvInProgress) {
                showToast(propositionToastFr.sendBlockedRdvInProgress, undefined, 'warning');
            } else {
                showToast(propositionToastFr.sendError, undefined, 'error');
            }
        }
    };

    const handleStaffRespond = async (status) => {
        if (!staffRespondTarget) return;
        const trimmed = staffRespondMessage.trim();
        if (status === 'rejected' && !trimmed) {
            showToast('Veuillez saisir un motif de refus.', undefined, 'warning');
            return;
        }
        setStaffRespondProcessing(true);
        try {
            await axios.post(`/propositions/${staffRespondTarget.id}/respond`, {
                status,
                response_message: trimmed || null,
            });
            showToast(propositionToastFr.respondUpdateSuccess, undefined, 'success');
            setStaffRespondTarget(null);
            setStaffRespondMessage('');
            router.reload();
        } catch (error) {
            if (error?.response?.status === 403) {
                showToast(propositionToastFr.respondUpdateUnauthorized, undefined, 'error');
            } else {
                showToast(propositionToastFr.respondUpdateError, undefined, 'error');
            }
        } finally {
            setStaffRespondProcessing(false);
        }
    };

    return (
        <AppLayout>
            <Head title={`Proposition #${proposition.id} — CZM`} />

            <div className="flex h-full flex-1 flex-col gap-5 rounded-xl p-4 md:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-3">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-muted-foreground hover:text-[#890505]"
                            onClick={() => router.visit(backUrl)}
                        >
                            <ArrowLeft className="mr-1.5 h-4 w-4" />
                            {isMemberViewer ? 'Retour aux propositions' : 'Retour aux propositions'}
                        </Button>
                        <h1 className="text-2xl font-semibold text-rose-900">Détail de la proposition #{proposition.id}</h1>
                    </div>
                    <Badge className={statusMeta.className}>{statusMeta.label}</Badge>
                </div>

                <Card className="border border-rose-100/60 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold text-rose-900">Détails de la proposition</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Message</p>
                            <p className="mt-1 whitespace-pre-wrap text-slate-700">{proposition.message || '—'}</p>
                        </div>
                        <Separator />
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date d&apos;envoi</p>
                                <p className="mt-1 font-medium text-slate-900">{proposition.created_at || '—'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dernière mise à jour</p>
                                <p className="mt-1 font-medium text-slate-900">{proposition.updated_at || '—'}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-rose-100/60 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base font-semibold text-rose-900">
                            <Heart className="h-4 w-4 text-[#890505]" aria-hidden />
                            Profils concernés
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
                            <ProfileRow user={proposition.reference_user} label="Profil référence" />
                            <ProfileRow user={proposition.compatible_user} label="Profil compatible" />
                        </div>
                    </CardContent>
                </Card>

                <MatchmakerContactBar matchmaker={proposition.matchmaker} />

                {isMemberViewer ? (
                    <Card className="border border-rose-100/60 shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-semibold text-rose-900">Votre réponse</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {canRespond && myRow ? (
                                <PropositionRespondForm
                                    proposition={myRow}
                                    onSuccess={(patch) => {
                                        setProposition((prev) => ({
                                            ...prev,
                                            my_recipient_row: { ...myRow, ...patch },
                                            recipients: {
                                                ...prev.recipients,
                                                [String(auth.user.id)]: { ...myRow, ...patch },
                                            },
                                        }));
                                        router.reload({ only: ['proposition', 'canRespond'] });
                                    }}
                                />
                            ) : (
                                <RecipientResponseSection title="Votre réponse" row={myRow} />
                            )}
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        <Card className="border border-rose-100/60 shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base font-semibold text-rose-900">Réponses des profils</CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <RecipientResponseSection
                                    title={`Réponse — ${proposition.reference_user?.name || 'Profil référence'}`}
                                    row={refRow}
                                />
                                <RecipientResponseSection
                                    title={`Réponse — ${proposition.compatible_user?.name || 'Profil compatible'}`}
                                    row={compRow}
                                />
                            </CardContent>
                        </Card>

                        <Card className="border border-rose-100/60 bg-rose-50/20 shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base font-semibold text-rose-900">Actions matchmaker</CardTitle>
                            </CardHeader>
                            <CardContent className="flex flex-wrap gap-2">
                                {proposition.can_cancel && (
                                    <Button
                                        variant="outline"
                                        className="border-rose-200 text-rose-800 hover:bg-rose-50"
                                        disabled={cancelling}
                                        onClick={() => setCancelConfirmOpen(true)}
                                    >
                                        Annuler la proposition
                                    </Button>
                                )}
                                {canSendToOther && (
                                    <Button variant="outline" onClick={() => void handleSendToOther()}>
                                        Envoyer au profil restant
                                    </Button>
                                )}
                                {proposition.can_create_rdv && (
                                    <Button
                                        className="bg-[#890505] text-white hover:bg-[#721f2b]"
                                        onClick={() => setRdvModalOpen(true)}
                                    >
                                        <CalendarPlus className="mr-1.5 h-4 w-4" />
                                        {proposition.is_recreation_context ? 'Re-créer un RDV' : 'Créer un RDV'}
                                    </Button>
                                )}
                                {recipientRows.map((row) =>
                                    row.can_update_response ? (
                                        <Button
                                            key={row.id}
                                            variant="outline"
                                            className="border-rose-200 text-rose-800 hover:bg-rose-50"
                                            onClick={() => {
                                                setStaffRespondTarget(row);
                                                setStaffRespondMessage(row.response_message || row.user_comment || '');
                                            }}
                                        >
                                            Répondre pour {row.recipient_user?.name || 'le profil'}
                                        </Button>
                                    ) : null,
                                )}
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>

            <ConfirmDialog
                open={cancelConfirmOpen}
                onOpenChange={setCancelConfirmOpen}
                title="Annuler la proposition"
                description="Confirmer l'annulation de cette proposition ? Les profils concernés pourront recevoir une nouvelle proposition."
                confirmLabel="Confirmer l'annulation"
                loading={cancelling}
                onConfirm={() => void handleCancel()}
            />

            {rdvModalOpen && (
                <CreateRdvModal
                    open={rdvModalOpen}
                    propositionId={proposition.is_recreation_context ? null : proposition.rdv_proposition_id}
                    fromFailedRdvId={proposition.is_recreation_context ? proposition.recreate_from_failed_rdv_id : null}
                    isRecreationContext={Boolean(proposition.is_recreation_context)}
                    onClose={() => setRdvModalOpen(false)}
                    onSuccess={() => {
                        setRdvModalOpen(false);
                        router.reload();
                    }}
                />
            )}

            <Dialog
                open={Boolean(staffRespondTarget)}
                onOpenChange={(open) => {
                    if (!open && !staffRespondProcessing) {
                        setStaffRespondTarget(null);
                        setStaffRespondMessage('');
                    }
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Répondre pour le profil</DialogTitle>
                        <DialogDescription>
                            {staffRespondTarget?.recipient_user?.name
                                ? `Réponse au nom de ${staffRespondTarget.recipient_user.name}`
                                : 'Répondre au nom du profil concerné.'}
                        </DialogDescription>
                    </DialogHeader>
                    <textarea
                        value={staffRespondMessage}
                        onChange={(e) => setStaffRespondMessage(e.target.value)}
                        placeholder="Motif (obligatoire en cas de refus)"
                        rows={3}
                        className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                        disabled={staffRespondProcessing}
                    />
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            disabled={staffRespondProcessing}
                            onClick={() => void handleStaffRespond('rejected')}
                        >
                            Refuser
                        </Button>
                        <Button
                            className="bg-[#890505] text-white hover:bg-[#721f2b]"
                            disabled={staffRespondProcessing}
                            onClick={() => void handleStaffRespond('accepted')}
                        >
                            Accepter
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
