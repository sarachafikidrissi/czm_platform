import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import AppLayout from '@/layouts/app-layout';
import { Head, usePage } from '@inertiajs/react';

const breadcrumbs = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
];

function UserDashboardContent() {
    return (
        <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
            <div className="grid auto-rows-min gap-4 md:grid-cols-3">
                <div className="border-sidebar-border/70 dark:border-sidebar-border relative aspect-video overflow-hidden rounded-xl border">
                    <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                </div>
                <div className="border-sidebar-border/70 dark:border-sidebar-border relative aspect-video overflow-hidden rounded-xl border">
                    <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                </div>
                <div className="border-sidebar-border/70 dark:border-sidebar-border relative aspect-video overflow-hidden rounded-xl border">
                    <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                </div>
            </div>
            <div className="border-sidebar-border/70 dark:border-sidebar-border relative min-h-[100vh] flex-1 overflow-hidden rounded-xl border md:min-h-min">
                <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
            </div>
        </div>
    );
}

function AdminDashboardContent() {
    return (
        <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
            <div className="rounded-xl border border-sidebar-border/70 dark:border-sidebar-border p-6">
                <div className="text-lg font-semibold">Tableau de bord Admin</div>
                <div className="mt-2 text-sm text-neutral-700 dark:text-neutral-200">Statistiques et outils d'administration viendront ici.</div>
            </div>
        </div>
    );
}

function StaffDashboardContent() {
    return (
        <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
            <div className="rounded-xl border border-sidebar-border/70 dark:border-sidebar-border p-6">
                <div className="text-lg font-semibold">Tableau de bord Équipe</div>
                <div className="mt-2 text-sm text-neutral-700 dark:text-neutral-200">Outils d'accompagnement des utilisateurs à venir.</div>
            </div>
        </div>
    );
}

export default function Dashboard() {
    const { props } = usePage();
    const role = props?.role ?? null;
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            {role === 'admin' ? (
                <AdminDashboardContent />
            ) : role === 'staff' || role === 'moderator' ? (
                <StaffDashboardContent />
            ) : (
                <UserDashboardContent />
            )}
        </AppLayout>
    );
}
