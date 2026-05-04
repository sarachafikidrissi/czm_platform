import AppLayout from '@/layouts/app-layout';
import { Head, router, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { rdvToastFr } from '@/lib/proposition-toast-messages';
import axios from 'axios';
import { useState } from 'react';

export default function RdvFeedbackPage() {
    const { showToast } = useToast();
    const { rdv, already_submitted } = usePage().props;

    const [avis, setAvis] = useState('');
    const [feedbackMessage, setFeedbackMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!avis) {
            setError('Veuillez choisir un avis.');
            return;
        }
        setError('');
        setSubmitting(true);
        try {
            await axios.post(`/rdv/${rdv.id}/feedback`, {
                author_role: 'user',
                avis,
                feedback_message: feedbackMessage.trim() || null,
            });
            showToast(rdvToastFr.feedbackSuccess, undefined, 'success');
            router.visit('/mes-rdvs');
        } catch (err) {
            const status = err?.response?.status;
            if (status === 403) {
                showToast(rdvToastFr.feedbackAlreadySubmitted, undefined, 'warning');
            } else {
                showToast(rdvToastFr.feedbackError, undefined, 'error');
                setError(rdvToastFr.feedbackError);
            }
        } finally {
            setSubmitting(false);
        }
    };

    const otherUser =
        rdv.reference_user && rdv.compatible_user
            ? rdv.reference_user
            : null;

    return (
        <AppLayout>
            <Head title="Mon feedback RDV" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4 max-w-xl mx-auto">
                <div>
                    <h1 className="text-2xl font-semibold text-rose-900">Mon feedback</h1>
                    <p className="text-sm text-muted-foreground">
                        Partagez votre ressenti sur le rendez-vous.
                    </p>
                </div>

                {already_submitted ? (
                    <Card className="border border-emerald-100 shadow-sm">
                        <CardContent className="p-6 text-sm text-emerald-700">
                            Vous avez déjà envoyé votre feedback pour ce RDV.
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="border border-rose-100/60 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-base text-rose-900">Votre avis</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="space-y-2">
                                    <Label>Votre avis <span className="text-red-500">*</span></Label>
                                    <div className="flex flex-col gap-2">
                                        <label className="flex cursor-pointer items-center gap-2 text-sm">
                                            <input
                                                type="radio"
                                                name="avis"
                                                value="liked"
                                                checked={avis === 'liked'}
                                                onChange={() => setAvis('liked')}
                                                disabled={submitting}
                                            />
                                            J'ai bien aimé
                                        </label>
                                        <label className="flex cursor-pointer items-center gap-2 text-sm">
                                            <input
                                                type="radio"
                                                name="avis"
                                                value="not_liked"
                                                checked={avis === 'not_liked'}
                                                onChange={() => setAvis('not_liked')}
                                                disabled={submitting}
                                            />
                                            Je n'ai pas aimé
                                        </label>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="feedback-message">Votre commentaire (optionnel)</Label>
                                    <textarea
                                        id="feedback-message"
                                        value={feedbackMessage}
                                        onChange={(e) => setFeedbackMessage(e.target.value)}
                                        rows={4}
                                        placeholder="Partagez votre expérience..."
                                        className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                                        disabled={submitting}
                                    />
                                </div>

                                {error && <p className="text-xs text-red-600">{error}</p>}

                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={submitting}
                                        onClick={() => router.visit('/mes-rdvs')}
                                    >
                                        Retour
                                    </Button>
                                    <Button
                                        type="submit"
                                        className="bg-rose-800 text-white hover:bg-rose-900"
                                        disabled={submitting}
                                    >
                                        {submitting ? 'Envoi...' : 'Envoyer mon feedback'}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}
