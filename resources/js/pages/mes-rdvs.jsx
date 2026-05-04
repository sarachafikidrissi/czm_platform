import AppLayout from '@/layouts/app-layout';
import { Head, router, usePage } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarHeart, Phone } from 'lucide-react';

const STATUS_META = {
    en_cours: { label: 'En cours', className: 'bg-blue-50 text-blue-700 border border-blue-100' },
    reussi: { label: 'Réussi', className: 'bg-emerald-50 text-emerald-700 border border-emerald-100' },
    echec: { label: 'Échec', className: 'bg-rose-50 text-rose-700 border border-rose-100' },
};

const getProfilePicture = (user) => {
    if (user?.profile?.profile_picture_path) {
        return `/storage/${user.profile.profile_picture_path}`;
    }
    if (!user?.name) return 'https://ui-avatars.com/api/?name=User&background=random';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`;
};

export default function MesRdvs() {
    const { rdvs = [], pagination = {}, auth } = usePage().props;
    const currentUserId = auth?.user?.id;

    const getOtherUser = (rdv) => {
        if ((rdv.reference_user?.id ?? rdv.reference_user_id) === currentUserId) {
            return rdv.compatible_user;
        }
        return rdv.reference_user;
    };

    return (
        <AppLayout>
            <Head title="Mes RDVs" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div>
                    <h1 className="text-2xl font-semibold text-rose-900">Mes RDVs</h1>
                    <p className="text-sm text-muted-foreground">
                        Consultez vos rendez-vous et partagez vos retours.
                    </p>
                </div>

                {rdvs.length === 0 ? (
                    <Card className="border border-rose-100/60 shadow-sm">
                        <CardContent className="p-6 text-sm text-neutral-600">
                            Aucun RDV pour le moment.
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="border border-rose-100/60 shadow-sm">
                        <CardContent className="p-0">
                            <div className="hidden grid-cols-[1fr_1fr_1fr_120px_140px_80px_140px] gap-4 border-b bg-rose-50/60 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-rose-900 lg:grid">
                                <div>Date</div>
                                <div>Avec qui</div>
                                <div>Matchmaker</div>
                                <div>Statut</div>
                                <div>Téléphone</div>
                                <div>Feedbacks</div>
                                <div>Actions</div>
                            </div>
                            <div className="divide-y">
                                {rdvs.map((rdv) => {
                                    const other = getOtherUser(rdv);
                                    const statusMeta = STATUS_META[rdv.status] ?? STATUS_META.en_cours;
                                    const feedbackCount = rdv.feedbacks?.length ?? 0;
                                    const alreadySubmitted = !rdv.can_add_feedback;

                                    return (
                                        <div
                                            key={rdv.id}
                                            className="grid grid-cols-1 gap-3 px-5 py-4 lg:grid-cols-[1fr_1fr_1fr_120px_140px_80px_140px]"
                                        >
                                            <div className="text-sm text-slate-700">
                                                <span className="text-xs font-semibold uppercase text-slate-400 lg:hidden">Date: </span>
                                                {new Date(rdv.created_at).toLocaleDateString('fr-FR')}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-semibold uppercase text-slate-400 lg:hidden">Avec: </span>
                                                {other ? (
                                                    <>
                                                        <img
                                                            src={getProfilePicture(other)}
                                                            alt={other.name}
                                                            className="h-8 w-8 rounded-full object-cover"
                                                        />
                                                        <div>
                                                            <div className="text-sm font-medium text-slate-900">{other.name}</div>
                                                            {other.username && (
                                                                <div className="text-xs text-muted-foreground">@{other.username}</div>
                                                            )}
                                                        </div>
                                                    </>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">—</span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-1 text-sm text-slate-700">
                                                <span className="text-xs font-semibold uppercase text-slate-400 lg:hidden">Matchmaker: </span>
                                                {rdv.matchmaker?.name ?? '—'}
                                            </div>

                                            <div>
                                                <Badge className={statusMeta.className}>{statusMeta.label}</Badge>
                                            </div>

                                            <div className="flex items-center gap-1.5 text-sm">
                                                {rdv.other_profile_phone ? (
                                                    <>
                                                        <Phone className="h-3.5 w-3.5 text-emerald-600" />
                                                        <span className="font-medium text-emerald-700">{rdv.other_profile_phone}</span>
                                                    </>
                                                ) : (
                                                    <span className="text-muted-foreground">—</span>
                                                )}
                                            </div>

                                            <div className="text-sm text-slate-700">
                                                {feedbackCount}
                                            </div>

                                            <div>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 border-rose-200 text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                                                    disabled={alreadySubmitted}
                                                    onClick={() => router.visit(`/mes-rdvs/${rdv.id}/feedback`)}
                                                >
                                                    {alreadySubmitted ? 'Feedback envoyé' : 'Ajouter un feedback'}
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {pagination.last_page > 1 && (
                    <div className="flex items-center justify-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={pagination.current_page <= 1}
                            onClick={() => router.visit(`/mes-rdvs?page=${pagination.current_page - 1}`)}
                        >
                            Précédent
                        </Button>
                        <span className="text-sm text-muted-foreground">
                            Page {pagination.current_page} / {pagination.last_page}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={pagination.current_page >= pagination.last_page}
                            onClick={() => router.visit(`/mes-rdvs?page=${pagination.current_page + 1}`)}
                        >
                            Suivant
                        </Button>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
