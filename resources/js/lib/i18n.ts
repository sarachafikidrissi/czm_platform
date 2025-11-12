import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import enTranslations from '../locales/en.json';
import frTranslations from '../locales/fr.json';
import arTranslations from '../locales/ar.json';

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            en: {
                translation: enTranslations,
            },
            fr: {
                translation: frTranslations,
            },
            ar: {
                translation: arTranslations,
            },
        },
        fallbackLng: 'en',
        supportedLngs: ['en', 'fr', 'ar'],
        interpolation: {
            escapeValue: false,
        },
        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage'],
        },
    });

export default i18n;

