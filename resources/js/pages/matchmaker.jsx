import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';

export default function MatchmakerPage() {
    return (
        <AppLayout breadcrumbs={[{ title: 'Mon Matchmaker', href: '/matchmaker' }]}> 
            <Head title="Mon Matchmaker" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="text-lg font-semibold">Mon Matchmaker</div>
                <div className="rounded-xl border border-sidebar-border/70 dark:border-sidebar-border p-6 text-sm text-neutral-700 dark:text-neutral-200">
                    Contenu du matchmaker à venir.
                </div>
            </div>
        </AppLayout>
    );
}


