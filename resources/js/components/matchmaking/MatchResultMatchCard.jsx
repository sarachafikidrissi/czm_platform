import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, MapPin, Calendar, GraduationCap, Briefcase, Heart, TrendingUp, Info, Loader2, ChevronDown } from 'lucide-react';
import {
    getProfilePicture,
    getAge,
    getLocation,
    getScoreColor,
    getRequestButtonLabel,
    MATCH_PRIMARY,
} from '@/lib/matchmaking-result-display';
import { propositionToastFr } from '@/lib/proposition-toast-messages';

/**
 * @param {object} props
 * @param {object} props.match Enriched match row from backend
 * @param {(match: object) => void} props.onCardClick
 * @param {(match: object, e?: React.MouseEvent) => void} props.onOpenPropose
 * @param {(match: object, e?: React.MouseEvent) => void} props.onOpenRequest
 * @param {(propositionId: number, e?: React.MouseEvent) => void} [props.onCancelProposition]
 * @param {number | null} [props.cancellingPropositionId]
 * @param {(propositionId: number, e?: React.MouseEvent) => void} [props.onOpenRespondDialog]
 * @param {boolean} [props.compactTypography] Slightly smaller text on dense pages (e.g. profile tab)
 * @param {boolean} [props.referenceActivePairMode] Reference user has an active proposition; show only cancel/respond for this counterpart card
 * @param {number | null} [props.referencePendingResponsePropositionId] Proposition id for matchmaker respond on behalf of reference user
 * @param {number | null} [props.activePairCancelPropositionId] Proposition id to cancel for this active pair
 */
export default function MatchResultMatchCard({
    match,
    onCardClick,
    onOpenPropose,
    onOpenRequest,
    onCancelProposition,
    cancellingPropositionId = null,
    onOpenRespondDialog,
    compactTypography = false,
    referenceActivePairMode = false,
    referencePendingResponsePropositionId = null,
    activePairCancelPropositionId = null,
}) {
    const titleClass = compactTypography ? 'truncate text-base font-semibold text-foreground' : 'truncate text-lg font-semibold text-foreground';
    const emailClass = compactTypography ? 'mt-0.5 truncate text-xs text-muted-foreground' : 'mt-0.5 truncate text-sm text-muted-foreground';

    const requestStatusForLabel = match.can_propose_from_request ? match.proposition_request_status : null;
    const pendingResponseId = match.pending_response_proposition?.id ?? null;
    const cancellableId = match.cancellable_proposition?.id ?? null;
    const [confirmActivePairCancel, setConfirmActivePairCancel] = useState(false);

    const requestDisabledForActiveCompatible = Boolean(match.proposition?.exists);
    const requestButtonDisabled = requestStatusForLabel === 'pending' || requestDisabledForActiveCompatible;
    const requestDisabledTitle = requestDisabledForActiveCompatible
        ? 'Ce profil a déjà une proposition en cours. Les demandes ne peuvent pas être envoyées.'
        : undefined;

    const refOrCompatHasActiveProposition =
        Boolean(match.user_a_has_active_proposition) || Boolean(match.compatible_user_has_active_proposition);

    return (
        <Card
            className="cursor-pointer overflow-hidden rounded-xl border-2 border-[#8B2635]/40 bg-card shadow-sm transition-shadow hover:shadow-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
            onClick={() => onCardClick(match)}
        >
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-start gap-4">
                        <img
                            src={getProfilePicture(match.user, match.profile)}
                            alt={match.user.name}
                            className="h-14 w-14 shrink-0 rounded-full object-cover sm:h-16 sm:w-16"
                        />
                        <div className="min-w-0 flex-1">
                            <CardTitle className={titleClass}>{match.user.name}</CardTitle>
                            <CardDescription className={emailClass}>{match.user.email}</CardDescription>
                        </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-0.5">
                        <span className={`text-xl font-bold ${getScoreColor(match.score)}`}>
                            <TrendingUp className="mr-1 inline-block h-5 w-5 align-middle" />
                            {Number(match.score).toFixed(1)}%
                        </span>
                        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            {Number(match.completeness).toFixed(0)}% complet
                        </span>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0" onClick={(e) => e.stopPropagation()}>
                <div className="space-y-2 text-sm text-muted-foreground">
                    {getAge(match.profile) && (
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 shrink-0" />
                            <span>{getAge(match.profile)} ans</span>
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 shrink-0" />
                        <span className="truncate">{getLocation(match.profile)}</span>
                    </div>
                    {match.profile.niveau_etudes && (
                        <div className="flex items-center gap-2">
                            <GraduationCap className="h-4 w-4 shrink-0" />
                            <span>{match.profile.niveau_etudes}</span>
                        </div>
                    )}
                    {match.profile.situation_professionnelle && (
                        <div className="flex items-center gap-2">
                            <Briefcase className="h-4 w-4 shrink-0" />
                            <span>{match.profile.situation_professionnelle}</span>
                        </div>
                    )}
                    {match.profile.religion && (
                        <Badge variant="secondary" className="w-fit rounded-md bg-muted text-muted-foreground">
                            {match.profile.religion}
                        </Badge>
                    )}
                </div>
                {match.isAssignedToMe ? (
                    <div className="flex items-center gap-2 text-sm">
                        <span className="h-2 w-2 shrink-0 rounded-full bg-green-500" aria-hidden />
                        <span className="text-muted-foreground">Assigné à moi</span>
                    </div>
                ) : match.assigned_matchmaker ? (
                    <div className="flex items-center gap-2 text-sm">
                        <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400" aria-hidden />
                        <span className="text-muted-foreground">Assigné à: {match.assigned_matchmaker.name}</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">Non assigné</div>
                )}

                <Separator className="my-3" />

                {referenceActivePairMode ? (
                    <div className="flex flex-col gap-2">
                        {referencePendingResponsePropositionId && onOpenRespondDialog && (
                            <Button
                                type="button"
                                className="w-full rounded-lg py-2.5 text-sm font-medium text-white focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                style={{ backgroundColor: MATCH_PRIMARY }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenRespondDialog(referencePendingResponsePropositionId, e);
                                }}
                            >
                                Répondre à la proposition
                            </Button>
                        )}
                        {activePairCancelPropositionId && onCancelProposition && (
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full rounded-lg border-destructive/40 py-2.5 text-sm text-destructive hover:bg-destructive/10"
                                disabled={cancellingPropositionId === activePairCancelPropositionId}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (!confirmActivePairCancel) {
                                        setConfirmActivePairCancel(true);
                                        return;
                                    }
                                    setConfirmActivePairCancel(false);
                                    onCancelProposition(activePairCancelPropositionId, e);
                                }}
                            >
                                {cancellingPropositionId === activePairCancelPropositionId ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : null}
                                {confirmActivePairCancel ? 'Confirmer l’annulation' : 'Annuler la proposition'}
                            </Button>
                        )}
                        {confirmActivePairCancel && (
                            <Button
                                type="button"
                                variant="ghost"
                                className="w-full py-1 text-xs text-muted-foreground"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmActivePairCancel(false);
                                }}
                            >
                                Retour
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            className="w-full rounded-b-xl border-border bg-muted/30 py-2.5 text-sm font-medium text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:bg-muted/50"
                            onClick={(event) => {
                                event.stopPropagation();
                                window.open(`/profile/${match.user.username || match.user.id}`, '_blank', 'noopener,noreferrer');
                            }}
                        >
                            <User className="mr-2 h-4 w-4" />
                            Voir le profil
                        </Button>
                    </div>
                ) : (
                    <>
                {!match.isAssignedToMe && match.assigned_matchmaker && (
                    requestDisabledForActiveCompatible ? (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className="inline-flex w-full">
                                    <Button
                                        variant="outline"
                                        className="w-full rounded-t-lg border-[#8B2635]/50 bg-[#8B2635]/10 py-2.5 text-sm font-medium text-[#8B2635] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:bg-[#8B2635]/15 disabled:opacity-50"
                                        onClick={(event) => {
                                            if (requestButtonDisabled) return;
                                            if (match.can_propose_from_request) {
                                                onOpenPropose(match, event);
                                                return;
                                            }
                                            onOpenRequest(match, event);
                                        }}
                                        disabled={requestButtonDisabled}
                                        aria-label={requestDisabledTitle || getRequestButtonLabel(requestStatusForLabel)}
                                    >
                                        <Info className="mr-2 h-4 w-4" />
                                        {getRequestButtonLabel(requestStatusForLabel)}
                                    </Button>
                                </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs text-left">
                                {requestDisabledTitle}
                            </TooltipContent>
                        </Tooltip>
                    ) : (
                        <Button
                            variant="outline"
                            className="w-full rounded-t-lg border-[#8B2635]/50 bg-[#8B2635]/10 py-2.5 text-sm font-medium text-[#8B2635] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:bg-[#8B2635]/15 disabled:opacity-50"
                            onClick={(event) => {
                                if (match.can_propose_from_request) {
                                    onOpenPropose(match, event);
                                    return;
                                }
                                onOpenRequest(match, event);
                            }}
                            disabled={requestButtonDisabled}
                        >
                            <Info className="mr-2 h-4 w-4" />
                            {getRequestButtonLabel(requestStatusForLabel)}
                        </Button>
                    )
                )}

                {match.isAssignedToMe && (
                    <Button
                        className={`w-full py-2.5 text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none ${
                            match.proposition_status === 'pending' || refOrCompatHasActiveProposition
                                ? 'rounded-t-lg bg-amber-50 text-amber-700 hover:bg-amber-50'
                                : 'rounded-t-lg text-white hover:opacity-90'
                        }`}
                        style={
                            match.proposition_status === 'pending' || refOrCompatHasActiveProposition
                                ? undefined
                                : { backgroundColor: MATCH_PRIMARY }
                        }
                        title={
                            refOrCompatHasActiveProposition ? propositionToastFr.sendBlockedActive : undefined
                        }
                        onClick={(event) => {
                            if (match.proposition_status === 'pending') {
                                return;
                            }
                            if (refOrCompatHasActiveProposition) {
                                return;
                            }
                            onOpenPropose(match, event);
                        }}
                        disabled={match.proposition_status === 'pending' || refOrCompatHasActiveProposition}
                    >
                        {match.proposition_status === 'pending' ? (
                            <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin text-amber-600" aria-hidden />
                        ) : refOrCompatHasActiveProposition ? (
                            <Info className="mr-2 h-4 w-4 shrink-0 text-amber-700" aria-hidden />
                        ) : (
                            <Heart className="mr-2 h-4 w-4" />
                        )}
                        {match.proposition_status === 'pending'
                            ? 'Proposition en cours...'
                            : refOrCompatHasActiveProposition
                              ? 'Proposition en cours (profil concerné)'
                              : 'Proposer'}
                    </Button>
                )}

                {pendingResponseId && match.isAssignedToMe && onOpenRespondDialog && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                className="w-full rounded-none border-t-0 py-2.5 text-sm"
                                onClick={(e) => e.stopPropagation()}
                            >
                                Modifier la réponse
                                <ChevronDown className="ml-2 h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="center" className="w-56">
                            <DropdownMenuItem
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenRespondDialog(pendingResponseId, e);
                                }}
                            >
                                Répondre pour le membre (accepter / refuser)
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}

                {cancellableId && onCancelProposition && (
                    <Button
                        variant="outline"
                        className="w-full rounded-none border-t-0 border-destructive/40 py-2.5 text-sm text-destructive hover:bg-destructive/10"
                        disabled={cancellingPropositionId === cancellableId}
                        onClick={(e) => {
                            e.stopPropagation();
                            onCancelProposition(cancellableId, e);
                        }}
                    >
                        {cancellingPropositionId === cancellableId ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Annuler la proposition
                    </Button>
                )}

                <Button
                    variant="outline"
                    className="w-full rounded-b-xl rounded-t-none border-t-0 border-border bg-muted/30 py-2.5 text-sm font-medium text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:bg-muted/50"
                    onClick={(event) => {
                        event.stopPropagation();
                        window.open(`/profile/${match.user.username || match.user.id}`, '_blank', 'noopener,noreferrer');
                    }}
                >
                    <User className="mr-2 h-4 w-4" />
                    Voir le profil
                </Button>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
