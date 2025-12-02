import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { type BreadcrumbItem } from '@/types';
import { type PropsWithChildren, useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';

export default function AppSidebarLayout({ children, breadcrumbs = [] }: PropsWithChildren<{ breadcrumbs?: BreadcrumbItem[] }>) {
    const { props } = usePage();
    const { i18n } = useTranslation();
    const flash = (props as any)?.flash || {};
    const [message, setMessage] = useState<string | null>(null);

    useEffect(() => {
        const msg = flash.success || flash.error || flash.status || null;
        setMessage(msg ?? null);
        if (msg) {
            const t = setTimeout(() => setMessage(null), 3500);
            return () => clearTimeout(t);
        }
    }, [flash.success, flash.error, flash.status]);

    // Set direction based on language
    const isRTL = i18n.language === 'ar';

    // Footer message based on language
    const footerMessage = {
        ar: 'تذكير: طبقاً للقانون 09-08 وتحت مراقبة اللجنة الوطنية، معلوماتكم محفوظة في سرية تامة.',
        fr: 'Rappel: Conformément à la loi 09-08 et sous le contrôle de la Commission Nationale, vos informations sont traitées en toute confidentialité.',
        en: 'Reminder: In accordance with Law 09-08 and under the supervision of the National Commission, your information is handled with full confidentiality.',
    };

    return (
        <AppShell variant="sidebar">
            <AppSidebar />
            <AppContent variant="sidebar" dir={isRTL ? 'rtl' : 'ltr'}>
                <AppSidebarHeader breadcrumbs={breadcrumbs} />
                {message && (
                    <div className="mb-3 px-4">
                        <div className="rounded-md border border-emerald-300 bg-emerald-50 text-emerald-800 px-3 py-2 text-sm">
                            {message}
                        </div>
                    </div>
                )}
                {children}
                <div className="px-4 pb-4">
                    <Card className="border-[#90080b]">
                        <CardHeader>
                            <div className="flex flex-col md:flex-row items-center justify-center gap-2">
                                <img 
                                    src="/images/czm_Logo.png" 
                                    alt="CZM Logo" 
                                    className="h-30 w-auto object-contain"
                                />
                                <div>
                                    <CardTitle className="text-[#076725] text-2xl  font-bold">
                                        Centre Zawaj Maroc - CZM
                                    </CardTitle>
                                    <CardDescription className="text-[#90080b] md:text-lg md:text-start text-center text-base mt-1">
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
