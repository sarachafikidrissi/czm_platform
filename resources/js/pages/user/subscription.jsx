import { Head, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Heart, Check, X, Calendar, User, Crown } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { usePage } from '@inertiajs/react';
import { useState } from 'react';

export default function UserSubscription() {
    const { user, profile, subscription, subscriptionStatus } = usePage().props;
    const [showMatchmakerDialog, setShowMatchmakerDialog] = useState(false);
    const assignedMatchmaker = user?.assignedMatchmaker ?? user?.assigned_matchmaker ?? subscription?.assignedMatchmaker ?? subscription?.assigned_matchmaker ?? null;
    
    // Determine current status
    const isClient = user.status === 'client';
    const isMember = user.status === 'member';
    const isPassiveMember = user.status === 'user' || (!isClient && !isMember);
    
    // Format dates
    const formatDate = (date) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };
    
    // Get status badge
    const getStatusBadge = (status) => {
        switch (status) {
            case 'active':
                return <Badge className="bg-success-bg text-success">Actif</Badge>;
            case 'expired':
                return <Badge className="bg-error-bg text-error">Expiré</Badge>;
            case 'cancelled':
                return <Badge className="bg-muted text-muted-foreground">Annulé</Badge>;
            default:
                return <Badge className="bg-muted text-muted-foreground">N/A</Badge>;
        }
    };
    
    return (
        <AppLayout>
            <Head title="Mon abonnement" />
            <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-6">
                {/* Page Header */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <h1 className="text-3xl font-bold text-foreground">Mon abonnement</h1>
                    </div>
                    
                    {/* Decorative line with heart */}
                    <div className="flex items-center justify-center">
                        <div className="h-px bg-border flex-1"></div>
                        <Heart className="w-4 h-4 text-error mx-4" />
                        <div className="h-px bg-border flex-1"></div>
                    </div>
                    
                    {/* Status Banner */}
                    <div className="flex items-center justify-between gap-4">
                        {isPassiveMember ? (
                            <div className="bg-warning-light border border-warning rounded-lg p-4 flex-1">
                                <div className="flex items-center gap-2">
                                    <User className="w-5 h-5 text-warning" />
                                    <span className="text-warning-foreground font-medium">Adhésion Gratuite : </span>
                                    <span className="text-warning">membre passif</span>
                                </div>
                            </div>
                        ) : isClient ? (
                            <div className="bg-success-bg border border-success rounded-lg p-4 flex-1">
                                <div className="flex items-center gap-2">
                                    <Crown className="w-5 h-5 text-success" />
                                    <span className="text-success font-medium">Client Actif</span>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-info-light border border-info rounded-lg p-4 flex-1">
                                <div className="flex items-center gap-2">
                                    <User className="w-5 h-5 text-info" />
                                    <span className="text-info-foreground font-medium">Membre</span>
                                </div>
                            </div>
                        )}
                        
                        {isPassiveMember && (
                            <Button 
                                className="bg-error hover:opacity-90 text-error-foreground rounded-lg px-6 py-2"
                                onClick={() => setShowMatchmakerDialog(true)}
                            >
                                Devenir Client
                            </Button>
                        )}
                    </div>
                </div>
                
                {/* Current Subscription Details */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-red-600 text-xl">Mon abonnement</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {subscription ? (
                            <div className="space-y-4">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Plan</TableHead>
                                            <TableHead>Commencer</TableHead>
                                            <TableHead>Expirer</TableHead>
                                            <TableHead>Statut</TableHead>
                                            <TableHead>Matchmaker</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell className="font-medium">
                                                {subscription.matrimonial_pack?.name || 'N/A'}
                                            </TableCell>
                                            <TableCell>{formatDate(subscription.subscription_start)}</TableCell>
                                            <TableCell>{formatDate(subscription.subscription_end)}</TableCell>
                                            <TableCell>{getStatusBadge(subscription.status)}</TableCell>
                                            <TableCell>
                                                {subscription.assigned_matchmaker?.name || 'N/A'}
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                                
                                {/* Pack Advantages */}
                                {subscription.pack_advantages && subscription.pack_advantages.length > 0 && (
                                    <div className="mt-6">
                                        <h4 className="text-lg font-semibold text-gray-800 mb-3">Avantages inclus :</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {subscription.pack_advantages.map((advantage, index) => (
                                                <div key={index} className="flex items-center gap-2 text-sm text-gray-700">
                                                    <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                                                    <span>{advantage}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                                <p>Aucun abonnement trouvé</p>
                                <p className="text-sm mt-2">Vous êtes actuellement un membre passif</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
                
                {/* Subscription Type Explanation */}
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-gray-700 text-center">
                            Choisissez le type d'abonnement qui vous convient, soit{' '}
                            <span className="font-semibold text-green-600">membre passif</span>, ou{' '}
                            <span className="font-semibold text-red-600">client actif</span>.
                        </p>
                    </CardContent>
                </Card>
                
                {/* Advantages Comparison Table */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-info">Avantages</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Avantages</TableHead>
                                    <TableHead className="text-center">Client</TableHead>
                                    <TableHead className="text-center">Membre</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {/* Dynamic advantages from pack */}
                                {(subscription?.pack_advantages && subscription.pack_advantages.length > 0) || 
                                 (profile?.pack_advantages && profile.pack_advantages.length > 0) ? (
                                    (subscription?.pack_advantages || profile?.pack_advantages).map((advantage, index) => (
                                        <TableRow key={index}>
                                            <TableCell>{advantage}</TableCell>
                                            <TableCell className="text-center">
                                                <Check className="w-5 h-5 text-green-600 mx-auto" />
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <X className="w-5 h-5 text-gray-400 mx-auto" />
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    /* Fallback to default advantages if no pack advantages */
                                    <>
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center text-gray-500 py-4">
                                                Aucun avantage spécifique défini pour ce pack
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>Votre propre matchmaker</TableCell>
                                            <TableCell className="text-center">
                                                <Check className="w-5 h-5 text-green-600 mx-auto" />
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <X className="w-5 h-5 text-gray-400 mx-auto" />
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>Un service complet en priorité</TableCell>
                                            <TableCell className="text-center">
                                                <Check className="w-5 h-5 text-green-600 mx-auto" />
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <X className="w-5 h-5 text-gray-400 mx-auto" />
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>Des propositions soigneusement sélectionnés</TableCell>
                                            <TableCell className="text-center">
                                                <Check className="w-5 h-5 text-green-600 mx-auto" />
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <X className="w-5 h-5 text-gray-400 mx-auto" />
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>Des matchs personnellement choisis</TableCell>
                                            <TableCell className="text-center">
                                                <Check className="w-5 h-5 text-green-600 mx-auto" />
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Check className="w-5 h-5 text-green-600 mx-auto" />
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>Organisation des rendez-vous rencontre pour vous et votre match</TableCell>
                                            <TableCell className="text-center">
                                                <Check className="w-5 h-5 text-green-600 mx-auto" />
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Check className="w-5 h-5 text-green-600 mx-auto" />
                                            </TableCell>
                                        </TableRow>
                                    </>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Matchmaker Contact Dialog */}
                <Dialog open={showMatchmakerDialog} onOpenChange={setShowMatchmakerDialog}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Devenir Client</DialogTitle>
                            <DialogDescription>
                                Contacter votre matchmaker pour plus de détails
                            </DialogDescription>
                        </DialogHeader>
                        {assignedMatchmaker ? (
                            <div className="flex flex-col gap-4">
                                <p className="text-sm text-muted-foreground">
                                    Pour devenir client, veuillez contacter votre matchmaker pour plus de détails.
                                </p>
                                <Link 
                                    href={assignedMatchmaker.username ? `/profile/${assignedMatchmaker.username}` : '/matchmaker'}
                                    className="w-full"
                                >
                                    <Button className="w-full">
                                        Voir le profil de mon matchmaker
                                    </Button>
                                </Link>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                <p className="text-sm text-muted-foreground">
                                    Pour devenir client, veuillez d'abord choisir un matchmaker.
                                </p>
                                <Link href="/user/matchmakers" className="w-full">
                                    <Button className="w-full">
                                        Choisir un matchmaker
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
