import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { Head, router, usePage } from '@inertiajs/react';
import { ArrowLeft, Building, Check, Mail } from 'lucide-react';
import { formatSubscriptionValidity, staffProfilePath } from '@/lib/subscription-display';

function MatchmakerContactBar({ matchmaker, agencyManager }) {
    if (!matchmaker) {
        return null;
    }

    const matchmakerPath = staffProfilePath(matchmaker);
    const managerPath = staffProfilePath(agencyManager);

    return (
        <Card className="border border-rose-100/60 bg-rose-50/20 shadow-sm">
            <CardContent className="py-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Matchmaker assigné
                        </p>
                        {matchmakerPath ? (
                            <button
                                type="button"
                                className="mt-1 text-base font-semibold text-[#890505] hover:underline"
                                onClick={() => router.visit(matchmakerPath)}
                            >
                                {matchmaker.name}
                            </button>
                        ) : (
                            <p className="mt-1 text-base font-semibold">{matchmaker.name}</p>
                        )}
                        {matchmaker.agency?.name && (
                            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                                <Building className="h-3.5 w-3.5" />
                                {matchmaker.agency.name}
                            </p>
                        )}
                        {agencyManager?.name && (
                            <p className="mt-1 text-sm text-muted-foreground">
                                Manager :{' '}
                                {managerPath ? (
                                    <button
                                        type="button"
                                        className="font-medium text-[#890505] hover:underline"
                                        onClick={() => router.visit(managerPath)}
                                    >
                                        {agencyManager.name}
                                    </button>
                                ) : (
                                    agencyManager.name
                                )}
                            </p>
                        )}
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                        {matchmaker.email && (
                            <a href={`mailto:${matchmaker.email}`} className="text-sm text-[#890505] hover:underline">
                                <Mail className="mr-1 inline h-4 w-4" />
                                {matchmaker.email}
                            </a>
                        )}
                        {matchmaker.phone && (
                            <a href={`tel:${matchmaker.phone}`} className="text-sm text-[#890505] hover:underline">
                                {matchmaker.phone}
                            </a>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function formatDate(value) {
    if (!value) return 'N/A';
    return new Date(value).toLocaleDateString('fr-FR');
}

function statusBadge(status) {
    if (status === 'active') return { label: 'Actif', className: 'bg-emerald-50 text-emerald-700 border border-emerald-100' };
    if (status === 'expired') return { label: 'Expiré', className: 'bg-rose-50 text-rose-700 border border-rose-100' };
    return { label: 'Annulé', className: 'bg-slate-100 text-slate-700 border border-slate-200' };
}

export default function SubscriptionShow() {
    const { subscription, viewerRole, backUrl } = usePage().props;
    const meta = statusBadge(subscription.status);
    const isStaff = viewerRole !== 'user';

    return (
        <AppLayout>
            <Head title="Détail abonnement" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4 sm:p-6">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={() => router.visit(backUrl)}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Retour
                    </Button>
                    <div>
                        <h1 className="text-xl font-semibold text-rose-900 sm:text-2xl">Abonnement</h1>
                        <p className="text-sm text-muted-foreground">
                            {subscription.matrimonial_pack?.name ?? 'Pack matrimonial'}
                        </p>
                    </div>
                    <Badge className={`ml-auto ${meta.className}`}>{meta.label}</Badge>
                </div>

                {isStaff && subscription.member?.username && (
                    <Card className="border border-rose-100/60 shadow-sm">
                        <CardContent className="py-4 text-sm">
                            Membre :{' '}
                            <button
                                type="button"
                                className="font-medium text-[#890505] hover:underline"
                                onClick={() => router.visit(`/profile/${subscription.member.username}`)}
                            >
                                {subscription.member.name}
                            </button>
                        </CardContent>
                    </Card>
                )}

                <Card className="border border-rose-100/60 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base text-rose-900">Informations</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
                        <p><span className="text-muted-foreground">Début :</span> {formatDate(subscription.subscription_start)}</p>
                        <p><span className="text-muted-foreground">Fin :</span> {formatDate(subscription.subscription_end)}</p>
                        <p><span className="text-muted-foreground">Durée :</span> {subscription.duration_months} mois</p>
                        <p><span className="text-muted-foreground">Prix :</span> {subscription.pack_price} MAD</p>
                        <p><span className="text-muted-foreground">Mode de paiement :</span> {subscription.payment_mode ?? '—'}</p>
                        {subscription.days_remaining != null && subscription.days_remaining > 0 && (
                            <p><span className="text-muted-foreground">Jours restants :</span> {subscription.days_remaining}</p>
                        )}
                        <p>
                            <span className="text-muted-foreground">Validité :</span>{' '}
                            {formatSubscriptionValidity(subscription, subscription.duration_months).label}
                        </p>
                        {subscription.bill_id && (
                            <p>
                                <span className="text-muted-foreground">Commande :</span>{' '}
                                <button
                                    type="button"
                                    className="font-medium text-[#890505] hover:underline"
                                    onClick={() => router.visit(`/mes-commandes/${subscription.bill_id}`)}
                                >
                                    {subscription.bill_order_number ?? 'Voir la facture'}
                                </button>
                            </p>
                        )}
                    </CardContent>
                </Card>

                <MatchmakerContactBar
                    matchmaker={subscription.assigned_matchmaker}
                    agencyManager={subscription.agency_manager}
                />

                {subscription.pack_advantages?.length > 0 && (
                    <Card className="border border-rose-100/60 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-base text-rose-900">Avantages</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {subscription.pack_advantages.map((advantage, index) => (
                                <div key={index} className="flex items-center gap-2 text-sm">
                                    <Check className="h-4 w-4 text-emerald-600" />
                                    {advantage}
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}

                {isStaff && subscription.notes && (
                    <Card className="border border-rose-100/60 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-base text-rose-900">Notes internes</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm whitespace-pre-wrap">{subscription.notes}</CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}
