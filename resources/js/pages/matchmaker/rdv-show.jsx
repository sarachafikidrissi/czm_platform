import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { getAge, getProfilePicture } from '@/lib/matchmaking-result-display';
import { rdvToastFr } from '@/lib/proposition-toast-messages';
import {
    ArrowLeft,
    Building,
    Calendar,
    CheckCircle,
    Heart,
    Mail,
    MapPin,
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

function getInitials(name) {
    if (!name) return '?';
    return name
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
}

function getFeedbackContent(feedback) {
    return (
        feedback.feedback_message ||
        feedback.avis_matchmaker ||
        feedback.evaluation_de_rdv ||
        feedback.avis ||
        '—'
    );
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

function ProfileRow({ user, label }) {
    if (!user) return null;

    const profile = user.profile;
    const age = getAge(profile);
    const location = [profile?.ville_residence, profile?.pays_residence].filter(Boolean).join(', ');
    const picture = getProfilePicture(user, profile);
    const genderLabel = user.gender === 'male' ? 'Homme' : user.gender === 'female' ? 'Femme' : null;
    const genderIcon = user.gender === 'male' ? '♂' : user.gender === 'female' ? '♀' : null;

    return (
        <div className="flex flex-1 flex-col gap-3 rounded-lg border border-rose-100/60 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
            <div className="flex items-start gap-3">
                <Avatar className="h-14 w-14">
                    <AvatarImage src={picture} alt={user.name} />
                    <AvatarFallback className="bg-rose-50 text-rose-800">{getInitials(user.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-slate-900">{user.name}</h3>
                        {user.status && (
                            <Badge variant="outline" className="text-xs">
                                {MEMBER_STATUS_LABELS[user.status] || user.status}
                            </Badge>
                        )}
                    </div>
                    {user.username && <p className="text-sm text-muted-foreground">@{user.username}</p>}
                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                        {genderLabel && (
                            <span className="flex items-center gap-1">
                                <User className="h-3.5 w-3.5" />
                                {genderLabel} {genderIcon}
                            </span>
                        )}
                        {age != null && (
                            <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                {age} ans
                            </span>
                        )}
                        {location && (
                            <span className="flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" />
                                {location}
                            </span>
                        )}
                    </div>
                    {user.phone && (
                        <a
                            href={`tel:${user.phone}`}
                            className="inline-flex items-center gap-1 text-sm text-[#890505] hover:underline"
                        >
                            <Phone className="h-3.5 w-3.5" />
                            {user.phone}
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function RdvShow({ rdv, canUpdateStatus }) {
    const [status, setStatus] = useState(rdv.status);
    const [updating, setUpdating] = useState(false);
    const [statusError, setStatusError] = useState('');

    const statusMeta = STATUS_META[status] ?? STATUS_META.en_cours;

    const handleStatusUpdate = async (newStatus) => {
        const confirmMessage =
            newStatus === 'reussi'
                ? 'Confirmer le marquage de ce RDV comme réussi ?'
                : 'Confirmer le marquage de ce RDV comme échec ?';

        if (!window.confirm(confirmMessage)) {
            return;
        }

        setUpdating(true);
        setStatusError('');
        try {
            const { data } = await axios.patch(`/staff/rdv/${rdv.id}/status`, { status: newStatus });
            setStatus(data.rdv?.status ?? newStatus);
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

    const feedbacks = rdv.feedbacks ?? [];

    return (
        <AppLayout>
            <Head title={`RDV #${rdv.id} — CZM`} />

            <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-4 md:p-6">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-3">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-muted-foreground hover:text-[#890505]"
                            onClick={() => router.visit(`/staff/rdv?status=${status}`)}
                        >
                            <ArrowLeft className="mr-1.5 h-4 w-4" />
                            Retour aux RDVs
                        </Button>
                        <h1 className="text-2xl font-semibold text-rose-900">Détail du RDV #{rdv.id}</h1>
                    </div>

                    <div className="flex flex-col items-start gap-3 sm:items-end">
                        <Badge className={statusMeta.className}>{statusMeta.label}</Badge>

                        {canUpdateStatus && (
                            <div className="flex flex-wrap gap-2">
                                {status !== 'reussi' && (
                                    <Button
                                        size="sm"
                                        className="bg-emerald-600 text-white hover:bg-emerald-700"
                                        disabled={updating}
                                        onClick={() => handleStatusUpdate('reussi')}
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
                                        onClick={() => handleStatusUpdate('echec')}
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

                {/* Two-column layout */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {/* Left — Profiles */}
                    <Card className="border border-rose-100/60 shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg text-rose-900">Profils en rendez-vous</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-col gap-4 md:flex-row md:items-stretch">
                                <ProfileRow user={rdv.reference_user} label="Profil référence" />
                                <div className="flex shrink-0 items-center justify-center md:flex-col">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-[#890505]">
                                        <Heart className="h-5 w-5" />
                                    </div>
                                </div>
                                <ProfileRow user={rdv.compatible_user} label="Profil compatible" />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Right — Metadata + matchmaker */}
                    <div className="space-y-6">
                        <Card className="border border-rose-100/60 shadow-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg text-rose-900">Informations du RDV</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                <div className="flex items-center justify-between gap-4">
                                    <span className="text-muted-foreground">Date de création</span>
                                    <span className="font-medium text-slate-900">{rdv.created_at}</span>
                                </div>
                                <Separator />
                                <div className="flex items-center justify-between gap-4">
                                    <span className="text-muted-foreground">Dernière mise à jour</span>
                                    <span className="font-medium text-slate-900">{rdv.updated_at}</span>
                                </div>
                                <Separator />
                                <div className="flex items-center justify-between gap-4">
                                    <span className="text-muted-foreground">Statut actuel</span>
                                    <Badge className={statusMeta.className}>{statusMeta.label}</Badge>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border border-rose-100/60 shadow-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg text-rose-900">Conseiller responsable</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                {rdv.matchmaker ? (
                                    <>
                                        <div className="flex items-center gap-2 font-medium text-slate-900">
                                            <User className="h-4 w-4 text-muted-foreground" />
                                            {rdv.matchmaker.name}
                                        </div>
                                        {rdv.matchmaker.email && (
                                            <a
                                                href={`mailto:${rdv.matchmaker.email}`}
                                                className="flex items-center gap-2 text-[#890505] hover:underline"
                                            >
                                                <Mail className="h-4 w-4" />
                                                {rdv.matchmaker.email}
                                            </a>
                                        )}
                                        {rdv.matchmaker.phone && (
                                            <a
                                                href={`tel:${rdv.matchmaker.phone}`}
                                                className="flex items-center gap-2 text-[#890505] hover:underline"
                                            >
                                                <Phone className="h-4 w-4" />
                                                {rdv.matchmaker.phone}
                                            </a>
                                        )}
                                        {rdv.matchmaker.agency?.name && (
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <Building className="h-4 w-4" />
                                                {rdv.matchmaker.agency.name}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-muted-foreground">Aucun conseiller assigné.</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Feedbacks */}
                <Card className="border border-rose-100/60 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg text-rose-900">Retours &amp; Feedbacks</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {feedbacks.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
                                <User className="h-8 w-8 opacity-40" />
                                <p className="text-sm">Aucun retour enregistré pour ce RDV.</p>
                            </div>
                        ) : (
                            <div className="space-y-0">
                                {feedbacks.map((feedback, index) => (
                                    <div key={feedback.id}>
                                        {index > 0 && <Separator className="my-4" />}
                                        <div className="space-y-1">
                                            <div className="flex flex-wrap items-center gap-2 text-sm">
                                                <span className="font-medium text-slate-900">
                                                    {feedback.author?.name || 'Auteur inconnu'}
                                                </span>
                                                {feedback.created_at && (
                                                    <span className="text-muted-foreground">
                                                        {formatFeedbackDate(feedback.created_at)}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-slate-700">{getFeedbackContent(feedback)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
