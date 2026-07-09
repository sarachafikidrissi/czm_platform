import AppLayout from '@/layouts/app-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getBillStatusMeta } from '@/lib/bill-status';
import { Head, router, usePage } from '@inertiajs/react';
import { FileText } from 'lucide-react';

function formatDate(value) {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('fr-FR');
}

export default function StaffBillsList() {
    const { bills = [], pagination = {} } = usePage().props;

    return (
        <AppLayout>
            <Head title="Factures" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div>
                    <h1 className="text-2xl font-semibold text-rose-900">Factures</h1>
                    <p className="text-sm text-muted-foreground">Consultez les commandes de vos membres.</p>
                </div>

                {bills.length === 0 ? (
                    <Card className="border border-rose-100/60 shadow-sm">
                        <CardContent className="p-6 text-sm text-muted-foreground">Aucune facture.</CardContent>
                    </Card>
                ) : (
                    <Card className="border border-rose-100/60 shadow-sm">
                        <CardContent className="p-0">
                            <div className="hidden grid-cols-[1fr_1fr_120px_120px_100px] gap-4 border-b bg-rose-50/60 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-rose-900 lg:grid">
                                <div>Membre</div>
                                <div>Facture</div>
                                <div>Date</div>
                                <div>Montant</div>
                                <div>Statut</div>
                            </div>
                            <div className="divide-y">
                                {bills.map((bill) => {
                                    const statusMeta = getBillStatusMeta(bill.status);
                                    return (
                                        <div
                                            key={bill.id}
                                            className="grid cursor-pointer grid-cols-1 gap-3 px-5 py-4 transition-colors hover:bg-rose-50/40 lg:grid-cols-[1fr_1fr_120px_120px_100px]"
                                            onClick={() => router.visit(`/staff/bills/${bill.id}`)}
                                        >
                                            <div className="text-sm font-medium text-slate-900">
                                                {bill.member_name ?? '—'}
                                            </div>
                                            <div className="text-sm text-slate-700">{bill.bill_number}</div>
                                            <div className="text-sm">{formatDate(bill.bill_date)}</div>
                                            <div className="text-sm font-medium">
                                                {parseFloat(bill.total_amount).toLocaleString()} {bill.currency}
                                            </div>
                                            <div>
                                                <Badge className={statusMeta.className}>{statusMeta.label}</Badge>
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
                            onClick={() => router.visit(`/staff/bills?page=${pagination.current_page - 1}`)}
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
                            onClick={() => router.visit(`/staff/bills?page=${pagination.current_page + 1}`)}
                        >
                            Suivant
                        </Button>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
