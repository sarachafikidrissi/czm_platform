import { AppContent } from '@/components/app-content';
import { AppHeader } from '@/components/app-header';
import { AppShell } from '@/components/app-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { type BreadcrumbItem } from '@/types';
import type { PropsWithChildren } from 'react';
import { useTranslation } from 'react-i18next';

export default function AppHeaderLayout({ children, breadcrumbs }: PropsWithChildren<{ breadcrumbs?: BreadcrumbItem[] }>) {
    const { i18n } = useTranslation();
    const isRTL = i18n.language === 'ar';

    // Footer message based on language
    const footerMessage = {
        ar: 'تذكير: طبقاً للقانون 09-08 وتحت مراقبة اللجنة الوطنية، معلوماتكم محفوظة في سرية تامة.',
        fr: 'Rappel: Conformément à la loi 09-08 et sous le contrôle de la Commission Nationale, vos informations sont traitées en toute confidentialité.',
        en: 'Reminder: In accordance with Law 09-08 and under the supervision of the National Commission, your information is handled with full confidentiality.',
    };

    return (
        <AppShell>
            <AppHeader breadcrumbs={breadcrumbs} />
            <AppContent>
                {children}
                <div className="px-4 pb-4">
                    <Card className="border-[#90080b]">
                        <CardHeader>
                            <div className="flex items-center gap-4">
                                <img 
                                    src="/images/czm_Logo.png" 
                                    alt="CZM Logo" 
                                    className="h-16 w-auto object-contain"
                                />
                                <div>
                                    <CardTitle className="text-[#076725] text-xl font-bold">
                                        Centre Zawaj Maroc - CZM
                                    </CardTitle>
                                    <CardDescription className="text-[#90080b] text-sm mt-1">
                                        1er Centre Matrimonial au Maroc
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="bg-[#90080b]/10 border-l-4 border-[#90080b] p-4 rounded-r-md">
                                <p className="text-base font-semibold text-[#90080b] leading-relaxed" dir={isRTL ? 'rtl' : 'ltr'}>
                                    {footerMessage[i18n.language as keyof typeof footerMessage] || footerMessage.en}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </AppContent>
        </AppShell>
    );
}
