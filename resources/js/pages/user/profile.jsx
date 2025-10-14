import { Head, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileDetails from '@/components/profile/ProfileDetails';
import SocialLinks from '@/components/profile/SocialLinks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Phone, Building } from 'lucide-react';

export default function UserProfile({ user, profile, agency }) {
    const { auth } = usePage().props;
    const isOwnProfile = auth?.user?.id === user?.id;
    
    // Get user role
    const userRole = user?.roles?.[0]?.name || 'user';
    
    // Calculate age from date of birth
    const calculateAge = (dateOfBirth) => {
        if (!dateOfBirth) return null;
        const today = new Date();
        const birthDate = new Date(dateOfBirth);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    const age = calculateAge(profile?.date_naissance);

    return (
        <AppLayout>
            <Head title={`${user?.name} - Profile`} />
            <div className="min-h-screen bg-gray-50">
                {/* Profile Header */}
                <ProfileHeader 
                    user={user} 
                    profile={profile} 
                    isOwnProfile={isOwnProfile}
                    age={age}
                />

                <div className="max-w-6xl mx-auto px-4 py-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Main Content */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Role-based Content */}
                            {userRole === 'user' && (
                                <ProfileDetails profile={profile} />
                            )}
                            
                            {userRole === 'matchmaker' && (
                                <div className="space-y-6">
                                    {/* Social Links */}
                                    <SocialLinks user={user} />
                                    
                                    {/* Contact Information */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <Phone className="w-5 h-5" />
                                                Contact Information
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="flex items-center gap-3">
                                                <Phone className="w-4 h-4 text-gray-500" />
                                                <span>{user?.phone}</span>
                                            </div>
                                            {agency && (
                                                <div className="flex items-center gap-3">
                                                    <Building className="w-4 h-4 text-gray-500" />
                                                    <span>{agency.name}</span>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>
                            )}
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {/* Basic Info Card */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Basic Information</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <MapPin className="w-4 h-4 text-gray-500" />
                                        <span>{user?.city}, {user?.country}</span>
                                    </div>
                                    {age && (
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm text-gray-500">Age:</span>
                                            <span>{age} years old</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm text-gray-500">Role:</span>
                                        <Badge variant="outline" className="capitalize">
                                            {userRole}
                                        </Badge>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Stats Card */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Statistics</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-blue-600">
                                                {userRole === 'user' ? '0' : '12'}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {userRole === 'user' ? 'Posts' : 'Matches'}
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-green-600">
                                                {userRole === 'user' ? '0' : '8'}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {userRole === 'user' ? 'Followers' : 'Success'}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
