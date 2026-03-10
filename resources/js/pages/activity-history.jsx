import { Head, router, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Send, Calendar, CreditCard, FileText, UserPlus, StickyNote, ChevronDown,
    User, Settings, RefreshCw, Search, CheckCircle, XCircle, Clock,
} from 'lucide-react';

const ACTIVITY_TYPES = [
    { value: '', label: 'All Activities' },
    { value: 'proposition', label: 'Proposition' },
    { value: 'proposition_accepted', label: 'Proposition accepted' },
    { value: 'proposition_refused', label: 'Proposition refused' },
    { value: 'proposition_expired', label: 'Proposition expired' },
    { value: 'rdv', label: 'RDV' },
    { value: 'subscription', label: 'Subscription' },
    { value: 'status_change', label: 'Status change' },
    { value: 'note', label: 'Note' },
    { value: 'matchmaker_assigned', label: 'Matchmaker assigned' },
];

const TYPE_CONFIG = {
    proposition: { label: 'MATCH PROPOSAL SENT', icon: Send, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
    proposition_accepted: { label: 'PROPOSITION ACCEPTED', icon: CheckCircle, color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
    proposition_refused: { label: 'PROPOSITION REFUSED', icon: XCircle, color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
    proposition_expired: { label: 'PROPOSITION EXPIRED', icon: Clock, color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
    rdv: { label: 'APPOINTMENT SCHEDULED', icon: Calendar, color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
    subscription: { label: 'SUBSCRIPTION RENEWED', icon: CreditCard, color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
    status_change: { label: 'STATUS CHANGED', icon: User, color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
    note: { label: 'NOTE ADDED', icon: StickyNote, color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' },
    matchmaker_assigned: { label: 'MATCHMAKER ASSIGNED', icon: UserPlus, color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
};

function getTypeConfig(type) {
    return TYPE_CONFIG[type] || { label: type?.toUpperCase?.() || type, icon: FileText, color: 'bg-muted text-muted-foreground' };
}

function formatDate(createdAt) {
    if (!createdAt) return '';
    const d = new Date(createdAt);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function PerformedBy({ performedBy }) {
    if (!performedBy) return null;
    if (performedBy.label) {
        return (
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                {performedBy.label === 'Auto-renewal' ? <RefreshCw className="h-4 w-4" /> : <Settings className="h-4 w-4" />}
                {performedBy.label}
            </span>
        );
    }
    const name = performedBy.name || 'Staff';
    const role = performedBy.role ? `(${performedBy.role})` : '';
    return (
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <User className="h-4 w-4" />
            {name} {role}
        </span>
    );
}

export default function ActivityHistory({ user, activities, filters: initialFilters }) {
    const { t } = useTranslation();
    const { role } = usePage().props;
    const isClientView = role === 'user';

    const [typeFilter, setTypeFilter] = useState(initialFilters?.type ?? '');
    const [dateFrom, setDateFrom] = useState(initialFilters?.date_from ?? '');
    const [dateTo, setDateTo] = useState(initialFilters?.date_to ?? '');
    const [searchQuery, setSearchQuery] = useState(initialFilters?.search ?? '');

    const basePath = isClientView ? '/user/activity' : `/staff/prospects/${user?.id}/activity`;
    const activitiesData = activities?.data ?? [];
    const nextPageUrl = activities?.next_page_url ?? null;

    function applyFilters() {
        const url = new URL(basePath, window.location.origin);
        if (typeFilter) url.searchParams.set('type', typeFilter);
        if (dateFrom) url.searchParams.set('date_from', dateFrom);
        if (dateTo) url.searchParams.set('date_to', dateTo);
        if (searchQuery.trim()) url.searchParams.set('search', searchQuery.trim());
        router.visit(url.toString(), { preserveState: true, replace: true });
    }

    function resetFilters() {
        setTypeFilter('');
        setDateFrom('');
        setDateTo('');
        setSearchQuery('');
        router.visit(basePath, { preserveState: true, replace: true });
    }

    const profilePictureSrc = user?.profile_picture ? `/storage/${user.profile_picture}` : null;

    return (
        <AppLayout>
            <Head title={t('activityHistory.title', { defaultValue: 'Activity History' })} />
            <div className="flex flex-1 flex-col gap-6 p-4 md:flex-row">
                {/* Filters - Left */}
                <Card className="w-full shrink-0 md:w-72">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Filters</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>{t('activityHistory.activityType', { defaultValue: 'Activity Type' })}</Label>
                            <Select value={typeFilter || 'all'} onValueChange={(v) => setTypeFilter(v === 'all' ? '' : v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Activities" />
                                </SelectTrigger>
                                <SelectContent>
                                    {ACTIVITY_TYPES.map((opt) => (
                                        <SelectItem key={opt.value || 'all'} value={opt.value || 'all'}>
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>{t('activityHistory.dateRange', { defaultValue: 'Date Range' })}</Label>
                            <div className="flex gap-2">
                                <Input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    placeholder="From"
                                />
                                <Input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    placeholder="To"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>{t('activityHistory.keywords', { defaultValue: 'Keywords' })}</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    className="pl-9"
                                    placeholder={t('activityHistory.searchPlaceholder', { defaultValue: 'Search text...' })}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={resetFilters}>
                                {t('activityHistory.resetFilters', { defaultValue: 'Reset Filters' })}
                            </Button>
                            <Button className="bg-[#890505] hover:bg-[#6d0404]" onClick={applyFilters}>
                                {t('activityHistory.apply', { defaultValue: 'Apply' })}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Timeline - Right */}
                <div className="min-w-0 flex-1 space-y-4">
                    {/* Client header - top right */}
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-[#890505]">
                                {t('activityHistory.pageTitle', { defaultValue: 'Activity History' })}
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                {t('activityHistory.subtitle', { defaultValue: 'Chronological record of actions related to this client.' })}
                            </p>
                        </div>
                        <Card className="flex items-center gap-3 p-3">
                            <Avatar className="h-12 w-12">
                                <AvatarImage src={profilePictureSrc} alt={user?.name} />
                                <AvatarFallback>{user?.name?.charAt(0) || '?'}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-semibold">{user?.name}</p>
                                {user?.membership_tier && (
                                    <Badge variant="destructive" className="text-xs">{user.membership_tier}</Badge>
                                )}
                                <p className="text-xs text-muted-foreground">
                                    Status: {user?.status || '—'} · ID: #{user?.id ?? '—'}
                                </p>
                            </div>
                        </Card>
                    </div>

                    {/* Timeline list */}
                    <div className="relative space-y-0">
                        {/* vertical line */}
                        <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-border" aria-hidden />
                        {activitiesData.length === 0 && (
                            <div className="relative py-12 text-center text-muted-foreground">
                                {t('activityHistory.empty', { defaultValue: 'No activity found for the selected filters.' })}
                            </div>
                        )}
                        {activitiesData.map((activity) => {
                            const config = getTypeConfig(activity.type);
                            const Icon = config.icon;
                            return (
                                <div key={activity.id} className="relative flex gap-4 pb-6">
                                    <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-background bg-muted">
                                        <Icon className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                    <Card className="min-w-0 flex-1">
                                        <CardContent className="pt-4">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Badge className={config.color}>{config.label}</Badge>
                                                <span className="text-sm text-muted-foreground">{formatDate(activity.created_at)}</span>
                                            </div>
                                            <p className="mt-2 text-sm">{activity.description}</p>
                                            {!isClientView && activity.performed_by && (
                                                <div className="mt-2">
                                                    <PerformedBy performedBy={activity.performed_by} />
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>
                            );
                        })}
                    </div>

                    {nextPageUrl && (
                        <div className="flex justify-center pt-4">
                            <Button
                                variant="outline"
                                onClick={() => router.get(nextPageUrl)}
                                className="border-[#890505]/20 text-[#890505] hover:bg-[#890505]/10"
                            >
                                <ChevronDown className="mr-2 h-4 w-4" />
                                {t('activityHistory.loadOlder', { defaultValue: 'Load older activity' })}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
