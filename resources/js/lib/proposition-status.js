export const PROPOSITION_STATUS_META = {
    pending: { label: 'En attente', className: 'bg-slate-50 text-slate-600 border border-slate-200' },
    accepted: { label: 'Acceptée', className: 'bg-emerald-50 text-emerald-700 border border-emerald-100' },
    rejected: { label: 'Refusée', className: 'bg-rose-50 text-rose-700 border border-rose-100' },
    expired: { label: 'Expirée', className: 'bg-amber-50 text-amber-700 border border-amber-100' },
    cancelled: { label: 'Annulée', className: 'bg-slate-100 text-slate-700 border border-slate-200' },
    closed: { label: 'Clôturée (RDV)', className: 'bg-sky-50 text-sky-800 border border-sky-100' },
};

export function normalizePropositionStatus(status, isExpired = false, userResponse = null) {
    if (isExpired || status === 'expired') return 'expired';
    if (status === 'closed') return 'closed';
    if (status === 'cancelled') return 'cancelled';
    if (
        userResponse === 'interested' ||
        userResponse === 'accepted' ||
        status === 'interested' ||
        status === 'accepted'
    ) {
        return 'accepted';
    }
    if (userResponse === 'not_interested' || status === 'not_interested' || status === 'rejected') {
        return 'rejected';
    }
    return 'pending';
}

export function getPropositionStatusMeta(status, isExpired = false, userResponse = null) {
    const normalized = normalizePropositionStatus(status, isExpired, userResponse);
    return PROPOSITION_STATUS_META[normalized] ?? PROPOSITION_STATUS_META.pending;
}

export function getPropositionResponseLabel(userResponse, responseMessage) {
    if (responseMessage) return responseMessage;
    if (userResponse === 'interested' || userResponse === 'accepted') return 'Intéressé(e)';
    if (userResponse === 'not_interested' || userResponse === 'rejected') return 'Pas intéressé(e)';
    return '—';
}

export function getPropositionResponseSelection(proposition) {
    if (!proposition) return '';
    const userResponse = proposition.user_response;
    if (userResponse === 'interested' || userResponse === 'accepted') return 'accepted';
    if (userResponse === 'not_interested' || userResponse === 'rejected') return 'rejected';
    const status = proposition.status;
    if (status === 'interested' || status === 'accepted') return 'accepted';
    if (status === 'not_interested' || status === 'rejected') return 'rejected';
    return '';
}
