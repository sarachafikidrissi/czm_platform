import ProfileHeader from '@/components/profile/ProfileHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { Head, usePage } from '@inertiajs/react';
import { Link, User } from 'lucide-react';

export default function MatchmakerPage() {
    const { auth } = usePage().props;
    const assignedMatchmaker = auth?.user?.assignedMatchmaker ?? auth?.user?.assigned_matchmaker ?? null;
    console.log(assignedMatchmaker);

    return (
        <AppLayout breadcrumbs={[{ title: 'Mon Matchmaker', href: '/matchmaker' }]}>
            <Head title="Mon Matchmaker" />

            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="text-lg font-semibold">Mon Matchmaker</div>
                {assignedMatchmaker && assignedMatchmaker?.approval_status === 'approved' ? (
                    <Card>
                        <ProfileHeader user={assignedMatchmaker} profile={assignedMatchmaker?.profile} isOwnProfile={false} age={assignedMatchmaker?.age} />
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5" color="red" />
                                Votre Matchmaker
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col gap-y-4">
                                <div className="md:w-[50%] w-full rounded-full border-error-dark cursor-pointer hover:bg-[#096725]! bg-success-border! hover:text-white! hover:outline-none! border-2 px-4 py-1.5 font-semibold">
                                    <div className='flex items-center gap-2'>
                                        <Link />
                                        <a href={`/profile/${assignedMatchmaker?.username}`} target="_blank">
                                            Voir Profil
                                        </a>
                                    </div>
                                </div>
                                <div className="md:w-[50%] w-full rounded-full hover:bg-[#096725]!  border-error-dark cursor-pointer   hover:text-white border-2 px-4 py-1.5 font-semibold">
                                    {/* to be added later now it's 404 not found page */}
                                    <div className='flex items-center gap-2'>
                                        <Link />
                                        <a href={`/user/${assignedMatchmaker?.username}/add-review`}>Ajouter mon avis</a>
                                    </div>
                                    <div>

                                    </div>
                                </div>
                                <div className="md:w-[50%] w-full rounded-full hover:bg-[#096725]!  border-error-dark cursor-pointer  hover:text-white border-2 px-4 py-1.5 font-semibold">
                                    <div className='flex items-center gap-2'>
                                        <Link />
                                        <a href={`/user/matchmakers`}>Changer de matchmaker</a>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="border-sidebar-border/70 dark:border-sidebar-border rounded-xl border p-6 text-sm text-neutral-700 dark:text-neutral-200">
                        Aucun matchmaker assigné pour le moment.
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
