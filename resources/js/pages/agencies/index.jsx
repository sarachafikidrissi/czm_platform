import { Head, router, usePage, Link } from '@inertiajs/react';
import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MapPin, Building2, Users, UserCheck, ChevronUp, ExternalLink, Calendar } from 'lucide-react';
import PostCard from '@/components/posts/PostCard';

export default function AgenciesIndex() {
    const { agencies = [], selectedAgency } = usePage().props;
    const [activeTab, setActiveTab] = useState(selectedAgency?.id || null);

    const handleAgencyClick = (agencyId) => {
        setActiveTab(agencyId);
        router.visit(`/agencies/${agencyId}`, {
            preserveScroll: true,
            preserveState: false,
        });
    };

    const getProfilePicture = (user) => {
        if (user?.profile_picture) {
            return `/storage/${user.profile_picture}`;
        }
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=random`;
    };

    const getAgencyImage = (agency) => {
        if (agency?.image) {
            return `/storage/${agency.image}`;
        }
        return '/images/team.jpg'; // Default image
    };
    return (
        <AppLayout>
            <Head title="Agencies" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Page Header */}
                <div className="flex flex-col gap-3">
                    <h1 className="text-3xl font-bold text-foreground">Agencies</h1>
                    <p className="text-muted-foreground">
                        Explore our agencies and their team members
                    </p>
                </div>

                {/* Horizontal Navigation Tabs */}
                <Card>
                    <CardContent className="p-4">
                        <div className="flex flex-wrap gap-2 overflow-x-auto">
                            {agencies.map((agency) => (
                                <Button
                                    key={agency.id}
                                    variant={activeTab === agency.id ? 'default' : 'outline'}
                                    onClick={() => handleAgencyClick(agency.id)}
                                    className="flex items-center gap-2 rounded-lg px-4 py-2"
                                    style={activeTab === agency.id ? { backgroundColor: '#890505', color: '#ffffff' } : {}}
                                >
                                    <Building2 className="w-4 h-4" />
                                    {agency.name}
                                    <Badge className="ml-1" style={{ backgroundColor: '#096725', color: '#ffffff' }}>
                                        {agency.matchmakers_count || 0}M
                                    </Badge>
                                </Button>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Agency Details Section */}
                {selectedAgency ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Left Column - Agency Information */}
                        <div className="lg:col-span-2 space-y-4">
                            {/* Agency Header Card */}
                            <Card className="overflow-hidden">
                                <div className="relative p-6" style={{ backgroundColor: 'rgba(9, 103, 37, 0.05)' }}>
                                    <div className="flex items-start gap-4">
                                        <div className="relative">
                                            <img
                                                src={getAgencyImage(selectedAgency)}
                                                alt={selectedAgency.name}
                                                className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg"
                                                onError={(e) => {
                                                    e.target.src = '/images/team.jpg';
                                                }}
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h2 className="text-2xl font-bold text-foreground mb-1">
                                                        {selectedAgency.name}
                                                    </h2>
                                                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                                                        <MapPin className="w-4 h-4" />
                                                        <span>{selectedAgency.city}, {selectedAgency.country}</span>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">
                                                        {selectedAgency.address}
                                                    </p>
                                                </div>
                                                <Badge style={{ backgroundColor: '#096725', color: '#ffffff' }}>
                                                    {selectedAgency.matchmakers?.length || 0} Matchmakers
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* About Section */}
                                <CardContent className="p-6">
                                    <h3 className="text-lg font-bold mb-3">About the Agency</h3>
                                    <p className="text-muted-foreground">
                                        {selectedAgency.matchmakers?.length > 0 
                                            ? `This agency has ${selectedAgency.matchmakers.length} matchmaker(s) and ${selectedAgency.managers?.length || 0} manager(s) dedicated to helping you find your perfect match.`
                                            : 'Agency information will be displayed here.'}
                                    </p>
                                </CardContent>
                            </Card>

                            {/* Team Members Section */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Users className="w-5 h-5" />
                                        Team Members
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Matchmakers */}
                                    {selectedAgency.matchmakers && selectedAgency.matchmakers.length > 0 && (
                                        <div>
                                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                                                <UserCheck className="w-4 h-4" />
                                                Matchmakers ({selectedAgency.matchmakers.length})
                                            </h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {selectedAgency.matchmakers.map((matchmaker) => (
                                                    <Card key={matchmaker.id} className="overflow-hidden hover:shadow-md transition-shadow">
                                                        <CardContent className="p-4">
                                                            <div className="flex items-center gap-3">
                                                                <img
                                                                    src={getProfilePicture(matchmaker)}
                                                                    alt={matchmaker.name}
                                                                    className="w-12 h-12 rounded-full object-cover"
                                                                    onError={(e) => {
                                                                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(matchmaker.name)}&background=random`;
                                                                    }}
                                                                />
                                                                <div className="flex-1 min-w-0">
                                                                    <h5 className="font-semibold truncate">{matchmaker.name}</h5>
                                                                    <p className="text-sm text-muted-foreground truncate">{matchmaker.email}</p>
                                                                    {matchmaker.matchmaker_bio && (
                                                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                                                            {matchmaker.matchmaker_bio}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                                <Link href={`/profile/${matchmaker.username || matchmaker.id}`}>
                                                                    <Button size="sm" variant="outline" className="flex items-center gap-1 hover:opacity-90" style={{ borderColor: '#890505', color: '#890505' }}>
                                                                        View Profile
                                                                        <ExternalLink className="w-3 h-3" />
                                                                    </Button>
                                                                </Link>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Managers */}
                                    {selectedAgency.managers && selectedAgency.managers.length > 0 && (
                                        <div>
                                            <Separator className="my-4" />
                                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                                                <Users className="w-4 h-4" />
                                                Managers ({selectedAgency.managers.length})
                                            </h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {selectedAgency.managers.map((manager) => (
                                                    <Card key={manager.id} className="overflow-hidden hover:shadow-md transition-shadow">
                                                        <CardContent className="p-4">
                                                            <div className="flex items-center gap-3">
                                                                <img
                                                                    src={getProfilePicture(manager)}
                                                                    alt={manager.name}
                                                                    className="w-12 h-12 rounded-full object-cover"
                                                                    onError={(e) => {
                                                                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(manager.name)}&background=random`;
                                                                    }}
                                                                />
                                                                <div className="flex-1 min-w-0">
                                                                    <h5 className="font-semibold truncate">{manager.name}</h5>
                                                                    <p className="text-sm text-muted-foreground truncate">{manager.email}</p>
                                                                </div>
                                                                <Link href={`/profile/${manager.username || manager.id}`}>
                                                                    <Button size="sm" variant="outline" className="flex items-center gap-1 hover:opacity-90" style={{ borderColor: '#890505', color: '#890505' }}>
                                                                        View Profile
                                                                        <ExternalLink className="w-3 h-3" />
                                                                    </Button>
                                                                </Link>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {(!selectedAgency.matchmakers || selectedAgency.matchmakers.length === 0) &&
                                     (!selectedAgency.managers || selectedAgency.managers.length === 0) && (
                                        <div className="text-center py-8 text-muted-foreground">
                                            <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                            <p>No team members assigned to this agency yet.</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Latest Posts Section */}
                            {selectedAgency.latest_posts && selectedAgency.latest_posts.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Calendar className="w-5 h-5" />
                                            Latest Posts from Matchmakers
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            {selectedAgency.latest_posts.map((post) => (
                                                <PostCard key={post.id} post={post} />
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        {/* Right Column - Map and Agency Image */}
                        <div className="space-y-4">
                            {/* Map Section */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <MapPin className="w-5 h-5" />
                                        Location
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    {getMapUrl(selectedAgency.map, selectedAgency.address) ? (
                                        <div className="relative w-full h-64 rounded-lg overflow-hidden">
                                            <iframe
                                                src={selectedAgency.map}
                                                width="100%"
                                                height="100%"
                                                style={{ border: 0 }}
                                                allowFullScreen
                                                loading="lazy"
                                                referrerPolicy="no-referrer-when-downgrade"
                                                className="absolute inset-0"
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center">
                                            <div className="text-center text-muted-foreground">
                                                <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                                <p>Map not available</p>
                                            </div>
                                        </div>
                                    )}
                                    <div className="p-4 bg-white">
                                        <div className="space-y-1">
                                            <p className="font-semibold">{selectedAgency.name}</p>
                                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                                                <MapPin className="w-3 h-3" />
                                                {selectedAgency.address}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {selectedAgency.city}, {selectedAgency.country}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Agency Image */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Agency Image</CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="relative w-full h-48 rounded-lg overflow-hidden">
                                        <img
                                            src={getAgencyImage(selectedAgency)}
                                            alt={selectedAgency.name}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                e.target.src = '/images/team.jpg';
                                            }}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                ) : (
                    <Card>
                        <CardContent className="text-center py-12">
                            <Building2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                            <h3 className="text-lg font-semibold mb-2">Select an Agency</h3>
                            <p className="text-muted-foreground">
                                Click on an agency name above to view its details, team members, and latest posts.
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}

