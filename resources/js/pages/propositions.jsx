import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import {
    getPropositionResponseLabel,
    getPropositionStatusMeta,
} from '@/lib/proposition-status';
import { Head, router, usePage } from '@inertiajs/react';
import { User } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const getProfilePicture = (user) => {
    if (user?.profile?.profile_picture_path) {
        return `/storage/${user.profile.profile_picture_path}`;
    }
    if (!user?.name) return 'https://ui-avatars.com/api/?name=User&background=random';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`;
};

export default function PropositionsPage() {
    const { t } = useTranslation();
    const { propositions = [], pagination = {}, auth } = usePage().props;
    const currentUserId = auth?.user?.id;

    const getOtherUser = (proposition) => {
        if (Number(proposition.reference_user?.id) === Number(currentUserId)) {
            return proposition.compatible_user;
        }
        if (Number(proposition.compatible_user?.id) === Number(currentUserId)) {
            return proposition.reference_user;
        }
        return proposition.compatible_user || proposition.reference_user;
    };

    return (
        <AppLayout breadcrumbs={[{ title: t('breadcrumbs.propositions'), href: '/propositions' }]}>
            <Head title={t('breadcrumbs.propositions')} />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div>
                    <h1 className="text-2xl font-semibold text-rose-900">
                        {t('pages.propositions.title', { defaultValue: 'Propositions' })}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Consultez vos propositions et répondez depuis la page de détail.
                    </p>
                </div>

                {propositions.length === 0 ? (
                    <Card className="border border-rose-100/60 shadow-sm">
                        <CardContent className="p-6 text-sm text-neutral-600">
                            {t('pages.propositions.content', { defaultValue: 'Aucune proposition pour le moment.' })}
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="border border-rose-100/60 shadow-sm">
                        <CardContent className="p-0">
                            <div className="hidden grid-cols-[120px_1fr_1fr_140px_1fr_200px] gap-4 border-b bg-rose-50/60 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-rose-900 lg:grid">
                                <div>Date</div>
                                <div>Profil compatible</div>
                                <div>Matchmaker</div>
                                <div>Statut</div>
                                <div>Votre réponse</div>
                                <div>Actions</div>
                            </div>
                            <div className="divide-y">
                                {propositions.map((proposition) => {
                                    const other = getOtherUser(proposition);
                                    const otherProfileUrl = other?.username || other?.id
                                        ? `/profile/${other.username || other.id}`
                                        : null;
                                    const statusMeta = getPropositionStatusMeta(
                                        proposition.status,
                                        proposition.is_expired,
                                        proposition.user_response,
                                    );

                                    return (
                                        <div
                                            key={proposition.id}
                                            className="grid cursor-pointer grid-cols-1 gap-3 px-5 py-4 transition-colors hover:bg-rose-50/40 lg:grid-cols-[120px_1fr_1fr_140px_1fr_200px]"
                                            onClick={() => router.visit(`/propositions/${proposition.id}`)}
                                        >
                                            <div className="text-sm text-slate-700">
                                                <span className="text-xs font-semibold uppercase text-slate-400 lg:hidden">Date: </span>
                                                {new Date(proposition.created_at).toLocaleDateString('fr-FR')}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {other ? (
                                                    <>
                                                        <img
                                                            src={getProfilePicture(other)}
                                                            alt={other.name}
                                                            className="h-8 w-8 rounded-full object-cover"
                                                        />
                                                        <div>
                                                            {other.username ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        router.visit(`/profile/${other.username}`);
                                                                    }}
                                                                    className="text-left text-sm font-medium text-slate-900 transition-colors hover:text-[#890505] hover:underline"
                                                                >
                                                                    {other.name}
                                                                </button>
                                                            ) : (
                                                                <div className="text-sm font-medium text-slate-900">{other.name}</div>
                                                            )}
                                                            {other.username && (
                                                                <div className="text-xs text-muted-foreground">@{other.username}</div>
                                                            )}
                                                        </div>
                                                    </>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">—</span>
                                                )}
                                            </div>

                                            <div className="text-sm text-slate-700">
                                                {proposition.matchmaker?.name ?? '—'}
                                            </div>

                                            <div>
                                                <Badge className={statusMeta.className}>{statusMeta.label}</Badge>
                                            </div>

                                            <div className="text-sm text-slate-700">
                                                {getPropositionResponseLabel(
                                                    proposition.user_response,
                                                    proposition.response_message,
                                                )}
                                            </div>

                                            <div className="flex flex-col gap-1.5">
                                                {otherProfileUrl && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 border-rose-200 text-rose-700 hover:bg-rose-50"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            router.visit(otherProfileUrl);
                                                        }}
                                                    >
                                                        <User className="mr-1.5 h-3.5 w-3.5" />
                                                        Voir le profil
                                                    </Button>
                                                )}
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 border-rose-200 text-rose-700 hover:bg-rose-50"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        router.visit(`/propositions/${proposition.id}`);
                                                    }}
                                                >
                                                    {proposition.can_respond ? 'Répondre' : 'Voir détail'}
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
                            onClick={() => router.visit(`/propositions?page=${pagination.current_page - 1}`)}
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
                            onClick={() => router.visit(`/propositions?page=${pagination.current_page + 1}`)}
                        >
                            Suivant
                        </Button>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
