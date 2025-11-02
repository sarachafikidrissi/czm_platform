import { Head, router, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';
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
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 24;

    // Reset page when prospects change (e.g., filter changes)
    useEffect(() => {
        setCurrentPage(1);
    }, [prospects.length, status]);

    // Pagination logic
    const totalPages = Math.ceil(prospects.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedProspects = prospects.slice(startIndex, endIndex);
    const showingStart = prospects.length > 0 ? startIndex + 1 : 0;
    const showingEnd = Math.min(endIndex, prospects.length);

    const handleStatusFilter = (newStatus) => {
        setSelectedStatus(newStatus);
        router.visit(`/manager/tracking?status=${newStatus}`, { preserveScroll: true, preserveState: true, replace: true });
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
                                        Showing {showingStart} to {showingEnd} of {prospects.length} users
                                    </div>
                                    {totalPages > 1 && (
                                        <div>
                                            Page {currentPage} of {totalPages}
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
                                {paginatedProspects.map((prospect) => (
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
                                                    onClick={() => router.visit(`/profile/${prospect.username || prospect.id}`)}
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
                                        {paginatedProspects.map((prospect) => (
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
                                                        onClick={() => router.visit(`/profile/${prospect.username || prospect.id}`)}
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

                        {paginatedProspects.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                No users found that were validated when you were the manager in charge.
                            </div>
                        )}

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="flex justify-center items-center gap-2 mt-6">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                >
                                    Previous
                                </Button>
                                <div className="flex gap-1">
                                    {[...Array(totalPages)].map((_, i) => {
                                        const pageNum = i + 1;
                                        if (
                                            pageNum === 1 ||
                                            pageNum === totalPages ||
                                            (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                                        ) {
                                            return (
                                                <Button
                                                    key={pageNum}
                                                    variant={currentPage === pageNum ? 'default' : 'outline'}
                                                    size="sm"
                                                    onClick={() => setCurrentPage(pageNum)}
                                                    className="w-10"
                                                >
                                                    {pageNum}
                                                </Button>
                                            );
                                        } else if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                                            return <span key={pageNum} className="px-2">...</span>;
                                        }
                                        return null;
                                    })}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
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
