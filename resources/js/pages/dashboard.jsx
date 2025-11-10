import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Toast } from '@/components/ui/toast';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { AlertCircle, Bell, CheckCircle, Clock, HeartHandshake, Mail, Phone, ShoppingCart, User, Receipt } from 'lucide-react';
import { useState } from 'react';
import AdminDashboardContent from './admin/adminDashboardContent';
import ManagerDashboardContent from './manager/managerDashboardContent';
import MatchMakerDashboardContent from './matchmaker/matchmakerDashboardContent';

function UserDashboardContent({ user, profile, subscriptionReminder, accountStatus, rejectedBy, unpaidBill, expiredSubscription }) {
    // Debug: Log the profile data in frontend
    console.log('Dashboard Profile Data:', {
        profile,
        is_completed: profile?.is_completed,
        current_step: profile?.current_step,
    });

    const isProfileComplete = profile?.is_completed;
    const userStatus = user?.status;
    const approvalStatus = user?.approval_status;
    const hasAssignedMatchmaker = user?.assigned_matchmaker_id;
    const isDesactivated = accountStatus === 'desactivated';
    const isRejected = user?.rejection_reason;
    const rejectedReason = user?.rejection_reason;
    const [reactivationOpen, setReactivationOpen] = useState(false);
    const [reactivationReason, setReactivationReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [showMatchmakerDialog, setShowMatchmakerDialog] = useState(false);
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

                <Alert className="bg-error-light border-error">
                    <AlertCircle className="text-error h-4 w-4" />
                    <AlertDescription>
                        <div className="space-y-4">
                            <p className="text-error font-semibold">Votre compte a été désactivé.</p>
                            <p className="text-error">Vous n'avez plus accès aux profils d'autres utilisateurs ni aux autres pages du site.</p>
                            {assignedMatchmaker && (
                                <div className="bg-card border-error mt-4 rounded-lg border p-4">
                                    <h3 className="mb-2 font-semibold">Informations de votre matchmaker:</h3>
                                    <div className="space-y-2 text-sm">
                                        <p>
                                            <strong>Nom:</strong> {assignedMatchmaker.name}
                                        </p>
                                        {assignedMatchmaker.email && (
                                            <p className="flex items-center gap-2">
                                                <Mail className="h-4 w-4" />
                                                <strong>Email:</strong> {assignedMatchmaker.email}
                                            </p>
                                        )}
                                        {assignedMatchmaker.phone && (
                                            <p className="flex items-center gap-2">
                                                <Phone className="h-4 w-4" />
                                                <strong>Téléphone:</strong> {assignedMatchmaker.phone}
                                            </p>
                                        )}
                                    </div>
                                    <p className="text-error mt-3 text-sm">
                                        Si vous souhaitez réactiver votre compte, veuillez contacter votre matchmaker ou soumettre une demande de
                                        réactivation ci-dessous.
                                    </p>
                                </div>
                            )}
                            {!assignedMatchmaker && (
                                <p className="text-error text-sm">
                                    Si vous souhaitez réactiver votre compte, veuillez contacter l'administration ou soumettre une demande de
                                    réactivation ci-dessous.
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
                                        <DialogDescription>Veuillez indiquer la raison de votre demande de réactivation.</DialogDescription>
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
                                                router.post(
                                                    '/user/reactivation-request',
                                                    {
                                                        reason: reactivationReason,
                                                    },
                                                    {
                                                        onSuccess: () => {
                                                            setReactivationOpen(false);
                                                            setReactivationReason('');
                                                            setSubmitting(false);
                                                        },
                                                        onError: () => {
                                                            setSubmitting(false);
                                                        },
                                                    },
                                                );
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

            {/* Toast Notifications */}
            <div className="flex flex-col gap-3">
                {/* Unpaid Bill Toast */}
                {unpaidBill && (
                    <Toast
                        variant="error"
                        title="Facture à payer"
                        message={`Vous avez une facture impayée (${unpaidBill.bill_number}) d'un montant de ${parseFloat(unpaidBill.total_amount).toLocaleString()} ${unpaidBill.currency}. Date d'échéance: ${unpaidBill.due_date}. Veuillez régler cette facture pour continuer à bénéficier de nos services.`}
                        actionLabel="Voir mes factures"
                        onAction={() => router.visit('/user/bills')}
                        icon={<Receipt className="h-5 w-5 text-[#e0495a]" />}
                    />
                )}

                {/* Incomplete Profile Toast */}
                {!isProfileComplete && !isRejected && (
                    <Toast
                        variant="warning"
                        title="Profil incomplet"
                        message="Votre profil n'est pas encore complet. Complétez votre profil pour accéder à tous nos services et commencer votre parcours matrimonial."
                        actionLabel="Compléter mon profil"
                        onAction={() => router.visit('/profile-info')}
                        icon={<User className="h-5 w-5 text-[#b1bbbf]" />}
                    />
                )}

                {/* Expired Subscription Toast */}
                {expiredSubscription && (
                    <Toast
                        variant="error"
                        title="Abonnement expiré"
                        message={`Votre abonnement au pack ${expiredSubscription.packName} a expiré le ${expiredSubscription.expirationDate}. Pour continuer à bénéficier de nos services, veuillez contacter votre matchmaker pour un nouvel abonnement.${expiredSubscription.matchmaker ? `\n\nContactez ${expiredSubscription.matchmaker.name}${expiredSubscription.matchmaker.phone ? ` au ${expiredSubscription.matchmaker.phone}` : ''}${expiredSubscription.matchmaker.email ? ` ou par email: ${expiredSubscription.matchmaker.email}` : ''}` : ''}`}
                        icon={<AlertCircle className="h-5 w-5 text-[#e0495a]" />}
                    />
                )}
            </div>

            {/* Status Messages and CTAs */}
            <div className="grid gap-4">
                {/* Rejection Message */}
                {isRejected && (
                    <Alert className="bg-error-light border-error">
                        <AlertDescription>
                            <div className="space-y-3  w-full">
                                <div className="flex items-center justify-center gap-2 font-bold">
                                    <AlertCircle className="text-error" />
                                    <h3 className="text-error text-4xl font-semibold">Votre demande d'adhésion est rejetée</h3>
                                </div>
                                <div className="space-y-2">
                                    <div className='flex items-center gap-2 '>
                                        <p className="text-sm ">Motif de rejet :</p>
                                        <p className="text-error text-sm">
                                            {rejectedBy ? (
                                                <>
                                                    {/* ZAWAJMAROCCENTRE : Suite à votre demande, votre inscription est malheureusement annulée. <br />Si
                                                    toujours intéressée par nos services, merci de contacter directement {rejectedBy.name} pour la
                                                    réouverture de votre dossier au {rejectedBy.phone || 'matchmaker'}
                                                    <br />
                                                    <br /> */}

                                                    <p className='font-extrabold text-lg text-black'>{rejectedReason}</p>
                                                </>
                                            ) : (
                                                <>ZAWAJMAROCCENTRE : Suite à votre demande, votre inscription est malheureusement annulée.</>
                                            )}
                                        </p>
                                    </div>
                                    {rejectedBy && (
                                        <div className="border-error/30 border-t pt-2">
                                            <p className=" text-sm">
                                                <span className="text-sm">Par matchmaker :</span> <span className='font-extrabold text-lg text-black'>{rejectedBy.name}</span>
                                            </p>
                                        </div>
                                    )}
                                    {user?.rejected_at && (
                                        <div>
                                            <p className=" text-sm">
                                                <span className="">Date :</span>{' '}
                                                <span className='font-extrabold text-lg text-black'>{new Date(user.rejected_at).toLocaleDateString('fr-FR', {
                                                    year: 'numeric',
                                                    month: 'numeric',
                                                    day: 'numeric',
                                                })}</span>
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </AlertDescription>
                    </Alert>
                )}

                {/* Profile Completion CTA */}
                {!isProfileComplete && !isRejected && (
                    <Alert>
                        <User className="h-4 w-4" />
                        <AlertDescription>
                            <div className="flex items-center justify-between">
                                <span>Votre profil n'est pas encore complet. Complétez-le pour accéder à tous nos services.</span>
                                <Link href="/profile-info">
                                    <Button size="sm">Compléter mon profil</Button>
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
                                <Badge variant="outline" className="bg-warning-light text-warning-foreground border-warning">
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
                                <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => setShowMatchmakerDialog(true)}
                                >
                                    Devenir Client
                                </Button>
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
                                    <Button size="sm">Choisir mon matchmaker</Button>
                                </Link>
                            </div>
                        </AlertDescription>
                    </Alert>
                )}

                {/* Subscription Reminder */}
                {subscriptionReminder && (
                    <Alert className={subscriptionReminder.isExpired ? 'bg-error-light border-error' : 'bg-warning-light border-warning'}>
                        <Bell className="h-4 w-4" />
                        <AlertDescription>
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    {subscriptionReminder.isExpired ? (
                                        <>
                                            <span className="text-error font-semibold">⚠️ Votre abonnement a expiré</span>
                                            <p className="text-error mt-1 text-sm">
                                                Votre abonnement au pack {subscriptionReminder.packName} a expiré le{' '}
                                                {subscriptionReminder.expirationDate}. Veuillez renouveler votre abonnement pour continuer à
                                                bénéficier de nos services.
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <span className="text-warning-foreground font-semibold">⏰ Rappel d'abonnement</span>
                                            <p className="text-warning-foreground mt-1 text-sm">
                                                Votre abonnement au pack {subscriptionReminder.packName} expire dans{' '}
                                                {subscriptionReminder.daysRemaining} {subscriptionReminder.daysRemaining === 1 ? 'jour' : 'jours'} (le{' '}
                                                {subscriptionReminder.expirationDate}). Pensez à renouveler votre abonnement pour continuer à
                                                bénéficier de nos services.
                                            </p>
                                        </>
                                    )}
                                </div>
                                <Link href="/user/subscription">
                                    <Button size="sm" variant={subscriptionReminder.isExpired ? 'destructive' : 'outline'}>
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
                        <User className="text-muted-foreground h-4 w-4" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{isProfileComplete ? '100%' : `${profile?.current_step || 1}/4`}</div>
                        <p className="text-muted-foreground text-xs">{isProfileComplete ? 'Profil complet' : 'Étapes complétées'}</p>
                        <Link href="/profile-info">
                            <Button variant="outline" size="sm" className="mt-2 w-full bg-success text-white hover:bg-green-600! hover:text-black! cursor-pointer!">
                                {isProfileComplete ? 'Voir mon profil' : 'Compléter mon profil'}
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Mon Matchmaker</CardTitle>
                        <HeartHandshake className="text-muted-foreground h-4 w-4" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{hasAssignedMatchmaker ? 'Assigné' : 'Non assigné'}</div>
                        <p className="text-muted-foreground text-xs">
                            {hasAssignedMatchmaker ? 'Vous avez un matchmaker' : 'Choisissez votre matchmaker'}
                        </p>
                        <Link href={hasAssignedMatchmaker ? '/matchmaker' : '/user/matchmakers'}>
                            <Button variant="outline" size="sm" className="mt-2 w-full hover:bg-red-600! text-white hover:text-whote  bg-[#890505]! cursor-pointer!">
                                {hasAssignedMatchmaker ? 'Voir mon matchmaker' : 'Choisir un matchmaker'}
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Mes Commandes</CardTitle>
                        <ShoppingCart className="text-muted-foreground h-4 w-4" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{userStatus === 'client' ? 'Client' : 'Membre'}</div>
                        <p className="text-muted-foreground text-xs">{userStatus === 'client' ? 'Statut client actif' : 'Membre passif'}</p>
                        {userStatus === 'client' ? (
                            <Link href="/mes-commandes">
                                <Button variant="outline" size="sm" className="mt-2 w-full bg-success text-white hover:bg-green-600! hover:text-black! cursor-pointer!">
                                    Voir mes commandes
                                </Button>
                            </Link>
                        ) : (
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="mt-2 w-full bg-success text-white hover:bg-green-600! hover:text-black! cursor-pointer!"
                                onClick={() => setShowMatchmakerDialog(true)}
                            >
                                Devenir client
                            </Button>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activity */}
            <Card>
                <CardHeader>
                    <CardTitle>Activité Récente</CardTitle>
                    <CardDescription>Suivez vos dernières activités sur la plateforme</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="py-8 text-center">
                        <AlertCircle className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                        <h3 className="mb-2 text-lg font-semibold text-gray-900">Aucune activité récente</h3>
                        <p className="text-gray-600">Vos activités apparaîtront ici une fois que vous commencerez à utiliser nos services.</p>
                    </div>
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
    );
}

function PendingApprovalContent() {
    return (
        <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
            <div className="flex h-64 items-center justify-center">
                <div className="text-center">
                    <h2 className="mb-4 text-2xl font-bold text-gray-900">Pending Approval</h2>
                    <p className="text-gray-600">
                        Your account is pending approval from an administrator. You will be notified once your account has been reviewed.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function Dashboard() {
    const { props } = usePage();
    const role = props?.role ?? null;
    const user = props?.auth?.user || null;
    const approvalStatus = user?.approval_status;
    const agencies = props?.agencies || [];
    const stats = props?.stats || null;
    const profile = props?.profile || null;
    const subscriptionReminder = props?.subscriptionReminder || null;
    const rejectedBy = props?.rejectedBy || null;
    const unpaidBill = props?.unpaidBill || null;
    const expiredSubscription = props?.expiredSubscription || null;

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
        <AppLayout>
            <Head title="Dashboard" />
            {role === 'admin' ? (
                <AdminDashboardContent
                    agencies={agencies}
                    stats={stats || { totalUsers: 0, pending: 0, approvedManagers: 0, approvedMatchmakers: 0 }}
                />
            ) : role === 'manager' ? (
                <ManagerDashboardContent 
                    stats={stats || { prospectsReceived: 0, activeClients: 0, members: 0 }} 
                    posts={props?.posts || null}
                />
            ) : role === 'matchmaker' ? (
                <MatchMakerDashboardContent />
            ) : (
                <UserDashboardContent
                    user={user}
                    profile={profile}
                    subscriptionReminder={subscriptionReminder}
                    accountStatus={props?.accountStatus || 'active'}
                    rejectedBy={props?.rejectedBy || null}
                    unpaidBill={unpaidBill}
                    expiredSubscription={expiredSubscription}
                />
            )}
        </AppLayout>
    );
}
