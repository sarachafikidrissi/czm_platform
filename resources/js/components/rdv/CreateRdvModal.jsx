import { useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { rdvToastFr } from '@/lib/proposition-toast-messages';

const DEFAULT_REGLE =
    "Les deux profils s'engagent à respecter les règles de bienséance et de respect mutuel lors de ce rendez-vous.";

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {number} props.propositionId
 * @param {() => void} [props.onSuccess]  Called after successful creation to update parent state
 */
export default function CreateRdvModal({ open, onClose, propositionId, onSuccess }) {
    const { showToast } = useToast();
    const [regle, setRegle] = useState(DEFAULT_REGLE);
    const [message, setMessage] = useState('');
    const [sharePhone, setSharePhone] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleClose = () => {
        if (submitting) return;
        setRegle(DEFAULT_REGLE);
        setMessage('');
        setSharePhone(false);
        setError('');
        onClose();
    };

    const handleSubmit = async () => {
        setError('');
        setSubmitting(true);
        try {
            await axios.post('/staff/rdv', {
                proposition_id: propositionId,
                regle: regle.trim() || DEFAULT_REGLE,
                message: message.trim() || null,
                share_phone: sharePhone,
            });
            showToast(rdvToastFr.createSuccess, undefined, 'success');
            handleClose();
            onSuccess?.();
        } catch (err) {
            const backendMsg = err?.response?.data?.message;
            if (backendMsg === rdvToastFr.createBlockedAlreadyExists) {
                showToast(rdvToastFr.createBlockedAlreadyExists, undefined, 'error');
                setError(rdvToastFr.createBlockedAlreadyExists);
            } else if (backendMsg === rdvToastFr.createBlockedNotBothAccepted) {
                showToast(rdvToastFr.createBlockedNotBothAccepted, undefined, 'error');
                setError(rdvToastFr.createBlockedNotBothAccepted);
            } else {
                showToast(rdvToastFr.createError, undefined, 'error');
                setError(rdvToastFr.createError);
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Créer un RDV</DialogTitle>
                    <DialogDescription>
                        Les deux profils ont accepté la proposition. Créez un rendez-vous pour les mettre en relation.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="rdv-regle">Règles du rendez-vous</Label>
                        <textarea
                            id="rdv-regle"
                            value={regle}
                            onChange={(e) => setRegle(e.target.value)}
                            rows={3}
                            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                            disabled={submitting}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="rdv-message">Message aux profils</Label>
                        <textarea
                            id="rdv-message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={3}
                            placeholder="Message optionnel pour les deux profils..."
                            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                            disabled={submitting}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Partage du numéro de téléphone</Label>
                        <div className="flex flex-col gap-2">
                            <label className="flex cursor-pointer items-center gap-2 text-sm">
                                <input
                                    type="radio"
                                    name="share_phone"
                                    value="false"
                                    checked={!sharePhone}
                                    onChange={() => setSharePhone(false)}
                                    disabled={submitting}
                                />
                                Non
                            </label>
                            <label className="flex cursor-pointer items-center gap-2 text-sm">
                                <input
                                    type="radio"
                                    name="share_phone"
                                    value="true"
                                    checked={sharePhone}
                                    onChange={() => setSharePhone(true)}
                                    disabled={submitting}
                                />
                                Oui — autoriser l'échange de numéros de téléphone
                            </label>
                        </div>
                    </div>

                    {error && <p className="text-xs text-red-600">{error}</p>}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={handleClose} disabled={submitting}>
                        Annuler
                    </Button>
                    <Button
                        className="bg-rose-800 text-white hover:bg-rose-900"
                        onClick={handleSubmit}
                        disabled={submitting}
                    >
                        {submitting ? 'Envoi...' : 'Envoyer le RDV'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
