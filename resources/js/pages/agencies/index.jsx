import PostCard from '@/components/posts/PostCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Building2, Calendar, ExternalLink, MapPin, UserCheck, Users } from 'lucide-react';
import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function AgenciesIndex() {
    const { t } = useTranslation();
    const { agencies = [], selectedAgency } = usePage().props;
    const [activeTab, setActiveTab] = useState(selectedAgency?.id || null);
    // Show skeleton only if an agency is selected (activeTab is set) but data is not yet loaded
    // Don't show skeleton if no agency is selected at all
    const isLoading = activeTab !== null && (selectedAgency === null || selectedAgency === undefined);

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
            <Head title={t('common.agencies')} />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Page Header */}
                <div className="flex flex-col gap-3">
                    <h1 className="text-foreground text-3xl font-bold">{t('common.agencies')}</h1>
                    <p className="text-muted-foreground">{t('agencies.exploreAgencies')}</p>
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
                    {isLoading ? (
                        <Skeleton className="h-full w-full" />
                    ) : selectedAgency ? (
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
                    ) : null}
                </Card>

                {/* Agency Details Section */}
                {isLoading ? (
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                        {/* Left Column Skeleton */}
                        <div className="space-y-4 lg:col-span-2">
                            {/* Agency Header Card Skeleton */}
                            <Card className="overflow-hidden">
                                <div className="relative p-6" style={{ backgroundColor: 'rgba(9, 103, 37, 0.05)' }}>
                                    <div className="flex items-start gap-4 max-md:flex-col">
                                        <Skeleton className="h-20 w-20 rounded-full" />
                                        <div className="flex-1 space-y-3">
                                            <div className="flex items-start justify-between">
                                                <div className="space-y-2">
                                                    <Skeleton className="h-8 w-48" />
                                                    <Skeleton className="h-4 w-64" />
                                                    <Skeleton className="h-4 w-80" />
                                                </div>
                                                <Skeleton className="h-6 w-24" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <CardContent className="p-6">
                                    <Skeleton className="h-6 w-32 mb-3" />
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-3/4" />
                                </CardContent>
                            </Card>

                            {/* Team Members Section Skeleton */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Users className="h-5 w-5" />
                                        {t('agencies.teamMembers')}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        {[1, 2, 3, 4].map((i) => (
                                            <Card key={i} className="overflow-hidden">
                                                <CardContent className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <Skeleton className="h-12 w-12 rounded-full" />
                                                        <div className="flex-1 space-y-2">
                                                            <Skeleton className="h-4 w-32" />
                                                            <Skeleton className="h-3 w-40" />
                                                        </div>
                                                        <Skeleton className="h-8 w-24" />
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Posts Section Skeleton */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Calendar className="h-5 w-5" />
                                        {t('agencies.latestPostsFromMatchmakers')}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {[1, 2].map((i) => (
                                            <Card key={i}>
                                                <CardContent className="p-4 space-y-3">
                                                    <div className="flex items-center gap-3">
                                                        <Skeleton className="h-10 w-10 rounded-full" />
                                                        <div className="space-y-2">
                                                            <Skeleton className="h-4 w-32" />
                                                            <Skeleton className="h-3 w-24" />
                                                        </div>
                                                    </div>
                                                    <Skeleton className="h-4 w-full" />
                                                    <Skeleton className="h-4 w-3/4" />
                                                    <Skeleton className="h-48 w-full" />
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Right Column Skeleton */}
                        <div className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <MapPin className="h-5 w-5" />
                                        {t('agencies.location')}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <Skeleton className="h-64 w-full" />
                                    <div className="bg-white p-4 space-y-2">
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-3 w-48" />
                                        <Skeleton className="h-3 w-40" />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                ) : selectedAgency ? (
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                        {/* Left Column - Agency Information */}
                        <div className="space-y-4 lg:col-span-2">
                            {/* Agency Header Card */}
                            <Card className="overflow-hidden">
                                <div className="relative p-6" style={{ backgroundColor: 'rgba(9, 103, 37, 0.05)' }}>
                                    <div className="flex items-start gap-4  max-md:flex-col">
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
                                                    <h2 className="text-foreground mb-1 text-2xl max-md:text-xl font-bold">{selectedAgency.name}</h2>
                                                    <div className="text-muted-foreground mb-2 flex items-center gap-2">
                                                        <MapPin className="h-4 w-4" />
                                                        <span>
                                                            {selectedAgency.city}, {selectedAgency.country}
                                                        </span>
                                                    </div>
                                                    <p className="text-muted-foreground text-sm">{selectedAgency.address}</p>
                                                </div>
                                <Badge style={{ backgroundColor: '#096725', color: '#ffffff' }}>
                                    {selectedAgency.matchmakers?.length || 0} {t('agencies.matchmakers')}
                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* About Section */}
                                <CardContent className="p-6">
                                    <h3 className="mb-3 text-lg font-bold">{t('agencies.aboutAgency')}</h3>

                                    <p className="text-muted-foreground">
                                        {selectedAgency.matchmakers?.length > 0
                                            ? t('agencies.agencyDescription', { 
                                                matchmakersCount: selectedAgency.matchmakers.length, 
                                                managersCount: selectedAgency.managers?.length || 0 
                                              })
                                            : t('agencies.agencyInfoPlaceholder')}
                                    </p>
                                </CardContent>
                            </Card>

                            {/* Team Members Section */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Users className="h-5 w-5" />
                                        {t('agencies.teamMembers')}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Matchmakers */}
                                    {selectedAgency.matchmakers && selectedAgency.matchmakers.length > 0 && (
                                        <div>
                                            <h4 className="mb-3 flex items-center gap-2 font-semibold">
                                                <UserCheck className="h-4 w-4" />
                                                {t('agencies.matchmakers')} ({selectedAgency.matchmakers.length})
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
                                                                <a href={`/profile/${matchmaker.username || matchmaker.id}`} target="_blank" rel="noopener noreferrer">
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        className="flex items-center gap-1 hover:opacity-90"
                                                                        style={{ borderColor: '#890505', color: '#890505' }}
                                                                    >
                                                                        {t('common.view')} {t('common.profile')}
                                                                        <ExternalLink className="h-3 w-3" />
                                                                    </Button>
                                                                </a>
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
                                                {t('agencies.managers')} ({selectedAgency.managers.length})
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
                                                                <a href={`/profile/${manager.username || manager.id}`} target="_blank" rel="noopener noreferrer">
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        className="flex items-center gap-1 hover:opacity-90"
                                                                        style={{ borderColor: '#890505', color: '#890505' }}
                                                                    >
                                                                        {t('common.view')} {t('common.profile')}
                                                                        <ExternalLink className="h-3 w-3" />
                                                                    </Button>
                                                                </a>
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
                                                <p>{t('agencies.noTeamMembers')}</p>
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
                                            {t('agencies.latestPostsFromMatchmakers')}
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
                                            {t('agencies.agencyPosts')}
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
                                        {t('agencies.location')}
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
                                                <p>{t('agencies.mapNotAvailable')}</p>
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
                            <h3 className="mb-2 text-lg font-semibold">{t('agencies.selectAgency')}</h3>
                            <p className="text-muted-foreground">
                                {t('agencies.selectAgencyDescription')}
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}
