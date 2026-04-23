import { useState, useCallback } from 'react';
import axios from 'axios';
import { useToast } from '@/hooks/use-toast';
import { propositionToastFr } from '@/lib/proposition-toast-messages';

/**
 * Shared propose + proposition-request modal flow (match results page + member profile).
 *
 * @param {{ id: number }} userA Reference profile (User A)
 * @param {{ onAfterProposeSuccess?: () => void, onAfterRequestSuccess?: () => void }} options
 */
export function useMatchmakingProposeRequestFlow(userA, options = {}) {
    const { onAfterProposeSuccess, onAfterRequestSuccess } = options;
    const { showToast } = useToast();

    const [showProposeModal, setShowProposeModal] = useState(false);
    const [proposeMatch, setProposeMatch] = useState(null);
    const [proposeMessage, setProposeMessage] = useState('');
    const [sendToReference, setSendToReference] = useState(true);
    const [sendToCompatible, setSendToCompatible] = useState(true);
    const [isSendingProposition, setIsSendingProposition] = useState(false);
    const [propositionError, setPropositionError] = useState('');

    const [showRequestModal, setShowRequestModal] = useState(false);
    const [requestMatch, setRequestMatch] = useState(null);
    const [requestMessage, setRequestMessage] = useState('');
    const [requestError, setRequestError] = useState('');
    const [isSendingRequest, setIsSendingRequest] = useState(false);

    const openProposeModal = useCallback((match, event) => {
        if (event) {
            event.stopPropagation();
        }
        if (!userA?.id) return;
        setProposeMatch(match);
        setProposeMessage('');
        const refBlocked = Boolean(match.user_a_has_active_proposition);
        const compBlocked = Boolean(match.compatible_user_has_active_proposition);
        setSendToReference(!refBlocked);
        setSendToCompatible(!compBlocked);
        setPropositionError('');
        setShowProposeModal(true);
    }, [userA?.id]);

    const openRequestModal = useCallback((match, event) => {
        if (event) {
            event.stopPropagation();
        }
        setRequestMatch(match);
        setRequestMessage('');
        setRequestError('');
        setShowRequestModal(true);
    }, []);

    const handleSendProposition = useCallback(
        async (event) => {
            event.preventDefault();
            if (!proposeMatch || !userA?.id) return;

            const trimmedMessage = proposeMessage.trim();
            if (!trimmedMessage) {
                setPropositionError('Veuillez saisir un message.');
                return;
            }
            if (!sendToReference && !sendToCompatible) {
                setPropositionError('Veuillez sélectionner au moins un destinataire.');
                return;
            }
            if (
                Boolean(proposeMatch.user_a_has_active_proposition) ||
                Boolean(proposeMatch.compatible_user_has_active_proposition)
            ) {
                setPropositionError(propositionToastFr.sendBlockedActive);
                return;
            }

            setIsSendingProposition(true);
            setPropositionError('');
            try {
                await axios.post('/staff/propositions', {
                    reference_user_id: userA.id,
                    compatible_user_id: proposeMatch.user.id,
                    message: trimmedMessage,
                    send_to_reference: sendToReference,
                    send_to_compatible: sendToCompatible,
                });
                showToast(propositionToastFr.sendSuccess, undefined, 'success');
                setShowProposeModal(false);
                setProposeMatch(null);
                onAfterProposeSuccess?.();
            } catch (error) {
                const status = error?.response?.status;
                const backendMsg = error?.response?.data?.message;
                if (status === 422 && backendMsg === propositionToastFr.sendBlockedActive) {
                    showToast(propositionToastFr.sendBlockedActive, undefined, 'warning');
                    setPropositionError(propositionToastFr.sendBlockedActive);
                } else if (status === 403) {
                    showToast('Action refusée.', undefined, 'error');
                    setPropositionError(propositionToastFr.sendError);
                } else {
                    showToast(propositionToastFr.sendError, undefined, 'error');
                    setPropositionError(propositionToastFr.sendError);
                }
            } finally {
                setIsSendingProposition(false);
            }
        },
        [
            proposeMatch,
            userA?.id,
            proposeMessage,
            sendToReference,
            sendToCompatible,
            showToast,
            onAfterProposeSuccess,
        ],
    );

    const handleSendRequest = useCallback(
        async (event) => {
            event.preventDefault();
            if (!requestMatch || !userA?.id) return;

            const trimmedMessage = requestMessage.trim();
            if (!trimmedMessage) {
                setRequestError('Veuillez saisir un message.');
                return;
            }

            setIsSendingRequest(true);
            setRequestError('');
            try {
                await axios.post('/staff/proposition-requests', {
                    reference_user_id: userA.id,
                    compatible_user_id: requestMatch.user.id,
                    message: trimmedMessage,
                });
                showToast('Demande envoyée.', undefined, 'success');
                setShowRequestModal(false);
                setRequestMatch(null);
                onAfterRequestSuccess?.();
            } catch (error) {
                const message = error?.response?.data?.message || 'Une erreur est survenue.';
                setRequestError(message);
                showToast(message, undefined, 'error');
            } finally {
                setIsSendingRequest(false);
            }
        },
        [requestMatch, userA?.id, requestMessage, showToast, onAfterRequestSuccess],
    );

    return {
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
        showRequestModal,
        setShowRequestModal,
        requestMatch,
        requestMessage,
        setRequestMessage,
        requestError,
        isSendingRequest,
        openProposeModal,
        openRequestModal,
        handleSendProposition,
        handleSendRequest,
    };
}
