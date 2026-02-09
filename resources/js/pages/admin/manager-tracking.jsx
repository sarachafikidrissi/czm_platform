import { Head, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { LayoutGrid, Table2, Mail, MapPin, CheckCircle, Pencil } from 'lucide-react';

export default function ManagerTracking() {
    const { prospects = [], status = 'all' } = usePage().props;
    const [selectedStatus, setSelectedStatus] = useState(status);
    const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'
    
    const prospectsData = prospects?.data || prospects || [];
    const pagination = prospects?.links || null;
    const currentPageNum = prospects?.current_page || 1;
    const lastPage = prospects?.last_page || 1;
    const showingStart = prospects?.from || 0;
    const showingEnd = prospects?.to || 0;
    const total = prospects?.total || prospectsData.length;

    const handleStatusFilter = (newStatus) => {
        setSelectedStatus(newStatus);
        router.visit(`/manager/tracking?status=${newStatus}`, { preserveScroll: true, preserveState: true, replace: true });
    };
    
    const handlePageChange = (page) => {
        const url = new URL(window.location.href);
        url.searchParams.set('page', page);
        router.visit(url.toString(), {
            preserveState: true,
            preserveScroll: false,
        });
    };

    const getStatusBadge = (status) => {
        const variants = {
            prospect: 'secondary',
            member: 'default',
            client: 'success',
            client_expire: 'outline'
        };
        return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
    };

    // Helper function to get profile picture URL
    const getProfilePicture = (prospect) => {
        if (prospect.profile?.profile_picture_path) {
            return `/storage/${prospect.profile.profile_picture_path}`;
        }
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(prospect.name)}&background=random`;
    };

    // Helper function to get location
    const getLocation = (prospect) => {
        const city = prospect.profile?.ville_residence || prospect.profile?.pays_residence || '';
        const district = prospect.profile?.heard_about_reference || '';
        if (city && district && district !== '-') {
            return `${city}, ${district}`;
        }
        return city || 'Other, None';
    };

    // Helper function to get step/status
    const getStep = (prospect) => {
        return prospect.profile?.matrimonial_pack?.name || 
               (prospect.profile?.service_id ? 'Service' : null) || 
               'N/A';
    };

    return (
        <AppLayout>
            <Head title="Historical Validation Tracking" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Historical Validation Tracking</CardTitle>
                        <p className="text-sm text-gray-600">
                            View all prospects, members, and clients that were validated when you were the manager in charge. 
                            This includes historical data from all agencies where you served as manager during validation.
                        </p>
                    </CardHeader>
                    <CardContent>
                        {/* Header with View Toggle and Pagination Info */}
                        <div className="flex flex-col gap-3 mb-6">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                {/* View Toggle */}
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant={viewMode === 'cards' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setViewMode('cards')}
                                        className="flex items-center gap-2"
                                    >
                                        <LayoutGrid className="w-4 h-4" />
                                        Cards
                                    </Button>
                                    <Button
                                        variant={viewMode === 'table' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setViewMode('table')}
                                        className="flex items-center gap-2"
                                    >
                                        <Table2 className="w-4 h-4" />
                                        Table
                                    </Button>
                                </div>
                                
                                {/* Pagination Info */}
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 text-sm text-muted-foreground">
                                    <div>
                                        Showing {showingStart} to {showingEnd} of {total} users
                                    </div>
                                    {lastPage > 1 && (
                                        <div>
                                            Page {currentPageNum} of {lastPage}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Filters */}
                            <div className="flex flex-wrap items-center gap-3 bg-white rounded-lg p-3 border">
                                <div className="flex items-center gap-2">
                                    <Label className="text-sm text-muted-foreground">Status Filter</Label>
                                    <Select value={selectedStatus} onValueChange={handleStatusFilter}>
                                        <SelectTrigger className="h-9 w-[160px]">
                                            <SelectValue placeholder="All Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Status</SelectItem>
                                            <SelectItem value="prospect">Prospects</SelectItem>
                                            <SelectItem value="member">Members</SelectItem>
                                            <SelectItem value="client">Clients</SelectItem>
                                            <SelectItem value="client_expire">Client Expiré</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Separator orientation="vertical" className="h-6" />
                            </div>
                        </div>

                        {/* Cards View */}
                        {viewMode === 'cards' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
                                {prospectsData.map((prospect) => (
                                    <Card key={prospect.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                                        <div className="relative">
                                            <img
                                                src={getProfilePicture(prospect)}
                                                alt={prospect.name}
                                                className="w-full h-48 object-cover"
                                                onError={(e) => {
                                                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(prospect.name)}&background=random`;
                                                }}
                                            />
                                            {/* Overlay Tags */}
                                            <div className="absolute top-2 right-2 flex gap-2">
                                                <Badge className="bg-black text-white text-xs px-2 py-1">
                                                    {getStep(prospect)}
                                                </Badge>
                                                {getStatusBadge(prospect.status)}
                                            </div>
                                        </div>
                                        <CardContent className="p-4 space-y-3">
                                            <div>
                                                <h3 className="font-semibold text-lg">{prospect.name}</h3>
                                            </div>
                                            
                                            <div className="flex items-start gap-2 text-sm text-muted-foreground">
                                                <Mail className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                                <span className="truncate">{prospect.email || 'N/A'}</span>
                                            </div>
                                            
                                            <div className="flex items-start gap-2 text-sm text-muted-foreground">
                                                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                                <span className="truncate">{getLocation(prospect)}</span>
                                            </div>
                                            
                                            {prospect.assigned_matchmaker && (
                                                <div className="flex items-start gap-2 text-sm">
                                                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-600" />
                                                    <span>Validated by {prospect.assigned_matchmaker.name}</span>
                                                </div>
                                            )}

                                            {prospect.agency && (
                                                <div className="text-sm text-blue-600">
                                                    Agency: {prospect.agency.name}
                                                </div>
                                            )}

                                            <div className="text-xs text-gray-500">
                                                Validated: {prospect.approved_at ? new Date(prospect.approved_at).toLocaleDateString() : 'N/A'}
                                            </div>
                                            
                                            <div className="pt-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="w-full"
                                                    onClick={() => window.open(`/profile/${prospect.username || prospect.id}`, '_blank', 'noopener,noreferrer')}
                                                >
                                                    View Profile
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}

                        {/* Table View */}
                        {viewMode === 'table' && (
                            <div className="overflow-x-auto mb-6">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead className="hidden md:table-cell">Phone</TableHead>
                                            <TableHead className="hidden lg:table-cell">Location</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Agency</TableHead>
                                            <TableHead>Validated By</TableHead>
                                            <TableHead className="hidden md:table-cell">Validated Date</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {prospectsData.map((prospect) => (
                                            <TableRow key={prospect.id}>
                                                <TableCell className="font-medium">{prospect.name}</TableCell>
                                                <TableCell>{prospect.email || 'N/A'}</TableCell>
                                                <TableCell className="hidden md:table-cell">{prospect.phone || 'N/A'}</TableCell>
                                                <TableCell className="hidden lg:table-cell">{getLocation(prospect)}</TableCell>
                                                <TableCell>{getStatusBadge(prospect.status)}</TableCell>
                                                <TableCell>{prospect.agency?.name || 'N/A'}</TableCell>
                                                <TableCell>{prospect.assigned_matchmaker?.name || 'N/A'}</TableCell>
                                                <TableCell className="hidden md:table-cell">
                                                    {prospect.approved_at ? new Date(prospect.approved_at).toLocaleDateString() : 'N/A'}
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => window.open(`/profile/${prospect.username || prospect.id}`, '_blank', 'noopener,noreferrer')}
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}

                        {prospectsData.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                No users found that were validated when you were the manager in charge.
                            </div>
                        )}

                        {/* Pagination Controls */}
                        {pagination && lastPage > 1 && (
                            <div className="flex justify-center items-center gap-2 mt-6">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePageChange(currentPageNum - 1)}
                                    disabled={currentPageNum === 1}
                                >
                                    Previous
                                </Button>
                                <div className="flex gap-1">
                                    {Array.from({ length: Math.min(5, lastPage) }, (_, i) => {
                                        let pageNum;
                                        if (lastPage <= 5) {
                                            pageNum = i + 1;
                                        } else if (currentPageNum <= 3) {
                                            pageNum = i + 1;
                                        } else if (currentPageNum >= lastPage - 2) {
                                            pageNum = lastPage - 4 + i;
                                        } else {
                                            pageNum = currentPageNum - 2 + i;
                                        }
                                        
                                        return (
                                            <Button
                                                key={pageNum}
                                                variant={currentPageNum === pageNum ? 'default' : 'outline'}
                                                size="sm"
                                                onClick={() => handlePageChange(pageNum)}
                                                className="w-10"
                                            >
                                                {pageNum}
                                            </Button>
                                        );
                                    })}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePageChange(currentPageNum + 1)}
                                    disabled={currentPageNum === lastPage}
                                >
                                    Next
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
