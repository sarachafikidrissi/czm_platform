export const RDV_STATUS_CONFIRM = {
    reussi: {
        title: 'Marquer comme réussi',
        description:
            "Confirmer que ce RDV s'est bien déroulé ? Le profil compatible ne pourra plus recevoir de nouvelles propositions.",
        confirmLabel: 'Confirmer',
    },
    echec: {
        title: 'Marquer comme échec',
        description:
            'Confirmer que ce RDV a échoué ? Les profils seront à nouveau disponibles pour de nouvelles propositions.',
        confirmLabel: 'Confirmer',
    },
    cancelMatch: {
        title: 'Annuler le match',
        description: "Confirmer l'annulation du match ? Les deux profils redeviendront disponibles.",
        confirmLabel: "Confirmer l'annulation",
    },
};

export function getRdvStatusConfirmConfig(currentStatus, newStatus) {
    if (newStatus === 'reussi') {
        return RDV_STATUS_CONFIRM.reussi;
    }

    if (currentStatus === 'reussi' && newStatus === 'echec') {
        return RDV_STATUS_CONFIRM.cancelMatch;
    }

    return RDV_STATUS_CONFIRM.echec;
}
