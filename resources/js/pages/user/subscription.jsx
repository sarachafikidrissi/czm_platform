import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Heart, Check, X, Calendar, User, Crown } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { usePage } from '@inertiajs/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';
import { formatSubscriptionValidity, staffProfilePath } from '@/lib/subscription-display';

export default function UserSubscription() {
    const { user, profile, subscription, subscriptions = [], subscriptionStatus } = usePage().props;
    const { t } = useTranslation();
    const isLoading = subscription === null || subscription === undefined;
    const [showMatchmakerDialog, setShowMatchmakerDialog] = useState(false);
    const assignedMatchmaker = user?.assignedMatchmaker ?? user?.assigned_matchmaker ?? subscription?.assignedMatchmaker ?? subscription?.assigned_matchmaker ?? null;

    const isClient = subscriptionStatus === 'active' || user.status === 'client';
    const isMember = user.status === 'member';
    const isPassiveMember = subscriptionStatus === 'no_subscription' && (user.status === 'user' || (!isClient && !isMember));
    
    // Format dates
    const formatDate = (date) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };
    
    const getStatusBadge = (status) => {
        switch (status) {
            case 'active':
                return <Badge className="bg-success-bg text-success">{t('common.active')}</Badge>;
            case 'expired':
                return <Badge className="bg-error-bg text-error">{t('common.expired')}</Badge>;
            case 'cancelled':
                return <Badge className="bg-muted text-muted-foreground">{t('common.cancel')}</Badge>;
            default:
                return <Badge className="bg-muted text-muted-foreground">N/A</Badge>;
        }
    };
    
    return (
        <AppLayout>
            <Head title={t('subscription.title')} />
            <div className="flex h-full flex-1 flex-col gap-4 sm:gap-6 rounded-xl p-4 sm:p-6">
                {/* Page Header */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t('subscription.title')}</h1>
                    </div>
                    
                    {/* Decorative line with heart */}
                    <div className="flex items-center justify-center">
                        <div className="h-px bg-border flex-1"></div>
                        <Heart className="w-4 h-4 text-error mx-2 sm:mx-4" />
                        <div className="h-px bg-border flex-1"></div>
                    </div>
                    
                    {/* Status Banner */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
                        {isPassiveMember ? (
                            <div className="bg-warning-light border border-warning rounded-lg p-4 flex-1">
                                <div className="flex items-center gap-2">
                                    <User className="w-5 h-5 text-warning" />
                                    <span className="text-warning-foreground font-medium">{t('subscription.freeMembership')}</span>
                                    <span className="text-warning">{t('subscription.passiveMember')}</span>
                                </div>
                            </div>
                        ) : isClient ? (
                            <div className="bg-success-bg border border-success rounded-lg p-4 flex-1">
                                <div className="flex items-center gap-2">
                                    <Crown className="w-5 h-5 text-success" />
                                    <span className="text-success font-medium">{t('subscription.activeClient')}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-info-light border border-info rounded-lg p-4 flex-1">
                                <div className="flex items-center gap-2">
                                    <User className="w-5 h-5 text-info" />
                                    <span className="text-info-foreground font-medium">{t('subscription.member')}</span>
                                </div>
                            </div>
                        )}
                        
                        {isPassiveMember && (
                            <Button 
                                className="bg-error hover:opacity-90 text-error-foreground rounded-lg px-4 sm:px-6 py-2 w-full sm:w-auto"
                                onClick={() => setShowMatchmakerDialog(true)}
                            >
                                {t('subscription.becomeClient')}
                            </Button>
                        )}
                    </div>
                </div>
                
                {/* Subscriptions list */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-red-600 text-lg sm:text-xl">
                            {subscriptions.length > 1 ? 'Mes abonnements' : t('subscription.currentSubscription')}
                        </CardTitle>
                        {subscriptions.length > 0 && (
                            <CardDescription>Cliquez sur une ligne pour voir le détail</CardDescription>
                        )}
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="space-y-4">
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                        ) : subscriptions.length > 0 ? (
                            <div className="space-y-4">
                                <div className="overflow-x-auto rounded-lg border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t('subscription.plan')}</TableHead>
                                                <TableHead>{t('subscription.start')}</TableHead>
                                                <TableHead>{t('subscription.expire')}</TableHead>
                                                <TableHead>Durée</TableHead>
                                                <TableHead>Validité</TableHead>
                                                <TableHead>{t('subscription.matchmaker')}</TableHead>
                                                <TableHead>Agence</TableHead>
                                                <TableHead>Commande</TableHead>
                                                <TableHead>{t('common.status')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {subscriptions.map((item) => {
                                                const validity = formatSubscriptionValidity(item, item.duration_months);
                                                const mm = item.assigned_matchmaker;
                                                const mmPath = staffProfilePath(mm);

                                                return (
                                                    <TableRow
                                                        key={item.id}
                                                        className="cursor-pointer hover:bg-rose-50/40"
                                                        onClick={() => router.visit(`/user/subscription/${item.id}`)}
                                                    >
                                                        <TableCell className="font-medium">
                                                            {item.matrimonial_pack?.name || 'N/A'}
                                                        </TableCell>
                                                        <TableCell>{formatDate(item.subscription_start)}</TableCell>
                                                        <TableCell>{formatDate(item.subscription_end)}</TableCell>
                                                        <TableCell>
                                                            {item.duration_months ? `${item.duration_months} mois` : '—'}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge className={validity.className}>{validity.label}</Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            {mmPath ? (
                                                                <button
                                                                    type="button"
                                                                    className="text-[#890505] hover:underline"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        router.visit(mmPath);
                                                                    }}
                                                                >
                                                                    {mm.name}
                                                                </button>
                                                            ) : (
                                                                mm?.name || 'N/A'
                                                            )}
                                                        </TableCell>
                                                        <TableCell>{mm?.agency?.name ?? '—'}</TableCell>
                                                        <TableCell>
                                                            {item.bill_id ? (
                                                                <button
                                                                    type="button"
                                                                    className="text-[#890505] hover:underline"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        router.visit(`/mes-commandes/${item.bill_id}`);
                                                                    }}
                                                                >
                                                                    Voir
                                                                </button>
                                                            ) : (
                                                                '—'
                                                            )}
                                                        </TableCell>
                                                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>

                                {subscription?.pack_advantages && subscription.pack_advantages.length > 0 && (
                                    <div className="mt-4 sm:mt-6">
                                        <h4 className="text-base sm:text-lg font-semibold text-gray-800 mb-3">{t('subscription.includedAdvantages')}</h4>
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
                                <p>{t('subscription.noSubscription')}</p>
                                <p className="text-sm mt-2">{t('subscription.currentlyPassiveMember')}</p>
                            </div>
                        )}

                        {assignedMatchmaker && (
                            <div className="mt-6 rounded-lg border border-rose-100 bg-rose-50/30 p-4">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Votre matchmaker</p>
                                {staffProfilePath(assignedMatchmaker) ? (
                                    <button
                                        type="button"
                                        className="mt-1 font-semibold text-[#890505] hover:underline"
                                        onClick={() => router.visit(staffProfilePath(assignedMatchmaker))}
                                    >
                                        {assignedMatchmaker.name}
                                    </button>
                                ) : (
                                    <p className="mt-1 font-semibold text-slate-900">{assignedMatchmaker.name}</p>
                                )}
                                <div className="mt-2 flex flex-col gap-1 text-sm text-[#890505]">
                                    {assignedMatchmaker.email && <a href={`mailto:${assignedMatchmaker.email}`}>{assignedMatchmaker.email}</a>}
                                    {assignedMatchmaker.phone && <a href={`tel:${assignedMatchmaker.phone}`}>{assignedMatchmaker.phone}</a>}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Subscription Type Explanation */}
                <Card>
                    <CardContent className="pt-4 sm:pt-6">
                        <p className="text-sm sm:text-base text-gray-700 text-center">
                            {t('subscription.subscriptionTypeExplanation')}{' '}
                            <span className="font-semibold text-green-600">{t('subscription.passiveMemberType')}</span>, {t('subscription.or')}{' '}
                            <span className="font-semibold text-red-600">{t('subscription.activeClientType')}</span>.
                        </p>
                    </CardContent>
                </Card>
                
                {/* Advantages Comparison Table */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-info">{t('subscription.advantages')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('subscription.advantages')}</TableHead>
                                        <TableHead className="text-center">{t('subscription.client')}</TableHead>
                                        <TableHead className="text-center">{t('subscription.member')}</TableHead>
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
                                                {t('subscription.noSpecificAdvantages')}
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>{t('subscription.ownMatchmaker')}</TableCell>
                                            <TableCell className="text-center">
                                                <Check className="w-5 h-5 text-green-600 mx-auto" />
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <X className="w-5 h-5 text-gray-400 mx-auto" />
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>{t('subscription.fullServicePriority')}</TableCell>
                                            <TableCell className="text-center">
                                                <Check className="w-5 h-5 text-green-600 mx-auto" />
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <X className="w-5 h-5 text-gray-400 mx-auto" />
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>{t('subscription.carefullySelectedProposals')}</TableCell>
                                            <TableCell className="text-center">
                                                <Check className="w-5 h-5 text-green-600 mx-auto" />
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <X className="w-5 h-5 text-gray-400 mx-auto" />
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>{t('subscription.personallyChosenMatches')}</TableCell>
                                            <TableCell className="text-center">
                                                <Check className="w-5 h-5 text-green-600 mx-auto" />
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Check className="w-5 h-5 text-green-600 mx-auto" />
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>{t('subscription.appointmentOrganization')}</TableCell>
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
                        </div>
                        
                        {/* Mobile Card View */}
                        <div className="md:hidden space-y-3">
                            {((subscription?.pack_advantages && subscription.pack_advantages.length > 0) || 
                              (profile?.pack_advantages && profile.pack_advantages.length > 0)) ? (
                                (subscription?.pack_advantages || profile?.pack_advantages).map((advantage, index) => (
                                    <Card key={index} className="border">
                                        <CardContent className="pt-4">
                                            <div className="space-y-3">
                                                <div className="font-medium text-sm">{advantage}</div>
                                                <div className="flex items-center justify-between pt-2 border-t">
                                                    <span className="text-xs text-muted-foreground">{t('subscription.client')}</span>
                                                    <Check className="w-5 h-5 text-green-600" />
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs text-muted-foreground">{t('subscription.member')}</span>
                                                    <X className="w-5 h-5 text-gray-400" />
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            ) : (
                                <>
                                    <Card className="border">
                                        <CardContent className="pt-4">
                                            <div className="space-y-3">
                                                <div className="font-medium text-sm">{t('subscription.ownMatchmaker')}</div>
                                                <div className="flex items-center justify-between pt-2 border-t">
                                                    <span className="text-xs text-muted-foreground">{t('subscription.client')}</span>
                                                    <Check className="w-5 h-5 text-green-600" />
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs text-muted-foreground">{t('subscription.member')}</span>
                                                    <X className="w-5 h-5 text-gray-400" />
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className="border">
                                        <CardContent className="pt-4">
                                            <div className="space-y-3">
                                                <div className="font-medium text-sm">{t('subscription.fullServicePriority')}</div>
                                                <div className="flex items-center justify-between pt-2 border-t">
                                                    <span className="text-xs text-muted-foreground">{t('subscription.client')}</span>
                                                    <Check className="w-5 h-5 text-green-600" />
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs text-muted-foreground">{t('subscription.member')}</span>
                                                    <X className="w-5 h-5 text-gray-400" />
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className="border">
                                        <CardContent className="pt-4">
                                            <div className="space-y-3">
                                                <div className="font-medium text-sm">{t('subscription.carefullySelectedProposals')}</div>
                                                <div className="flex items-center justify-between pt-2 border-t">
                                                    <span className="text-xs text-muted-foreground">{t('subscription.client')}</span>
                                                    <Check className="w-5 h-5 text-green-600" />
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs text-muted-foreground">{t('subscription.member')}</span>
                                                    <X className="w-5 h-5 text-gray-400" />
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className="border">
                                        <CardContent className="pt-4">
                                            <div className="space-y-3">
                                                <div className="font-medium text-sm">{t('subscription.personallyChosenMatches')}</div>
                                                <div className="flex items-center justify-between pt-2 border-t">
                                                    <span className="text-xs text-muted-foreground">{t('subscription.client')}</span>
                                                    <Check className="w-5 h-5 text-green-600" />
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs text-muted-foreground">{t('subscription.member')}</span>
                                                    <Check className="w-5 h-5 text-green-600" />
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className="border">
                                        <CardContent className="pt-4">
                                            <div className="space-y-3">
                                                <div className="font-medium text-sm">{t('subscription.appointmentOrganization')}</div>
                                                <div className="flex items-center justify-between pt-2 border-t">
                                                    <span className="text-xs text-muted-foreground">{t('subscription.client')}</span>
                                                    <Check className="w-5 h-5 text-green-600" />
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs text-muted-foreground">{t('subscription.member')}</span>
                                                    <Check className="w-5 h-5 text-green-600" />
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Matchmaker Contact Dialog */}
                <Dialog open={showMatchmakerDialog} onOpenChange={setShowMatchmakerDialog}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{t('subscription.becomeClientDialog')}</DialogTitle>
                            <DialogDescription>
                                {t('subscription.becomeClientDescription')}
                            </DialogDescription>
                        </DialogHeader>
                        {assignedMatchmaker ? (
                            <div className="flex flex-col gap-4">
                                <p className="text-sm text-muted-foreground">
                                    {t('subscription.becomeClientMessage')}
                                </p>
                                <a 
                                    href={assignedMatchmaker.username ? `/profile/${assignedMatchmaker.username}` : '/matchmaker'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full"
                                >
                                    <Button className="w-full">
                                        {t('subscription.viewMatchmakerProfile')}
                                    </Button>
                                </a>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                <p className="text-sm text-muted-foreground">
                                    {t('subscription.becomeClientNoMatchmaker')}
                                </p>
                                <a href="/user/matchmakers" target="_blank" rel="noopener noreferrer" className="w-full">
                                    <Button className="w-full">
                                        {t('subscription.chooseMatchmakerButton')}
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
