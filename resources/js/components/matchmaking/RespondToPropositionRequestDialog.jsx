import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { propositionToastFr } from '@/lib/proposition-toast-messages';
import { router } from '@inertiajs/react';
import { AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

function firstValidationMessage(errors, key) {
    const value = errors?.[key];
    if (Array.isArray(value)) {
        return value[0];
    }
    if (typeof value === 'string') {
        return value;
    }
    return undefined;
}

// Server reason (PropositionRequestController::acceptBlockReason) -> translation key.
const ACCEPT_BLOCK_KEYS = {
    rdv_in_progress: 'profile.respondRequestBlockedRdv',
    active_proposition: 'profile.respondRequestBlockedActive',
};

/**
 * Answer a received proposition request (accept / decline).
 * Shared by the "Demandes reçues" page and the staff profile header.
 *
 * @param {{ id: number, can_accept?: boolean, accept_block_reason?: string|null }} request
 */
export default function RespondToPropositionRequestDialog({ open, onOpenChange, request, onSuccess, visitOptions = {} }) {
    const { t } = useTranslation();
    const { showToast } = useToast();

    const canAccept = request?.can_accept !== false;
    const blockedText = t(ACCEPT_BLOCK_KEYS[request?.accept_block_reason] || ACCEPT_BLOCK_KEYS.rdv_in_progress);

    const [status, setStatus] = useState('accepted');
    const [rejectionReason, setRejectionReason] = useState('');
    const [sharePhone, setSharePhone] = useState(false);
    const [organizer, setOrganizer] = useState('');
    const [responseMessage, setResponseMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Fresh form each time the dialog opens for a request.
    useEffect(() => {
        if (!open) return;
        setStatus(canAccept ? 'accepted' : 'rejected');
        setRejectionReason('');
        setSharePhone(false);
        setOrganizer('');
        setResponseMessage('');
        setError('');
    }, [open, request?.id, canAccept]);

    const handleSubmitResponse = () => {
        if (!request) return;
        if (status === 'rejected' && !rejectionReason.trim()) {
            setError(t('profile.respondRequestReasonRequired'));
            return;
        }
        if (status === 'accepted' && !organizer) {
            setError(t('profile.respondRequestOrganizerRequired'));
            return;
        }
        if (status === 'accepted' && !canAccept) return;

        setError('');
        setIsSubmitting(true);
        router.post(
            `/staff/proposition-requests/${request.id}/respond`,
            {
                status,
                rejection_reason: rejectionReason || null,
                share_phone: status === 'accepted' ? sharePhone : false,
                organizer: status === 'accepted' ? organizer : null,
                response_message: responseMessage || null,
            },
            {
                ...visitOptions,
                onSuccess: () => {
                    setIsSubmitting(false);
                    onOpenChange(false);
                    onSuccess?.();
                },
                onError: (errors) => {
                    setIsSubmitting(false);
                    const acceptMsg = firstValidationMessage(errors, 'accept');
                    if (acceptMsg === propositionToastFr.acceptRequestBlockedRdvInProgress) {
                        showToast(propositionToastFr.acceptRequestBlockedRdvInProgress, undefined, 'warning');
                        setError(t('profile.respondRequestBlockedRdv'));
                    } else if (acceptMsg) {
                        setError(t('profile.respondRequestBlockedActive'));
                    } else {
                        setError(t('profile.respondRequestError'));
                    }
                },
            },
        );
    };

    const textareaClass =
        'mt-2 w-full rounded-md border border-gray-300 p-3 focus:border-[#096725] focus:outline-none focus:ring-1 focus:ring-[#096725]';

    return (
        <Dialog open={open} onOpenChange={(next) => !isSubmitting && onOpenChange(next)}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>{t('profile.respondRequestTitle')}</DialogTitle>
                    <DialogDescription>{t('profile.respondRequestDescription')}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    {error && (
                        <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-800">
                            <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" aria-hidden />
                            {error}
                        </div>
                    )}

                    <div>
                        <Label>{t('profile.respondRequestDecision')}</Label>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {canAccept ? (
                                <Button type="button" variant={status === 'accepted' ? 'default' : 'outline'} onClick={() => setStatus('accepted')}>
                                    {t('profile.respondRequestAccept')}
                                </Button>
                            ) : (
                                <TooltipProvider delayDuration={200}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <span className="inline-flex">
                                                <Button type="button" variant="outline" disabled>
                                                    {t('profile.respondRequestAccept')}
                                                </Button>
                                            </span>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom" className="max-w-xs text-center">
                                            {blockedText}
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                            <Button type="button" variant={status === 'rejected' ? 'default' : 'outline'} onClick={() => setStatus('rejected')}>
                                {t('profile.respondRequestReject')}
                            </Button>
                        </div>
                        {!canAccept && <p className="mt-2 text-xs font-semibold text-amber-800">{blockedText}</p>}
                    </div>

                    {status === 'accepted' && (
                        <>
                            <div>
                                <Label>{t('profile.respondRequestSharePhone')}</Label>
                                <Select value={sharePhone ? 'yes' : 'no'} onValueChange={(value) => setSharePhone(value === 'yes')}>
                                    <SelectTrigger className="mt-2">
                                        <SelectValue placeholder={t('profile.respondRequestChoose')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="yes">{t('profile.respondRequestYes')}</SelectItem>
                                        <SelectItem value="no">{t('profile.respondRequestNo')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>{t('profile.respondRequestOrganizer')}</Label>
                                <Select value={organizer} onValueChange={setOrganizer}>
                                    <SelectTrigger className="mt-2">
                                        <SelectValue placeholder={t('profile.respondRequestChoose')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="vous">{t('profile.respondRequestOrganizerYou')}</SelectItem>
                                        <SelectItem value="moi">{t('profile.respondRequestOrganizerMe')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </>
                    )}

                    {status === 'rejected' && (
                        <div>
                            <Label>{t('profile.respondRequestRejectionReason')}</Label>
                            <textarea
                                className={textareaClass}
                                rows={3}
                                value={rejectionReason}
                                onChange={(event) => setRejectionReason(event.target.value)}
                                placeholder={t('profile.respondRequestRejectionPlaceholder')}
                                required
                            />
                        </div>
                    )}

                    <div>
                        <Label>{t('profile.respondRequestMessage')}</Label>
                        <textarea
                            className={textareaClass}
                            rows={3}
                            value={responseMessage}
                            onChange={(event) => setResponseMessage(event.target.value)}
                            placeholder={t('profile.respondRequestMessagePlaceholder')}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
                        {t('profile.respondRequestCancel')}
                    </Button>
                    <Button onClick={handleSubmitResponse} disabled={isSubmitting}>
                        {isSubmitting ? t('profile.respondRequestSending') : t('profile.respondRequestSend')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
