import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Calendar, Edit } from 'lucide-react';
import { Link } from '@inertiajs/react';

export default function ProfileHeader({ user, profile, isOwnProfile, age }) {
    return (
        <div className="relative">
            {/* Cover Image */}
            <div className="h-64 md:h-80 bg-gradient-to-r from-blue-600 to-purple-600 relative overflow-hidden">
                <div className="absolute inset-0 bg-black bg-opacity-20"></div>
                <div className="absolute bottom-4 left-4 text-white">
                    <h1 className="text-2xl md:text-3xl font-bold">{user?.name}</h1>
                    <p className="text-lg opacity-90">
                        {user?.city}, {user?.country}
                    </p>
                </div>
            </div>

            {/* Profile Picture and Info */}
            <div className="relative px-4 md:px-6">
                <div className="flex flex-col md:flex-row items-start md:items-end gap-4 -mt-16 md:-mt-20">
                    {/* Profile Picture */}
                    <div className="relative">
                        <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white bg-gray-200 overflow-hidden shadow-lg">
                            {profile?.profile_picture_path ? (
                                <img 
                                    src={`/storage/${profile.profile_picture_path}`}
                                    alt={user?.name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                                    <span className="text-4xl font-bold text-gray-600">
                                        {user?.name?.charAt(0)}
                                    </span>
                                </div>
                            )}
                        </div>
                        {isOwnProfile && (
                            <Link href="/profile-info">
                                <Button 
                                    size="sm" 
                                    className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0"
                                    variant="outline"
                                >
                                    <Edit className="w-4 h-4" />
                                </Button>
                            </Link>
                        )}
                    </div>

                    {/* User Info */}
                    <div className="flex-1 space-y-3">
                        <div>
                            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                                {user?.name}
                            </h2>
                            <div className="flex items-center gap-2 text-gray-600">
                                <MapPin className="w-4 h-4" />
                                <span>{user?.city}, {user?.country}</span>
                            </div>
                            {age && (
                                <div className="flex items-center gap-2 text-gray-600">
                                    <Calendar className="w-4 h-4" />
                                    <span>{age} years old</span>
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-3">
                            {!isOwnProfile && (
                                <>
                                    <Button className="bg-pink-500 hover:bg-pink-600 text-white">
                                        Follow
                                    </Button>
                                    <Button variant="outline" className="border-gray-300">
                                        Send Message
                                    </Button>
                                </>
                            )}
                        </div>

                        {/* Stats */}
                        <div className="flex gap-6 text-sm">
                            <div className="text-center">
                                <div className="font-bold text-lg">150</div>
                                <div className="text-gray-500">Posts</div>
                            </div>
                            <div className="text-center">
                                <div className="font-bold text-lg">420</div>
                                <div className="text-gray-500">Followers</div>
                            </div>
                            <div className="text-center">
                                <div className="font-bold text-lg">216</div>
                                <div className="text-gray-500">Views</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
