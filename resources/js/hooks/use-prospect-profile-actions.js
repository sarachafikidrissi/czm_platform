import { useToast } from '@/hooks/use-toast';
import { router, useForm } from '@inertiajs/react';
import { useState } from 'react';

export const DOCUMENT_TYPE_OPTIONS = [
    { value: 'cin', label: 'CIN' },
    { value: 'passport', label: 'Passport' },
    { value: 'driver_license', label: 'Driver License' },
];

export const getDocumentLabel = (documentType) => {
    if (documentType === 'passport') return 'Passport';
    if (documentType === 'driver_license') return 'Driver License';
    return 'CIN';
};

export const getDocumentRegex = () => /^[A-Za-z0-9-]{5,20}$/;

export const getDocumentExample = () => 'Ex: AB12345 or B-123456';

export const getProspectProfilePicture = (prospect) => {
    if (prospect?.profile?.profile_picture_path) {
        return `/storage/${prospect.profile.profile_picture_path}`;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(prospect?.name || 'User')}&background=random`;
};

/**
 * Shared prospect profile actions (validate, reject, accept, transfer, password, etc.)
 *
 * @param {{ services?: array, matrimonialPacks?: array, auth?: object, userRole?: string|null }} options
 */
export function useProspectProfileActions({ services = [], matrimonialPacks = [], auth, userRole = null } = {}) {
    const { showToast } = useToast();

    const { data, setData, post, processing, errors, reset } = useForm({
        notes: '',
        contact_type: '',
        document_type: 'cin',
        cin: '',
        identity_card_front: null,
        service_id: '',
        matrimonial_pack_id: '',
        pack_price: '',
        pack_advantages: [],
        payment_mode: '',
    });

    const [validatingProspect, setValidatingProspect] = useState(null);
    const [cinConfirm, setCinConfirm] = useState('');
    const [cinConfirmError, setCinConfirmError] = useState(null);

    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [rejecting, setRejecting] = useState(false);
    const [selectedProspectForReject, setSelectedProspectForReject] = useState(null);

    const [acceptDialogOpen, setAcceptDialogOpen] = useState(false);
    const [acceptanceReason, setAcceptanceReason] = useState('');
    const [accepting, setAccepting] = useState(false);
    const [selectedProspectForAccept, setSelectedProspectForAccept] = useState(null);

    const [userInfoModalOpen, setUserInfoModalOpen] = useState(false);
    const [selectedUserForInfo, setSelectedUserForInfo] = useState(null);

    const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
    const [passwordOld, setPasswordOld] = useState('');
    const [showOldPassword, setShowOldPassword] = useState(false);
    const [passwordNew, setPasswordNew] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [passwordSubmitting, setPasswordSubmitting] = useState(false);
    const [passwordErrors, setPasswordErrors] = useState({});

    const [transferDialogOpen, setTransferDialogOpen] = useState(false);
    const [selectedProspectForTransfer, setSelectedProspectForTransfer] = useState(null);
    const [matchmakers, setMatchmakers] = useState([]);
    const [selectedMatchmakerId, setSelectedMatchmakerId] = useState('');
    const [transferReason, setTransferReason] = useState('');
    const [loadingMatchmakers, setLoadingMatchmakers] = useState(false);
    const [matchmakersError, setMatchmakersError] = useState(false);
    const [transferring, setTransferring] = useState(false);

    const currentUser = auth?.user;
    const userId = currentUser?.id || null;
    const userAgencyId = currentUser?.agency_id || null;

    const canRejectProspect = (prospect) => {
        if (!prospect || prospect.status !== 'prospect' || prospect.rejection_reason) {
            return false;
        }
        if (!userRole || !userId) {
            return false;
        }
        if (userRole === 'admin') {
            return true;
        }
        if (userRole === 'matchmaker') {
            if (prospect.assigned_matchmaker_id === userId) {
                return true;
            }
            if (prospect.agency_id === userAgencyId && prospect.assigned_matchmaker_id === null) {
                return true;
            }
        }
        if (userRole === 'manager') {
            if (prospect.assigned_matchmaker_id === userId) {
                return true;
            }
            if (prospect.agency_id === userAgencyId) {
                return true;
            }
        }
        return false;
    };

    const canValidateProspect = (prospect) => {
        if (!prospect || prospect.status !== 'prospect') {
            return false;
        }
        // Business-rule precondition: must be assigned to a conseiller first (all roles).
        if (!prospect.assigned_matchmaker_id) {
            return false;
        }
        if (!userRole || !userId) {
            return false;
        }
        if (userRole === 'admin') {
            return true;
        }
        if (userRole === 'matchmaker') {
            return prospect.assigned_matchmaker_id === userId;
        }
        if (userRole === 'manager') {
            return prospect.assigned_matchmaker_id === userId;
        }
        return false;
    };

    const canEditProspectProfile = (prospect) => {
        if (!prospect || prospect.status !== 'prospect') {
            return false;
        }
        if (!userRole || !userId) {
            return false;
        }
        if (userRole === 'admin') {
            return true;
        }
        if (userRole === 'matchmaker') {
            return prospect.assigned_matchmaker_id === userId;
        }
        if (userRole === 'manager') {
            if (prospect.assigned_matchmaker_id === userId) {
                return true;
            }
            if (prospect.assigned_matchmaker_id && prospect.assigned_matchmaker_id !== userId) {
                return false;
            }
            return prospect.agency_id === userAgencyId;
        }
        return false;
    };

    const canAcceptProspect = (prospect) => {
        if (!prospect || !prospect.rejection_reason) return false;
        if (!userRole) return false;
        // Mirror server rule: any admin, matchmaker, or manager (no assignment/agency gate).
        if (userRole === 'admin') return true;
        if (userRole === 'matchmaker' || userRole === 'manager') return true;
        return false;
    };

    const canTransferUser = (user) => {
        if (!user || !userRole || !userId) {
            return false;
        }
        if (userRole === 'matchmaker') {
            return user.assigned_matchmaker_id === userId;
        }
        if (userRole === 'manager') {
            if (user.assigned_matchmaker_id === userId) {
                return true;
            }
            return user.agency_id === userAgencyId;
        }
        if (userRole === 'admin') {
            return true;
        }
        return false;
    };

    const idsMatch = (left, right) => left != null && right != null && Number(left) === Number(right);

    const canDeactivateAccount = (prospect) => {
        if (!prospect || prospect.profile?.account_status === 'desactivated') {
            return false;
        }
        if (!userRole) {
            return false;
        }
        if (userRole === 'admin') {
            return true;
        }
        if (userRole === 'matchmaker') {
            return idsMatch(prospect.assigned_matchmaker_id, userId);
        }
        if (userRole === 'manager') {
            return idsMatch(prospect.assigned_matchmaker_id, userId)
                || idsMatch(prospect.validated_by_manager_id, userId);
        }
        return false;
    };

    const canMarkAsRappeler = (prospect) => {
        if (!prospect) return false;
        if (!userRole || !userId) return false;
        if (userRole === 'admin') return true;
        if (userRole === 'matchmaker') {
            if (prospect.assigned_matchmaker_id === userId) return true;
            if (prospect.agency_id === userAgencyId && prospect.assigned_matchmaker_id === null) return true;
        }
        if (userRole === 'manager') {
            if (prospect.assigned_matchmaker_id === userId) return true;
            if (prospect.agency_id === userAgencyId) return true;
        }
        return false;
    };

    const handleReject = (prospect) => {
        setSelectedProspectForReject(prospect);
        setRejectionReason('');
        setRejectDialogOpen(true);
    };

    const submitRejection = () => {
        if (!selectedProspectForReject || !rejectionReason.trim()) return;

        setRejecting(true);
        router.post(
            `/staff/prospects/${selectedProspectForReject.id}/reject`,
            {
                rejection_reason: rejectionReason,
            },
            {
                onSuccess: () => {
                    setRejectDialogOpen(false);
                    setRejectionReason('');
                    setSelectedProspectForReject(null);
                    setRejecting(false);
                },
                onError: () => {
                    setRejecting(false);
                },
            },
        );
    };

    const handleAccept = (prospect) => {
        setSelectedProspectForAccept(prospect);
        setAcceptanceReason('');
        setAcceptDialogOpen(true);
    };

    const submitAcceptance = () => {
        if (!selectedProspectForAccept || !acceptanceReason.trim()) return;

        setAccepting(true);
        router.post(
            `/staff/prospects/${selectedProspectForAccept.id}/accept`,
            {
                acceptance_reason: acceptanceReason,
            },
            {
                onSuccess: () => {
                    setAcceptDialogOpen(false);
                    setAcceptanceReason('');
                    setSelectedProspectForAccept(null);
                    setAccepting(false);
                },
                onError: () => {
                    setAccepting(false);
                },
            },
        );
    };

    const handleMarkAsRappeler = (prospect) => {
        router.post(`/staff/prospects/${prospect.id}/rappeler`, {}, {
            onSuccess: () => {},
            onError: () => {},
        });
    };

    const handleToggleTraite = (prospect) => {
        router.post(
            `/staff/prospects/${prospect.id}/toggle-traite`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    router.reload({
                        only: [
                            'prospects',
                            'untreatedCount',
                            'untreatedSummary',
                            'untreatedUnassigned',
                            'untreatedUnassigned',
                            'untreatedByStaff',
                            'untreatedByAgency',
                        ],
                    });
                },
            },
        );
    };

    const handleOpenActions = (user) => {
        setSelectedUserForInfo(user);
        setUserInfoModalOpen(true);
    };

    const handleCopyLink = () => {
        if (selectedUserForInfo?.username) {
            const profileUrl = `${window.location.origin}/profile/${selectedUserForInfo.username}`;
            navigator.clipboard.writeText(profileUrl).then(() => {});
        }
    };

    const openPasswordDialog = async () => {
        setShowOldPassword(false);
        setPasswordNew('');
        setPasswordConfirm('');
        setPasswordErrors({});
        if (selectedUserForInfo?.id) {
            try {
                const res = await fetch(`/staff/prospects/${selectedUserForInfo.id}/current-password`);
                const responseData = await res.json().catch(() => ({}));
                if (res.ok && responseData.current_password != null) {
                    setPasswordOld(responseData.current_password);
                } else {
                    setPasswordOld('');
                }
            } catch {
                setPasswordOld('');
            }
        } else {
            setPasswordOld('');
        }
        setPasswordDialogOpen(true);
    };

    const handleUpdatePassword = () => {
        setPasswordErrors({});
        if (!passwordNew.trim()) {
            setPasswordErrors({ password: ['Le mot de passe est requis.'] });
            return;
        }
        if (passwordNew !== passwordConfirm) {
            setPasswordErrors({ password: ['Les mots de passe ne correspondent pas.'] });
            return;
        }
        if (passwordNew.length < 8) {
            setPasswordErrors({ password: ['Le mot de passe doit contenir au moins 8 caractères.'] });
            return;
        }
        if (!selectedUserForInfo?.id) return;
        setPasswordSubmitting(true);
        router.put(
            `/staff/prospects/${selectedUserForInfo.id}/password`,
            {
                password: passwordNew,
                password_confirmation: passwordConfirm,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setPasswordDialogOpen(false);
                    setUserInfoModalOpen(false);
                    setPasswordOld('');
                    setShowOldPassword(false);
                    setPasswordNew('');
                    setPasswordConfirm('');
                    setPasswordSubmitting(false);
                    showToast?.('Mot de passe mis à jour', 'Le mot de passe a été modifié avec succès.', 'success');
                },
                onError: (formErrors) => {
                    setPasswordErrors(formErrors);
                    setPasswordSubmitting(false);
                },
            },
        );
    };

    const handleViewProfile = () => {
        if (selectedUserForInfo?.username) {
            window.open(`/profile/${selectedUserForInfo.username}`, '_blank', 'noopener,noreferrer');
        }
    };

    const loadMatchmakersForTransfer = async () => {
        setMatchmakersError(false);
        setLoadingMatchmakers(true);

        try {
            const response = await fetch('/staff/matchmakers-for-transfer');
            if (!response.ok) {
                throw new Error(`Request failed with status ${response.status}`);
            }
            const responseData = await response.json();
            if (!Array.isArray(responseData)) {
                throw new Error('Unexpected response shape from matchmakers-for-transfer');
            }
            setMatchmakers(responseData);
        } catch (error) {
            console.error('Error fetching matchmakers:', error);
            setMatchmakersError(true);
        } finally {
            setLoadingMatchmakers(false);
        }
    };

    const handleTransferClick = async (user) => {
        setSelectedProspectForTransfer(user);
        setSelectedMatchmakerId('');
        setTransferReason('');
        setTransferDialogOpen(true);
        await loadMatchmakersForTransfer();
    };

    const handleTransferSubmit = () => {
        if (!selectedProspectForTransfer || !selectedMatchmakerId) {
            return;
        }

        setTransferring(true);
        router.post(
            '/staff/transfer-requests',
            {
                user_id: selectedProspectForTransfer.id,
                to_matchmaker_id: selectedMatchmakerId,
                reason: transferReason,
            },
            {
                onSuccess: () => {
                    setTransferDialogOpen(false);
                    setSelectedProspectForTransfer(null);
                    setSelectedMatchmakerId('');
                    setTransferReason('');
                    setTransferring(false);
                },
                onError: () => {
                    setTransferring(false);
                },
            },
        );
    };

    const handleValidateClick = (prospect) => {
        setValidatingProspect(prospect);
        setCinConfirm('');
        setCinConfirmError(null);

        const profile = prospect.profile;

        if (profile) {
            setData('document_type', profile.document_type || 'cin');
            if (profile.cin && profile.cin_decrypted) {
                setData('cin', profile.cin_decrypted);
            } else {
                setData('cin', '');
            }

            setData('notes', profile.notes || '');
            setData('service_id', profile.service_id ? String(profile.service_id) : '');
            setData('matrimonial_pack_id', profile.matrimonial_pack_id ? String(profile.matrimonial_pack_id) : '');
            setData('pack_price', profile.pack_price || '');
            setData('pack_advantages', profile.pack_advantages || []);
            setData('payment_mode', profile.payment_mode || '');
        }
    };

    const submitValidation = () => {
        const hasExistingCin = validatingProspect?.profile?.cin;
        const hasExistingFront = validatingProspect?.profile?.identity_card_front_path;
        const needsCin = !hasExistingCin;
        const needsFront = !hasExistingFront;
        const documentRegex = getDocumentRegex();

        if (
            (needsCin && (!data.cin || !documentRegex.test(data.cin.trim()))) ||
            (needsFront && !data.identity_card_front) ||
            !data.service_id ||
            !data.matrimonial_pack_id ||
            !data.pack_price ||
            !data.payment_mode ||
            data.pack_advantages.length === 0
        ) {
            showToast('Champs requis', 'Please fill in all required fields', 'warning');
            return;
        }

        if (needsCin) {
            if (!cinConfirm || cinConfirm.trim() === '') {
                setCinConfirmError(`Confirmation du ${getDocumentLabel(data.document_type)} requise`);
                return;
            }
            if (data.cin.trim().toUpperCase() !== cinConfirm.trim().toUpperCase()) {
                setCinConfirmError(`Les numéros ${getDocumentLabel(data.document_type)} ne correspondent pas`);
                return;
            }
            setCinConfirmError(null);
        }

        post(`/staff/prospects/${validatingProspect?.id}/validate`, {
            forceFormData: true,
            onError: (err) => {
                console.error('Validation error:', err);
                showToast('Erreur de validation', 'Validation failed: ' + (err.message || 'Please check all fields'), 'error');
            },
            onSuccess: () => {
                setValidatingProspect(null);
                setCinConfirm('');
                setCinConfirmError(null);
                reset();
            },
        });
    };

    const closeValidationDialog = () => {
        setValidatingProspect(null);
        setCinConfirm('');
        setCinConfirmError(null);
        reset();
    };

    const closePasswordDialog = () => {
        setPasswordDialogOpen(false);
        setPasswordOld('');
        setShowOldPassword(false);
        setPasswordNew('');
        setPasswordConfirm('');
        setPasswordErrors({});
    };

    return {
        services,
        matrimonialPacks,
        data,
        setData,
        post,
        processing,
        errors,
        reset,
        validatingProspect,
        setValidatingProspect,
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
        handleOpenActions,
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
    };
}
