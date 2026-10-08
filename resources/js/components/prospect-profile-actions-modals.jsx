import { Alert, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
    DOCUMENT_TYPE_OPTIONS,
    getDocumentExample,
    getDocumentLabel,
    getProspectProfilePicture,
} from '@/hooks/use-prospect-profile-actions';
import { router } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowRightLeft,
    Check,
    CheckCircle,
    Copy,
    Eye,
    EyeOff,
    KeyRound,
    Pencil,
    Phone,
    RefreshCw,
    XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const PACK_ADVANTAGES = [
    'Suivi et accompagnement personnalisé',
    'Suivi et accompagnement approfondi',
    'Suivi et accompagnement premium',
    'Suivi et accompagnement exclusif avec assistance personnalisée',
    'Rendez-vous avec des profils compatibles',
    'Rendez-vous avec des profils correspondant à vos attentes',
    'Rendez-vous avec des profils soigneusement sélectionnés',
    'Rendez-vous illimités avec des profils rigoureusement sélectionnés',
    'Formations pré-mariage avec le profil choisi',
    'Formations pré-mariage avancées avec le profil choisi',
    'Accès prioritaire aux nouveaux profils',
    'Accès prioritaire aux profils VIP',
    'Réduction à vie sur les séances de conseil conjugal et coaching familial (-10% à -25%)',
];

export function ProspectProfileActionsModals({
    services = [],
    matrimonialPacks = [],
    data,
    setData,
    processing,
    errors,
    validatingProspect,
    cinConfirm,
    setCinConfirm,
    cinConfirmError,
    setCinConfirmError,
    rejectDialogOpen,
    setRejectDialogOpen,
    rejectionReason,
    setRejectionReason,
    rejecting,
    selectedProspectForReject,
    acceptDialogOpen,
    setAcceptDialogOpen,
    acceptanceReason,
    setAcceptanceReason,
    accepting,
    selectedProspectForAccept,
    userInfoModalOpen,
    setUserInfoModalOpen,
    selectedUserForInfo,
    passwordDialogOpen,
    setPasswordDialogOpen,
    passwordOld,
    showOldPassword,
    setShowOldPassword,
    passwordNew,
    setPasswordNew,
    passwordConfirm,
    setPasswordConfirm,
    passwordSubmitting,
    passwordErrors,
    transferDialogOpen,
    setTransferDialogOpen,
    selectedProspectForTransfer,
    matchmakers,
    selectedMatchmakerId,
    setSelectedMatchmakerId,
    transferReason,
    setTransferReason,
    loadingMatchmakers,
    matchmakersError,
    transferring,
    canRejectProspect,
    canValidateProspect,
    canEditProspectProfile,
    canAcceptProspect,
    canTransferUser,
    canDeactivateAccount,
    canMarkAsRappeler,
    handleReject,
    submitRejection,
    handleAccept,
    submitAcceptance,
    handleMarkAsRappeler,
    handleToggleTraite,
    handleCopyLink,
    openPasswordDialog,
    handleUpdatePassword,
    handleViewProfile,
    handleTransferClick,
    loadMatchmakersForTransfer,
    handleTransferSubmit,
    handleValidateClick,
    submitValidation,
    closeValidationDialog,
    closePasswordDialog,
}) {
    const { t } = useTranslation();
    const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
    const [deactivationReason, setDeactivationReason] = useState('');
    const [deactivating, setDeactivating] = useState(false);
    const [prospectToDeactivate, setProspectToDeactivate] = useState(null);

    return (
        <>
            <Dialog open={!!validatingProspect} onOpenChange={(open) => !open && closeValidationDialog()}>
                <DialogContent className="overflow-y-auto sm:max-h-[90vh] sm:w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Validate Prospect</DialogTitle>
                        <DialogDescription>Complete validation for {validatingProspect?.name}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-2">
                        <div className="grid gap-2">
                            <Label htmlFor="document_type">Document Type</Label>
                            <Select value={data.document_type || 'cin'} onValueChange={(value) => setData('document_type', value)}>
                                <SelectTrigger className="h-9 w-full">
                                    <SelectValue placeholder="Select document type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {DOCUMENT_TYPE_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="cin">
                                {getDocumentLabel(data.document_type)} {!validatingProspect?.profile?.cin && '*'}
                                {validatingProspect?.profile?.cin && (
                                    <span className="text-muted-foreground ml-2 text-xs">(Déjà rempli par le prospect)</span>
                                )}
                            </Label>
                            {validatingProspect?.profile?.cin ? (
                                <Input id="cin" value={data.cin} onChange={(e) => setData('cin', e.target.value)} />
                            ) : (
                                <Input
                                    id="cin"
                                    value={data.cin}
                                    onChange={(e) => {
                                        setData('cin', e.target.value);
                                        setCinConfirmError(null);
                                    }}
                                    placeholder={getDocumentExample(data.document_type)}
                                    autoComplete="off"
                                />
                            )}
                            {errors.cin && <p className="text-error text-sm">{errors.cin}</p>}
                        </div>
                        {!validatingProspect?.profile?.cin && (
                            <div className="grid gap-2">
                                <Label htmlFor="cin_confirm">Confirmer {getDocumentLabel(data.document_type)} *</Label>
                                <Input
                                    id="cin_confirm"
                                    value={cinConfirm}
                                    onChange={(e) => {
                                        setCinConfirm(e.target.value);
                                        setCinConfirmError(null);
                                    }}
                                    placeholder={getDocumentExample(data.document_type)}
                                    autoComplete="off"
                                />
                                {cinConfirmError && <p className="text-error text-sm">{cinConfirmError}</p>}
                            </div>
                        )}
                        <div className="grid gap-2">
                            <Label htmlFor="front">
                                Identity Card Front {!validatingProspect?.profile?.identity_card_front_path && '*'}
                                {validatingProspect?.profile?.identity_card_front_path && (
                                    <span className="text-muted-foreground ml-2 text-xs">(Déjà téléchargée - vous pouvez la remplacer)</span>
                                )}
                            </Label>
                            {validatingProspect?.profile?.identity_card_front_path ? (
                                <div className="space-y-2">
                                    <div className="border-border bg-muted relative overflow-hidden rounded-lg border-2">
                                        {data.identity_card_front ? (
                                            <img
                                                src={URL.createObjectURL(data.identity_card_front)}
                                                alt="Nouvelle CNI Front Preview"
                                                className="h-auto max-h-48 w-full object-cover"
                                            />
                                        ) : (
                                            <img
                                                src={`/storage/${validatingProspect.profile.identity_card_front_path}`}
                                                alt="CNI Front Preview"
                                                className="h-auto max-h-48 w-full object-cover"
                                                onError={(e) => {
                                                    e.target.onerror = null;
                                                    e.target.src =
                                                        'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="150"%3E%3Crect fill="%23e5e7eb" width="200" height="150"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle" fill="%239ca3af" font-family="Arial" font-size="14"%3EImage non disponible%3C/text%3E%3C/svg%3E';
                                                }}
                                            />
                                        )}
                                    </div>
                                    {!data.identity_card_front && (
                                        <a
                                            href={`/storage/${validatingProspect.profile.identity_card_front_path}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary inline-block text-xs hover:underline"
                                        >
                                            Ouvrir dans un nouvel onglet
                                        </a>
                                    )}
                                    {data.identity_card_front && (
                                        <p className="text-success text-xs">✓ Nouvelle image sélectionnée: {data.identity_card_front.name}</p>
                                    )}
                                    <Input
                                        id="front"
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => e.target.files?.[0] && setData('identity_card_front', e.target.files[0])}
                                        className="mt-2"
                                    />
                                    {data.identity_card_front && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setData('identity_card_front', null)}
                                            className="w-full"
                                        >
                                            Annuler le remplacement
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <Input
                                    id="front"
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => e.target.files?.[0] && setData('identity_card_front', e.target.files[0])}
                                />
                            )}
                            {errors.identity_card_front && <p className="text-error text-sm">{errors.identity_card_front}</p>}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="service">Service</Label>
                            <Select value={data.service_id} onValueChange={(v) => setData('service_id', v)}>
                                <SelectTrigger className="h-9 w-full">
                                    <SelectValue placeholder="Choose a service" />
                                </SelectTrigger>
                                <SelectContent>
                                    {services.map((s) => (
                                        <SelectItem key={s.id} value={String(s.id)}>
                                            {s.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.service_id && <p className="text-error text-sm">{errors.service_id}</p>}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="matrimonial_pack">Matrimonial Pack</Label>
                            <Select value={data.matrimonial_pack_id} onValueChange={(v) => setData('matrimonial_pack_id', v)}>
                                <SelectTrigger className="h-9 w-full">
                                    <SelectValue placeholder="Choose a pack" />
                                </SelectTrigger>
                                <SelectContent>
                                    {matrimonialPacks.map((pack) => (
                                        <SelectItem key={pack.id} value={String(pack.id)}>
                                            {pack.name} - {pack.duration} mois
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.matrimonial_pack_id && <p className="text-error text-sm">{errors.matrimonial_pack_id}</p>}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="pack_price">Pack Price (MAD)</Label>
                            <Input
                                id="pack_price"
                                type="number"
                                value={data.pack_price}
                                onChange={(e) => setData('pack_price', e.target.value)}
                                placeholder="Enter price"
                            />
                            {errors.pack_price && <p className="text-error text-sm">{errors.pack_price}</p>}
                        </div>
                        <div className="grid gap-2">
                            <Label>Pack Advantages</Label>
                            <div className="grid max-h-40 gap-2 overflow-y-auto rounded border p-2">
                                {PACK_ADVANTAGES.map((advantage) => (
                                    <label key={advantage} className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={data.pack_advantages.includes(advantage)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setData('pack_advantages', [...data.pack_advantages, advantage]);
                                                } else {
                                                    setData(
                                                        'pack_advantages',
                                                        data.pack_advantages.filter((a) => a !== advantage),
                                                    );
                                                }
                                            }}
                                        />
                                        <span className="text-sm">{advantage}</span>
                                    </label>
                                ))}
                            </div>
                            {errors.pack_advantages && <p className="text-error text-sm">{errors.pack_advantages}</p>}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="payment_mode">Mode de Paiement</Label>
                            <Select value={data.payment_mode} onValueChange={(v) => setData('payment_mode', v)}>
                                <SelectTrigger className="h-9 w-full">
                                    <SelectValue placeholder="Choisir un mode de paiement" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Virement">Virement</SelectItem>
                                    <SelectItem value="Caisse agence">Caisse agence</SelectItem>
                                    <SelectItem value="Chèque">Chèque</SelectItem>
                                    <SelectItem value="CMI">CMI</SelectItem>
                                    <SelectItem value="TPE">TPE</SelectItem>
                                    <SelectItem value="Avance">Avance</SelectItem>
                                    <SelectItem value="Reliquat">Reliquat</SelectItem>
                                    <SelectItem value="RDV">RDV</SelectItem>
                                </SelectContent>
                            </Select>
                            {errors.payment_mode && <p className="text-sm text-red-500">{errors.payment_mode}</p>}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea
                                id="notes"
                                value={data.notes}
                                onChange={(e) => setData('notes', e.target.value)}
                                placeholder="Add your notes about this prospect..."
                            />
                            {errors.notes && <p className="text-sm text-red-500">{errors.notes}</p>}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="contact_type">Type de contact</Label>
                            <Select value={data.contact_type} onValueChange={(v) => setData('contact_type', v)}>
                                <SelectTrigger className="h-9 w-full">
                                    <SelectValue placeholder="Sélectionnez le type de contact (optionnel)" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="distance">À distance</SelectItem>
                                    <SelectItem value="presentiel">Présentiel</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={closeValidationDialog}>
                            Cancel
                        </Button>
                        <Button onClick={submitValidation} disabled={processing}>
                            {validatingProspect?.status === 'prospect' ? 'Validate & Assign' : 'Update Validation Info'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rejeter le prospect</DialogTitle>
                        <DialogDescription>
                            Veuillez fournir une raison pour le rejet de {selectedProspectForReject?.name || 'ce prospect'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="rejection-reason">Raison du rejet *</Label>
                            <Textarea
                                id="rejection-reason"
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="Expliquez pourquoi vous rejetez ce prospect..."
                                rows={4}
                                required
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                            Annuler
                        </Button>
                        <Button variant="destructive" onClick={submitRejection} disabled={!rejectionReason.trim() || rejecting}>
                            {rejecting ? 'Envoi...' : 'Rejeter'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={acceptDialogOpen} onOpenChange={setAcceptDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Accepter le prospect</DialogTitle>
                        <DialogDescription>
                            Veuillez fournir une raison pour l'acceptation de {selectedProspectForAccept?.name || 'ce prospect'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {selectedProspectForAccept?.rejection_reason && (
                            <div className="bg-error-light border-error rounded-lg border p-3">
                                <p className="mb-2 text-sm font-semibold">Raison du rejet précédent:</p>
                                <p className="text-error text-sm">{selectedProspectForAccept.rejection_reason}</p>
                            </div>
                        )}
                        <div className="grid gap-2">
                            <Label htmlFor="acceptance-reason">Raison de l'acceptation *</Label>
                            <Textarea
                                id="acceptance-reason"
                                value={acceptanceReason}
                                onChange={(e) => setAcceptanceReason(e.target.value)}
                                placeholder="Expliquez pourquoi vous acceptez ce prospect..."
                                rows={4}
                                required
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAcceptDialogOpen(false)}>
                            Annuler
                        </Button>
                        <Button
                            variant="default"
                            onClick={submitAcceptance}
                            disabled={!acceptanceReason.trim() || accepting}
                            className="bg-success hover:opacity-90"
                        >
                            {accepting ? 'Envoi...' : 'Accepter'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={userInfoModalOpen} onOpenChange={setUserInfoModalOpen}>
                <DialogContent className="max-h-[90vh] w-[95vw] overflow-y-auto rounded-2xl border border-slate-200/70 bg-white p-5 shadow-2xl sm:w-full sm:max-w-md sm:p-6">
                    {selectedUserForInfo && (
                        <>
                            <div className="flex items-center justify-between">
                                <DialogTitle className="text-lg font-semibold text-slate-900">Gestion du Profil</DialogTitle>
                            </div>
                            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                                <div className="relative">
                                    <img
                                        src={getProspectProfilePicture(selectedUserForInfo)}
                                        alt={selectedUserForInfo.name}
                                        className="h-12 w-12 rounded-full object-cover"
                                        onError={(e) => {
                                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUserForInfo.name)}&background=random`;
                                        }}
                                    />
                                    <span className="absolute right-0 bottom-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
                                </div>
                                <div>
                                    <div className="text-sm font-semibold text-slate-900">{selectedUserForInfo.name}</div>
                                    <div className="text-muted-foreground text-xs">
                                        <span className="text-md font-bold">Email : </span>
                                        {selectedUserForInfo.email}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 space-y-2">
                                <button
                                    type="button"
                                    className="flex w-full items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
                                    onClick={() => {
                                        setUserInfoModalOpen(false);
                                        handleViewProfile();
                                    }}
                                    disabled={!selectedUserForInfo?.username}
                                >
                                    <Eye className="h-4 w-4 text-rose-700" />
                                    Voir les détails
                                </button>
                                {canEditProspectProfile(selectedUserForInfo) && (
                                    <button
                                        type="button"
                                        className="flex w-full items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
                                        onClick={() => {
                                            setUserInfoModalOpen(false);
                                            router.visit(`/staff/prospects/${selectedUserForInfo.id}/profile/edit`);
                                        }}
                                    >
                                        <Pencil className="h-4 w-4 text-rose-700" />
                                        Éditer le profil
                                    </button>
                                )}
                                <button
                                    type="button"
                                    className="flex w-full items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
                                    onClick={() => {
                                        setUserInfoModalOpen(false);
                                        handleToggleTraite(selectedUserForInfo);
                                    }}
                                >
                                    <Check className="h-4 w-4 text-rose-700" />
                                    {selectedUserForInfo.is_traite ? 'Marquer comme non traité' : 'Marquer comme traité'}                                </button>
                                {canValidateProspect(selectedUserForInfo) && (
                                    <button
                                        type="button"
                                        className="flex w-full items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
                                        onClick={() => {
                                            setUserInfoModalOpen(false);
                                            handleValidateClick(selectedUserForInfo);
                                        }}
                                    >
                                        <CheckCircle className="h-4 w-4 text-rose-700" />
                                        Valider
                                    </button>
                                )}
                                {canRejectProspect(selectedUserForInfo) && (
                                    <button
                                        type="button"
                                        className="flex w-full items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
                                        onClick={() => {
                                            setUserInfoModalOpen(false);
                                            handleReject(selectedUserForInfo);
                                        }}
                                    >
                                        <XCircle className="h-4 w-4 text-rose-700" />
                                        Rejeter
                                    </button>
                                )}
                                {canAcceptProspect(selectedUserForInfo) && (
                                    <button
                                        type="button"
                                        className="flex w-full items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
                                        onClick={() => {
                                            setUserInfoModalOpen(false);
                                            handleAccept(selectedUserForInfo);
                                        }}
                                    >
                                        <CheckCircle className="h-4 w-4 text-rose-700" />
                                        Réactiver le prospect
                                    </button>
                                )}
                                {canMarkAsRappeler(selectedUserForInfo) && !selectedUserForInfo.to_rappeler && (
                                    <button
                                        type="button"
                                        className="flex w-full items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
                                        onClick={() => {
                                            setUserInfoModalOpen(false);
                                            handleMarkAsRappeler(selectedUserForInfo);
                                        }}
                                    >
                                        <Phone className="h-4 w-4 text-rose-700" />
                                        Rappeler
                                    </button>
                                )}
                                {canTransferUser(selectedUserForInfo) && (
                                    <button
                                        type="button"
                                        className="flex w-full items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
                                        onClick={() => {
                                            setUserInfoModalOpen(false);
                                            handleTransferClick(selectedUserForInfo);
                                        }}
                                    >
                                        <ArrowRightLeft className="h-4 w-4 text-rose-700" />
                                        Transférer le dossier
                                    </button>
                                )}
                                <button
                                    type="button"
                                    className="flex w-full items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
                                    onClick={() => {
                                        openPasswordDialog();
                                    }}
                                >
                                    <KeyRound className="h-4 w-4 text-rose-700" />
                                    Changer le mot de passe
                                </button>
                                <button
                                    type="button"
                                    className="flex w-full items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
                                    onClick={() => {
                                        setUserInfoModalOpen(false);
                                        handleCopyLink();
                                    }}
                                    disabled={!selectedUserForInfo?.username}
                                >
                                    <Copy className="h-4 w-4 text-rose-700" />
                                    Copier le lien
                                </button>
                                {canDeactivateAccount?.(selectedUserForInfo) && (
                                    <button
                                        type="button"
                                        className="flex w-full items-center gap-3 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-100"
                                        onClick={() => {
                                            setProspectToDeactivate(selectedUserForInfo);
                                            setDeactivationReason('');
                                            setUserInfoModalOpen(false);
                                            setDeactivateDialogOpen(true);
                                        }}
                                    >
                                        <XCircle className="h-4 w-4" />
                                        Désactiver le compte
                                    </button>
                                )}
                            </div>

                            <DialogFooter className="flex justify-end">
                                <Button variant="outline" onClick={() => setUserInfoModalOpen(false)}>
                                    {t('common.cancel')}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Désactiver le compte</DialogTitle>
                        <DialogDescription>
                            Vous êtes sur le point de désactiver le compte de {prospectToDeactivate?.name}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="prospect-deactivation-reason">Raison *</Label>
                            <Textarea
                                id="prospect-deactivation-reason"
                                value={deactivationReason}
                                onChange={(e) => setDeactivationReason(e.target.value)}
                                placeholder="Raison de la désactivation..."
                                rows={4}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeactivateDialogOpen(false)}>
                            Annuler
                        </Button>
                        <Button
                            variant="destructive"
                            disabled={!deactivationReason.trim() || deactivating}
                            onClick={() => {
                                if (!prospectToDeactivate || !deactivationReason.trim()) return;
                                setDeactivating(true);
                                router.post(`/staff/users/${prospectToDeactivate.id}/deactivate`, {
                                    reason: deactivationReason,
                                }, {
                                    onSuccess: () => {
                                        setDeactivateDialogOpen(false);
                                        setDeactivationReason('');
                                        setProspectToDeactivate(null);
                                        setDeactivating(false);
                                    },
                                    onError: () => {
                                        setDeactivating(false);
                                    },
                                });
                            }}
                        >
                            {deactivating ? 'Désactivation...' : 'Désactiver'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={passwordDialogOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        closePasswordDialog();
                    } else {
                        setPasswordDialogOpen(true);
                    }
                }}
            >
                <DialogContent className="w-[95vw] rounded-2xl border border-slate-200/70 bg-white p-5 shadow-2xl sm:w-full sm:max-w-md sm:p-6">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold text-slate-900">Changer le mot de passe</DialogTitle>
                        <DialogDescription className="text-sm text-slate-500">
                            Le mot de passe actuel est affiché ci-dessous si disponible. Saisissez le nouveau mot de passe (l'ancien n'est pas
                            requis).
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="password-old">Ancien mot de passe (affiché à titre informatif)</Label>
                            <div className="relative">
                                <Input
                                    id="password-old"
                                    type={showOldPassword ? 'text' : 'password'}
                                    value={passwordOld}
                                    readOnly
                                    placeholder={passwordOld ? undefined : 'Non disponible'}
                                    className="rounded-xl border-slate-200 bg-slate-50 pr-10"
                                    autoComplete="off"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute top-0 right-0 h-full rounded-l-none rounded-r-xl px-3 py-2 hover:bg-transparent"
                                    onClick={() => setShowOldPassword(!showOldPassword)}
                                    disabled={passwordSubmitting}
                                    aria-label={showOldPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                                >
                                    {showOldPassword ? <EyeOff className="h-4 w-4 text-slate-500" /> : <Eye className="h-4 w-4 text-slate-500" />}
                                </Button>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="password-new">Nouveau mot de passe</Label>
                            <Input
                                id="password-new"
                                type="password"
                                value={passwordNew}
                                onChange={(e) => setPasswordNew(e.target.value)}
                                placeholder="••••••••"
                                className="rounded-xl border-slate-200"
                                autoComplete="new-password"
                            />
                            {passwordErrors?.password && (
                                <p className="text-xs text-red-600">
                                    {Array.isArray(passwordErrors.password) ? passwordErrors.password[0] : passwordErrors.password}
                                </p>
                            )}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="password-confirm">Confirmer le mot de passe</Label>
                            <Input
                                id="password-confirm"
                                type="password"
                                value={passwordConfirm}
                                onChange={(e) => setPasswordConfirm(e.target.value)}
                                placeholder="••••••••"
                                className="rounded-xl border-slate-200"
                                autoComplete="new-password"
                            />
                        </div>
                    </div>
                    <DialogFooter className="flex justify-end gap-2">
                        <Button variant="outline" onClick={closePasswordDialog} className="rounded-xl">
                            {t('common.cancel')}
                        </Button>
                        <Button
                            onClick={handleUpdatePassword}
                            disabled={passwordSubmitting || !passwordNew || !passwordConfirm}
                            className="rounded-xl bg-rose-700 text-white hover:bg-rose-800"
                        >
                            {passwordSubmitting ? 'Enregistrement...' : 'Mettre à jour le mot de passe'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Transférer {selectedProspectForTransfer?.name || "l'utilisateur"}</DialogTitle>
                        <DialogDescription>Sélectionnez le matchmaker vers lequel vous souhaitez transférer cet utilisateur</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="matchmaker">Matchmaker *</Label>
                            {loadingMatchmakers ? (
                                <div className="text-muted-foreground text-sm">Chargement des matchmakers...</div>
                            ) : matchmakersError ? (
                                <Alert variant="default" className="border-amber-200 bg-amber-50">
                                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                                    <div className="flex w-full items-center justify-between gap-4">
                                        <div>
                                            <AlertTitle className="text-amber-800">
                                                Impossible de charger la liste des matchmakers.
                                            </AlertTitle>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="flex-shrink-0 border-amber-400 text-amber-800 hover:bg-amber-100"
                                            onClick={loadMatchmakersForTransfer}
                                            disabled={loadingMatchmakers}
                                        >
                                            <RefreshCw className="mr-1.5 size-3.5" />
                                            Réessayer
                                        </Button>
                                    </div>
                                </Alert>
                            ) : matchmakers.length === 0 ? (
                                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                                    Aucun matchmaker disponible pour le transfert.
                                </div>
                            ) : (
                                <Select value={selectedMatchmakerId} onValueChange={setSelectedMatchmakerId}>
                                    <SelectTrigger className="h-9 w-full">
                                        <SelectValue placeholder="Sélectionnez un matchmaker" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {matchmakers.map((matchmaker) => (
                                            <SelectItem key={matchmaker.id} value={String(matchmaker.id)}>
                                                {matchmaker.name} {matchmaker.agency ? `(${matchmaker.agency.name})` : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="transfer-reason">Raison du transfert (optionnel)</Label>
                            <Textarea
                                id="transfer-reason"
                                value={transferReason}
                                onChange={(e) => setTransferReason(e.target.value)}
                                placeholder="Expliquez pourquoi vous souhaitez transférer cet utilisateur..."
                                rows={4}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>
                            Annuler
                        </Button>
                        <Button
                            onClick={handleTransferSubmit}
                            disabled={!selectedMatchmakerId || transferring || loadingMatchmakers || matchmakersError}
                        >
                            {transferring ? 'Envoi...' : 'Transférer'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
