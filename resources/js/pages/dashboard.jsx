import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import AppLayout from '@/layouts/app-layout';
import { Head, usePage, Link } from '@inertiajs/react';
import AdminDashboardContent from './admin/adminDashboardContent'
import MatchMakerDashboardContent from './matchmaker/matchmakerDashboardContent'
import ManagerDashboardContent from './manager/managerDashboardContent'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User, HeartHandshake, ShoppingCart, CheckCircle, Clock, AlertCircle, Bell, Mail, Phone } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { router } from '@inertiajs/react';



function UserDashboardContent({ user, profile, subscriptionReminder, accountStatus }) {
    // Debug: Log the profile data in frontend
    console.log('Dashboard Profile Data:', {
        profile,
        is_completed: profile?.is_completed,
        current_step: profile?.current_step
    });
    
    const isProfileComplete = profile?.is_completed;
    const userStatus = user?.status;
    const approvalStatus = user?.approval_status;
    const hasAssignedMatchmaker = user?.assigned_matchmaker_id;
    const isDesactivated = accountStatus === 'desactivated';
    const [reactivationOpen, setReactivationOpen] = useState(false);
    const [reactivationReason, setReactivationReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const assignedMatchmaker = user?.assigned_matchmaker;

    // If account is desactivated, show restricted view
    if (isDesactivated) {
        return (
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Bienvenue, {user?.name}</h1>
                        <p className="text-muted-foreground">Votre compte est désactivé</p>
                    </div>
                </div>

                <Alert className="bg-red-50 border-red-200">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription>
                        <div className="space-y-4">
                            <p className="font-semibold text-red-800">Votre compte a été désactivé.</p>
                            <p className="text-red-700">
                                Vous n'avez plus accès aux profils d'autres utilisateurs ni aux autres pages du site.
                            </p>
                            {assignedMatchmaker && (
                                <div className="mt-4 p-4 bg-white rounded-lg border border-red-200">
                                    <h3 className="font-semibold mb-2">Informations de votre matchmaker:</h3>
                                    <div className="space-y-2 text-sm">
                                        <p><strong>Nom:</strong> {assignedMatchmaker.name}</p>
                                        {assignedMatchmaker.email && (
                                            <p className="flex items-center gap-2">
                                                <Mail className="w-4 h-4" />
                                                <strong>Email:</strong> {assignedMatchmaker.email}
                                            </p>
                                        )}
                                        {assignedMatchmaker.phone && (
                                            <p className="flex items-center gap-2">
                                                <Phone className="w-4 h-4" />
                                                <strong>Téléphone:</strong> {assignedMatchmaker.phone}
                                            </p>
                                        )}
                                    </div>
                                    <p className="mt-3 text-sm text-red-700">
                                        Si vous souhaitez réactiver votre compte, veuillez contacter votre matchmaker ou soumettre une demande de réactivation ci-dessous.
                                    </p>
                                </div>
                            )}
                            {!assignedMatchmaker && (
                                <p className="text-sm text-red-700">
                                    Si vous souhaitez réactiver votre compte, veuillez contacter l'administration ou soumettre une demande de réactivation ci-dessous.
                                </p>
                            )}
                            <Dialog open={reactivationOpen} onOpenChange={setReactivationOpen}>
                                <DialogTrigger asChild>
                                    <Button className="mt-4" variant="default">
                                        Demande de réactivation de compte
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Demande de réactivation de compte</DialogTitle>
                                        <DialogDescription>
                                            Veuillez indiquer la raison de votre demande de réactivation.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="reason">Raison de la réactivation *</Label>
                                            <Textarea
                                                id="reason"
                                                value={reactivationReason}
                                                onChange={(e) => setReactivationReason(e.target.value)}
                                                placeholder="Expliquez pourquoi vous souhaitez réactiver votre compte..."
                                                rows={4}
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setReactivationOpen(false)}>
                                            Annuler
                                        </Button>
                                        <Button 
                                            onClick={() => {
                                                if (!reactivationReason.trim()) return;
                                                setSubmitting(true);
                                                router.post('/user/reactivation-request', {
                                                    reason: reactivationReason
                                                }, {
                                                    onSuccess: () => {
                                                        setReactivationOpen(false);
                                                        setReactivationReason('');
                                                        setSubmitting(false);
                                                    },
                                                    onError: () => {
                                                        setSubmitting(false);
                                                    }
                                                });
                                            }}
                                            disabled={!reactivationReason.trim() || submitting}
                                        >
                                            {submitting ? 'Envoi...' : 'Envoyer la demande'}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
            {/* Welcome Section */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Bienvenue, {user?.name}</h1>
                    <p className="text-muted-foreground">Gérez votre profil et découvrez nos services</p>
                </div>
            </div>

            {/* Status Messages and CTAs */}
            <div className="grid gap-4">
                {/* Profile Completion CTA */}
                {!isProfileComplete && (
                    <Alert>
                        <User className="h-4 w-4" />
                        <AlertDescription>
                            <div className="flex items-center justify-between">
                                <span>Votre profil n'est pas encore complet. Complétez-le pour accéder à tous nos services.</span>
                                <Link href="/profile-info">
                                    <Button size="sm">
                                        Compléter mon profil
                                    </Button>
                                </Link>
                            </div>
                        </AlertDescription>
                    </Alert>
                )}

                {/* Validation Status */}
                {approvalStatus !== 'approved' && userStatus === 'prospect' && (
                    <Alert>
                        <Clock className="h-4 w-4" />
                        <AlertDescription>
                            <div className="flex items-center justify-between">
                                <span>Prospect : en attente de validation</span>
                                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                    En attente
                                </Badge>
                            </div>
                        </AlertDescription>
                    </Alert>
                )}

                {/* Member Status */}
                {approvalStatus === 'approved' && userStatus === 'member' && (
                    <Alert>
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>
                            <div className="flex items-center justify-between">
                                <span>Adhésion Gratuite : membre passif</span>
                                <Link href="/mes-commandes">
                                    <Button size="sm" variant="outline">
                                        Devenir Client
                                    </Button>
                                </Link>
                            </div>
                        </AlertDescription>
                    </Alert>
                )}

                {/* Matchmaker Selection CTA */}
                {approvalStatus === 'approved' && !hasAssignedMatchmaker && (
                    <Alert>
                        <HeartHandshake className="h-4 w-4" />
                        <AlertDescription>
                            <div className="flex items-center justify-between">
                                <span>Choisissez votre matchmaker pour commencer votre parcours matrimonial.</span>
                                <Link href="/user/matchmakers">
                                    <Button size="sm">
                                        Choisir mon matchmaker
                                    </Button>
                                </Link>
                            </div>
                        </AlertDescription>
                    </Alert>
                )}

                {/* Subscription Reminder */}
                {subscriptionReminder && (
                    <Alert className={subscriptionReminder.isExpired ? "bg-red-50 border-red-200" : "bg-yellow-50 border-yellow-200"}>
                        <Bell className="h-4 w-4" />
                        <AlertDescription>
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    {subscriptionReminder.isExpired ? (
                                        <>
                                            <span className="font-semibold text-red-800">⚠️ Votre abonnement a expiré</span>
                                            <p className="text-sm text-red-700 mt-1">
                                                Votre abonnement au pack {subscriptionReminder.packName} a expiré le {subscriptionReminder.expirationDate}.
                                                Veuillez renouveler votre abonnement pour continuer à bénéficier de nos services.
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <span className="font-semibold text-yellow-800">⏰ Rappel d'abonnement</span>
                                            <p className="text-sm text-yellow-700 mt-1">
                                                Votre abonnement au pack {subscriptionReminder.packName} expire dans {subscriptionReminder.daysRemaining} {subscriptionReminder.daysRemaining === 1 ? 'jour' : 'jours'} (le {subscriptionReminder.expirationDate}).
                                                Pensez à renouveler votre abonnement pour continuer à bénéficier de nos services.
                                            </p>
                                        </>
                                    )}
                                </div>
                                <Link href="/user/subscription">
                                    <Button size="sm" variant={subscriptionReminder.isExpired ? "destructive" : "outline"}>
                                        Voir mon abonnement
                                    </Button>
                                </Link>
                            </div>
                        </AlertDescription>
                    </Alert>
                )}
            </div>

            {/* Quick Actions */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Mon Profil</CardTitle>
                        <User className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {isProfileComplete ? '100%' : `${profile?.current_step || 1}/4`}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {isProfileComplete ? 'Profil complet' : 'Étapes complétées'}
                        </p>
                        <Link href="/profile-info">
                            <Button variant="outline" size="sm" className="mt-2 w-full">
                                {isProfileComplete ? 'Voir mon profil' : 'Compléter mon profil'}
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Mon Matchmaker</CardTitle>
                        <HeartHandshake className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {hasAssignedMatchmaker ? 'Assigné' : 'Non assigné'}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {hasAssignedMatchmaker ? 'Vous avez un matchmaker' : 'Choisissez votre matchmaker'}
                        </p>
                        <Link href={hasAssignedMatchmaker ? "/matchmaker" : "/user/matchmakers"}>
                            <Button variant="outline" size="sm" className="mt-2 w-full">
                                {hasAssignedMatchmaker ? 'Voir mon matchmaker' : 'Choisir un matchmaker'}
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Mes Commandes</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {userStatus === 'client' ? 'Client' : 'Membre'}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {userStatus === 'client' ? 'Statut client actif' : 'Membre passif'}
                        </p>
                        <Link href="/mes-commandes">
                            <Button variant="outline" size="sm" className="mt-2 w-full">
                                {userStatus === 'client' ? 'Voir mes commandes' : 'Devenir client'}
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activity */}
            <Card>
                <CardHeader>
                    <CardTitle>Activité Récente</CardTitle>
                    <CardDescription>
                        Suivez vos dernières activités sur la plateforme
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8">
                        <AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            Aucune activité récente
                        </h3>
                        <p className="text-gray-600">
                            Vos activités apparaîtront ici une fois que vous commencerez à utiliser nos services.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}



function PendingApprovalContent() {
    return (
        <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Pending Approval</h2>
                    <p className="text-gray-600">
                        Your account is pending approval from an administrator. 
                        You will be notified once your account has been reviewed.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function Dashboard() {
    const { props } = usePage();
    const role = props?.role ?? null;
    const user = props?.auth?.user;
    const approvalStatus = user?.approval_status;
    const agencies = props?.agencies || [];
    const stats = props?.stats || null;
    const profile = props?.profile || null;
    const subscriptionReminder = props?.subscriptionReminder || null;
    
    // Show pending approval for non-admin staff who aren't approved
    if ((role === 'manager' || role === 'matchmaker') && approvalStatus !== 'approved') {
        return (
            <AppLayout>
                <Head title="Dashboard" />
                <PendingApprovalContent />
            </AppLayout>
        );
    }
    
    return (
        <AppLayout >
            <Head title="Dashboard" />
            {role === 'admin' ? (
                <AdminDashboardContent agencies={agencies} stats={stats || { totalUsers: 0, pending: 0, approvedManagers: 0, approvedMatchmakers: 0 }} />
            ) : role === 'manager' ? (
                <ManagerDashboardContent />
            ) : role === 'matchmaker' ? (
                <MatchMakerDashboardContent />
            ) : (
                <UserDashboardContent user={user} profile={profile} subscriptionReminder={subscriptionReminder} accountStatus={props?.accountStatus || 'active'} />
            )}
        </AppLayout>
    );
}
