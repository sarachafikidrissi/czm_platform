import { Head, router, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Calendar, CreditCard, FileText, UserPlus, StickyNote, User, RefreshCw, Search, Star, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const TYPE_CONFIG = {
    proposition: { label: 'MATCH PROPOSAL SENT', icon: Send, color: 'text-blue-600' },
    proposition_accepted: { label: 'PROPOSITION ACCEPTED', icon: CheckCircle, color: 'text-green-600' },
    proposition_refused: { label: 'PROPOSITION REFUSED', icon: XCircle, color: 'text-red-600' },
    proposition_expired: { label: 'PROPOSITION EXPIRED', icon: Clock, color: 'text-amber-600' },
    rdv: { label: 'APPOINTMENT SCHEDULED', icon: Calendar, color: 'text-red-600' },
    subscription: { label: 'SUBSCRIPTION RENEWED', icon: CreditCard, color: 'text-green-600' },
    status_change: { label: 'STATUS CHANGED', icon: User, color: 'text-amber-600' },
    note: { label: 'NOTE ADDED', icon: StickyNote, color: 'text-gray-600' },
    matchmaker_assigned: { label: 'MATCHMAKER ASSIGNED', icon: UserPlus, color: 'text-purple-600' },
};

function getTypeConfig(type) {
    return TYPE_CONFIG[type] || {
        label: type?.toUpperCase?.() || type,
        icon: FileText,
        color: 'text-gray-600',
    };
}

// Status / pack badge helpers (mirroring user profile page)
function getStatusInfo(userStatus) {
    switch (userStatus) {
        case 'member':
            return { label: 'Member', className: 'bg-blue-500 text-white px-4  rounded-md' };
        case 'client':
            return { label: 'Client', className: 'bg-green-500 text-white px-4  rounded-md' };
        case 'client_expire':
            return { label: 'Client Expiré', className: 'bg-orange-500 text-white px-4  rounded-md' };
        default:
            return { label: userStatus || 'Unknown', className: 'bg-gray-500 text-white px-4  rounded-md' };
    }
}

function getPackBadgeStyle(packName, status) {
    // Same gradient colors for client and member; only label prefix differs (Client vs Member + pack name)
    const prefix = status === 'client' || status === 'client_expire' ? 'Client' : 'Member';
    const name = packName || '';
    if (name === 'Pack Bronze') {
        return {
            label: `${prefix} Bronze`,
            className:
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold shadow-sm bg-gradient-to-b from-amber-700 to-amber-900 text-amber-50',
        };
    }
    if (name === 'Pack Silver') {
        return {
            label: `${prefix} Silver`,
            className:
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold shadow-md bg-gradient-to-b from-gray-300 to-gray-500 text-gray-800',
        };
    }
    if (name === 'Pack Gold') {
        return {
            label: `${prefix} Gold`,
            className:
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold shadow-sm bg-gradient-to-b from-amber-400 via-amber-500 to-amber-700 text-amber-950',
            icon: Star,
        };
    }
    if (name === 'Pack Diamond') {
        return {
            label: `${prefix} Diamond`,
            className:
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold shadow-sm bg-gradient-to-b from-gray-600 via-gray-700 to-gray-900 text-white ring-1 ring-white/20',
        };
    }
    return {
        label: prefix,
        className:
            'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold bg-muted text-muted-foreground',
    };
}

function getHeaderStatusBadgeInfo(headerUser) {
    if (!headerUser) return null;
    const packName = headerUser.membership_tier;
    const statusForPrefix = headerUser.status === 'client_expire' ? 'client' : headerUser.status;
    if (packName) {
        return getPackBadgeStyle(packName, statusForPrefix);
    }
    return getStatusInfo(headerUser.status);
}

function formatDate(createdAt) {
    if (!createdAt) return '';
    const d = new Date(createdAt);
    return d.toLocaleString('en-US', {
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function PerformedBy({ performedBy }) {
    if (!performedBy) return null;
    if (performedBy.label) {
        return (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {performedBy.label === 'Auto-renewal' ? (
                    <RefreshCw className="h-3 w-3" />
                ) : (
                    <User className="h-3 w-3" />
                )}
                {performedBy.label}
            </span>
        );
    }
    const name = performedBy.name || 'Staff';
    const role = performedBy.role ? `(${performedBy.role})` : '';
    return (
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            {name} {role}
        </span>
    );
}

export default function ActivityHistoryIndex() {
    const { users, selectedUser, activities, filters } = usePage().props;

    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState(filters?.type ?? '');
    const [dateFrom, setDateFrom] = useState(filters?.date_from ?? '');
    const [dateTo, setDateTo] = useState(filters?.date_to ?? '');
    const [searchQuery, setSearchQuery] = useState(filters?.search ?? '');

    const activitiesData = activities?.data ?? [];
    const nextPageUrl = activities?.next_page_url ?? null;

    const filteredUsers = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return users || [];
        return (users || []).filter((u) => {
            const name = (u.name || '').toLowerCase();
            const username = (u.username || '').toLowerCase();
            return name.includes(term) || username.includes(term);
        });
    }, [users, search]);

    function selectUser(userId) {
        router.get('/staff/activity', { user_id: userId }, { preserveScroll: true });
    }

    function applyFilters() {
        if (!selectedUser) return;
        const params = {
            user_id: selectedUser.id,
        };
        if (typeFilter) params.type = typeFilter;
        if (dateFrom) params.date_from = dateFrom;
        if (dateTo) params.date_to = dateTo;
        if (searchQuery.trim()) params.search = searchQuery.trim();

        router.get('/staff/activity', params, { preserveState: true, replace: true });
    }

    function resetFilters() {
        if (!selectedUser) return;
        setTypeFilter('');
        setDateFrom('');
        setDateTo('');
        setSearchQuery('');
        router.get('/staff/activity', { user_id: selectedUser.id }, { preserveState: true, replace: true });
    }

    function loadMore() {
        if (!nextPageUrl) return;
        router.get(nextPageUrl, {}, { preserveScroll: true, preserveState: true });
    }

    const headerUser = selectedUser;

    const profilePictureSrc = headerUser?.profile_picture ? `/storage/${headerUser.profile_picture}` : null;
    
    return (
        <AppLayout>
            <Head title="Activity History" />
            <div className="flex flex-col gap-4 px-4 py-6 lg:flex-row">
                {/* Left sidebar: users list */}
                <div className="w-full max-w-xs shrink-0 rounded-lg border bg-white shadow-sm">
                    <div className="border-b px-4 py-3">
                        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                            Users
                        </h2>
                        <div className="mt-2 flex items-center gap-2 rounded-full bg-muted px-3 py-1.5">
                            <Search className="h-4 w-4 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by name..."
                                className="h-7 border-0 bg-transparent p-0 text-xs focus-visible:ring-0"
                            />
                        </div>
                    </div>
                    <div className="max-h-[600px] overflow-y-auto">
                        {(filteredUsers || []).map((user) => {
                            const isActive = headerUser && user.id === headerUser.id;
                            
                            return (
                                <button
                                    key={user.id}
                                    type="button"
                                    onClick={() => selectUser(user.id)}
                                    className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-muted ${
                                        isActive ? 'bg-muted' : ''
                                    }`}
                                >
                                    <Avatar className="h-9 w-9">
                                        <AvatarImage
                                            src={user.profile.profile_picture ? `/storage/${user.profile.profile_picture}` : undefined}
                                            alt={user.name}
                                        />
                                        <AvatarFallback>
                                            {(user.name || user.username || '?')
                                                .toUpperCase()
                                                .substring(0, 2)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium">{user.name}</p>
                                        <p className="truncate text-xs text-muted-foreground">
                                            @{user.username} · {user.status}
                                        </p>
                                    </div>
                                </button>
                            );
                        })}
                        {filteredUsers.length === 0 && (
                            <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                                No users found.
                            </div>
                        )}
                    </div>
                </div>

                {/* Right side: header + timeline + filters */}
                <div className="flex min-w-0 flex-1 flex-col gap-4">
                    {/* Top header */}
                    <div className="rounded-lg border bg-white px-6 py-4 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <h1 className="text-2xl font-bold text-[#890505]">Activity History</h1>
                                <p className="text-sm text-muted-foreground">
                                    Chronological record of actions related to this client.
                                </p>
                            </div>
                            {headerUser && (
                                <Card className="flex items-center gap-3 border-none bg-transparent p-0 shadow-none">
                                    <Avatar className="h-11 w-11">
                                        <AvatarImage src={profilePictureSrc || undefined} alt={headerUser.name} />
                                        <AvatarFallback>{headerUser.name?.charAt(0) || '?'}</AvatarFallback>
                                    </Avatar>
                                    <CardContent className="p-0">
                                        <p className="text-sm font-semibold">{headerUser.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            Status: {headerUser.status || '—'} · ID: #{headerUser.id}
                                        </p>
                                        {(() => {
                                            const badge = getHeaderStatusBadgeInfo(headerUser);
                                            if (!badge) return null;
                                            const StatusIcon = badge.icon;
                                            return (
                                                <span className={badge.className}>
                                                    {StatusIcon && (
                                                        <StatusIcon className="h-3.5 w-3.5" strokeWidth={2.5} />
                                                    )}
                                                    {badge.label}
                                                </span>
                                            );
                                        })()}
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 lg:flex-row">
                        {/* Timeline column */}
                        <div className="flex-1 rounded-lg border bg-white p-4 shadow-sm">
                            <div className="mb-3 flex items-center justify-between">
                                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                                    Activity Timeline
                                </h2>
                                {headerUser && (
                                    <span className="text-xs text-muted-foreground">{headerUser.name}</span>
                                )}
                            </div>

                            <div className="relative space-y-0">
                                <div className="absolute left-[18px] top-4 bottom-4 w-px bg-muted" aria-hidden />
                                {activitiesData.length === 0 && (
                                    <div className="relative py-10 text-center text-sm text-muted-foreground">
                                        {headerUser
                                            ? 'No activity found for this client.'
                                            : 'Select a client on the left to view activity history.'}
                                    </div>
                                )}
                                {activitiesData.map((activity) => {
                                    const config = getTypeConfig(activity.type);
                                    const Icon = config.icon;
                                    return (
                                        <div key={activity.id} className="relative flex gap-4 pb-5">
                                            <div className="relative z-10 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                                                <Icon className={`h-4 w-4 ${config.color}`} />
                                            </div>
                                            <div className="flex-1 rounded-md border bg-white px-4 py-3">
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span
                                                            className={`text-xs font-semibold uppercase tracking-wide ${config.color}`}
                                                        >
                                                            {config.label}
                                                        </span>
                                                    </div>
                                                    <span className="text-xs text-muted-foreground">
                                                        {formatDate(activity.created_at)}
                                                    </span>
                                                </div>
                                                <p className="mt-1 text-sm">{activity.description}</p>
                                                {activity.performed_by && (
                                                    <div className="mt-2">
                                                        <PerformedBy performedBy={activity.performed_by} />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {nextPageUrl && (
                                <div className="mt-4 flex justify-center">
                                    <button
                                        type="button"
                                        onClick={loadMore}
                                        className="text-xs font-semibold text-[#890505] hover:underline"
                                    >
                                        Load older activity
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Filters column */}
                        <div className="w-full max-w-xs shrink-0 rounded-lg border bg-white p-4 shadow-sm">
                            <CardHeader className="px-0 pb-3 pt-0">
                                <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Filters
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 px-0">
                                <div className="space-y-1.5">
                                    <p className="text-xs font-medium">Activity Type</p>
                                    <select
                                        value={typeFilter}
                                        onChange={(e) => setTypeFilter(e.target.value)}
                                        className="h-8 w-full rounded-md border px-2 text-xs"
                                    >
                                        <option value="">All activities</option>
                                        <option value="proposition">Proposition</option>
                                        <option value="proposition_accepted">Proposition accepted</option>
                                        <option value="proposition_refused">Proposition refused</option>
                                        <option value="proposition_expired">Proposition expired</option>
                                        <option value="rdv">RDV</option>
                                        <option value="subscription">Subscription</option>
                                        <option value="status_change">Status change</option>
                                        <option value="note">Note</option>
                                        <option value="matchmaker_assigned">Matchmaker assigned</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <p className="text-xs font-medium">Date Range</p>
                                    <div className="flex gap-2">
                                        <Input
                                            type="date"
                                            value={dateFrom}
                                            onChange={(e) => setDateFrom(e.target.value)}
                                            className="h-8 text-xs"
                                        />
                                        <Input
                                            type="date"
                                            value={dateTo}
                                            onChange={(e) => setDateTo(e.target.value)}
                                            className="h-8 text-xs"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <p className="text-xs font-medium">Keywords</p>
                                    <Input
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search text..."
                                        className="h-8 text-xs"
                                    />
                                </div>
                                <div className="flex flex-col gap-2 pt-1">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="h-8 justify-center text-xs text-destructive hover:text-destructive"
                                        onClick={resetFilters}
                                        disabled={!selectedUser}
                                    >
                                        Reset filters
                                    </Button>
                                    <Button
                                        type="button"
                                        className="h-8 justify-center bg-[#890505] text-xs hover:bg-[#6d0404]"
                                        onClick={applyFilters}
                                        disabled={!selectedUser}
                                    >
                                        Apply
                                    </Button>
                                </div>
                            </CardContent>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

