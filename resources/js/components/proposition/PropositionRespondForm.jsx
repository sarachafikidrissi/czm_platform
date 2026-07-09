import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { getPropositionResponseSelection } from '@/lib/proposition-status';
import { propositionToastFr } from '@/lib/proposition-toast-messages';
import axios from 'axios';
import { useEffect, useState } from 'react';

/**
 * Shared member respond form for proposition detail (and legacy profile shortcut).
 */
export default function PropositionRespondForm({
    proposition,
    onSuccess,
    requireMessageForAccept = true,
    submitLabel = 'Soumettre',
}) {
    const { showToast } = useToast();
    const [selection, setSelection] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (!proposition) return;
        setSelection(getPropositionResponseSelection(proposition));
        setMessage(proposition.response_message || '');
        setError('');
    }, [proposition?.id, proposition?.response_message, proposition?.user_response, proposition?.status]);

    if (!proposition) return null;

    const hasAnswered = Boolean(proposition.responded_at);
    const isAnswerable = !hasAnswered && proposition.status === 'pending' && !proposition.is_expired;

    const handleSubmit = async () => {
        if (!selection) {
            setError('Veuillez sélectionner une réponse.');
            return;
        }
        const trimmed = message.trim();
        if (requireMessageForAccept && !trimmed) {
            setError('Veuillez saisir un motif.');
            return;
        }
        if (selection === 'rejected' && !trimmed) {
            setError('Veuillez saisir un motif de refus.');
            return;
        }

        setProcessing(true);
        setError('');
        try {
            await axios.post(`/propositions/${proposition.id}/respond`, {
                status: selection,
                response_message: trimmed || null,
            });
            showToast(
                selection === 'accepted' ? propositionToastFr.memberAccept : propositionToastFr.memberDecline,
                undefined,
                'success',
            );
            onSuccess?.({
                status: selection === 'accepted' ? 'interested' : 'not_interested',
                user_response: selection === 'accepted' ? 'interested' : 'not_interested',
                response_message: trimmed || null,
                responded_at: new Date().toISOString(),
            });
        } catch (err) {
            const backendMsg = err?.response?.data?.message;
            if (backendMsg === 'Proposition already responded.') {
                showToast(propositionToastFr.memberAlreadyAnswered, undefined, 'warning');
                setError(propositionToastFr.memberAlreadyAnswered);
            } else if (backendMsg === 'Proposition expired.') {
                showToast(propositionToastFr.memberExpired, undefined, 'warning');
                setError(propositionToastFr.memberExpired);
            } else if (backendMsg === 'Cette proposition a été annulée.') {
                showToast('Cette proposition a été annulée.', undefined, 'warning');
                setError('Cette proposition a été annulée.');
            } else {
                showToast(propositionToastFr.memberGenericError, undefined, 'error');
                setError(propositionToastFr.memberGenericError);
            }
        } finally {
            setProcessing(false);
        }
    };

    if (hasAnswered) {
        return (
            <div className="rounded-lg border border-rose-100/60 bg-white p-4 text-sm text-slate-700">
                {proposition.response_message ? (
                    <>Votre réponse : {proposition.response_message}</>
                ) : getPropositionResponseSelection(proposition) === 'accepted' ? (
                    <>Vous avez indiqué être intéressé(e). En attente de la réponse de l&apos;autre profil.</>
                ) : (
                    <>Vous avez déjà répondu à cette proposition.</>
                )}
            </div>
        );
    }

    if (!isAnswerable) {
        return <p className="text-sm text-muted-foreground">Cette proposition n&apos;est plus modifiable.</p>;
    }

    return (
        <div className="space-y-4">
            <div className="space-y-3">
                <label className="flex items-center gap-3 text-sm text-slate-700">
                    <input
                        type="radio"
                        name={`proposition-respond-${proposition.id}`}
                        value="accepted"
                        checked={selection === 'accepted'}
                        disabled={processing}
                        onChange={() => setSelection('accepted')}
                    />
                    Intéressé(e)
                </label>
                <label className="flex items-center gap-3 text-sm text-slate-700">
                    <input
                        type="radio"
                        name={`proposition-respond-${proposition.id}`}
                        value="rejected"
                        checked={selection === 'rejected'}
                        disabled={processing}
                        onChange={() => setSelection('rejected')}
                    />
                    Pas intéressé(e)
                </label>
            </div>
            <Textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Veuillez donner plus de détails"
                disabled={processing}
                className="min-h-[90px] bg-white"
            />
            {error && <div className="text-sm text-rose-600">{error}</div>}
            <Button
                type="button"
                className="bg-[#890505] text-white hover:bg-[#721f2b]"
                disabled={processing}
                onClick={() => void handleSubmit()}
            >
                {submitLabel}
            </Button>
        </div>
    );
}
