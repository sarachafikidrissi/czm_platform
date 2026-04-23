import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChevronRight, Info } from 'lucide-react';
import { propositionToastFr } from '@/lib/proposition-toast-messages';
import { MATCH_PRIMARY } from '@/lib/matchmaking-result-display';

/**
 * @param {object} props
 * @param {{ id: number, name?: string }} props.userA
 * @param {boolean} props.showProposeModal
 * @param {(open: boolean) => void} props.setShowProposeModal
 * @param {object | null} props.proposeMatch
 * @param {string} props.proposeMessage
 * @param {(v: string) => void} props.setProposeMessage
 * @param {boolean} props.sendToReference
 * @param {(v: boolean) => void} props.setSendToReference
 * @param {boolean} props.sendToCompatible
 * @param {(v: boolean) => void} props.setSendToCompatible
 * @param {boolean} props.isSendingProposition
 * @param {string} props.propositionError
 * @param {(e: React.FormEvent) => void} props.handleSendProposition
 * @param {boolean} props.showRequestModal
 * @param {(open: boolean) => void} props.setShowRequestModal
 * @param {object | null} props.requestMatch
 * @param {string} props.requestMessage
 * @param {(v: string) => void} props.setRequestMessage
 * @param {string} props.requestError
 * @param {boolean} props.isSendingRequest
 * @param {(e: React.FormEvent) => void} props.handleSendRequest
 */
export default function MatchmakingProposeRequestModals({
    userA,
    showProposeModal,
    setShowProposeModal,
    proposeMatch,
    proposeMessage,
    setProposeMessage,
    sendToReference,
    setSendToReference,
    sendToCompatible,
    setSendToCompatible,
    isSendingProposition,
    propositionError,
    handleSendProposition,
    showRequestModal,
    setShowRequestModal,
    requestMatch,
    requestMessage,
    setRequestMessage,
    requestError,
    isSendingRequest,
    handleSendRequest,
}) {
    return (
        <>
            <Dialog open={showProposeModal} onOpenChange={setShowProposeModal}>
                <DialogContent className="max-w-lg rounded-xl border border-gray-200 bg-white shadow-xl">
                    <DialogHeader className="space-y-2">
                        <DialogTitle className="text-xl font-semibold" style={{ color: MATCH_PRIMARY }}>
                            Envoyer une proposition
                        </DialogTitle>
                        <DialogDescription className="text-sm text-muted-foreground">
                            Cette proposition sera envoyée aux profils sélectionnés.
                        </DialogDescription>
                    </DialogHeader>
                    {proposeMatch &&
                        (Boolean(proposeMatch.user_a_has_active_proposition) ||
                            Boolean(proposeMatch.compatible_user_has_active_proposition)) && (
                            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                                <p>
                                    {proposeMatch.user_a_has_active_proposition &&
                                    proposeMatch.compatible_user_has_active_proposition
                                        ? 'Les deux profils ont déjà une proposition active. Annulez-en une depuis la liste avant d’en envoyer une nouvelle.'
                                        : propositionToastFr.sendBlockedActive}
                                </p>
                                <a
                                    href="/staff/matchmaker/propositions"
                                    className="mt-1 inline-block font-medium text-amber-900 underline underline-offset-2"
                                >
                                    Ouvrir la liste des propositions
                                </a>
                            </div>
                        )}
                    <form onSubmit={handleSendProposition} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="proposition-message-shared" className="text-sm font-normal text-foreground">
                                Message
                            </Label>
                            <textarea
                                id="proposition-message-shared"
                                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                rows={4}
                                value={proposeMessage}
                                onChange={(event) => setProposeMessage(event.target.value)}
                                placeholder="Écrire un message pour la proposition..."
                                required
                            />
                        </div>
                        <div className="space-y-3">
                            <Label className="text-sm font-normal text-foreground">Destinataires</Label>
                            <div className="flex flex-col gap-3">
                                <label
                                    htmlFor="send-to-reference-shared"
                                    className={`flex items-start gap-3 space-x-0 ${proposeMatch?.user_a_has_active_proposition ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                                >
                                    <Checkbox
                                        id="send-to-reference-shared"
                                        checked={sendToReference}
                                        disabled={Boolean(proposeMatch?.user_a_has_active_proposition)}
                                        onCheckedChange={(value) => setSendToReference(Boolean(value))}
                                        className="mt-0.5 border-gray-300 data-[state=checked]:border-[#8B2635] data-[state=checked]:bg-[#8B2635] data-[state=checked]:text-white"
                                    />
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-sm font-normal text-foreground">Envoyer au profil de référence</span>
                                        <span className="text-xs text-muted-foreground">{userA?.name}</span>
                                    </div>
                                </label>
                                <label
                                    htmlFor="send-to-compatible-shared"
                                    className={`flex items-start gap-3 space-x-0 ${proposeMatch?.compatible_user_has_active_proposition ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                                >
                                    <Checkbox
                                        id="send-to-compatible-shared"
                                        checked={sendToCompatible}
                                        disabled={Boolean(proposeMatch?.compatible_user_has_active_proposition)}
                                        onCheckedChange={(value) => setSendToCompatible(Boolean(value))}
                                        className="mt-0.5 border-gray-300 data-[state=checked]:border-[#8B2635] data-[state=checked]:bg-[#8B2635] data-[state=checked]:text-white"
                                    />
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-sm font-normal text-foreground">Envoyer au profil compatible</span>
                                        <span className="text-xs text-muted-foreground">{proposeMatch?.user?.name}</span>
                                    </div>
                                </label>
                            </div>
                        </div>
                        {propositionError && <div className="text-sm text-destructive">{propositionError}</div>}
                        <DialogFooter className="flex justify-end gap-2 sm:gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                className="rounded-lg border-gray-200 bg-white text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                onClick={() => setShowProposeModal(false)}
                            >
                                Annuler
                            </Button>
                            <Button
                                type="submit"
                                className="inline-flex items-center gap-2 rounded-lg text-white hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
                                style={{ backgroundColor: MATCH_PRIMARY }}
                                disabled={
                                    isSendingProposition ||
                                    Boolean(proposeMatch?.user_a_has_active_proposition) ||
                                    Boolean(proposeMatch?.compatible_user_has_active_proposition) ||
                                    (!sendToReference && !sendToCompatible)
                                }
                            >
                                {isSendingProposition ? 'Envoi...' : 'Envoyer la proposition'}
                                {!isSendingProposition && <ChevronRight className="h-4 w-4" />}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={showRequestModal} onOpenChange={setShowRequestModal}>
                <DialogContent className="max-w-lg rounded-xl border border-gray-200 bg-white shadow-xl">
                    <DialogHeader className="space-y-2">
                        <DialogTitle className="text-xl font-semibold" style={{ color: MATCH_PRIMARY }}>
                            Demande de propositions
                        </DialogTitle>
                        <DialogDescription className="text-sm text-muted-foreground">
                            Envoyez un message au matchmaker assigné au profil compatible.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSendRequest} className="space-y-6">
                        <div className="flex items-start gap-3 rounded-lg bg-[#8B2635]/10 px-4 py-3">
                            <span
                                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#8B2635] text-white"
                                aria-hidden
                            >
                                <Info className="h-3.5 w-3.5" />
                            </span>
                            <p className="text-sm leading-snug" style={{ color: '#7a2230' }}>
                                Profil compatible : <span className="font-semibold">{requestMatch?.user?.name}</span>
                                {' • '}
                                Matchmaker :{' '}
                                <span className="font-semibold">{requestMatch?.assigned_matchmaker?.name || 'N/A'}</span>
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="request-message-shared" className="text-sm font-normal text-foreground">
                                Message
                            </Label>
                            <textarea
                                id="request-message-shared"
                                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                rows={4}
                                value={requestMessage}
                                onChange={(event) => setRequestMessage(event.target.value)}
                                placeholder="Écrire un message pour la demande..."
                                required
                            />
                        </div>
                        {requestError && <div className="text-sm text-destructive">{requestError}</div>}
                        <DialogFooter className="flex justify-end gap-2 sm:gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                className="rounded-lg border-gray-200 bg-white text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                onClick={() => setShowRequestModal(false)}
                            >
                                Annuler
                            </Button>
                            <Button
                                type="submit"
                                className="inline-flex items-center gap-2 rounded-lg text-white hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
                                style={{ backgroundColor: MATCH_PRIMARY }}
                                disabled={isSendingRequest}
                            >
                                {isSendingRequest ? 'Envoi...' : 'Envoyer'}
                                {!isSendingRequest && <ChevronRight className="h-4 w-4" />}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
