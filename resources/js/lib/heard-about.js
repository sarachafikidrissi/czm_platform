/**
 * Translation keys for heard_about_us values (profile field).
 * Used to display "Heard about us" and commercial code in prospect/member tables.
 */
const HEARD_ABOUT_KEYS = {
    recommande: 'heardAboutUsRecommended',
    passage: 'heardAboutUsPassage',
    online_ads: 'heardAboutUsOnlineAds',
    google_search: 'heardAboutUsGoogleSearch',
    youtube_video: 'heardAboutUsYouTubeVideo',
    facebook_post: 'heardAboutUsFacebookPost',
    instagram_post: 'heardAboutUsInstagramPost',
    tiktok_video: 'heardAboutUsTikTokVideo',
    collaboration: 'heardAboutUsCollaboration',
    phone_call: 'heardAboutUsPhoneCall',
    pub: 'heardAboutUsPub',
    commercial_terrain: 'heardAboutUsCommercialTerrain',
};

/**
 * Returns display string for the commercial-code column in prospect/member tables.
 * Only shows the code when user selected "commercial de terrain" and filled it; otherwise "_".
 * @param {Object} prospectOrUser - User/prospect with profile (heard_about_us, heard_about_reference)
 * @returns {string} Commercial code or "_"
 */
export function getCommercialCodeDisplay(prospectOrUser) {
    const profile = prospectOrUser?.profile;
    const raw = profile?.heard_about_us ?? prospectOrUser?.heard_about_us ?? '';
    if (raw !== 'commercial_terrain') return '_';
    const code = (profile?.heard_about_reference ?? prospectOrUser?.heard_about_reference ?? '').toString().trim();
    return code || '_';
}

/**
 * Returns display string for "Heard about us" + optional commercial code.
 * @param {Function} t - i18n t function (e.g. from useTranslation())
 * @param {Object} prospectOrUser - User/prospect with profile (heard_about_us, heard_about_reference)
 * @returns {string} Label and optionally " (Code: XXX)" for commercial_terrain
 */
export function getHeardAboutDisplay(t, prospectOrUser) {
    const profile = prospectOrUser?.profile;
    const raw = profile?.heard_about_us ?? prospectOrUser?.heard_about_us ?? '';
    if (!raw) return '—';
    const key = HEARD_ABOUT_KEYS[raw];
    const label = key ? t(`profile.${key}`) : raw;
    if (raw === 'commercial_terrain') {
        const code = profile?.heard_about_reference ?? prospectOrUser?.heard_about_reference ?? '';
        const codeLabel = t('profile.heardAboutCommercialCode', { defaultValue: 'Code commercial' });
        return code ? `${label} (${codeLabel}: ${code})` : label;
    }
    const ref = profile?.heard_about_reference ?? prospectOrUser?.heard_about_reference ?? '';
    return ref ? `${label} (${ref})` : label;
}
