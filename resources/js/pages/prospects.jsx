import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
function Prospects() {
    return (
        <AppLayout  breadcrumbs={[{ title: 'les prospects', href: '/prospects' }]}>
            <Head title="Mes Prospects"/>
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="border-sidebar-border/70 dark:border-sidebar-border rounded-xl border p-6">
                    <div className="text-lg font-semibold">Prospects</div>
                    <div className="mt-2 text-sm text-neutral-700 dark:text-neutral-200">Outils d'accompagnement des utilisateurs à venir.</div>
                </div>
            </div>
        </AppLayout>
    );
}

export default Prospects;
