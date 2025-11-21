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
import { useTranslation } from 'react-i18next';
import AdminDashboardContent from './admin/adminDashboardContent';
import ManagerDashboardContent from './manager/managerDashboardContent';
import MatchMakerDashboardContent from './matchmaker/matchmakerDashboardContent';
import PostCard from '@/components/posts/PostCard';

function UserDashboardContent({ user, profile, subscriptionReminder, accountStatus, rejectedBy, unpaidBill, expiredSubscription, recentPosts }) {
    const { t } = useTranslation();

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
                        <h1 className="text-2xl font-bold">{t('dashboard.welcome', { name: user?.name })}</h1>
                        <p className="text-muted-foreground">{t('dashboard.accountDeactivated')}</p>
                    </div>
                </div>

                <Alert className="bg-error-light border-error">
                    <AlertCircle className="text-error h-4 w-4" />
                    <AlertDescription>
                        <div className="space-y-4">
                            <p className="text-error font-semibold">{t('dashboard.accountDeactivatedMessage')}</p>
                            <p className="text-error">{t('dashboard.noAccessMessage')}</p>
                            {assignedMatchmaker && (
                                <div className="bg-card border-error mt-4 rounded-lg border p-4">
                                    <h3 className="mb-2 font-semibold">{t('dashboard.matchmakerInfo')}</h3>
                                    <div className="space-y-2 text-sm">
                                        <p>
                                            <strong>{t('common.name')}:</strong> {assignedMatchmaker.name}
                                        </p>
                                        {assignedMatchmaker.email && (
                                            <p className="flex items-center gap-2">
                                                <Mail className="h-4 w-4" />
                                                <strong>{t('common.email')}:</strong> {assignedMatchmaker.email}
                                            </p>
                                        )}
                                        {assignedMatchmaker.phone && (
                                            <p className="flex items-center gap-2">
                                                <Phone className="h-4 w-4" />
                                                <strong>{t('common.phone')}:</strong> {assignedMatchmaker.phone}
                                            </p>
                                        )}
                                    </div>
                                    <p className="text-error mt-3 text-sm">
                                        {t('dashboard.reactivationRequest')}
                                    </p>
                                </div>
                            )}
                            {!assignedMatchmaker && (
                                <p className="text-error text-sm">
                                    {t('dashboard.reactivationRequestNoMatchmaker')}
                                </p>
                            )}
                            <Dialog open={reactivationOpen} onOpenChange={setReactivationOpen}>
                                <DialogTrigger asChild>
                                    <Button className="mt-4" variant="default">
                                        {t('dashboard.requestReactivation')}
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>{t('dashboard.requestReactivation')}</DialogTitle>
                                        <DialogDescription>{t('dashboard.reactivationReason')}</DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="reason">{t('dashboard.reactivationReason')}</Label>
                                            <Textarea
                                                id="reason"
                                                value={reactivationReason}
                                                onChange={(e) => setReactivationReason(e.target.value)}
                                                placeholder={t('dashboard.reactivationReasonPlaceholder')}
                                                rows={4}
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setReactivationOpen(false)}>
                                            {t('common.cancel')}
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
                                            {submitting ? t('common.sending') : t('dashboard.sendRequest')}
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
                    <h1 className="text-2xl font-bold">{t('dashboard.welcome', { name: user?.name })}</h1>
                    <p className="text-muted-foreground">{t('dashboard.manageProfile')}</p>
                </div>
            </div>

            {/* Toast Notifications */}
            <div className="flex flex-col gap-3">
                {/* Unpaid Bill Toast */}
                {unpaidBill && (
                    <Toast
                        variant="error"
                        title={t('orders.invoice')}
                        message={t('orders.unpaidBillMessage', { 
                            billNumber: unpaidBill.bill_number,
                            amount: parseFloat(unpaidBill.total_amount).toLocaleString(),
                            currency: unpaidBill.currency,
                            dueDate: unpaidBill.due_date
                        })}
                        actionLabel={t('orders.viewInvoices')}
                        onAction={() => router.visit('/user/bills')}
                        icon={<Receipt className="h-5 w-5 text-[#e0495a]" />}
                    />
                )}

                {/* Incomplete Profile Toast */}
                {!isProfileComplete && !isRejected && (
                    <Toast
                        variant="warning"
                        title={t('dashboard.profileIncomplete')}
                        message={t('dashboard.profileIncomplete')}
                        actionLabel={t('dashboard.completeProfile')}
                        onAction={() => router.visit('/profile-info')}
                        icon={<User className="h-5 w-5 text-[#b1bbbf]" />}
                    />
                )}

                {/* Expired Subscription Toast */}
                {expiredSubscription && (
                    <Toast
                        variant="error"
                        title={t('dashboard.subscriptionExpired')}
                        message={t('dashboard.subscriptionExpiredMessage', { 
                            packName: expiredSubscription.packName,
                            date: expiredSubscription.expirationDate,
                            matchmaker: expiredSubscription.matchmaker ? `${expiredSubscription.matchmaker.name}${expiredSubscription.matchmaker.phone ? ` ${expiredSubscription.matchmaker.phone}` : ''}${expiredSubscription.matchmaker.email ? ` ${expiredSubscription.matchmaker.email}` : ''}` : ''
                        })}
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
                                    <h3 className="text-error text-4xl font-semibold">{t('dashboard.rejectionTitle')}</h3>
                                </div>
                                <div className="space-y-2">
                                    <div className='flex items-center gap-2 '>
                                        <p className="text-sm ">{t('dashboard.rejectionReason')}</p>
                                        <p className="text-error text-sm">
                                            {rejectedBy ? (
                                                <>
                                                    <p className='font-extrabold text-lg text-black'>{rejectedReason}</p>
                                                </>
                                            ) : (
                                                <>{t('dashboard.rejectionTitle')}</>
                                            )}
                                        </p>
                                    </div>
                                    {rejectedBy && (
                                        <div className="border-error/30 border-t pt-2">
                                            <p className=" text-sm">
                                                <span className="text-sm">{t('dashboard.rejectionBy')}</span> <span className='font-extrabold text-lg text-black'>{rejectedBy.name}</span>
                                            </p>
                                        </div>
                                    )}
                                    {user?.rejected_at && (
                                        <div>
                                            <p className=" text-sm">
                                                <span className="">{t('common.date')}:</span>{' '}
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
                                <span>{t('dashboard.profileIncomplete')}</span>
                                <Link href="/profile-info">
                                    <Button size="sm">{t('dashboard.completeProfile')}</Button>
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
                                <span>{t('dashboard.prospectPending')}</span>
                                <Badge variant="outline" className="bg-warning-light text-warning-foreground border-warning">
                                    {t('dashboard.pending')}
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
                                <span>{t('dashboard.freeMembership')}</span>
                                <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => setShowMatchmakerDialog(true)}
                                >
                                    {t('dashboard.becomeClient')}
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
                                <span>{t('dashboard.chooseMatchmakerMessage')}</span>
                                <Link href="/user/matchmakers">
                                    <Button size="sm">{t('dashboard.chooseMatchmaker')}</Button>
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
                                            <span className="text-error font-semibold">{t('dashboard.subscriptionExpired')}</span>
                                            <p className="text-error mt-1 text-sm">
                                                {t('dashboard.subscriptionExpiredMessage', { 
                                                    packName: subscriptionReminder.packName,
                                                    date: subscriptionReminder.expirationDate
                                                })}
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <span className="text-warning-foreground font-semibold">{t('dashboard.subscriptionReminder')}</span>
                                            <p className="text-warning-foreground mt-1 text-sm">
                                                {t('dashboard.subscriptionReminderMessage', { 
                                                    packName: subscriptionReminder.packName,
                                                    days: subscriptionReminder.daysRemaining,
                                                    daysText: subscriptionReminder.daysRemaining === 1 ? t('dashboard.day') : t('dashboard.days'),
                                                    date: subscriptionReminder.expirationDate
                                                })}
                                            </p>
                                        </>
                                    )}
                                </div>
                                <Link href="/user/subscription">
                                    <Button size="sm" variant={subscriptionReminder.isExpired ? 'destructive' : 'outline'}>
                                        {t('dashboard.viewSubscription')}
                                    </Button>
                                </Link>
                            </div>
                        </AlertDescription>
                    </Alert>
                )}
            </div>
            <div className='grid grid-cols-3 gap-4 max-md:flex max-md:flex-col-reverse'>

            
            {/* Recent Activity */}
            <Card className='col-span-2'>
                <CardHeader>
                    <CardTitle>{t('dashboard.recentActivity')}</CardTitle>
                    <CardDescription>{t('dashboard.recentActivityDescription')}</CardDescription>
                </CardHeader>
                <CardContent>
                    {recentPosts && recentPosts.length > 0 ? (
                        <div className="space-y-4">
                            {recentPosts.map((post) => (
                                <PostCard key={post.id} post={post} />
                            ))}
                        </div>
                    ) : (
                        <div className="py-8 text-center">
                            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                            <h3 className="mb-2 text-lg font-semibold text-gray-900">{t('dashboard.noRecentActivity')}</h3>
                            <p className="text-gray-600">{t('dashboard.noRecentActivityMessage')}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className='flex flex-col  gap-4 '>
            {/* <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"> */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('dashboard.myProfileCard')}</CardTitle>
                        <User className="text-muted-foreground h-4 w-4" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{isProfileComplete ? '100%' : `${profile?.current_step || 1}/4`}</div>
                        <p className="text-muted-foreground text-xs">{isProfileComplete ? t('dashboard.profileComplete') : t('dashboard.stepsCompleted')}</p>
                        <Link href="/profile-info">
                            <Button variant="outline" size="sm" className="mt-2 w-full bg-success text-white hover:bg-green-600! hover:text-black! cursor-pointer!">
                                {isProfileComplete ? t('dashboard.viewProfile') : t('dashboard.completeMyProfile')}
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('dashboard.myMatchmakerCard')}</CardTitle>
                        <HeartHandshake className="text-muted-foreground h-4 w-4" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{hasAssignedMatchmaker ? t('dashboard.assigned') : t('dashboard.notAssigned')}</div>
                        <p className="text-muted-foreground text-xs">
                            {hasAssignedMatchmaker ? t('dashboard.youHaveMatchmaker') : t('dashboard.chooseMatchmaker')}
                        </p>
                        <Link href={hasAssignedMatchmaker ? '/matchmaker' : '/user/matchmakers'}>
                            <Button variant="outline" size="sm" className="mt-2 w-full hover:bg-red-600! text-white hover:text-whote  bg-[#890505]! cursor-pointer!">
                                {hasAssignedMatchmaker ? t('dashboard.viewMatchmaker') : t('dashboard.chooseMatchmakerButton')}
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('dashboard.myOrdersCard')}</CardTitle>
                        <ShoppingCart className="text-muted-foreground h-4 w-4" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{userStatus === 'client' ? t('dashboard.client') : t('dashboard.member')}</div>
                        <p className="text-muted-foreground text-xs">{userStatus === 'client' ? t('dashboard.activeClientStatus') : t('dashboard.passiveMember')}</p>
                        {userStatus === 'client' ? (
                            <Link href="/mes-commandes">
                                <Button variant="outline" size="sm" className="mt-2 w-full bg-success text-white hover:bg-green-600! hover:text-black! cursor-pointer!">
                                    {t('dashboard.viewOrders')}
                                </Button>
                            </Link>
                        ) : (
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="mt-2 w-full bg-success text-white hover:bg-green-600! hover:text-black! cursor-pointer!"
                                onClick={() => setShowMatchmakerDialog(true)}
                            >
                                {t('dashboard.becomeClient')}
                            </Button>
                        )}
                    </CardContent>
                </Card>
            </div>

            </div>

            {/* Matchmaker Contact Dialog */}
            <Dialog open={showMatchmakerDialog} onOpenChange={setShowMatchmakerDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('dashboard.becomeClientDialog')}</DialogTitle>
                        <DialogDescription>
                            {t('dashboard.becomeClientDescription')}
                        </DialogDescription>
                    </DialogHeader>
                    {assignedMatchmaker ? (
                        <div className="flex flex-col gap-4">
                            <p className="text-sm text-muted-foreground">
                                {t('dashboard.becomeClientMessage')}
                            </p>
                            <Link 
                                href={assignedMatchmaker.username ? `/profile/${assignedMatchmaker.username}` : '/matchmaker'}
                                className="w-full"
                            >
                                <Button className="w-full">
                                    {t('dashboard.viewMatchmakerProfile')}
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            <p className="text-sm text-muted-foreground">
                                {t('dashboard.becomeClientNoMatchmaker')}
                            </p>
                            <Link href="/user/matchmakers" className="w-full">
                                <Button className="w-full">
                                    {t('dashboard.chooseMatchmakerButton')}
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
    const { t } = useTranslation();
    return (
        <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
            <div className="flex h-64 items-center justify-center">
                <div className="text-center">
                    <h2 className="mb-4 text-2xl font-bold text-gray-900">{t('pages.pendingApproval.title')}</h2>
                    <p className="text-gray-600">
                        {t('pages.pendingApproval.message')}
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
                    recentPosts={props?.recentPosts || null}
                />
            )}
        </AppLayout>
    );
}
