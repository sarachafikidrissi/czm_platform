import { useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { rdvToastFr } from '@/lib/proposition-toast-messages';

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {number} props.rdvId
 * @param {() => void} [props.onSuccess]
 */
export default function MatchmakerFeedbackModal({ open, onClose, rdvId, onSuccess }) {
    const { showToast } = useToast();
    const [feedbackMessage, setFeedbackMessage] = useState('');
    const [espaceDeRdv, setEspaceDeRdv] = useState('');
    const [espaceAutreDetail, setEspaceAutreDetail] = useState('');
    const [signeDeRdv, setSigneDeRdv] = useState('');
    const [avisMatchmaker, setAvisMatchmaker] = useState('');
    const [evaluationDeRdv, setEvaluationDeRdv] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState({});

    const resetForm = () => {
        setFeedbackMessage('');
        setEspaceDeRdv('');
        setEspaceAutreDetail('');
        setSigneDeRdv('');
        setAvisMatchmaker('');
        setEvaluationDeRdv('');
        setErrors({});
    };

    const handleClose = () => {
        if (submitting) return;
        resetForm();
        onClose();
    };

    const validate = () => {
        const errs = {};
        if (!espaceDeRdv) errs.espaceDeRdv = 'Ce champ est requis.';
        if (espaceDeRdv === 'autre' && !espaceAutreDetail.trim()) {
            errs.espaceAutreDetail = 'Veuillez préciser l\'espace.';
        }
        if (!signeDeRdv) errs.signeDeRdv = 'Ce champ est requis.';
        return errs;
    };

    const handleSubmit = async () => {
        const errs = validate();
        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            return;
        }
        setErrors({});
        setSubmitting(true);
        try {
            await axios.post(`/rdv/${rdvId}/feedback`, {
                author_role: 'matchmaker',
                feedback_message: feedbackMessage.trim() || null,
                espace_de_rdv: espaceDeRdv,
                espace_autre_detail: espaceDeRdv === 'autre' ? (espaceAutreDetail.trim() || null) : null,
                signe_de_rdv: signeDeRdv,
                avis_matchmaker: avisMatchmaker.trim() || null,
                evaluation_de_rdv: evaluationDeRdv.trim() || null,
            });
            showToast(rdvToastFr.feedbackMatchmakerSuccess, undefined, 'success');
            resetForm();
            onClose();
            onSuccess?.();
        } catch (err) {
            const status = err?.response?.status;
            if (status === 403) {
                showToast(rdvToastFr.feedbackAlreadySubmitted, undefined, 'warning');
            } else {
                showToast(rdvToastFr.feedbackError, undefined, 'error');
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Feedback matchmaker</DialogTitle>
                    <DialogDescription>Renseignez votre retour sur le rendez-vous.</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="mm-feedback-message">Commentaire général</Label>
                        <textarea
                            id="mm-feedback-message"
                            value={feedbackMessage}
                            onChange={(e) => setFeedbackMessage(e.target.value)}
                            rows={3}
                            placeholder="Commentaire général (optionnel)..."
                            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                            disabled={submitting}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Espace de RDV <span className="text-red-500">*</span></Label>
                        <div className="flex flex-col gap-2">
                            {[
                                { value: 'agence', label: 'Agence' },
                                { value: 'espace_public', label: 'Espace public' },
                                { value: 'autre', label: 'Autre' },
                            ].map(({ value, label }) => (
                                <label key={value} className="flex cursor-pointer items-center gap-2 text-sm">
                                    <input
                                        type="radio"
                                        name="espace_de_rdv"
                                        value={value}
                                        checked={espaceDeRdv === value}
                                        onChange={() => setEspaceDeRdv(value)}
                                        disabled={submitting}
                                    />
                                    {label}
                                </label>
                            ))}
                        </div>
                        {errors.espaceDeRdv && <p className="text-xs text-red-600">{errors.espaceDeRdv}</p>}

                        {espaceDeRdv === 'autre' && (
                            <div className="mt-2 space-y-1">
                                <Label htmlFor="espace-autre-detail">Précisez l'espace</Label>
                                <input
                                    id="espace-autre-detail"
                                    type="text"
                                    value={espaceAutreDetail}
                                    onChange={(e) => setEspaceAutreDetail(e.target.value)}
                                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                                    disabled={submitting}
                                />
                                {errors.espaceAutreDetail && <p className="text-xs text-red-600">{errors.espaceAutreDetail}</p>}
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>Signe de RDV <span className="text-red-500">*</span></Label>
                        <div className="flex gap-4">
                            {[
                                { value: 'positif', label: 'Positif' },
                                { value: 'negatif', label: 'Négatif' },
                            ].map(({ value, label }) => (
                                <label key={value} className="flex cursor-pointer items-center gap-2 text-sm">
                                    <input
                                        type="radio"
                                        name="signe_de_rdv"
                                        value={value}
                                        checked={signeDeRdv === value}
                                        onChange={() => setSigneDeRdv(value)}
                                        disabled={submitting}
                                    />
                                    {label}
                                </label>
                            ))}
                        </div>
                        {errors.signeDeRdv && <p className="text-xs text-red-600">{errors.signeDeRdv}</p>}
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="avis-matchmaker">Avis du matchmaker</Label>
                        <textarea
                            id="avis-matchmaker"
                            value={avisMatchmaker}
                            onChange={(e) => setAvisMatchmaker(e.target.value)}
                            rows={3}
                            placeholder="Votre avis sur la rencontre (optionnel)..."
                            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                            disabled={submitting}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="evaluation-de-rdv">Évaluation du RDV</Label>
                        <textarea
                            id="evaluation-de-rdv"
                            value={evaluationDeRdv}
                            onChange={(e) => setEvaluationDeRdv(e.target.value)}
                            rows={3}
                            placeholder="Évaluation globale du rendez-vous (optionnel)..."
                            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                            disabled={submitting}
                        />
                    </div>
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
                        {submitting ? 'Envoi...' : 'Envoyer le feedback'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
