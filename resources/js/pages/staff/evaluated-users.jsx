import { Head, router, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';
import { useState, useMemo } from 'react';
import { Search, User, ExternalLink, Calendar } from 'lucide-react';

export default function EvaluatedUsers() {
    const { t } = useTranslation();
    const { evaluatedUsers = [], recommendationFilter = 'all' } = usePage().props;
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFilter, setSelectedFilter] = useState(recommendationFilter);

    // Filter users based on search query
    const filteredUsers = useMemo(() => {
        let filtered = evaluatedUsers;

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            filtered = filtered.filter(item => {
                const name = (item.user?.name || '').toLowerCase();
                const email = (item.user?.email || '').toLowerCase();
                const username = (item.user?.username || '').toLowerCase();
                const phone = (item.user?.phone || '').toLowerCase();
                return name.includes(query) || email.includes(query) || username.includes(query) || phone.includes(query);
            });
        }

        return filtered;
    }, [evaluatedUsers, searchQuery]);

    // Handle filter change
    const handleFilterChange = (value) => {
        setSelectedFilter(value);
        router.visit(`/staff/evaluated-users?recommendation=${value}`, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    };

    // Get recommendation badge info
    const getRecommendationBadge = (recommendation) => {
        switch (recommendation) {
            case 'ready':
                return { label: 'Profile Ready', variant: 'default', className: 'bg-green-500 text-white' };
            case 'accompany':
                return { label: 'To Accompany', variant: 'default', className: 'bg-blue-500 text-white' };
            case 'not_ready':
                return { label: 'Not Ready', variant: 'default', className: 'bg-red-500 text-white' };
            default:
                return { label: recommendation || 'N/A', variant: 'default', className: 'bg-gray-500 text-white' };
        }
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    // Handle view profile
    const handleViewProfile = (username, userId) => {
        if (username) {
            router.visit(`/profile/${username}`);
        } else {
            router.visit(`/profile/${userId}`);
        }
    };

    return (
        <AppLayout>
            <Head title="Evaluated Users" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="flex flex-col gap-4">
                    <div>
                        <h1 className="text-2xl font-bold">Evaluated Users</h1>
                        <p className="text-muted-foreground">
                            View and filter users who have been evaluated by matchmakers
                        </p>
                    </div>

                    {/* Filters and Search */}
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                        <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full sm:w-auto">
                            {/* Recommendation Filter */}
                            <Select value={selectedFilter} onValueChange={handleFilterChange}>
                                <SelectTrigger className="w-full sm:w-[200px]">
                                    <SelectValue placeholder="Filter by recommendation" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Evaluated Users</SelectItem>
                                    <SelectItem value="ready">Profile Ready</SelectItem>
                                    <SelectItem value="accompany">To Accompany</SelectItem>
                                    <SelectItem value="not_ready">Not Ready</SelectItem>
                                </SelectContent>
                            </Select>

                            {/* Search */}
                            <div className="relative flex-1 w-full sm:w-[300px]">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by name, email, username, or phone..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-8"
                                />
                            </div>
                        </div>

                        {/* Results count */}
                        <div className="text-sm text-muted-foreground">
                            {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'} found
                        </div>
                    </div>
                </div>

                {/* Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Evaluated Users</CardTitle>
                        <CardDescription>
                            {selectedFilter === 'all' 
                                ? 'All users with evaluations' 
                                : `Users with recommendation: ${getRecommendationBadge(selectedFilter).label}`}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {filteredUsers.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>No evaluated users found</p>
                                {searchQuery && (
                                    <p className="text-sm mt-2">Try adjusting your search or filter</p>
                                )}
                            </div>
                        ) : (
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>User</TableHead>
                                            <TableHead>Contact</TableHead>
                                            <TableHead>Agency</TableHead>
                                            <TableHead>Recommendation</TableHead>
                                            <TableHead>Evaluated By</TableHead>
                                            <TableHead>Evaluation Date</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredUsers.map((item) => {
                                            const badgeInfo = getRecommendationBadge(item.recommendation);
                                            return (
                                                <TableRow key={item.id}>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className="font-medium">
                                                                {item.user?.name || 'N/A'}
                                                            </span>
                                                            {item.user?.username && (
                                                                <span className="text-sm text-muted-foreground">
                                                                    @{item.user.username}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col text-sm">
                                                            {item.user?.email && (
                                                                <span className="text-muted-foreground">
                                                                    {item.user.email}
                                                                </span>
                                                            )}
                                                            {item.user?.phone && (
                                                                <span className="text-muted-foreground">
                                                                    {item.user.phone}
                                                                </span>
                                                            )}
                                                            {!item.user?.email && !item.user?.phone && (
                                                                <span className="text-muted-foreground">N/A</span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {item.user?.agency ? (
                                                            <span className="text-sm">{item.user.agency.name}</span>
                                                        ) : (
                                                            <span className="text-sm text-muted-foreground">N/A</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge className={badgeInfo.className}>
                                                            {badgeInfo.label}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        {item.author ? (
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-medium">
                                                                    {item.author.name}
                                                                </span>
                                                                {item.author.username && (
                                                                    <span className="text-xs text-muted-foreground">
                                                                        @{item.author.username}
                                                                    </span>
                                                                )}
                                                                {item.user?.validated_by_manager && item.user.validated_by_manager.id !== item.author.id && (
                                                                    <span className="text-xs text-blue-600 mt-1">
                                                                        (Validated by: {item.user.validated_by_manager.name})
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : item.user?.validated_by_manager ? (
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-medium">
                                                                    {item.user.validated_by_manager.name}
                                                                </span>
                                                                {item.user.validated_by_manager.username && (
                                                                    <span className="text-xs text-muted-foreground">
                                                                        @{item.user.validated_by_manager.username}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-sm text-muted-foreground">N/A</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                            <Calendar className="w-3 h-3" />
                                                            {formatDate(item.updated_at)}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleViewProfile(item.user?.username, item.user?.id)}
                                                            className="flex items-center gap-1"
                                                        >
                                                            <ExternalLink className="w-4 h-4" />
                                                            View Profile
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

