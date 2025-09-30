import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import AppLayout from '@/layouts/app-layout';
import { Head, usePage } from '@inertiajs/react';
import AdminDashboardContent from './admin/adminDashboardContent'
import MatchMakerDashboardContent from './matchmaker/matchmakerDashboardContent'
import ManagerDashboardContent from './manager/managerDashboardContent'



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



function PendingApprovalContent() {
    return (
        <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Pending Approval</h2>
                    <p className="text-gray-600">
                        Your account is pending approval from an administrator. 
                        You will be notified once your account has been reviewed.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function Dashboard() {
    const { props } = usePage();
    const role = props?.role ?? null;
    const user = props?.auth?.user;
    const approvalStatus = user?.approval_status;
    
    // Show pending approval for non-admin staff who aren't approved
    if ((role === 'manager' || role === 'matchmaker') && approvalStatus !== 'approved') {
        return (
            <AppLayout>
                <Head title="Dashboard" />
                <PendingApprovalContent />
            </AppLayout>
        );
    }
    
    return (
        <AppLayout >
            <Head title="Dashboard" />
            {role === 'admin' ? (
                <AdminDashboardContent />
            ) : role === 'manager' ? (
                <ManagerDashboardContent />
            ) : role === 'matchmaker' ? (
                <MatchMakerDashboardContent />
            ) : (
                <UserDashboardContent />
            )}
        </AppLayout>
    );
}
