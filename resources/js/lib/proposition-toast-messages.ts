/**
 * French user-facing copy for proposition flows (never expose raw API strings in UI).
 */
export const propositionToastFr = {
    sendSuccess: 'Proposition envoyée avec succès.',
    /** Must match backend `PropositionController::MESSAGE_RECIPIENT_HAS_ACTIVE_PROPOSITION` */
    sendBlockedActive:
        "Ce profil a déjà une proposition active. Annulez-la avant d'en envoyer une nouvelle.",
    sendError: 'Échec de l’envoi de la proposition. Veuillez réessayer.',

    cancelSuccess: 'Proposition annulée. Vous pouvez maintenant en envoyer une nouvelle à ce profil.',
    /** Shown when cancel API returns pair_was_cancelled */
    cancelSuccessPaired:
        'Proposition annulée. La proposition jumelée a également été annulée automatiquement.',
    cancelInvalidState: 'Cette proposition ne peut pas être annulée dans son état actuel.',
    cancelExpired: 'Cette proposition est expirée et ne peut pas être annulée.',
    cancelUnauthorized: 'Vous n’êtes pas autorisé à annuler cette proposition.',
    cancelError: 'Échec de l’annulation de la proposition. Veuillez réessayer.',

    respondUpdateSuccess: 'Réponse mise à jour avec succès.',
    respondUpdateUnauthorized: 'Vous n’êtes pas autorisé à mettre à jour cette réponse.',
    respondUpdateError: 'Échec de la mise à jour de la réponse. Veuillez réessayer.',

    memberAccept: 'Vous avez accepté cette proposition.',
    memberDecline: 'Vous avez refusé cette proposition.',
    memberAlreadyAnswered: 'Cette proposition a déjà reçu une réponse.',
    memberExpired: 'Cette proposition a expiré et ne peut plus recevoir de réponse.',
    memberGenericError: 'Une erreur est survenue. Veuillez réessayer.',
    sendBlockedRdvInProgress: 'Un RDV est en cours pour ce profil. Veuillez attendre sa clôture.',
} as const

export const rdvToastFr = {
    createSuccess: 'RDV créé avec succès. Les deux profils ont été notifiés.',
    createBlockedAlreadyExists: 'Un RDV existe déjà pour cette proposition.',
    createBlockedNotBothAccepted: 'Les deux profils doivent avoir accepté la proposition.',
    createError: 'Erreur lors de la création du RDV. Veuillez réessayer.',
    feedbackSuccess: 'Feedback envoyé avec succès.',
    feedbackMatchmakerSuccess: 'Feedback matchmaker enregistré.',
    feedbackAlreadySubmitted: 'Vous avez déjà soumis un feedback pour ce RDV.',
    feedbackError: 'Erreur lors de l\'envoi du feedback.',
    genericError: 'Une erreur est survenue. Veuillez réessayer.',
} as const
