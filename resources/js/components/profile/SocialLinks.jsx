import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
    Facebook, 
    Instagram, 
    Linkedin, 
    Youtube, 
    ExternalLink,
    Phone,
    Building
} from 'lucide-react';

export default function SocialLinks({ user }) {
    // Mock social links - in a real app, these would come from the user's profile
    const socialLinks = {
        facebook: user?.facebook_url || null,
        instagram: user?.instagram_url || null,
        linkedin: user?.linkedin_url || null,
        youtube: user?.youtube_url || null,
    };

    const hasSocialLinks = Object.values(socialLinks).some(link => link);

    return (
        <div className="space-y-6">
            {/* Social Networks */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-gradient-to-r from-blue-500 to-purple-500 rounded"></div>
                        Social Networks
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {hasSocialLinks ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {socialLinks.facebook && (
                                <Button 
                                    variant="outline" 
                                    className="w-full justify-start gap-3"
                                    onClick={() => window.open(socialLinks.facebook, '_blank')}
                                >
                                    <Facebook className="w-4 h-4 text-blue-600" />
                                    <span>Facebook</span>
                                    <ExternalLink className="w-3 h-3 ml-auto" />
                                </Button>
                            )}
                            
                            {socialLinks.instagram && (
                                <Button 
                                    variant="outline" 
                                    className="w-full justify-start gap-3"
                                    onClick={() => window.open(socialLinks.instagram, '_blank')}
                                >
                                    <Instagram className="w-4 h-4 text-pink-600" />
                                    <span>Instagram</span>
                                    <ExternalLink className="w-3 h-3 ml-auto" />
                                </Button>
                            )}
                            
                            {socialLinks.linkedin && (
                                <Button 
                                    variant="outline" 
                                    className="w-full justify-start gap-3"
                                    onClick={() => window.open(socialLinks.linkedin, '_blank')}
                                >
                                    <Linkedin className="w-4 h-4 text-blue-700" />
                                    <span>LinkedIn</span>
                                    <ExternalLink className="w-3 h-3 ml-auto" />
                                </Button>
                            )}
                            
                            {socialLinks.youtube && (
                                <Button 
                                    variant="outline" 
                                    className="w-full justify-start gap-3"
                                    onClick={() => window.open(socialLinks.youtube, '_blank')}
                                >
                                    <Youtube className="w-4 h-4 text-red-600" />
                                    <span>YouTube Channel</span>
                                    <ExternalLink className="w-3 h-3 ml-auto" />
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <div className="w-8 h-8 bg-gray-300 rounded"></div>
                            </div>
                            <p>No social networks added yet</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Phone className="w-5 h-5" />
                        Contact Information
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <Phone className="w-4 h-4 text-gray-500" />
                        <div>
                            <div className="text-sm text-gray-500">Phone Number</div>
                            <div className="font-medium">{user?.phone || 'Not provided'}</div>
                        </div>
                    </div>
                    
                    {user?.agency && (
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <Building className="w-4 h-4 text-gray-500" />
                            <div>
                                <div className="text-sm text-gray-500">Agency</div>
                                <div className="font-medium">{user.agency.name}</div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Professional Stats */}
            <Card>
                <CardHeader>
                    <CardTitle>Professional Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">12</div>
                            <div className="text-sm text-gray-500">Successful Matches</div>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">8</div>
                            <div className="text-sm text-gray-500">Happy Couples</div>
                        </div>
                        <div className="text-center p-4 bg-purple-50 rounded-lg">
                            <div className="text-2xl font-bold text-purple-600">4.8</div>
                            <div className="text-sm text-gray-500">Rating</div>
                        </div>
                        <div className="text-center p-4 bg-orange-50 rounded-lg">
                            <div className="text-2xl font-bold text-orange-600">2</div>
                            <div className="text-sm text-gray-500">Years Experience</div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
