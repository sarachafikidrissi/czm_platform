import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import { getBillStatusMeta } from '@/lib/bill-status';
import { formatDateFr, formatSubscriptionValidity, staffProfilePath } from '@/lib/subscription-display';
import { Head, router, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    Building,
    CheckCircle,
    Download,
    Mail,
    Package,
    UserCheck,
} from 'lucide-react';

function MatchmakerContactBar({ matchmaker, agencyManager }) {
    if (!matchmaker) {
        return (
            <Card className="border border-rose-100/60 bg-rose-50/20 shadow-sm">
                <CardContent className="py-4 text-sm text-muted-foreground">Aucun conseiller assigné.</CardContent>
            </Card>
        );
    }

    const matchmakerPath = staffProfilePath(matchmaker);
    const managerPath = staffProfilePath(agencyManager ?? matchmaker?.agency_manager);

    return (
        <Card className="border border-rose-100/60 bg-rose-50/20 shadow-sm">
            <CardContent className="py-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Conseiller responsable
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
                            <p className="mt-1 text-base font-semibold text-slate-900">{matchmaker.name}</p>
                        )}
                        {matchmaker.agency?.name && (
                            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                                <Building className="h-3.5 w-3.5 shrink-0" />
                                {matchmaker.agency.name}
                            </p>
                        )}
                        {(agencyManager ?? matchmaker.agency_manager)?.name && (
                            <p className="mt-1 text-sm text-muted-foreground">
                                Manager :{' '}
                                {managerPath ? (
                                    <button
                                        type="button"
                                        className="font-medium text-[#890505] hover:underline"
                                        onClick={() => router.visit(managerPath)}
                                    >
                                        {(agencyManager ?? matchmaker.agency_manager).name}
                                    </button>
                                ) : (
                                    (agencyManager ?? matchmaker.agency_manager).name
                                )}
                            </p>
                        )}
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                        {matchmaker.email && (
                            <a
                                href={`mailto:${matchmaker.email}`}
                                className="inline-flex items-center gap-2 rounded-md border border-rose-100 bg-white px-3 py-2 text-sm text-[#890505] hover:bg-rose-50"
                            >
                                <Mail className="h-4 w-4 shrink-0" />
                                {matchmaker.email}
                            </a>
                        )}
                        {matchmaker.phone && (
                            <a
                                href={`tel:${matchmaker.phone}`}
                                className="inline-flex items-center gap-2 rounded-md border border-rose-100 bg-white px-3 py-2 text-sm text-[#890505] hover:bg-rose-50"
                            >
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
    if (!value) return '—';
    return new Date(value).toLocaleDateString('fr-FR');
}

export default function BillShow() {
    const { bill, viewerRole, backUrl, downloadUrl, sendEmailUrl, markAsClientUrl } = usePage().props;
    const statusMeta = getBillStatusMeta(bill.status);
    const isStaff = viewerRole !== 'user';

    const handleMarkPaid = () => {
        if (!bill.member_user_id) return;
        router.post(markAsClientUrl, { user_id: bill.member_user_id }, { preserveScroll: true });
    };

    return (
        <AppLayout>
            <Head title={`Facture ${bill.bill_number}`} />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="sm" onClick={() => router.visit(backUrl)}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Retour
                        </Button>
                        <div>
                            <h1 className="text-xl font-semibold text-rose-900 sm:text-2xl">
                                Facture {bill.bill_number}
                            </h1>
                            <p className="text-sm text-muted-foreground">Commande {bill.order_number}</p>
                        </div>
                    </div>
                    <Badge className={statusMeta.className}>{statusMeta.label}</Badge>
                </div>

                {isStaff && bill.user && (
                    <Card className="border border-rose-100/60 shadow-sm">
                        <CardContent className="py-4 text-sm">
                            <span className="text-muted-foreground">Membre : </span>
                            {bill.user.username ? (
                                <button
                                    type="button"
                                    className="font-medium text-[#890505] hover:underline"
                                    onClick={() => router.visit(`/profile/${bill.user.username}`)}
                                >
                                    {bill.user.name}
                                </button>
                            ) : (
                                <span className="font-medium">{bill.user.name}</span>
                            )}
                        </CardContent>
                    </Card>
                )}

                <div className="grid gap-4 lg:grid-cols-2">
                    <Card className="border border-rose-100/60 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-base text-rose-900">Informations de facturation</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <p><span className="text-muted-foreground">Nom :</span> {bill.user?.name ?? '—'}</p>
                            <p><span className="text-muted-foreground">Email :</span> {bill.user?.email ?? '—'}</p>
                            <p><span className="text-muted-foreground">Téléphone :</span> {bill.user?.phone ?? '—'}</p>
                            <p><span className="text-muted-foreground">Ville :</span> {bill.user?.city ?? '—'}</p>
                            <p><span className="text-muted-foreground">Pays :</span> {bill.user?.country ?? '—'}</p>
                        </CardContent>
                    </Card>

                    <Card className="border border-rose-100/60 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-base text-rose-900">Détails commande</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <p><span className="text-muted-foreground">Date :</span> {formatDate(bill.bill_date)}</p>
                            <p><span className="text-muted-foreground">Échéance :</span> {formatDate(bill.due_date)}</p>
                            {bill.is_overdue && bill.status !== 'paid' && (
                                <Badge className="bg-rose-50 text-rose-700 border border-rose-100">En retard</Badge>
                            )}
                            <p><span className="text-muted-foreground">Mode de paiement :</span> {bill.payment_method ?? '—'}</p>
                            <p><span className="text-muted-foreground">Pack :</span> {bill.pack_name ?? '—'}</p>
                        </CardContent>
                    </Card>
                </div>

                {bill.pack_advantages?.length > 0 && (
                    <Card className="border border-rose-100/60 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base text-rose-900">
                                <Package className="h-4 w-4" />
                                Avantages inclus
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-2 md:grid-cols-2">
                                {bill.pack_advantages.map((advantage, index) => (
                                    <div key={index} className="flex items-start gap-2 rounded-lg bg-rose-50/40 p-3 text-sm">
                                        <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                                        <span>{advantage}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {(bill.subscription || bill.duration_months) && (
                    <Card className="border border-rose-100/60 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-base text-rose-900">Abonnement associé</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-wrap items-center gap-3 text-sm">
                            {bill.duration_months && (
                                <span><span className="text-muted-foreground">Durée :</span> {bill.duration_months} mois</span>
                            )}
                            {bill.subscription?.subscription_end && (
                                <span><span className="text-muted-foreground">Fin :</span> {formatDateFr(bill.subscription.subscription_end)}</span>
                            )}
                            <Badge className={formatSubscriptionValidity(bill.subscription, bill.duration_months).className}>
                                {formatSubscriptionValidity(bill.subscription, bill.duration_months).label}
                            </Badge>
                            {bill.subscription?.id && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-rose-200"
                                    onClick={() => router.visit(`/user/subscription/${bill.subscription.id}`)}
                                >
                                    Voir l&apos;abonnement
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                )}

                <MatchmakerContactBar matchmaker={bill.matchmaker} agencyManager={bill.agency_manager} />

                <Card className="border border-rose-100/60 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base text-rose-900">Montants</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span>Sous-total HT</span>
                            <span>{parseFloat(bill.amount).toLocaleString()} {bill.currency}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>TVA ({bill.tax_rate}%)</span>
                            <span>{parseFloat(bill.tax_amount).toLocaleString()} {bill.currency}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between text-base font-semibold">
                            <span>Total TTC</span>
                            <span>{parseFloat(bill.total_amount).toLocaleString()} {bill.currency}</span>
                        </div>
                        {bill.status !== 'paid' && (
                            <div className="flex justify-between font-medium text-rose-700">
                                <span>Montant dû</span>
                                <span>{parseFloat(bill.total_amount).toLocaleString()} {bill.currency}</span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {bill.status !== 'paid' && viewerRole === 'user' && (
                    <Card className="border border-amber-200 bg-amber-50/50">
                        <CardContent className="py-4 text-sm text-amber-900">
                            Paiement en attente — merci de régler avant le {formatDate(bill.due_date)}.
                        </CardContent>
                    </Card>
                )}

                <div className="flex flex-wrap gap-2">
                    {bill.can_download && (
                        <Button variant="outline" className="border-rose-200" asChild>
                            <a href={downloadUrl}>
                                <Download className="mr-2 h-4 w-4" />
                                Télécharger PDF
                            </a>
                        </Button>
                    )}
                    {bill.can_resend_email && (
                        <Button
                            variant="outline"
                            className="border-rose-200"
                            onClick={() => router.post(sendEmailUrl, {}, { preserveScroll: true })}
                        >
                            <Mail className="mr-2 h-4 w-4" />
                            Renvoyer par email
                        </Button>
                    )}
                    {bill.can_mark_paid && (
                        <Button className="bg-[#890505] hover:bg-[#6d0404]" onClick={handleMarkPaid}>
                            <UserCheck className="mr-2 h-4 w-4" />
                            Marquer comme client
                        </Button>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
