import AppLayout from '@/layouts/app-layout';
import { Head, router, usePage } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import MatchmakerFeedbackModal from '@/components/rdv/MatchmakerFeedbackModal';
import { useState } from 'react';

const STATUS_META = {
    en_cours: { label: 'En cours', className: 'bg-blue-50 text-blue-700 border border-blue-100' },
    reussi: { label: 'Réussi', className: 'bg-emerald-50 text-emerald-700 border border-emerald-100' },
    echec: { label: 'Échec', className: 'bg-rose-50 text-rose-700 border border-rose-100' },
};

const TABS = [
    { key: 'en_cours', label: 'En cours' },
    { key: 'reussi', label: 'Réussis' },
    { key: 'echec', label: 'Échecs' },
];

const getProfilePicture = (user) => {
    if (user?.profile?.profile_picture_path) return `/storage/${user.profile.profile_picture_path}`;
    if (!user?.name) return 'https://ui-avatars.com/api/?name=User&background=random';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`;
};

export default function RdvList() {
    const { rdvs = [], status_filter, pagination = {} } = usePage().props;
    const [feedbackModal, setFeedbackModal] = useState(null);
    const [localRdvs, setLocalRdvs] = useState(rdvs);

    const activeTab = status_filter || 'en_cours';

    const switchTab = (tab) => {
        router.visit(`/staff/rdv?status=${tab}`, { preserveScroll: false });
    };

    const handleStatusUpdate = async (rdvId, status) => {
        try {
            const { data } = await (await import('axios')).default.patch(`/staff/rdv/${rdvId}/status`, { status });
            setLocalRdvs((prev) => prev.map((r) => (r.id === rdvId ? { ...r, status: data.rdv.status } : r)));
        } catch {
            // silently ignore – user sees no change
        }
    };

    return (
        <AppLayout>
            <Head title="RDV" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-rose-900">RDV</h1>
                        <p className="text-sm text-muted-foreground">Gérez vos rendez-vous et leurs retours.</p>
                    </div>
                </div>

                {/* Tab filter */}
                <div className="flex gap-2 border-b border-rose-100">
                    {TABS.map(({ key, label }) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => switchTab(key)}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === key
                                    ? 'border-rose-800 text-rose-900'
                                    : 'border-transparent text-muted-foreground hover:text-rose-700'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {localRdvs.length === 0 ? (
                    <Card className="border border-rose-100/60 shadow-sm">
                        <CardContent className="p-6 text-sm text-neutral-600">
                            Aucun RDV {STATUS_META[activeTab]?.label.toLowerCase() || ''} pour le moment.
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="border border-rose-100/60 shadow-sm">
                        <CardContent className="p-0">
                            <div className="hidden grid-cols-[1fr_1fr_120px_80px_200px] gap-4 border-b bg-rose-50/60 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-rose-900 lg:grid">
                                <div>Profils</div>
                                <div>Message</div>
                                <div>Statut</div>
                                <div>Feedbacks</div>
                                <div>Actions</div>
                            </div>
                            <div className="divide-y">
                                {localRdvs.map((rdv) => {
                                    const statusMeta = STATUS_META[rdv.status] ?? STATUS_META.en_cours;
                                    const feedbackCount = rdv.feedbacks?.length ?? 0;
                                    const alreadySubmitted = !rdv.can_add_feedback;

                                    return (
                                        <div
                                            key={rdv.id}
                                            className="grid grid-cols-1 gap-3 px-5 py-4 lg:grid-cols-[1fr_1fr_120px_80px_200px]"
                                        >
                                            {/* Profiles */}
                                            <div className="space-y-2">
                                                {[rdv.reference_user, rdv.compatible_user].map((u, i) =>
                                                    u ? (
                                                        <div key={i} className="flex items-center gap-2">
                                                            <img
                                                                src={getProfilePicture(u)}
                                                                alt={u.name}
                                                                className="h-7 w-7 rounded-full object-cover"
                                                            />
                                                            <div>
                                                                <div className="text-sm font-medium text-slate-900">{u.name}</div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    {i === 0 ? 'Référence' : 'Compatible'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : null
                                                )}
                                            </div>

                                            {/* Message */}
                                            <div className="text-sm text-muted-foreground">
                                                {rdv.message ? (
                                                    <span className="italic">"{rdv.message}"</span>
                                                ) : (
                                                    <span>—</span>
                                                )}
                                            </div>

                                            {/* Status */}
                                            <div>
                                                <Badge className={statusMeta.className}>{statusMeta.label}</Badge>
                                            </div>

                                            {/* Feedback count */}
                                            <div className="text-sm text-slate-700">{feedbackCount}</div>

                                            {/* Actions */}
                                            <div className="flex flex-col gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 border-rose-200 text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                                                    disabled={alreadySubmitted}
                                                    onClick={() => setFeedbackModal(rdv.id)}
                                                >
                                                    {alreadySubmitted ? 'Feedback envoyé' : 'Ajouter un feedback'}
                                                </Button>

                                                {rdv.status === 'en_cours' && (
                                                    <div className="flex gap-1.5">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-8 border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-xs"
                                                            onClick={() => handleStatusUpdate(rdv.id, 'reussi')}
                                                        >
                                                            Réussi
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-8 border-rose-200 text-rose-700 hover:bg-rose-50 text-xs"
                                                            onClick={() => handleStatusUpdate(rdv.id, 'echec')}
                                                        >
                                                            Échec
                                                        </Button>
                                                    </div>
                                                )}
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
                            onClick={() => router.visit(`/staff/rdv?status=${activeTab}&page=${pagination.current_page - 1}`)}
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
                            onClick={() => router.visit(`/staff/rdv?status=${activeTab}&page=${pagination.current_page + 1}`)}
                        >
                            Suivant
                        </Button>
                    </div>
                )}
            </div>

            {feedbackModal && (
                <MatchmakerFeedbackModal
                    open={Boolean(feedbackModal)}
                    rdvId={feedbackModal}
                    onClose={() => setFeedbackModal(null)}
                    onSuccess={() => {
                        setLocalRdvs((prev) =>
                            prev.map((r) =>
                                r.id === feedbackModal ? { ...r, can_add_feedback: false } : r
                            )
                        );
                        setFeedbackModal(null);
                    }}
                />
            )}
        </AppLayout>
    );
}
