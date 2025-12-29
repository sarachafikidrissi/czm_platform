import { Head, router } from '@inertiajs/react';
import { useState, useMemo } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LayoutGrid, Table2, Search, User, MapPin, Calendar, Heart, CheckCircle } from 'lucide-react';

export default function MatchmakingEntry({ prospects }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'

    // Filter prospects based on search query
    const filteredProspects = useMemo(() => {
        if (!prospects || prospects.length === 0) return [];
        if (!searchQuery.trim()) return prospects;

        const query = searchQuery.toLowerCase().trim();
        return prospects.filter(p => {
            const name = (p.name || '').toLowerCase();
            const email = (p.email || '').toLowerCase();
            const username = (p.username || '').toLowerCase();
            const city = (p.profile?.ville_residence || '').toLowerCase();
            return name.includes(query) || 
                   email.includes(query) || 
                   username.includes(query) ||
                   city.includes(query);
        });
    }, [prospects, searchQuery]);

    // Helper function to get profile picture URL
    const getProfilePicture = (user) => {
        if (user.profile?.profile_picture_path) {
            return `/storage/${user.profile.profile_picture_path}`;
        }
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`;
    };

    // Helper function to get location
    const getLocation = (user) => {
        const city = user.profile?.ville_residence || '';
        const country = user.profile?.pays_residence || '';
        if (city && country) {
            return `${city}, ${country}`;
        }
        return city || country || 'Non spécifié';
    };

    // Helper function to calculate age
    const getAge = (user) => {
        if (!user.profile?.date_naissance) return null;
        const birthDate = new Date(user.profile.date_naissance);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    // Helper function to get status info
    const getStatusInfo = (status) => {
        switch (status) {
            case 'member':
                return { label: 'Member', className: 'bg-blue-500 text-white' };
            case 'client':
                return { label: 'Client', className: 'bg-green-500 text-white' };
            case 'client_expire':
                return { label: 'Client Expiré', className: 'bg-orange-500 text-white' };
            default:
                return { label: status || 'Unknown', className: 'bg-gray-500 text-white' };
        }
    };

    // Handle "À proposer" button click
    const handlePropose = (userId) => {
        router.visit(`/staff/match/results/${userId}`);
    };

    return (
        <AppLayout>
            <Head title="Recherche de Matchmaking" />
            
            <div className="space-y-6 p-4 ">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Recherche de Matchmaking</h1>
                        <p className="text-muted-foreground mt-2">
                            Liste des membres et clients assignés. Cliquez sur "À proposer" pour démarrer le processus de matchmaking intelligent.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant={viewMode === 'cards' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setViewMode('cards')}
                        >
                            <LayoutGrid className="w-4 h-4 mr-2" />
                            Cards
                        </Button>
                        <Button
                            variant={viewMode === 'table' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setViewMode('table')}
                        >
                            <Table2 className="w-4 h-4 mr-2" />
                            Table
                        </Button>
                    </div>
                </div>

                {/* Search Bar */}
                <Card>
                    <CardContent className="pt-6">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <Input
                                type="text"
                                placeholder="Rechercher par nom, email, username ou ville..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Results Count */}
                {filteredProspects.length > 0 && (
                    <div className="text-sm text-muted-foreground">
                        {filteredProspects.length} profil{filteredProspects.length > 1 ? 's' : ''} trouvé{filteredProspects.length > 1 ? 's' : ''}
                    </div>
                )}

                {/* Cards View */}
                {viewMode === 'cards' && (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {filteredProspects.length === 0 ? (
                            <div className="col-span-full text-center py-12">
                                <p className="text-muted-foreground">
                                    {searchQuery ? 'Aucun profil trouvé pour votre recherche' : 'Aucun membre ou client éligible disponible'}
                                </p>
                            </div>
                        ) : (
                            filteredProspects.map((prospect) => {
                                const age = getAge(prospect);
                                const location = getLocation(prospect);
                                const statusInfo = getStatusInfo(prospect.status);
                                
                                return (
                                    <Card key={prospect.id} className="hover:shadow-md transition-shadow">
                                        <CardHeader>
                                            <div className="flex items-start gap-4">
                                                <img
                                                    src={getProfilePicture(prospect)}
                                                    alt={prospect.name}
                                                    className="w-16 h-16 rounded-full object-cover"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <CardTitle className="text-lg truncate">
                                                        {prospect.name}
                                                    </CardTitle>
                                                    <CardDescription className="mt-1">
                                                        <Badge variant={prospect.gender === 'male' ? 'default' : 'secondary'} className="text-xs">
                                                            {prospect.gender === 'male' ? 'Homme' : prospect.gender === 'female' ? 'Femme' : 'N/A'}
                                                        </Badge>
                                                    </CardDescription>
                                                    <Badge className={`${statusInfo.className} mt-2 text-xs`}>
                                                        {statusInfo.label}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="space-y-2 text-sm">
                                                {age && (
                                                    <div className="flex items-center gap-2 text-muted-foreground">
                                                        <Calendar className="w-4 h-4" />
                                                        <span>{age} ans</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <MapPin className="w-4 h-4" />
                                                    <span className="truncate">{location}</span>
                                                </div>
                                                {prospect.profile?.religion && (
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline">
                                                            {prospect.profile.religion}
                                                        </Badge>
                                                    </div>
                                                )}
                                            </div>

                                            <Button
                                                onClick={() => handlePropose(prospect.id)}
                                                className="w-full"
                                                size="sm"
                                            >
                                                <Heart className="w-4 h-4 mr-2" />
                                                À proposer
                                            </Button>
                                        </CardContent>
                                    </Card>
                                );
                            })
                        )}
                    </div>
                )}

                {/* Table View */}
                {viewMode === 'table' && (
                    <Card>
                        <CardContent className="p-0">
                            {filteredProspects.length === 0 ? (
                                <div className="text-center py-12">
                                    <p className="text-muted-foreground">
                                        {searchQuery ? 'Aucun profil trouvé pour votre recherche' : 'Aucun membre ou client éligible disponible'}
                                    </p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Profil</TableHead>
                                            <TableHead>Genre</TableHead>
                                            <TableHead>Âge</TableHead>
                                            <TableHead>Localisation</TableHead>
                                            <TableHead>Statut</TableHead>
                                            <TableHead>Religion</TableHead>
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredProspects.map((prospect) => {
                                            const age = getAge(prospect);
                                            const location = getLocation(prospect);
                                            const statusInfo = getStatusInfo(prospect.status);
                                            
                                            return (
                                                <TableRow key={prospect.id}>
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <img
                                                                src={getProfilePicture(prospect)}
                                                                alt={prospect.name}
                                                                className="w-10 h-10 rounded-full object-cover"
                                                            />
                                                            <span className="font-medium">{prospect.name}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={prospect.gender === 'male' ? 'default' : 'secondary'}>
                                                            {prospect.gender === 'male' ? 'Homme' : prospect.gender === 'female' ? 'Femme' : 'N/A'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        {age ? `${age} ans` : 'N/A'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <MapPin className="w-4 h-4 text-muted-foreground" />
                                                            <span className="text-sm">{location}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge className={statusInfo.className}>
                                                            {statusInfo.label}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        {prospect.profile?.religion ? (
                                                            <Badge variant="outline">
                                                                {prospect.profile.religion}
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-muted-foreground text-sm">N/A</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            onClick={() => handlePropose(prospect.id)}
                                                            size="sm"
                                                            variant="default"
                                                        >
                                                            <Heart className="w-4 h-4 mr-2" />
                                                            À proposer
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}

