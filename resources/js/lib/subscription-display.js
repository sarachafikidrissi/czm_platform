export function formatDateFr(value) {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('fr-FR');
}

export function formatSubscriptionValidity(subscription, durationMonths) {
    if (subscription?.is_expired || subscription?.status === 'expired') {
        return { label: 'Expiré', className: 'bg-rose-50 text-rose-700 border border-rose-100' };
    }

    if (subscription?.days_remaining != null && subscription.days_remaining > 0) {
        return {
            label: `${subscription.days_remaining} j restants`,
            className: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
        };
    }

    if (subscription?.subscription_end) {
        return {
            label: `Fin ${formatDateFr(subscription.subscription_end)}`,
            className: 'bg-slate-100 text-slate-700 border border-slate-200',
        };
    }

    if (durationMonths) {
        return {
            label: `${durationMonths} mois`,
            className: 'bg-slate-100 text-slate-600 border border-slate-200',
        };
    }

    return { label: '—', className: 'bg-slate-100 text-slate-500 border border-slate-200' };
}

export function isStaffViewer(viewerRole) {
    return viewerRole === 'admin' || viewerRole === 'manager' || viewerRole === 'matchmaker';
}

export function subscriptionShowPath(subscriptionId, viewerRole) {
    if (!subscriptionId) return null;
    return isStaffViewer(viewerRole)
        ? `/staff/subscriptions/${subscriptionId}`
        : `/user/subscription/${subscriptionId}`;
}

export function billShowPath(billId, viewerRole) {
    if (!billId) return null;
    return isStaffViewer(viewerRole)
        ? `/staff/bills/${billId}`
        : `/mes-commandes/${billId}`;
}

export function staffProfilePath(user) {
    if (!user?.username) return null;
    return `/profile/${user.username}`;
}
