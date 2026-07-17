import AppLayout from '@/layouts/app-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getBillStatusMeta } from '@/lib/bill-status';
import { formatDateFr, formatSubscriptionValidity, staffProfilePath } from '@/lib/subscription-display';
import { Head, router, usePage } from '@inertiajs/react';
import { CreditCard, ShoppingCart } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

function StaffLink({ user, onNavigate }) {
    if (!user?.name) return <span className="text-slate-500">—</span>;
    const path = staffProfilePath(user);
    if (!path) return <span className="text-slate-700">{user.name}</span>;

    return (
        <button
            type="button"
            className="text-left text-sm font-medium text-[#890505] hover:underline"
            onClick={(e) => {
                e.stopPropagation();
                onNavigate(path);
            }}
        >
            {user.name}
        </button>
    );
}

export default function MesCommandes() {
    const { bills = [], pagination = {}, auth } = usePage().props;
    const { t } = useTranslation();
    const [showMatchmakerDialog, setShowMatchmakerDialog] = useState(false);
    const assignedMatchmaker = auth?.user?.assignedMatchmaker ?? auth?.user?.assigned_matchmaker ?? null;

    const visit = (path) => router.visit(path);

    return (
        <AppLayout>
            <Head title={t('orders.title')} />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div>
                    <h1 className="text-2xl font-semibold text-rose-900">{t('orders.title')}</h1>
                    <p className="text-sm text-muted-foreground">{t('orders.manageOrders')}</p>
                </div>

                {bills.length === 0 ? (
                    <Card className="border border-rose-100/60 shadow-sm">
                        <CardContent className="flex flex-col items-center py-10 text-center">
                            <ShoppingCart className="mb-4 h-12 w-12 text-muted-foreground" />
                            <h3 className="text-lg font-semibold">{t('orders.noOrders')}</h3>
                            <p className="mb-4 text-sm text-muted-foreground">{t('orders.noOrdersMessage')}</p>
                            <Button className="bg-[#890505] hover:bg-[#6d0404]" onClick={() => setShowMatchmakerDialog(true)}>
                                <CreditCard className="mr-2 h-4 w-4" />
                                {t('orders.becomeClient')}
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="border border-rose-100/60 shadow-sm">
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <div className="min-w-[960px]">
                                    <div className="grid grid-cols-[minmax(120px,1fr)_minmax(100px,0.9fr)_minmax(90px,0.8fr)_minmax(90px,0.8fr)_minmax(70px,0.5fr)_minmax(110px,0.8fr)_minmax(90px,0.7fr)_minmax(90px,0.7fr)] gap-3 border-b bg-rose-50/60 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-rose-900">
                                        <div>{t('orders.orderNumber')}</div>
                                        <div>{t('orders.pack')}</div>
                                        <div>Conseiller</div>
                                        <div>Agence</div>
                                        <div>Durée</div>
                                        <div>Validité</div>
                                        <div>{t('common.amount')}</div>
                                        <div>{t('common.status')}</div>
                                    </div>
                                    <div className="divide-y">
                                        {bills.map((bill) => {
                                            const statusMeta = getBillStatusMeta(bill.status);
                                            const overdue = bill.is_overdue === true;
                                            const validity = formatSubscriptionValidity(bill.subscription, bill.duration_months);
                                            const manager = bill.agency_manager ?? bill.matchmaker?.agency_manager;

                                            return (
                                                <div
                                                    key={bill.id}
                                                    className="grid cursor-pointer grid-cols-[minmax(120px,1fr)_minmax(100px,0.9fr)_minmax(90px,0.8fr)_minmax(90px,0.8fr)_minmax(70px,0.5fr)_minmax(110px,0.8fr)_minmax(90px,0.7fr)_minmax(90px,0.7fr)] gap-3 px-5 py-4 transition-colors hover:bg-rose-50/40"
                                                    onClick={() => router.visit(`/mes-commandes/${bill.id}`)}
                                                >
                                                    <div>
                                                        <div className="text-sm font-medium text-slate-900">{bill.order_number}</div>
                                                        <div className="text-xs text-muted-foreground">{formatDateFr(bill.bill_date)}</div>
                                                    </div>
                                                    <div className="text-sm text-slate-700">{bill.pack_name ?? '—'}</div>
                                                    <div>
                                                        <StaffLink user={bill.matchmaker} onNavigate={visit} />
                                                        {manager && (
                                                            <div className="mt-0.5 text-xs text-muted-foreground">
                                                                Resp.{' '}
                                                                <StaffLink user={manager} onNavigate={visit} />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="text-sm text-slate-600">
                                                        {bill.matchmaker?.agency?.name ?? '—'}
                                                    </div>
                                                    <div className="text-sm text-slate-700">
                                                        {bill.duration_months ? `${bill.duration_months} mois` : '—'}
                                                    </div>
                                                    <div>
                                                        <Badge className={validity.className}>{validity.label}</Badge>
                                                    </div>
                                                    <div className="text-sm font-medium">
                                                        {parseFloat(bill.total_amount).toLocaleString()} {bill.currency}
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <Badge className={statusMeta.className}>
                                                            {bill.status === 'paid' ? t('common.paid') : t('common.unpaid')}
                                                        </Badge>
                                                        {overdue && (
                                                            <Badge className="border border-rose-100 bg-rose-50 text-rose-700">
                                                                {t('common.overdue')}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
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
                            onClick={() => router.visit(`/mes-commandes?page=${pagination.current_page - 1}`)}
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
                            onClick={() => router.visit(`/mes-commandes?page=${pagination.current_page + 1}`)}
                        >
                            Suivant
                        </Button>
                    </div>
                )}

                <Dialog open={showMatchmakerDialog} onOpenChange={setShowMatchmakerDialog}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{t('orders.becomeClient')}</DialogTitle>
                            <DialogDescription>{t('orders.becomeClientDescription')}</DialogDescription>
                        </DialogHeader>
                        {assignedMatchmaker ? (
                            <div className="flex flex-col gap-4">
                                <p className="text-sm text-muted-foreground">{t('orders.becomeClientMessage')}</p>
                                <a
                                    href={assignedMatchmaker.username ? `/profile/${assignedMatchmaker.username}` : '/matchmaker'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full"
                                >
                                    <Button className="w-full">{t('orders.viewMatchmakerProfile')}</Button>
                                </a>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                <p className="text-sm text-muted-foreground">{t('orders.becomeClientNoMatchmaker')}</p>
                                <a href="/user/matchmakers" target="_blank" rel="noopener noreferrer" className="w-full">
                                    <Button className="w-full">{t('orders.chooseMatchmakerButton')}</Button>
                                </a>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
