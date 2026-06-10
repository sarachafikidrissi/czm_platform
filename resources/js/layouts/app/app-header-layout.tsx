import { AppContent } from '@/components/app-content';
import { AppHeader } from '@/components/app-header';
import { AppShell } from '@/components/app-shell';
import LegalFooter from '@/components/LegalFooter';
import { type BreadcrumbItem } from '@/types';
import type { PropsWithChildren } from 'react';
import { usePage } from '@inertiajs/react';

type HeaderLayoutPageProps = {
    role?: string | null;
};

export default function AppHeaderLayout({ children, breadcrumbs }: PropsWithChildren<{ breadcrumbs?: BreadcrumbItem[] }>) {
    const { props } = usePage();
    const userRole = (props as HeaderLayoutPageProps)?.role ?? null;

    return (
        <AppShell>
            <AppHeader breadcrumbs={breadcrumbs} />
            <AppContent>
                {children}
                {userRole === 'user' && <LegalFooter />}
            </AppContent>
        </AppShell>
    );
}
