import type { TFunction } from 'i18next';

/**
 * Maps backend (mostly French) activity descriptions to i18n keys.
 * Free-text notes and unknown patterns are returned unchanged.
 */
export function translateActivityDescription(description: string | undefined | null, t: TFunction): string {
    if (!description) return '';
    const d = description.trim();

    const exact: Record<string, string> = {
        'Proposition acceptée.': 'activityHistory.desc.propositionAccepted',
        'Proposition refusée.': 'activityHistory.desc.propositionRefused',
        'Proposition expirée (délai dépassé).': 'activityHistory.desc.propositionExpired',
        'Proposition annulée par le conseiller.': 'activityHistory.desc.propositionCancelled',
    };
    const exactKey = exact[d];
    if (exactKey) return t(exactKey);

    const propSent = d.match(/^Proposition envoyée avec (.+?)\.\s*(?:Message\s*:\s*(.+))?$/s);
    if (propSent) {
        const name = propSent[1];
        const message = propSent[2]?.trim();
        if (message) return t('activityHistory.desc.propositionSentWithMessage', { name, message });
        return t('activityHistory.desc.propositionSent', { name });
    }

    const sub = d.match(/^Abonnement ajouté : (.+), (\d+) mois\.$/);
    if (sub) return t('activityHistory.desc.subscriptionAdded', { pack: sub[1], months: sub[2] });

    if (d === 'Statut passé de prospect à membre (validé).') return t('activityHistory.desc.statusProspectToMember');
    if (d === 'Statut passé de membre à client.') return t('activityHistory.desc.statusMemberToClient');

    const memAssign = d.match(/^Membre assigné à (.+)\.$/);
    if (memAssign) return t('activityHistory.desc.memberAssigned', { name: memAssign[1] });

    const prospectAssign = d.match(/^Prospect assigné à (.+) \(marieuse\)\.$/);
    if (prospectAssign) return t('activityHistory.desc.prospectAssigned', { name: prospectAssign[1] });

    const prospectReassign = d.match(/^Prospect réassigné à (.+) \(marieuse\)\.$/);
    if (prospectReassign) return t('activityHistory.desc.prospectReassigned', { name: prospectReassign[1] });

    const acc = d.match(/^Compte activé\.\s*(.*)$/);
    if (acc) {
        const reason = acc[1]?.trim();
        return reason
            ? t('activityHistory.desc.accountActivatedWithReason', { reason })
            : t('activityHistory.desc.accountActivated');
    }

    const deacc = d.match(/^Compte désactivé\.\s*(.*)$/);
    if (deacc) {
        const reason = deacc[1]?.trim();
        return reason
            ? t('activityHistory.desc.accountDeactivatedWithReason', { reason })
            : t('activityHistory.desc.accountDeactivated');
    }

    if (d === 'Abonnement expiré ; statut passé à client_expire.') {
        return t('activityHistory.desc.subscriptionExpiredStatus');
    }

    if (d === 'Rendez-vous marqué comme traité.') return t('activityHistory.desc.rdvTreated');
    if (d === 'Demande de rendez-vous convertie en prospect.') return t('activityHistory.desc.rdvConvertedProspect');

    return d;
}
