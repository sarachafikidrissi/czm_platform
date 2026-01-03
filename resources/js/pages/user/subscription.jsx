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
import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';

export default function UserSubscription() {
    const { user, profile, subscription, subscriptionStatus } = usePage().props;
    const { t } = useTranslation();
    const isLoading = subscription === null || subscription === undefined;
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
                
                {/* Current Subscription Details */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-red-600 text-lg sm:text-xl">{t('subscription.currentSubscription')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="space-y-4">
                                {/* Desktop Table View Skeleton */}
                                <div className="hidden md:block overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t('subscription.plan')}</TableHead>
                                                <TableHead>{t('subscription.start')}</TableHead>
                                                <TableHead>{t('subscription.expire')}</TableHead>
                                                <TableHead>{t('common.status')}</TableHead>
                                                <TableHead>{t('subscription.matchmaker')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            <TableRow>
                                                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                                <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                                                <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </div>
                                {/* Mobile Card View Skeleton */}
                                <div className="md:hidden space-y-3">
                                    <Card className="border">
                                        <CardContent className="pt-4">
                                            <div className="space-y-3">
                                                <Skeleton className="h-4 w-3/4" />
                                                <Skeleton className="h-4 w-1/2" />
                                                <Skeleton className="h-4 w-1/2" />
                                                <Skeleton className="h-6 w-20" />
                                                <Skeleton className="h-4 w-2/3" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        ) : subscription ? (
                            <div className="space-y-4">
                                {/* Desktop Table View */}
                                <div className="hidden md:block overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t('subscription.plan')}</TableHead>
                                                <TableHead>{t('subscription.start')}</TableHead>
                                                <TableHead>{t('subscription.expire')}</TableHead>
                                                <TableHead>{t('common.status')}</TableHead>
                                                <TableHead>{t('subscription.matchmaker')}</TableHead>
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
                                </div>
                                
                                {/* Mobile Card View */}
                                <div className="md:hidden space-y-3">
                                    <Card className="border">
                                        <CardContent className="pt-4">
                                            <div className="space-y-3">
                                                <div>
                                                    <span className="text-xs text-muted-foreground">{t('subscription.plan')}: </span>
                                                    <span className="font-medium">{subscription.matrimonial_pack?.name || 'N/A'}</span>
                                                </div>
                                                <div>
                                                    <span className="text-xs text-muted-foreground">{t('subscription.start')}: </span>
                                                    <span>{formatDate(subscription.subscription_start)}</span>
                                                </div>
                                                <div>
                                                    <span className="text-xs text-muted-foreground">{t('subscription.expire')}: </span>
                                                    <span>{formatDate(subscription.subscription_end)}</span>
                                                </div>
                                                <div>
                                                    <span className="text-xs text-muted-foreground">{t('common.status')}: </span>
                                                    <div className="mt-1">{getStatusBadge(subscription.status)}</div>
                                                </div>
                                                <div>
                                                    <span className="text-xs text-muted-foreground">{t('subscription.matchmaker')}: </span>
                                                    <span>{subscription.assigned_matchmaker?.name || 'N/A'}</span>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                                
                                {/* Pack Advantages */}
                                {subscription.pack_advantages && subscription.pack_advantages.length > 0 && (
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
