import { Head, router, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import AppLayout from '@/layouts/app-layout';
import { useState, useEffect } from 'react';

export default function ValidatedProspects() {
    const { prospects, status, assignedMatchmaker } = usePage().props;
    const [loading, setLoading] = useState({});
    const [subscriptionOpen, setSubscriptionOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [subscriptionData, setSubscriptionData] = useState({
        matrimonial_pack_id: '',
        pack_price: '',
        pack_advantages: [],
        payment_mode: ''
    });
    const [matrimonialPacks, setMatrimonialPacks] = useState([]);
    console.log(prospects);

    const handleMarkAsClient = (userId) => {
        setLoading(prev => ({ ...prev, [userId]: true }));
        
        router.post('/staff/mark-as-client', {
            user_id: userId
        }, {
            onSuccess: () => {
                setLoading(prev => ({ ...prev, [userId]: false }));
            },
            onError: () => {
                setLoading(prev => ({ ...prev, [userId]: false }));
            }
        });
    };

    const handleCreateSubscription = (user) => {
        setSelectedUser(user);
        setSubscriptionOpen(true);
        
        // Fetch subscription form data
        fetch(`/staff/subscription-form-data/${user.id}`)
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    alert(data.error);
                    return;
                }
                
                setMatrimonialPacks(data.matrimonial_packs);
                
                // Pre-fill form with existing data
                setSubscriptionData({
                    matrimonial_pack_id: data.profile.matrimonial_pack_id || '',
                    pack_price: data.profile.pack_price || '',
                    pack_advantages: data.profile.pack_advantages || [],
                    payment_mode: data.profile.payment_mode || ''
                });
            })
            .catch(error => {
                console.error('Error fetching subscription data:', error);
                alert('Error loading subscription data');
            });
    };

    const handleBillSubmit = () => {
        if (!selectedUser) return;
        
        setLoading(prev => ({ ...prev, bill: true }));
        
        router.post('/staff/create-bill', {
            user_id: selectedUser.id,
            ...subscriptionData
        }, {
            onSuccess: () => {
                setLoading(prev => ({ ...prev, bill: false }));
                setSubscriptionOpen(false);
                setSelectedUser(null);
                setSubscriptionData({
                    matrimonial_pack_id: '',
                    pack_price: '',
                    pack_advantages: [],
                    payment_mode: ''
                });
            },
            onError: () => {
                setLoading(prev => ({ ...prev, bill: false }));
            }
        });
    };

    const handleAdvantageChange = (advantage, checked) => {
        if (checked) {
            setSubscriptionData(prev => ({
                ...prev,
                pack_advantages: [...prev.pack_advantages, advantage]
            }));
        } else {
            setSubscriptionData(prev => ({
                ...prev,
                pack_advantages: prev.pack_advantages.filter(a => a !== advantage)
            }));
        }
    };
    
    return (
        <AppLayout>
            <Head title="Validated Prospects" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-bold">Validated Prospects</h1>
                        <Badge variant="outline">{prospects.length} users</Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 bg-white rounded-lg p-3 border">
                        <div className="flex items-center gap-2">
                            <Label className="text-sm text-muted-foreground">Status</Label>
                            <Select value={status || 'all'} onValueChange={(v) => router.visit(`/staff/validated-prospects?status=${v}`, { preserveScroll: true, preserveState: true, replace: true })}>
                                <SelectTrigger className="h-9 w-[160px]"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All</SelectItem>
                                    <SelectItem value="member">Member</SelectItem>
                                    <SelectItem value="client">Client</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Separator orientation="vertical" className="h-6" />
                    </div>
                </div>

                <Card className="overflow-hidden">
                    <CardHeader>
                        <CardTitle>Validated Users</CardTitle>
                        <CardDescription>
                            {prospects.length > 0 
                                ? `Showing ${prospects.length} validated users based on your role permissions.`
                                : 'No validated users found based on your role permissions.'
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-10"></TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Phone</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Pack</TableHead>
                                    <TableHead>Subscription</TableHead>
                                    <TableHead>Origin Agency</TableHead>
                                    <TableHead>Manager at Validation</TableHead>
                                    <TableHead>Validated By</TableHead>
                                    <TableHead>Validated Date</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {prospects.map((u) => (
                                    <TableRow key={u.id}>
                                        <TableCell><input type="checkbox" className="accent-neutral-800" /></TableCell>
                                        <TableCell className="font-medium">{u.name}</TableCell>
                                        <TableCell>{u.phone}</TableCell>
                                        <TableCell>
                                            <Badge className={`capitalize ${
                                                u.status === 'member' 
                                                    ? 'bg-green-100 text-green-800' 
                                                    : 'bg-blue-100 text-blue-800'
                                            }`}>
                                                {u.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {u.profile?.matrimonial_pack?.name || 'N/A'}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {u.subscriptions && u.subscriptions.length > 0 ? (
                                                <div className="text-xs">
                                                    <div className="font-medium">
                                                        {u.subscriptions[0].subscription_start ? 
                                                            new Date(u.subscriptions[0].subscription_start).toLocaleDateString() : 'N/A'
                                                        } - {u.subscriptions[0].subscription_end ? 
                                                            new Date(u.subscriptions[0].subscription_end).toLocaleDateString() : 'N/A'
                                                        }
                                                    </div>
                                                    <Badge variant="outline" className={`text-xs ${
                                                        u.subscriptions[0].status === 'active' ? 'bg-green-50 text-green-700' :
                                                        u.subscriptions[0].status === 'expired' ? 'bg-red-50 text-red-700' :
                                                        'bg-gray-50 text-gray-700'
                                                    }`}>
                                                        {u.subscriptions[0].status}
                                                    </Badge>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400">No subscription</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {u.agency?.name || 'N/A'}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {u.validated_by_manager?.name || 'N/A'}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {u.approved_by ? u.assigned_matchmaker.name : 'N/A'}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {u.approved_at ? new Date(u.approved_at).toLocaleDateString() : 'N/A'}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                {u.status === 'member' && (
                                                    <>
                                                        {!u.has_bill && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => handleCreateSubscription(u)}
                                                                className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                                                            >
                                                                Abonnement
                                                            </Button>
                                                        )}
                                                        {u.has_bill && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => handleMarkAsClient(u.id)}
                                                                disabled={loading[u.id]}
                                                                className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                                                            >
                                                                {loading[u.id] ? 'Processing...' : 'Mark as Client'}
                                                            </Button>
                                                        )}
                                                    </>
                                                )}
                                                {u.status === 'client' && (
                                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                                        Client
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* Subscription Form Dialog */}
            <Dialog open={subscriptionOpen} onOpenChange={setSubscriptionOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Créer une Facture</DialogTitle>
                        <DialogDescription>
                            Créez une facture pour {selectedUser?.name}. L'abonnement sera créé après paiement.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                        {/* Matrimonial Pack Selection */}
                        <div className="space-y-2">
                            <Label htmlFor="matrimonial_pack">Pack Matrimonial</Label>
                            <Select 
                                value={subscriptionData.matrimonial_pack_id} 
                                onValueChange={(value) => setSubscriptionData(prev => ({ ...prev, matrimonial_pack_id: value }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Sélectionner un pack" />
                                </SelectTrigger>
                                <SelectContent>
                                    {matrimonialPacks.map((pack) => (
                                        <SelectItem key={pack.id} value={pack.id.toString()}>
                                            {pack.name} - {pack.price} MAD
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Pack Price */}
                        <div className="space-y-2">
                            <Label htmlFor="pack_price">Prix du Pack (MAD)</Label>
                            <Input
                                id="pack_price"
                                type="number"
                                value={subscriptionData.pack_price}
                                onChange={(e) => setSubscriptionData(prev => ({ ...prev, pack_price: e.target.value }))}
                                placeholder="Entrez le prix"
                            />
                        </div>

                        {/* Pack Advantages */}
                        <div className="space-y-2">
                            <Label>Avantages du Pack</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {[
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
                                ].map((advantage) => (
                                    <div key={advantage} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={advantage}
                                            checked={subscriptionData.pack_advantages.includes(advantage)}
                                            onCheckedChange={(checked) => handleAdvantageChange(advantage, checked)}
                                        />
                                        <Label htmlFor={advantage} className="text-sm">
                                            {advantage}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Payment Mode */}
                        <div className="space-y-2">
                            <Label htmlFor="payment_mode">Mode de Paiement</Label>
                            <Select 
                                value={subscriptionData.payment_mode} 
                                onValueChange={(value) => setSubscriptionData(prev => ({ ...prev, payment_mode: value }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Sélectionner un mode de paiement" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Virement">Virement</SelectItem>
                                    <SelectItem value="Caisse agence">Caisse agence</SelectItem>
                                    <SelectItem value="Chèque">Chèque</SelectItem>
                                    <SelectItem value="CMI">CMI</SelectItem>
                                    <SelectItem value="Avance">Avance</SelectItem>
                                    <SelectItem value="Reliquat">Reliquat</SelectItem>
                                    <SelectItem value="RDV">RDV</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end space-x-2 pt-4">
                            <Button
                                variant="outline"
                                onClick={() => setSubscriptionOpen(false)}
                            >
                                Annuler
                            </Button>
                            <Button
                                onClick={handleBillSubmit}
                                disabled={loading.bill}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                {loading.bill ? 'Création...' : 'Créer la Facture'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}


