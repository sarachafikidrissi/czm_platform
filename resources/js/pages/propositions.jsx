import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';

export default function PropositionsPage() {
    const { t } = useTranslation();
    return (
        <AppLayout breadcrumbs={[{ title: t('breadcrumbs.propositions'), href: '/propositions' }]}> 
            <Head title={t('breadcrumbs.propositions')} />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="text-lg font-semibold">{t('pages.propositions.title')}</div>
                <div className="rounded-xl border border-sidebar-border/70 dark:border-sidebar-border p-6 text-sm text-neutral-700 dark:text-neutral-200">
                    {t('pages.propositions.content')}
                </div>
            </div>
        </AppLayout>
    );
}


