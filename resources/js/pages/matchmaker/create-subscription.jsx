import AppLayout from '@/layouts/app-layout';
import { Head, usePage, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, ArrowLeft } from 'lucide-react';

export default function CreateSubscription() {
    const { user, profile, matrimonialPacks } = usePage().props;
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [subscriptionData, setSubscriptionData] = useState({
        matrimonial_pack_id: profile?.matrimonial_pack_id?.toString() || '',
        pack_price: profile?.pack_price || '',
        pack_advantages: profile?.pack_advantages || [],
        payment_mode: profile?.payment_mode || ''
    });

    const handleAdvantageChange = (advantage, checked) => {
        setSubscriptionData(prev => {
            const advantages = prev.pack_advantages || [];
            if (checked) {
                return { ...prev, pack_advantages: [...advantages, advantage] };
            } else {
                return { ...prev, pack_advantages: advantages.filter(a => a !== advantage) };
            }
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (!subscriptionData.matrimonial_pack_id || !subscriptionData.pack_price || 
            !subscriptionData.pack_advantages.length || !subscriptionData.payment_mode) {
            alert('Veuillez remplir tous les champs requis.');
            return;
        }

        setLoading(true);
        
        router.post('/staff/create-bill', {
            user_id: user.id,
            ...subscriptionData
        }, {
            onSuccess: () => {
                // Redirect back to user profile
                router.visit(`/profile/${user.username}`);
            },
            onError: (errors) => {
                console.error('Error creating subscription:', errors);
                alert('Erreur lors de la création de la facture. Veuillez réessayer.');
                setLoading(false);
            }
        });
    };

    const advantagesList = [
        'Suivi et accompagnement personnalisé',
        'Suivi et accompagnement approfondi',
        'Suivi et accompagnement premium',
        'Suivi et accompagnement exclusif avec assistance personnalisée',
        'Rendez-vous avec des profils compatibles',
        'Rendez-vous avec des profils correspondant à vos attentes',
        'Rendez-vous avec des profils soigneusement sélectionnés',
        'Rendez-vous illimités avec des profils rigoureusement sélectionnés',
        'Formations pré-mariage avec le profil choisi',
        'Formations pré-mariage avancées avec le profil choisi',
        'Accès prioritaire aux nouveaux profils',
        'Accès prioritaire aux profils VIP',
        'Réduction à vie sur les séances de conseil conjugal et coaching familial (-10% à -25%)'
    ];

    return (
        <AppLayout>
            <Head title="Créer un Abonnement" />
            
            <div className="container mx-auto py-6 px-4 max-w-4xl">
                <div className="mb-6">
                    <Button
                        variant="ghost"
                        onClick={() => router.visit(`/profile/${user.username}`)}
                        className="mb-4"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Retour au profil
                    </Button>
                    <h1 className="text-2xl font-bold">Créer un Abonnement</h1>
                    <p className="text-muted-foreground mt-1">
                        Créez une facture pour {user.name}. L'abonnement sera créé après paiement.
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CreditCard className="w-5 h-5" />
                            Informations de l'Abonnement
                        </CardTitle>
                        <CardDescription>
                            Remplissez les informations pour créer la facture d'abonnement
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Matrimonial Pack Selection */}
                            <div className="space-y-2">
                                <Label htmlFor="matrimonial_pack">Pack Matrimonial *</Label>
                                <Select 
                                    value={subscriptionData.matrimonial_pack_id} 
                                    onValueChange={(value) => setSubscriptionData(prev => ({ ...prev, matrimonial_pack_id: value }))}
                                    required
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner un pack" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {matrimonialPacks && matrimonialPacks.map((pack) => (
                                            <SelectItem key={pack.id} value={pack.id.toString()}>
                                                {pack.name} - {pack.duration} mois
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Pack Price */}
                            <div className="space-y-2">
                                <Label htmlFor="pack_price">Prix du Pack (MAD) *</Label>
                                <Input
                                    id="pack_price"
                                    type="number"
                                    value={subscriptionData.pack_price}
                                    onChange={(e) => setSubscriptionData(prev => ({ ...prev, pack_price: e.target.value }))}
                                    placeholder="Entrez le prix"
                                    required
                                    min="0"
                                    step="0.01"
                                />
                            </div>

                            {/* Pack Advantages */}
                            <div className="space-y-2">
                                <Label>Avantages du Pack *</Label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 border rounded-lg max-h-96 overflow-y-auto">
                                    {advantagesList.map((advantage) => (
                                        <div key={advantage} className="flex items-start space-x-2">
                                            <Checkbox
                                                id={advantage}
                                                checked={subscriptionData.pack_advantages.includes(advantage)}
                                                onCheckedChange={(checked) => handleAdvantageChange(advantage, checked)}
                                                className="mt-1"
                                            />
                                            <Label htmlFor={advantage} className="text-sm font-normal cursor-pointer">
                                                {advantage}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                                {subscriptionData.pack_advantages.length === 0 && (
                                    <p className="text-sm text-destructive">Veuillez sélectionner au moins un avantage</p>
                                )}
                            </div>

                            {/* Payment Mode */}
                            <div className="space-y-2">
                                <Label htmlFor="payment_mode">Mode de Paiement *</Label>
                                <Select 
                                    value={subscriptionData.payment_mode} 
                                    onValueChange={(value) => setSubscriptionData(prev => ({ ...prev, payment_mode: value }))}
                                    required
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner un mode de paiement" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Virement">Virement</SelectItem>
                                        <SelectItem value="Caisse agence">Caisse agence</SelectItem>
                                        <SelectItem value="Chèque">Chèque</SelectItem>
                                        <SelectItem value="CMI">CMI</SelectItem>
                                        <SelectItem value="TPE">TPE</SelectItem>
                                        <SelectItem value="Avance">Avance</SelectItem>
                                        <SelectItem value="Reliquat">Reliquat</SelectItem>
                                        <SelectItem value="RDV">RDV</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex justify-end space-x-2 pt-4 border-t">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => router.visit(`/profile/${user.username}`)}
                                    disabled={loading}
                                >
                                    Annuler
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={loading || !subscriptionData.matrimonial_pack_id || 
                                             !subscriptionData.pack_price || 
                                             !subscriptionData.pack_advantages.length || 
                                             !subscriptionData.payment_mode}
                                    className="bg-blue-600 hover:bg-blue-700"
                                >
                                    {loading ? 'Création...' : 'Créer la Facture'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

