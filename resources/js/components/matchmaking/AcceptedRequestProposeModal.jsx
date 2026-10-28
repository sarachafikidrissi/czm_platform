import MatchmakingProposeRequestModals from '@/components/matchmaking/MatchmakingProposeRequestModals';
import { useMatchmakingProposeRequestFlow } from '@/hooks/use-matchmaking-propose-request-flow';
import { useEffect, useRef } from 'react';

/**
 * "Proposer" after an accepted proposition request: opens the same propose modal as the match results,
 * with my member as reference (User A) and the other matchmaker's profile as compatible.
 */
export default function AcceptedRequestProposeModal({ link, onClose, onSent }) {
    const flow = useMatchmakingProposeRequestFlow(link.reference, { onAfterProposeSuccess: onSent });
    const wasOpen = useRef(false);

    useEffect(() => {
        flow.openProposeModal({
            user: link.compatible,
            user_a_has_active_proposition: link.reference_has_active_proposition,
            compatible_user_has_active_proposition: link.compatible_has_active_proposition,
        });
        // Open once when mounted for this request.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (flow.showProposeModal) {
            wasOpen.current = true;
        } else if (wasOpen.current) {
            onClose();
        }
    }, [flow.showProposeModal, onClose]);

    return <MatchmakingProposeRequestModals userA={link.reference} {...flow} />;
}
