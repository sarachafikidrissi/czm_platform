import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Package, CreditCard, CheckCircle } from 'lucide-react';

export default function MesCommandes() {
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
                        </CardContent>
                    </Card>

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
            </div>
        </AppLayout>
    );
}
