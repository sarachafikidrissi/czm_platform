import { useTranslation } from 'react-i18next';

export default function LegalFooter() {
    const { i18n } = useTranslation();

    const footerMessage = {
        ar: 'تذكير: طبقاً للقانون 09-08 وتحت مراقبة اللجنة الوطنية، معلوماتكم محفوظة في سرية تامة.',
        fr: 'Rappel : Conformément à la loi 09-08 et sous le contrôle de la Commission Nationale, vos informations sont traitées en toute confidentialité.',
        en: 'Reminder: In accordance with Law 09-08 and under the supervision of the National Commission, your information is handled with full confidentiality.',
    };

    const lang = (i18n.language || 'en').split('-')[0];
    const message = footerMessage[lang] ?? footerMessage.en;
    const isRTL = lang === 'ar';

    return (
        <div className="px-4 pb-4">
            <div className="rounded-lg border border-gray-100 bg-white">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-4 py-4 border-t border-gray-100">
                    <div className="flex flex-col md:flex-row items-center gap-2">
                        <img
                            src="/images/czm_Logo.png"
                            alt="CZM Logo"
                            className="h-16 w-auto object-contain"
                        />
                        <div className="text-center md:text-left">
                            <p className="text-[#076725] text-lg font-semibold">Centre Zawaj Maroc - CZM</p>
                            <p className="text-neutral-500 text-sm">1er Centre Matrimonial au Maroc</p>
                        </div>
                    </div>
                    <p
                        className="text-[13px] font-normal text-gray-600 leading-relaxed max-w-xl text-center md:text-right"
                        dir={isRTL ? 'rtl' : 'ltr'}
                    >
                        {message}
                    </p>
                </div>
            </div>
        </div>
    );
}
