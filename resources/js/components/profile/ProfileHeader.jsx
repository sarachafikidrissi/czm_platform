import { Button } from '@/components/ui/button';
import { Link } from '@inertiajs/react';
import { Calendar, Edit, MapPin } from 'lucide-react';
import { FaUser } from 'react-icons/fa';
import SocialLinks from './SocialLinks';

export default function ProfileHeader({ user, profile, isOwnProfile, age }) {
    const userRole = user?.roles?.[0]?.name || 'user';

    console.log(user);

    return (
        <div className="relative">
            {/* Cover Image */}
            <div className="relative h-64 overflow-hidden bg-gradient-to-r from-blue-600 to-purple-600 md:h-80">
                <div className="bg-opacity-20 absolute inset-0 bg-black">
                    <img src={`/images/morocco-flag-banner.jpg`} alt={user?.name} className="h-full w-full object-cover" />
                </div>
                {/* <div className="absolute bottom-4 left-4 text-white">
                    <h1 className="text-2xl md:text-3xl font-bold">{user?.name}</h1>
                    <p className="text-lg opacity-90">
                        {user?.city}, {user?.country}
                    </p>
                </div> */}
            </div>

            {/* Profile Picture and Info */}
            <div className="relative px-4 md:px-6">
                <div className="-mt-16 flex flex-col items-start gap-4 md:-mt-20 md:flex-row md:items-end">
                    {/* Profile Picture */}
                    <div className="relative">
                        <div className="h-32 w-32 overflow-hidden rounded-full border-4 border-white bg-gray-200 shadow-lg md:h-40 md:w-40">
                            {(() => {
                                let profilePictureSrc = null;

                                if (userRole === 'user' && user?.profile?.profile_picture_path) {
                                    profilePictureSrc = `/storage/${user.profile.profile_picture_path}`;
                                } 
                                // else if (userRole !== 'user' && user?.profile_picture) {
                                //     profilePictureSrc = `/storage/${user.profile_picture}`;
                                // }
                                else{
                                    profilePictureSrc = `/storage/${user.profile_picture}`;
                                }

                                return profilePictureSrc ? (
                                    <img src={profilePictureSrc} alt={user?.name} className="h-full w-full object-cover" />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center bg-gray-300">
                                        <span className="text-4xl font-bold text-gray-600">{user?.name?.charAt(0)}</span>
                                    </div>
                                );
                            })()}
                        </div>
                        {isOwnProfile && (
                            <Link href="/settings/profile">
                                <Button size="sm" className="absolute -right-2 -bottom-2 h-8 w-8 rounded-full p-0" variant="outline">
                                    <Edit className="h-4 w-4" />
                                </Button>
                            </Link>
                        )}
                    </div>

                    {/* User Info */}
                    <div className="">
                        <h2 className="text-2xl font-bold text-gray-900 md:text-xl">{user?.name}</h2>
                        <div className="flex items-center gap-x-3">
                            {age && (
                                <div className="flex items-center gap-2 text-gray-600">
                                    <Calendar className="h-4 w-4" />
                                    <span>{age} years old</span>
                                </div>
                            )}
                            <div className="flex flex-col gap-2 text-gray-600 md:flex-row md:items-center">
                                <div className="flex items-center gap-x-1">
                                    <MapPin className="h-4 w-4" />
                                    <span>
                                        {user?.city}, {user?.country}
                                    </span>
                                </div>
                                {userRole != 'user' ? <SocialLinks user={user} /> : ''}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

           
        </div>
    );
}
