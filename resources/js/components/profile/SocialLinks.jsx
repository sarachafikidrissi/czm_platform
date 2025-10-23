import { Building, Phone } from 'lucide-react';
import { FaFacebook, FaInstagram, FaLinkedin, FaYoutube } from 'react-icons/fa';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';


export default function SocialLinks({ user }) {
    // Mock social links - in a real app, these would come from the user's profile
    const socialLinks = {
        facebook: user?.facebook_url || null,
        instagram: user?.instagram_url || null,
        linkedin: user?.linkedin_url || null,
        youtube: user?.youtube_url || null,
    };

    const hasSocialLinks = Object.values(socialLinks).some((link) => link);

    return (
        <div className="space-y-6 ">
            {/* Social Networks */}
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
                {/* <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-gradient-to-r from-blue-500 to-purple-500 rounded"></div>
                        Social Networks
                    </CardTitle>
                </CardHeader> */}
                <div>
                    {hasSocialLinks ? (
                        <div className="flex items-center gap-x-4">
                            {socialLinks.facebook && (
                                <FaFacebook
                                    className="cursor-pointer rounded-full text-blue-600"
                                    size={30}
                                    onClick={() => window.open(socialLinks.facebook, '_blank')}
                                />
                            )}

                            {socialLinks.instagram && (
                                <FaInstagram
                                    className="cursor-pointer rounded-full bg-pink-600 p-1 text-white"
                                    size={30}
                                    onClick={() => window.open(socialLinks.instagram, '_blank')}
                                />
                            )}

                            {socialLinks.linkedin && (
                                <FaLinkedin
                                    className="cursor-pointer rounded-full bg-blue-700 p-1 text-white"
                                    size={30}
                                    onClick={() => window.open(socialLinks.linkedin, '_blank')}
                                />
                            )}

                            {socialLinks.youtube && (
                                <FaYoutube
                                    className="cursor-pointer rounded-full bg-red-600 p-1 text-white"
                                    size={30}
                                    onClick={() => window.open(socialLinks.youtube, '_blank')}
                                />
                            )}
                        </div>
                    ) : (
                        <div className="">
                            {/* <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                                <div className="h-8 w-8 rounded bg-gray-300"></div>
                            </div> */}
                            <p>No social networks added yet</p>
                        </div>
                    )}
                </div>
                {/* Contact Information */}
                {/* <div> */}
                {/* <div className="flex items-center gap-3"> */}
                <div className="flex items-center">
                    <Phone className="h-4 w-4 text-green-700" />
                    {/* <div> */}
                    {/* <div className="text-sm text-gray-500">Phone Number</div> */}
                    <div className="font-medium text-red-700">{user?.phone || 'Not provided'}</div>
                    {/* </div> */}
                </div>

                {user?.agency && (
                    <div className="flex items-center gap-3">
                        {/* <div> */}
                            <Building className="h-4 w-4 text-red-950" /> <span>Agency</span>
                        <div className="font-medium">{user.agency.name}</div>
                        {/* </div> */}
                    </div>
                )}
                {/* </div> */}
                {/* </div> */}
            </div>

        </div>
    );
}
