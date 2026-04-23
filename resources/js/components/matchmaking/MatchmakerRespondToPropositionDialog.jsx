import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { propositionToastFr } from '@/lib/proposition-toast-messages';
import { MATCH_PRIMARY } from '@/lib/matchmaking-result-display';

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {(open: boolean) => void} props.onOpenChange
 * @param {number | null} props.propositionId
 * @param {() => void} [props.onSuccess]
 */
export default function MatchmakerRespondToPropositionDialog({ open, onOpenChange, propositionId, onSuccess }) {
    const { showToast } = useToast();
    const [choice, setChoice] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (open && propositionId) {
            setChoice('');
            setMessage('');
            setError('');
        }
    }, [open, propositionId]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!propositionId) return;
        if (!choice) {
            setError('Veuillez sélectionner une réponse.');
            return;
        }
        const trimmed = message.trim();
        if (choice === 'rejected' && !trimmed) {
            setError('Veuillez saisir un motif de refus.');
            return;
        }
        setBusy(true);
        setError('');
        try {
            await axios.post(`/propositions/${propositionId}/respond`, {
                status: choice,
                response_message: trimmed || null,
            });
            showToast(
                choice === 'accepted' ? propositionToastFr.memberAccept : propositionToastFr.memberDecline,
                undefined,
                'success',
            );
            onOpenChange(false);
            onSuccess?.();
        } catch (err) {
            const m = err?.response?.data?.message || '';
            if (m === 'Proposition already responded.') {
                showToast(propositionToastFr.memberAlreadyAnswered, undefined, 'warning');
                setError(propositionToastFr.memberAlreadyAnswered);
            } else if (m === 'Proposition expired.') {
                showToast(propositionToastFr.memberExpired, undefined, 'warning');
                setError(propositionToastFr.memberExpired);
            } else if (m === 'Cette proposition a été annulée.') {
                showToast('Cette proposition a été annulée.', undefined, 'warning');
            } else {
                showToast(propositionToastFr.memberGenericError, undefined, 'error');
                setError(propositionToastFr.memberGenericError);
            }
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg rounded-xl border border-gray-200 bg-white shadow-xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold" style={{ color: MATCH_PRIMARY }}>
                        Réponse pour le membre
                    </DialogTitle>
                    <DialogDescription>
                        Enregistrer une acceptation ou un refus pour cette proposition en tant que matchmaker du destinataire.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Réponse</Label>
                        <div className="flex gap-4">
                            <label className="flex cursor-pointer items-center gap-2 text-sm">
                                <input
                                    type="radio"
                                    name="mm-respond-choice"
                                    checked={choice === 'accepted'}
                                    onChange={() => setChoice('accepted')}
                                    className="h-4 w-4"
                                />
                                Accepter
                            </label>
                            <label className="flex cursor-pointer items-center gap-2 text-sm">
                                <input
                                    type="radio"
                                    name="mm-respond-choice"
                                    checked={choice === 'rejected'}
                                    onChange={() => setChoice('rejected')}
                                    className="h-4 w-4"
                                />
                                Refuser
                            </label>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="mm-respond-msg">Message {choice === 'rejected' ? '(obligatoire si refus)' : ''}</Label>
                        <textarea
                            id="mm-respond-msg"
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                            rows={3}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Message transmis avec la réponse..."
                        />
                    </div>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Fermer
                        </Button>
                        <Button type="submit" disabled={busy} style={{ backgroundColor: MATCH_PRIMARY }} className="text-white">
                            {busy ? 'Envoi...' : 'Enregistrer'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
