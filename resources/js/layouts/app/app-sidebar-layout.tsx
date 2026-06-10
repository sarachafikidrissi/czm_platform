import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import LegalFooter from '@/components/LegalFooter';
import { type BreadcrumbItem } from '@/types';
import { type PropsWithChildren, useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';

type SidebarLayoutPageProps = {
    flash?: {
        success?: string;
        error?: string;
        status?: string;
    };
    role?: string | null;
};

export default function AppSidebarLayout({ children, breadcrumbs = [] }: PropsWithChildren<{ breadcrumbs?: BreadcrumbItem[] }>) {
    const { props } = usePage();
    const { i18n } = useTranslation();
    const pageProps = props as SidebarLayoutPageProps;
    const flash = pageProps?.flash || {};
    const userRole = pageProps?.role ?? null;
    const [message, setMessage] = useState<string | null>(null);

    useEffect(() => {
        const msg = flash.success || flash.error || flash.status || null;
        setMessage(msg ?? null);
        if (msg) {
            const t = setTimeout(() => setMessage(null), 3500);
            return () => clearTimeout(t);
        }
    }, [flash.success, flash.error, flash.status]);

    return (
        <AppShell variant="sidebar">
            <AppSidebar />
            <AppContent variant="sidebar" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
                <AppSidebarHeader breadcrumbs={breadcrumbs} />
                {message && (
                    <div className="mb-3 px-4">
                        <div className="rounded-md border border-emerald-300 bg-emerald-50 text-emerald-800 px-3 py-2 text-sm">
                            {message}
                        </div>
                    </div>
                )}
                {children}
                {userRole === 'user' && <LegalFooter />}
            </AppContent>
        </AppShell>
    );
}
