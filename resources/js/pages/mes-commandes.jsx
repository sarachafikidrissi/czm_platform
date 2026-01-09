import { Head, router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ShoppingCart, Package, CreditCard, CheckCircle, MoreHorizontal, Eye, Download, FileText, Mail } from 'lucide-react';
import { useState } from 'react';
import { Link } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

export default function MesCommandes({ bills = [] }) {
    const { auth } = usePage().props;
    const { t } = useTranslation();
    const { showToast } = useToast();
    const isLoading = bills === null || bills === undefined;
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [showInvoice, setShowInvoice] = useState(false);
    const [showMatchmakerDialog, setShowMatchmakerDialog] = useState(false);
    const assignedMatchmaker = auth?.user?.assignedMatchmaker ?? auth?.user?.assigned_matchmaker ?? null;

    const handleViewInvoice = (order) => {
        setSelectedInvoice(order);
        setShowInvoice(true);
    };

    const handleDownloadPDF = (bill) => {
        // Create a direct download link
        const downloadUrl = `/user/bills/${bill.id}/download`;
        
        // Create a temporary link element and trigger download
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `${bill.bill_number}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleSendEmail = (bill) => {
        router.post(`/user/bills/${bill.id}/send-email`, {}, {
            onSuccess: (response) => {
                showToast(t('orders.invoiceSentSuccess', { defaultValue: 'Success' }), undefined, 'success');
            },
            onError: (errors) => {
                console.error('Error sending email:', errors);
                showToast(t('orders.errorSendingEmail', { defaultValue: 'Error sending email' }), undefined, 'error');
            }
        });
    };

    const isOverdue = (dueDate) => {
        return new Date(dueDate) < new Date();
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('fr-FR');
    };

    return (
        <AppLayout>
            <Head title={t('orders.title')} />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4 sm:p-6 min-w-0 overflow-x-hidden">
                <div className="flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <h1 className="text-xl sm:text-2xl font-bold">{t('orders.title')}</h1>
                        <Badge variant="outline" className="flex items-center gap-2">
                            <ShoppingCart className="w-4 h-4" />
                            {t('orders.orders')}
                        </Badge>
                    </div>
                </div>

                <div className="grid gap-4 min-w-0">
                    {/* Pack Advantages Overview */}
                    {bills.length > 0 && bills.some(bill => bill.pack_advantages && bill.pack_advantages.length > 0) && (
                        <Card className="min-w-0">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <span className="text-xl sm:text-2xl">🎁</span>
                                    <span className="text-base sm:text-lg">{t('orders.includedAdvantages')}</span>
                                </CardTitle>
                                <CardDescription className="text-xs sm:text-sm">
                                    {t('orders.discoverAdvantages')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="min-w-0">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 min-w-0">
                                    {bills.map((bill) => (
                                        bill.pack_advantages && bill.pack_advantages.length > 0 && (
                                            <div key={bill.id} className="bg-info-light border border-info rounded-lg p-3 sm:p-4 min-w-0">
                                                <div className="flex items-center gap-2 mb-3 min-w-0">
                                                    <Package className="w-4 h-4 sm:w-5 sm:h-5 text-info flex-shrink-0" />
                                                    <h4 className="font-semibold text-info text-sm sm:text-base break-words min-w-0">{bill.pack_name}</h4>
                                                </div>
                                                <div className="space-y-2 min-w-0">
                                                    {bill.pack_advantages.map((advantage, index) => (
                                                        <div key={index} className="flex items-start gap-2 min-w-0">
                                                            <CheckCircle className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                                                            <span className="text-xs sm:text-sm text-foreground break-words min-w-0">{advantage}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="mt-3 pt-3 border-t border-info">
                                                    <div className="flex justify-between items-center min-w-0">
                                                        <span className="text-xs text-muted-foreground flex-shrink-0">{t('orders.order')}</span>
                                                        <span className="text-xs font-medium text-info break-all ml-2">{bill.order_number}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Orders Table */}
                    <Card className="min-w-0">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                                <Package className="w-4 h-4 sm:w-5 sm:h-5" />
                                {t('orders.yourOrders')}
                            </CardTitle>
                            <CardDescription className="text-xs sm:text-sm">
                                {t('orders.manageOrders')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="min-w-0">
                            {isLoading ? (
                                <>
                                    {/* Desktop Table View Skeleton */}
                                    <div className="hidden md:block overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-[120px]">{t('orders.orderNumber')}</TableHead>
                                                    <TableHead>{t('common.date')}</TableHead>
                                                    <TableHead>{t('orders.pack')}</TableHead>
                                                    <TableHead>{t('common.status')}</TableHead>
                                                    <TableHead>{t('orders.dueDate')}</TableHead>
                                                    <TableHead className="text-right">{t('common.amount')}</TableHead>
                                                    <TableHead className="w-[100px]">{t('common.actions')}</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {[1, 2, 3, 4, 5].map((i) => (
                                                    <TableRow key={i}>
                                                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                                        <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                                                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                                        <TableCell className="text-right"><Skeleton className="h-4 w-20" /></TableCell>
                                                        <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    {/* Mobile Card View Skeleton */}
                                    <div className="md:hidden space-y-4 min-w-0">
                                        {[1, 2, 3].map((i) => (
                                            <Card key={i} className="border min-w-0">
                                                <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
                                                    <div className="space-y-4 min-w-0">
                                                        <Skeleton className="h-4 w-3/4" />
                                                        <Skeleton className="h-4 w-1/2" />
                                                        <Skeleton className="h-6 w-20" />
                                                        <Skeleton className="h-4 w-full" />
                                                        <Skeleton className="h-4 w-2/3" />
                                                        <Skeleton className="h-4 w-1/2" />
                                                        <Skeleton className="h-9 w-full" />
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </>
                            ) : bills.length > 0 ? (
                                <>
                                    {/* Desktop Table View */}
                                    <div className="hidden md:block overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-[120px]">{t('orders.orderNumber')}</TableHead>
                                                    <TableHead>{t('common.date')}</TableHead>
                                                    <TableHead>{t('orders.pack')}</TableHead>
                                                    <TableHead>{t('common.status')}</TableHead>
                                                    <TableHead>{t('orders.dueDate')}</TableHead>
                                                    <TableHead className="text-right">{t('common.amount')}</TableHead>
                                                    <TableHead className="w-[100px]">{t('common.actions')}</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {bills.map((bill) => (
                                                    <TableRow key={bill.id}>
                                                        <TableCell className="font-medium">
                                                            {bill.order_number}
                                                        </TableCell>
                                                        <TableCell>
                                                            {formatDate(bill.bill_date)}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-col">
                                                                <span className="font-medium text-info">{bill.pack_name}</span>
                                                                {bill.pack_advantages && bill.pack_advantages.length > 0 && (
                                                                    <span className="text-xs text-muted-foreground">
                                                                        {bill.pack_advantages.length} {t('orders.advantage')}{bill.pack_advantages.length > 1 ? 's' : ''}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge 
                                                                className={`capitalize ${
                                                                    bill.status === 'paid' 
                                                                        ? 'bg-success-bg text-success' 
                                                                        : 'bg-warning-light text-warning-foreground'
                                                                }`}
                                                            >
                                                                {bill.status === 'paid' ? t('common.paid') : t('common.unpaid')}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-col">
                                                                <span>{formatDate(bill.due_date)}</span>
                                                                {isOverdue(bill.due_date) && bill.status === 'unpaid' && (
                                                                    <Badge variant="destructive" className="text-xs mt-1">
                                                                        {t('common.overdue')}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right font-medium">
                                                            {parseFloat(bill.total_amount).toLocaleString()} {bill.currency}
                                                        </TableCell>
                                                        <TableCell>
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                                        <MoreHorizontal className="h-4 w-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end">
                                                                    <DropdownMenuItem onClick={() => handleViewInvoice(bill)}>
                                                                        <Eye className="mr-2 h-4 w-4" />
                                                                        {t('orders.viewInvoice')}
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => handleDownloadPDF(bill)}>
                                                                        <Download className="mr-2 h-4 w-4" />
                                                                        {t('orders.downloadPDF')}
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => handleSendEmail(bill)}>
                                                                        <Mail className="mr-2 h-4 w-4" />
                                                                        {t('orders.sendEmail')}
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    
                                    {/* Mobile Card View */}
                                    <div className="md:hidden space-y-4 min-w-0">
                                        {bills.map((bill) => (
                                            <Card key={bill.id} className="border min-w-0">
                                                <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
                                                    <div className="space-y-4 min-w-0">
                                                        <div className="flex items-start justify-between gap-2 min-w-0">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                                    <Package className="w-4 h-4 text-info flex-shrink-0" />
                                                                    <span className="font-semibold text-sm whitespace-nowrap">{t('orders.orderNumber')}</span>
                                                                    <span className="font-medium text-sm break-all">{bill.order_number}</span>
                                                                </div>
                                                                <div className="text-xs sm:text-sm text-muted-foreground">
                                                                    {formatDate(bill.bill_date)}
                                                                </div>
                                                            </div>
                                                            <Badge 
                                                                className={`capitalize flex-shrink-0 ${
                                                                    bill.status === 'paid' 
                                                                        ? 'bg-success-bg text-success' 
                                                                        : 'bg-warning-light text-warning-foreground'
                                                                }`}
                                                            >
                                                                {bill.status === 'paid' ? t('common.paid') : t('common.unpaid')}
                                                            </Badge>
                                                        </div>
                                                        
                                                        <div className="border-t pt-3 space-y-2 min-w-0">
                                                            <div className="min-w-0">
                                                                <span className="text-xs text-muted-foreground">{t('orders.pack')}: </span>
                                                                <span className="font-medium text-info break-words">{bill.pack_name}</span>
                                                                {bill.pack_advantages && bill.pack_advantages.length > 0 && (
                                                                    <div className="text-xs text-muted-foreground mt-1">
                                                                        {bill.pack_advantages.length} {t('orders.advantage')}{bill.pack_advantages.length > 1 ? 's' : ''}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            
                                                            <div className="min-w-0">
                                                                <span className="text-xs text-muted-foreground">{t('orders.dueDate')}: </span>
                                                                <span className="text-sm">{formatDate(bill.due_date)}</span>
                                                                {isOverdue(bill.due_date) && bill.status === 'unpaid' && (
                                                                    <Badge variant="destructive" className="text-xs mt-1 ml-2 inline-block">
                                                                        {t('common.overdue')}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            
                                                            <div className="flex items-center justify-between pt-2 min-w-0">
                                                                <span className="text-xs text-muted-foreground flex-shrink-0">{t('common.amount')}:</span>
                                                                <span className="font-semibold text-base sm:text-lg break-all ml-2">
                                                                    {parseFloat(bill.total_amount).toLocaleString()} {bill.currency}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="flex flex-col gap-2 pt-2 border-t">
                                                            <Button 
                                                                variant="outline" 
                                                                size="sm" 
                                                                className="w-full text-xs sm:text-sm"
                                                                onClick={() => handleViewInvoice(bill)}
                                                            >
                                                                <Eye className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                                                                {t('orders.viewInvoice')}
                                                            </Button>
                                                            <Button 
                                                                variant="outline" 
                                                                size="sm" 
                                                                className="w-full text-xs sm:text-sm"
                                                                onClick={() => handleDownloadPDF(bill)}
                                                            >
                                                                <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                                                                {t('orders.downloadPDF')}
                                                            </Button>
                                                            <Button 
                                                                variant="outline" 
                                                                size="sm" 
                                                                className="w-full text-xs sm:text-sm"
                                                                onClick={() => handleSendEmail(bill)}
                                                            >
                                                                <Mail className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                                                                {t('orders.sendEmail')}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-8">
                                    <ShoppingCart className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                                    <h3 className="text-lg font-semibold text-foreground mb-2">
                                        {t('orders.noOrders')}
                                    </h3>
                                    <p className="text-muted-foreground mb-4">
                                        {t('orders.noOrdersMessage')}
                                    </p>
                                    <Button 
                                        className="bg-[#890505]! hover:bg-[#096725]!"
                                        onClick={() => setShowMatchmakerDialog(true)}
                                    >
                                        <CreditCard className="w-4 h-4 mr-2" />
                                        {t('orders.becomeClient')}
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Membership Status Card */}
                    {/* <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CheckCircle className="w-5 h-5" />
                                Statut de votre Adhésion
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                                <div>
                                    <h4 className="font-semibold">Adhésion Gratuite : Membre Passif</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Vous bénéficiez de l'adhésion gratuite. Passez au statut client pour accéder à tous nos services.
                                    </p>
                                </div>
                                <Button variant="outline" className="bg-[#890505]! hover:bg-[#096725]! text-white hover:text-white">
                                    Devenir Client
                                </Button>
                            </div>
                        </CardContent>
                    </Card> */}
                </div>

                {/* Invoice Modal */}
                {showInvoice && selectedInvoice && (
                    <div className="fixed inset-0 bg-foreground/50 flex items-center justify-center z-50 p-2 sm:p-4">
                        <div className="bg-card rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="p-4 sm:p-6 lg:p-8">
                                {/* Invoice Header */}
                                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6 sm:mb-8">
                                    <div>
                                        <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
                                            {t('common.centreZawajMaroc')}
                                        </h1>
                                        <p className="text-sm sm:text-base text-muted-foreground">{t('orders.marriageService')}</p>
                                    </div>
                                    <div className="text-left sm:text-right">
                                        <h2 className="text-lg sm:text-xl font-bold text-foreground">{t('orders.invoice')}</h2>
                                        <p className="text-xs sm:text-sm text-muted-foreground">N° {selectedInvoice.bill_number}</p>
                                    </div>
                                </div>

                                {/* Invoice Details */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 mb-6 sm:mb-8">
                                    <div>
                                        <h3 className="font-semibold text-gray-900 mb-2">{t('orders.billingDetails')}</h3>
                                        <div className="space-y-1 text-sm">
                                            <p><strong>{t('common.name')}:</strong> {selectedInvoice.user?.name}</p>
                                            <p><strong>{t('common.email')}:</strong> {selectedInvoice.user?.email}</p>
                                            <p><strong>{t('common.phone')}:</strong> {selectedInvoice.user?.phone}</p>
                                            <p><strong>{t('orders.city')}:</strong> {selectedInvoice.user?.city}</p>
                                            <p><strong>{t('orders.country')}:</strong> {selectedInvoice.user?.country}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 mb-2">{t('orders.orderInformation')}</h3>
                                        <div className="space-y-1 text-sm">
                                            <p><strong>{t('orders.orderNumber')}:</strong> {selectedInvoice.order_number}</p>
                                            <p><strong>{t('common.date')}:</strong> {formatDate(selectedInvoice.bill_date)}</p>
                                            <p><strong>{t('orders.dueDate')}:</strong> {formatDate(selectedInvoice.due_date)}</p>
                                            <p><strong>{t('orders.paymentMethod')}:</strong> {selectedInvoice.payment_method}</p>
                                            <p><strong>{t('orders.chosenPack')}:</strong> {selectedInvoice.pack_name}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Pack Advantages */}
                                {selectedInvoice.pack_advantages && selectedInvoice.pack_advantages.length > 0 && (
                                    <div className="mb-8">
                                        <div className="bg-primary text-primary-foreground p-6 rounded-xl mb-6 shadow-lg">
                                            <div className="text-center">
                                                <div className="text-4xl mb-2">🎁</div>
                                                <h3 className="text-xl font-bold mb-2">{t('orders.includedAdvantagesTitle')}</h3>
                                                <p className="text-primary-foreground/80 text-sm">{t('orders.enjoyExclusive')}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {selectedInvoice.pack_advantages.map((advantage, index) => (
                                                <div key={index} className="bg-success-bg border-2 border-success rounded-xl p-4 flex items-start shadow-sm hover:shadow-md transition-shadow">
                                                    <div className="bg-success rounded-full p-1 mr-4 flex-shrink-0">
                                                        <CheckCircle className="w-4 h-4 text-success-foreground" />
                                                    </div>
                                                    <span className="text-success font-medium">{advantage}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-6 bg-warning-light border border-warning rounded-lg p-4">
                                            <div className="flex items-center gap-2">
                                                <span className="text-2xl">💡</span>
                                                <p className="text-warning-foreground font-medium">
                                                    {t('orders.helpFindSoulmate')}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Payment Reminder */}
                                <div className="bg-warning-light border border-warning rounded-lg p-4 mb-6">
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl">⏰</span>
                                        <div>
                                            <h3 className="font-semibold text-warning-foreground">{t('orders.paymentPending')}</h3>
                                            <p className="text-warning-foreground text-sm">
                                                {t('orders.pleasePayBefore', { date: formatDate(selectedInvoice.due_date) })}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Order Details Table */}
                                <div className="mb-8 overflow-x-auto">
                                    <table className="w-full border-collapse min-w-[640px]">
                                        <thead>
                                            <tr className="bg-muted">
                                                <th className="border border-border px-2 sm:px-4 py-2 sm:py-3 text-left font-semibold text-xs sm:text-sm">{t('orders.description')}</th>
                                                <th className="border border-border px-2 sm:px-4 py-2 sm:py-3 text-center font-semibold text-xs sm:text-sm">{t('orders.quantity')}</th>
                                                <th className="border border-border px-2 sm:px-4 py-2 sm:py-3 text-right font-semibold text-xs sm:text-sm">{t('orders.unitPrice')}</th>
                                                <th className="border border-border px-2 sm:px-4 py-2 sm:py-3 text-right font-semibold text-xs sm:text-sm">{t('common.amount')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td className="border border-border px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <Package className="w-4 h-4 text-info flex-shrink-0" />
                                                        {selectedInvoice.pack_name}
                                                    </div>
                                                </td>
                                                <td className="border border-border px-2 sm:px-4 py-2 sm:py-3 text-center text-xs sm:text-sm">1</td>
                                                <td className="border border-border px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm">
                                                    {parseFloat(selectedInvoice.amount).toLocaleString()} {selectedInvoice.currency}
                                                </td>
                                                <td className="border border-border px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm">
                                                    {parseFloat(selectedInvoice.amount).toLocaleString()} {selectedInvoice.currency}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                {/* Totals */}
                                <div className="flex justify-end mb-6 sm:mb-8">
                                    <div className="w-full sm:w-64 space-y-2">
                                        <div className="flex justify-between">
                                            <span>{t('orders.subtotal')}</span>
                                            <span>{parseFloat(selectedInvoice.amount).toLocaleString()} {selectedInvoice.currency}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>{t('orders.vat', { rate: selectedInvoice.tax_rate })}</span>
                                            <span>{parseFloat(selectedInvoice.tax_amount).toLocaleString()} {selectedInvoice.currency}</span>
                                        </div>
                                        <div className="border-t pt-2">
                                            <div className="flex justify-between font-bold text-lg">
                                                <span>{t('orders.totalIncludingTax')}</span>
                                                <span>{parseFloat(selectedInvoice.total_amount).toLocaleString()} {selectedInvoice.currency}</span>
                                            </div>
                                        </div>
                                        <div className="flex justify-between font-bold text-lg text-info">
                                            <span>{t('orders.amountDue')}</span>
                                            <span>{parseFloat(selectedInvoice.total_amount).toLocaleString()} {selectedInvoice.currency}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-6 border-t">
                                    <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                                        <FileText className="w-4 h-4" />
                                        <span>{t('orders.documentGenerated')} {new Date().toLocaleDateString('fr-FR')}</span>
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                                        <Button 
                                            variant="outline" 
                                            className="w-full sm:w-auto"
                                            onClick={() => handleDownloadPDF(selectedInvoice)}
                                        >
                                            <Download className="w-4 h-4 mr-2" />
                                            {t('orders.downloadPDF')}
                                        </Button>
                                        <Button 
                                            className="w-full sm:w-auto"
                                            onClick={() => setShowInvoice(false)}
                                        >
                                            {t('common.close')}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Matchmaker Contact Dialog */}
                <Dialog open={showMatchmakerDialog} onOpenChange={setShowMatchmakerDialog}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{t('orders.becomeClient')}</DialogTitle>
                            <DialogDescription>
                                {t('orders.becomeClientDescription')}
                            </DialogDescription>
                        </DialogHeader>
                        {assignedMatchmaker ? (
                            <div className="flex flex-col gap-4">
                                <p className="text-sm text-muted-foreground">
                                    {t('orders.becomeClientMessage')}
                                </p>
                                <a 
                                    href={assignedMatchmaker.username ? `/profile/${assignedMatchmaker.username}` : '/matchmaker'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full"
                                >
                                    <Button className="w-full">
                                        {t('orders.viewMatchmakerProfile')}
                                    </Button>
                                </a>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                <p className="text-sm text-muted-foreground">
                                    {t('orders.becomeClientNoMatchmaker')}
                                </p>
                                <a href="/user/matchmakers" target="_blank" rel="noopener noreferrer" className="w-full">
                                    <Button className="w-full">
                                        {t('orders.chooseMatchmakerButton')}
                                    </Button>
                                </a>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
