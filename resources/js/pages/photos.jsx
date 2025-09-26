import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';

export default function PhotosPage() {
    return (
        <AppLayout breadcrumbs={[{ title: 'Photos', href: '/photos' }]}> 
            <Head title="Mes Photos" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="text-lg font-semibold">Mes Photos</div>
                <div className="rounded-xl border border-sidebar-border/70 dark:border-sidebar-border p-6 text-sm text-neutral-700 dark:text-neutral-200">
                    Contenu des photos à venir.
                </div>
            </div>
        </AppLayout>
    );
}


