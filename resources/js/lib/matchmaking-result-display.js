/** @typedef {{ profile_picture_path?: string }} ProfileLike */
/** @typedef {{ name: string }} UserLike */

export const MATCH_PRIMARY = '#8B2635';

/**
 * @param {UserLike} user
 * @param {ProfileLike | null | undefined} profile
 */
export function getProfilePicture(user, profile) {
    const profilePicturePath = profile?.profile_picture_path;
    if (profilePicturePath) {
        return `/storage/${profilePicturePath}`;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`;
}

/**
 * @param {ProfileLike | null | undefined} profile
 */
export function getLocation(profile) {
    const city = profile?.ville_residence || profile?.ville_origine || '';
    const country = profile?.pays_residence || profile?.pays_origine || '';
    if (city && country) {
        return `${city}, ${country}`;
    }
    return city || country || 'Non spécifié';
}

/**
 * @param {ProfileLike | null | undefined} profile
 */
export function getAge(profile) {
    if (!profile?.date_naissance) return null;
    const birthDate = new Date(profile.date_naissance);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

/**
 * @param {number} score
 */
export function getScoreColor(score) {
    if (score >= 70) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-orange-600';
}

/**
 * @param {string | null | undefined} status
 */
export function getRequestButtonLabel(status) {
    if (status === 'pending') {
        return 'Proposition envoyée (en attente de réponse)';
    }
    if (status === 'accepted') {
        return 'Proposer';
    }
    return 'Demande de propositions';
}
