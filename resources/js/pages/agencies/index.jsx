import PostCard from '@/components/posts/PostCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Building2, Calendar, ExternalLink, MapPin, UserCheck, Users } from 'lucide-react';
import { useState } from 'react';

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
                    <h1 className="text-foreground text-3xl font-bold">Agencies</h1>
                    <p className="text-muted-foreground">Explore our agencies and their team members</p>
                </div>

                {/* Horizontal Navigation Tabs */}
                <Card className=" tabsCard">
                    <CardContent className="">
                        <div className="flex flex-wrap gap-2 py-4 sm:h-[90%] h-[300px] btnTabs items-center overflow-y-scroll">
                            {agencies.map((agency) => (
                                <Button
                                    key={agency.id}
                                    variant={activeTab === agency.id ? 'default' : 'outline'}
                                    onClick={() => handleAgencyClick(agency.id)}
                                    className="flex items-center hover:bg-[#890505]! cursor-pointer hover:text-white gap-2 rounded-lg px-2 py-2 sm:w-[250px] w-full max-w-content text-truncate"
                                    style={activeTab === agency.id ? { backgroundColor: '#890505', color: '#ffffff' } : {}}
                                >
                                    <Building2 className="" />
                                    {agency.name}
                                    {/* <Badge className="" style={{ backgroundColor: '#096725', color: '#ffffff' }}>
                                        {agency.matchmakers_count || 0}M
                                    </Badge> */}
                                </Button>
                            ))}
                        </div>
                    </CardContent>
                </Card>
                <Card className=" h-48 p-0!">
                    {/* <CardHeader>
                        <CardTitle>Agency Image</CardTitle>
                    </CardHeader> */}
                    {/* <CardContent className="p-0"> */}
                        <div className="relative h-full w-full overflow-hidden rounded-lg">
                            <img
                                src={getAgencyImage(selectedAgency)}
                                alt={selectedAgency?.name}
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                    e.target.src = '/images/team.jpg';
                                }}
                            />
                        </div>
                    {/* </CardContent> */}
                </Card>

                {/* Agency Details Section */}
                {selectedAgency ? (
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                        {/* Left Column - Agency Information */}
                        <div className="space-y-4 lg:col-span-2">
                            {/* Agency Header Card */}
                            <Card className="overflow-hidden">
                                <div className="relative p-6" style={{ backgroundColor: 'rgba(9, 103, 37, 0.05)' }}>
                                    <div className="flex items-start gap-4">
                                        <div className="relative">
                                            <img
                                                src={getAgencyImage(selectedAgency)}
                                                alt={selectedAgency.name}
                                                className="h-20 w-20 rounded-full border-4 border-white object-cover shadow-lg"
                                                onError={(e) => {
                                                    e.target.src = '/images/team.jpg';
                                                }}
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h2 className="text-foreground mb-1 text-2xl font-bold">{selectedAgency.name}</h2>
                                                    <div className="text-muted-foreground mb-2 flex items-center gap-2">
                                                        <MapPin className="h-4 w-4" />
                                                        <span>
                                                            {selectedAgency.city}, {selectedAgency.country}
                                                        </span>
                                                    </div>
                                                    <p className="text-muted-foreground text-sm">{selectedAgency.address}</p>
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
                                    <h3 className="mb-3 text-lg font-bold">About the Agency</h3>

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
                                        <Users className="h-5 w-5" />
                                        Team Members
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Matchmakers */}
                                    {selectedAgency.matchmakers && selectedAgency.matchmakers.length > 0 && (
                                        <div>
                                            <h4 className="mb-3 flex items-center gap-2 font-semibold">
                                                <UserCheck className="h-4 w-4" />
                                                Matchmakers ({selectedAgency.matchmakers.length})
                                            </h4>
                                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                {selectedAgency.matchmakers.map((matchmaker) => (
                                                    <Card key={matchmaker.id} className="overflow-hidden transition-shadow hover:shadow-md">
                                                        <CardContent className="p-4">
                                                            <div className="flex items-center gap-3">
                                                                <img
                                                                    src={getProfilePicture(matchmaker)}
                                                                    alt={matchmaker.name}
                                                                    className="h-12 w-12 rounded-full object-cover"
                                                                    onError={(e) => {
                                                                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(matchmaker.name)}&background=random`;
                                                                    }}
                                                                />
                                                                <div className="min-w-0 flex-1">
                                                                    <h5 className="truncate font-semibold">{matchmaker.name}</h5>
                                                                    <p className="text-muted-foreground truncate text-sm">{matchmaker.email}</p>
                                                                    {matchmaker.matchmaker_bio && (
                                                                        <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                                                                            {matchmaker.matchmaker_bio}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                                <Link href={`/profile/${matchmaker.username || matchmaker.id}`}>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        className="flex items-center gap-1 hover:opacity-90"
                                                                        style={{ borderColor: '#890505', color: '#890505' }}
                                                                    >
                                                                        View Profile
                                                                        <ExternalLink className="h-3 w-3" />
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
                                            <h4 className="mb-3 flex items-center gap-2 font-semibold">
                                                <Users className="h-4 w-4" />
                                                Managers ({selectedAgency.managers.length})
                                            </h4>
                                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                {selectedAgency.managers.map((manager) => (
                                                    <Card key={manager.id} className="overflow-hidden transition-shadow hover:shadow-md">
                                                        <CardContent className="p-4">
                                                            <div className="flex items-center gap-3">
                                                                <img
                                                                    src={getProfilePicture(manager)}
                                                                    alt={manager.name}
                                                                    className="h-12 w-12 rounded-full object-cover"
                                                                    onError={(e) => {
                                                                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(manager.name)}&background=random`;
                                                                    }}
                                                                />
                                                                <div className="min-w-0 flex-1">
                                                                    <h5 className="truncate font-semibold">{manager.name}</h5>
                                                                    <p className="text-muted-foreground truncate text-sm">{manager.email}</p>
                                                                </div>
                                                                <Link href={`/profile/${manager.username || manager.id}`}>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        className="flex items-center gap-1 hover:opacity-90"
                                                                        style={{ borderColor: '#890505', color: '#890505' }}
                                                                    >
                                                                        View Profile
                                                                        <ExternalLink className="h-3 w-3" />
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
                                            <div className="text-muted-foreground py-8 text-center">
                                                <Users className="mx-auto mb-2 h-12 w-12 opacity-50" />
                                                <p>No team members assigned to this agency yet.</p>
                                            </div>
                                        )}
                                </CardContent>
                            </Card>

                            {/* Latest Posts from Matchmakers Section */}
                            {selectedAgency.latest_posts && selectedAgency.latest_posts.length > 0 && (
                                <Card className=''>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Calendar className="h-5 w-5" />
                                            Latest Posts from Matchmakers
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className=''>
                                        <div className="space-y-4">
                                            {selectedAgency.latest_posts.map((post) => (
                                                <PostCard key={post.id} post={post}   />
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Agency Posts Section */}
                            {selectedAgency.agency_posts && selectedAgency.agency_posts.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Calendar className="h-5 w-5" />
                                            Agency Posts
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            {selectedAgency.agency_posts.map((post) => (
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
                                        <MapPin className="h-5 w-5" />
                                        Location
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    {selectedAgency.map ? (
                                        <div className="relative h-64 w-full overflow-hidden rounded-lg">
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
                                        <div className="bg-muted flex h-64 w-full items-center justify-center rounded-lg">
                                            <div className="text-muted-foreground text-center">
                                                <MapPin className="mx-auto mb-2 h-12 w-12 opacity-50" />
                                                <p>Map not available</p>
                                            </div>
                                        </div>
                                    )}
                                    <div className="bg-white p-4">
                                        <div className="space-y-1">
                                            <p className="font-semibold">{selectedAgency.name}</p>
                                            <p className="text-muted-foreground flex items-center gap-1 text-sm">
                                                <MapPin className="h-3 w-3" />
                                                {selectedAgency.address}
                                            </p>
                                            <p className="text-muted-foreground text-sm">
                                                {selectedAgency.city}, {selectedAgency.country}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                ) : (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <Building2 className="text-muted-foreground mx-auto mb-4 h-16 w-16 opacity-50" />
                            <h3 className="mb-2 text-lg font-semibold">Select an Agency</h3>
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
