import React from "react";

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

export default AdminDashboardContent