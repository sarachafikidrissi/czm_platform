import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ShoppingCart, Package, CreditCard, CheckCircle, MoreHorizontal, Eye, Download, FileText, Mail } from 'lucide-react';
import { useState } from 'react';

export default function MesCommandes({ bills = [] }) {
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [showInvoice, setShowInvoice] = useState(false);

    const handleViewInvoice = (order) => {
        setSelectedInvoice(order);
        setShowInvoice(true);
    };

    const handleDownloadPDF = (bill) => {
        router.get(`/user/bills/${bill.id}/download`, {}, {
            onSuccess: (response) => {
                // Handle PDF download
                console.log('PDF download initiated for bill:', bill.bill_number);
            },
            onError: (errors) => {
                console.error('Error downloading PDF:', errors);
                alert('Erreur lors du téléchargement du PDF');
            }
        });
    };

    const handleSendEmail = (bill) => {
        router.post(`/user/bills/${bill.id}/send-email`, {}, {
            onSuccess: (response) => {
                alert('Facture envoyée par email avec succès');
            },
            onError: (errors) => {
                console.error('Error sending email:', errors);
                alert('Erreur lors de l\'envoi de l\'email');
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
            <Head title="Mes Commandes" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-bold">Mes Commandes</h1>
                        <Badge variant="outline" className="flex items-center gap-2">
                            <ShoppingCart className="w-4 h-4" />
                            Commandes
                        </Badge>
                    </div>
                </div>

                <div className="grid gap-4">
                    {/* Orders Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Package className="w-5 h-5" />
                                Vos Commandes
                            </CardTitle>
                            <CardDescription>
                                Gérez vos commandes et suivez leur statut
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {bills.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[120px]">Numéro de Commande</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Statut</TableHead>
                                            <TableHead>Date d'échéance</TableHead>
                                            <TableHead className="text-right">Montant</TableHead>
                                            <TableHead className="w-[100px]">Actions</TableHead>
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
                                                    <Badge 
                                                        className={`capitalize ${
                                                            bill.status === 'paid' 
                                                                ? 'bg-green-100 text-green-800' 
                                                                : 'bg-orange-100 text-orange-800'
                                                        }`}
                                                    >
                                                        {bill.status === 'paid' ? 'Payé' : 'Impayé'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span>{formatDate(bill.due_date)}</span>
                                                        {isOverdue(bill.due_date) && bill.status === 'unpaid' && (
                                                            <Badge variant="destructive" className="text-xs mt-1">
                                                                Expirée
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
                                                                Voir facture
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleDownloadPDF(bill)}>
                                                                <Download className="mr-2 h-4 w-4" />
                                                                Télécharger PDF
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleSendEmail(bill)}>
                                                                <Mail className="mr-2 h-4 w-4" />
                                                                Envoyer par email
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="text-center py-8">
                                    <ShoppingCart className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                        Aucune commande pour le moment
                                    </h3>
                                    <p className="text-gray-600 mb-4">
                                        Vous n'avez pas encore passé de commande. Découvrez nos services et devenez client pour accéder à nos offres.
                                    </p>
                                    <Button className="bg-primary hover:bg-primary/90">
                                        <CreditCard className="w-4 h-4 mr-2" />
                                        Devenir Client
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Membership Status Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CheckCircle className="w-5 h-5" />
                                Statut de votre Adhésion
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                <div>
                                    <h4 className="font-semibold">Adhésion Gratuite : Membre Passif</h4>
                                    <p className="text-sm text-gray-600">
                                        Vous bénéficiez de l'adhésion gratuite. Passez au statut client pour accéder à tous nos services.
                                    </p>
                                </div>
                                <Button variant="outline">
                                    Devenir Client
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Invoice Modal */}
                {showInvoice && selectedInvoice && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="p-8">
                                {/* Invoice Header */}
                                <div className="flex justify-between items-start mb-8">
                                    <div>
                                        <h1 className="text-2xl font-bold text-gray-900 mb-2">
                                            Centre Zawaj Maroc
                                        </h1>
                                        <p className="text-gray-600">Service de mariage et accompagnement matrimonial</p>
                                    </div>
                                    <div className="text-right">
                                        <h2 className="text-xl font-bold text-gray-900">FACTURE</h2>
                                        <p className="text-sm text-gray-600">N° {selectedInvoice.bill_number}</p>
                                    </div>
                                </div>

                                {/* Invoice Details */}
                                <div className="grid grid-cols-2 gap-8 mb-8">
                                    <div>
                                        <h3 className="font-semibold text-gray-900 mb-2">Détails de facturation</h3>
                                        <div className="space-y-1 text-sm">
                                            <p><strong>Nom:</strong> {selectedInvoice.user?.name}</p>
                                            <p><strong>Email:</strong> {selectedInvoice.user?.email}</p>
                                            <p><strong>Téléphone:</strong> {selectedInvoice.user?.phone}</p>
                                            <p><strong>Ville:</strong> {selectedInvoice.user?.city}</p>
                                            <p><strong>Pays:</strong> {selectedInvoice.user?.country}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 mb-2">Informations de la commande</h3>
                                        <div className="space-y-1 text-sm">
                                            <p><strong>Numéro de commande:</strong> {selectedInvoice.order_number}</p>
                                            <p><strong>Date:</strong> {formatDate(selectedInvoice.bill_date)}</p>
                                            <p><strong>Date d'échéance:</strong> {formatDate(selectedInvoice.due_date)}</p>
                                            <p><strong>Mode de paiement:</strong> {selectedInvoice.payment_method}</p>
                                            <p><strong>Pack choisi:</strong> {selectedInvoice.pack_name}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Order Details Table */}
                                <div className="mb-8">
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50">
                                                <th className="border border-gray-200 px-4 py-3 text-left font-semibold">Description</th>
                                                <th className="border border-gray-200 px-4 py-3 text-center font-semibold">Quantité</th>
                                                <th className="border border-gray-200 px-4 py-3 text-right font-semibold">Prix unitaire</th>
                                                <th className="border border-gray-200 px-4 py-3 text-right font-semibold">Montant</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td className="border border-gray-200 px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <Package className="w-4 h-4 text-blue-600" />
                                                        {selectedInvoice.pack_name}
                                                    </div>
                                                </td>
                                                <td className="border border-gray-200 px-4 py-3 text-center">1</td>
                                                <td className="border border-gray-200 px-4 py-3 text-right">
                                                    {parseFloat(selectedInvoice.amount).toLocaleString()} {selectedInvoice.currency}
                                                </td>
                                                <td className="border border-gray-200 px-4 py-3 text-right">
                                                    {parseFloat(selectedInvoice.amount).toLocaleString()} {selectedInvoice.currency}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                {/* Totals */}
                                <div className="flex justify-end mb-8">
                                    <div className="w-64 space-y-2">
                                        <div className="flex justify-between">
                                            <span>Sous-total:</span>
                                            <span>{parseFloat(selectedInvoice.amount).toLocaleString()} {selectedInvoice.currency}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>TVA ({selectedInvoice.tax_rate}%):</span>
                                            <span>{parseFloat(selectedInvoice.tax_amount).toLocaleString()} {selectedInvoice.currency}</span>
                                        </div>
                                        <div className="border-t pt-2">
                                            <div className="flex justify-between font-bold text-lg">
                                                <span>Total TTC:</span>
                                                <span>{parseFloat(selectedInvoice.total_amount).toLocaleString()} {selectedInvoice.currency}</span>
                                            </div>
                                        </div>
                                        <div className="flex justify-between font-bold text-lg text-blue-600">
                                            <span>Montant dû:</span>
                                            <span>{parseFloat(selectedInvoice.total_amount).toLocaleString()} {selectedInvoice.currency}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex justify-between items-center pt-6 border-t">
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <FileText className="w-4 h-4" />
                                        <span>Document généré le {new Date().toLocaleDateString('fr-FR')}</span>
                                    </div>
                                    <div className="flex gap-3">
                                        <Button 
                                            variant="outline" 
                                            onClick={() => handleDownloadPDF(selectedInvoice)}
                                        >
                                            <Download className="w-4 h-4 mr-2" />
                                            Télécharger PDF
                                        </Button>
                                        <Button onClick={() => setShowInvoice(false)}>
                                            Fermer
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
