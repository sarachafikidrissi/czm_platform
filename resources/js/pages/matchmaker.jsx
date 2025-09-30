import AppLayout from '@/layouts/app-layout';
import { Head, usePage } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User } from 'lucide-react';

export default function MatchmakerPage() {
    const { auth } = usePage().props;
    const assignedMatchmaker = auth?.user?.assignedMatchmaker ?? auth?.user?.assigned_matchmaker ?? null;
    return (
        <AppLayout breadcrumbs={[{ title: 'Mon Matchmaker', href: '/matchmaker' }]}> 
            <Head title="Mon Matchmaker" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="text-lg font-semibold">Mon Matchmaker</div>
                {assignedMatchmaker ? (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="w-5 h-5" />
                                Votre Matchmaker
                            </CardTitle>
                            <CardDescription>Les informations du matchmaker assigné</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gray-200 rounded-full" />
                                <div>
                                    <div className="font-semibold">{assignedMatchmaker.name}</div>
                                    <div className="text-sm text-muted-foreground">{assignedMatchmaker.email}</div>
                                    <div className="text-sm text-muted-foreground">Agence: {assignedMatchmaker.agency ?? '—'}</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="rounded-xl border border-sidebar-border/70 dark:border-sidebar-border p-6 text-sm text-neutral-700 dark:text-neutral-200">
                        Aucun matchmaker assigné pour le moment.
                    </div>
                )}
            </div>
        </AppLayout>
    );
}


