import CreatePost from '@/components/posts/CreatePost';
import PostCard from '@/components/posts/PostCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import { Head, router, usePage } from '@inertiajs/react';
import { BookOpen, Camera, Facebook, Heart, Instagram, Linkedin, MapPin, MessageSquareWarning, Share2, Trash2, User, X, Youtube } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function UserProfile({ user, profile, agency, matchmakerNotes = [], matchmakerEvaluation = null, photos = [] }) {
    const { t } = useTranslation();
    const { auth } = usePage().props;
    const isOwnProfile = auth?.user?.id === user?.id;
    
    const assignedMatchmakerId = auth.user['assigned_matchmaker']?.id;

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

    // Controller-provided matchmaking data
    const pageProps = usePage().props;
    const profilRecherche = pageProps?.profil_recherche || {};
    const apropos = pageProps?.apropos || {};

    // Feedback local state
    const [avis, setAvis] = useState('');
    const [commentaire, setCommentaire] = useState('');

    // Visibility: who can see notes/evaluation
    const viewerRole = auth?.user?.roles?.[0]?.name || 'user';
    const canManage =
        viewerRole === 'admin' ||
        (viewerRole === 'matchmaker' && user?.assigned_matchmaker_id === auth?.user?.id) ||
        (viewerRole === 'manager' && user?.validated_by_manager_id === auth?.user?.id);
    
    // Write permissions: only assigned matchmaker can write/edit/delete
    const canWrite = viewerRole === 'matchmaker' && user?.assigned_matchmaker_id === auth?.user?.id;

    // Visibility for photos: user themselves, assigned matchmaker, or manager of their agency
    const canViewPhotos = 
        isOwnProfile ||
        (viewerRole === 'admin') ||
        (viewerRole === 'matchmaker' && user?.assigned_matchmaker_id === auth?.user?.id) ||
        (viewerRole === 'manager' && user?.agency_id && user?.agency_id === auth?.user?.agency_id);
        (viewerRole === 'manager' && user?.agency_id && user?.agency_id === auth?.user?.agency_id);

    // Notes form
    const [newNote, setNewNote] = useState('');
    const addNote = (e) => {
        e.preventDefault();
        if (!newNote.trim()) return;
        router.post(
            `/users/${user.id}/notes`,
            { content: newNote },
            {
                onSuccess: () => setNewNote(''),
            },
        );
    };

    // Delete note dialog state
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [noteToDelete, setNoteToDelete] = useState(null);

    // Open delete confirmation dialog
    const openDeleteDialog = (noteId) => {
        setNoteToDelete(noteId);
        setDeleteDialogOpen(true);
    };

    // Delete note handler
    const deleteNote = () => {
        if (noteToDelete) {
            router.delete(`/users/${user.id}/notes/${noteToDelete}`, {
                preserveScroll: true,
                onSuccess: () => {
                    setDeleteDialogOpen(false);
                    setNoteToDelete(null);
                },
            });
        }
    };

    // Evaluation form state
    const [evaluation, setEvaluation] = useState({
        status: matchmakerEvaluation?.status || user?.status || '',
        appearance: matchmakerEvaluation?.appearance || '',
        communication: matchmakerEvaluation?.communication || '',
        seriousness: matchmakerEvaluation?.seriousness || '',
        emotional_psychological: matchmakerEvaluation?.emotional_psychological || '',
        values_principles: matchmakerEvaluation?.values_principles || '',
        social_compatibility: matchmakerEvaluation?.social_compatibility || '',
        qualities: matchmakerEvaluation?.qualities || '',
        defects: matchmakerEvaluation?.defects || '',
        recommendation: matchmakerEvaluation?.recommendation || '',
        remarks: matchmakerEvaluation?.remarks || '',
        feedback_behavior: matchmakerEvaluation?.feedback_behavior || '',
        feedback_partner_impression: matchmakerEvaluation?.feedback_partner_impression || '',
        feedback_pos_neg: matchmakerEvaluation?.feedback_pos_neg || '',
    });

    const saveEvaluation = (e) => {
        e.preventDefault();
        router.post(`/users/${user.id}/evaluation`, evaluation);
    };

    // Get profile picture
    const getProfilePicture = () => {
        if (userRole === 'user' && user?.profile?.profile_picture_path) {
            return `/storage/${user.profile.profile_picture_path}`;
        } else if (user?.profile_picture) {
            return `/storage/${user.profile_picture}`;
        }
        return null;
    };

    const profilePictureSrc = getProfilePicture();

    // Get banner image
    const getBannerImage = () => {
        if (userRole === 'user' && user?.profile?.banner_image_path) {
            return `/storage/${user.profile.banner_image_path}`;
        } else if (user?.banner_image_path) {
            return `/storage/${user.banner_image_path}`;
        }
        return null;
    };

    const bannerImageSrc = getBannerImage();

    // Handle banner image upload
    const handleBannerUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert(t('profile.invalidImageType', { defaultValue: 'Please select a valid image file.' }));
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert(t('profile.imageTooLarge', { defaultValue: 'Image size must be less than 5MB.' }));
            return;
        }

        const formData = new FormData();
        formData.append('banner_image', file);
        formData.append('from_profile_page', '1'); // Flag to indicate we're coming from profile page

        router.post('/settings/profile', formData, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                // Reload the current page to show the new banner
                router.reload({ only: ['user', 'profile'] });
            },
            onError: (errors) => {
                if (errors.banner_image) {
                    alert(errors.banner_image);
                } else {
                    alert(t('profile.uploadError', { defaultValue: 'An error occurred while uploading the banner image.' }));
                }
            },
        });
    };

    // Handle banner image deletion
    const handleBannerDelete = () => {
        if (!confirm(t('profile.deleteBannerConfirm', { defaultValue: 'Are you sure you want to remove your banner image?' }))) {
            return;
        }

        const formData = new FormData();
        formData.append('delete_banner', '1'); // Flag to indicate deletion
        formData.append('from_profile_page', '1'); // Flag to indicate we're coming from profile page

        router.post('/settings/profile', formData, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                router.reload({ only: ['user', 'profile'] });
            },
            onError: (errors) => {
                alert(t('profile.deleteError', { defaultValue: 'An error occurred while deleting the banner image.' }));
            },
        });
    };

    // Get skills/expertise tags (for matchmakers or based on profile data)
    const getExpertiseTags = () => {
        if (userRole === 'matchmaker') {
            return ['Capital Raising', 'Marketing & Sales', 'Consulting', 'Asset Management', 'Business Development'];
        }
        // For users, use actual profile data
        const tags = [];
        if (user?.profile?.secteur) tags.push(user.profile.secteur);
        if (user?.profile?.situation_professionnelle) tags.push(user.profile.situation_professionnelle);
        if (user?.profile?.niveau_etudes) tags.push(user.profile.niveau_etudes);
        if (user?.profile?.religion) tags.push(user.profile.religion);
        if (user?.profile?.origine) tags.push(user.profile.origine);
        return tags.slice(0, 5);
    };

    const expertiseTags = getExpertiseTags();

    // Get skills tags from profile data
    // const getSkillsTags = () => {
    //     const skills = [];
    //     if (user?.profile?.sport && user.profile.sport !== 'non') skills.push('Sports');
    //     if (user?.profile?.motorise === 'oui') skills.push('Motorized');
    //     if (user?.profile?.loisirs) {
    //         const hobbies = user.profile.loisirs.split(',').slice(0, 3);
    //         skills.push(...hobbies.map((h) => h.trim()));
    //     }
    //     // Default skills if none available
    //     if (skills.length === 0) {
    //         return ['Communication', 'Interpersonal Skills', 'Team work'];
    //     }
    //     return skills.slice(0, 5);
    // };

    // const skillsTags = getSkillsTags();

    // Get motivation tags from profile data
    const getMotivationTags = () => {
        const motivations = [];
        if (user?.profile?.apropos_description) {
            // Extract keywords or use default
            motivations.push('Helping others', 'Impact', 'Learning');
        }
        if (motivations.length === 0) {
            return ['Completing a task', 'Helping others', 'Impact', 'Learning'];
        }
        return motivations;
    };

    const motivationTags = getMotivationTags();

    // Active tab state - set default based on role
    const [activeTab, setActiveTab] = useState(() => {
        const role = user?.roles?.[0]?.name || 'user';
        return role === 'user' ? 'personal' : 'info';
    });

    return (
        <AppLayout>
            <Head title={`${user?.name} - ${t('common.profile')}`} />
            <div className="min-h-screen bg-gray-50">
                {/* Banner Image Section */}
                <div className="relative h-64 w-full overflow-hidden bg-gradient-to-r from-blue-600 to-purple-600 md:h-80">
                    {bannerImageSrc ? (
                        <img src={bannerImageSrc} alt={`${user?.name} banner`} className="h-full w-full object-cover" />
                    ) : (
                        <div className="h-full w-full bg-gradient-to-r from-blue-600 to-purple-600" />
                    )}
                    {isOwnProfile && (
                        <div className="absolute top-4 right-4 z-20 flex gap-2">
                            <label htmlFor="banner-upload-input" className="cursor-pointer">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleBannerUpload}
                                    className="hidden"
                                    id="banner-upload-input"
                                />
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    className="bg-white hover:bg-gray-50 text-gray-700 shadow-lg border border-gray-200"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        document.getElementById('banner-upload-input')?.click();
                                    }}
                                >
                                    <Camera className="h-4 w-4 mr-2" />
                                    {bannerImageSrc ? t('profile.changeBanner', { defaultValue: 'Change' }) : t('profile.uploadBanner', { defaultValue: 'Upload' })}
                                </Button>
                            </label>
                            {bannerImageSrc && (
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    className="bg-white hover:bg-gray-50 text-red-600 shadow-lg border border-gray-200"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleBannerDelete();
                                    }}
                                >
                                    <X className="h-4 w-4 mr-2" />
                                    {t('profile.removeBanner', { defaultValue: 'Remove' })}
                                </Button>
                            )}
                        </div>
                    )}
                </div>

                <div className="mx-auto max-w-7xl px-4 py-6">
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                        {/* Left Sidebar - Profile Card */}
                        <div className="lg:col-span-3">
                            <Card className="sticky top-6">
                                <CardContent className="p-6">
                                    {/* Profile Picture */}
                                    <div className="mb-4 flex justify-center">
                                        <div className="relative">
                                            <div className="h-32 w-32 overflow-hidden rounded-full border-4 border-white shadow-lg">
                                                {profilePictureSrc ? (
                                                    <img src={profilePictureSrc} alt={user?.name} className="h-full w-full object-cover" />
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center bg-gray-200">
                                                        <span className="text-4xl font-bold text-gray-600">{user?.name?.charAt(0)}</span>
                                                    </div>
                                                )}
                                            </div>
                                            {isOwnProfile && (
                                                <label className="absolute -right-2 -bottom-2 cursor-pointer">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        id="profile-picture-upload"
                                                        onChange={(e) => {
                                                            const file = e.target.files[0];
                                                            if (!file) return;

                                                            // Validate file type
                                                            if (!file.type.startsWith('image/')) {
                                                                alert(t('profile.invalidImageType', { defaultValue: 'Please select a valid image file.' }));
                                                                return;
                                                            }

                                                            // Validate file size (max 2MB)
                                                            if (file.size > 2 * 1024 * 1024) {
                                                                alert(t('profile.imageTooLarge', { defaultValue: 'Image size must be less than 2MB.' }));
                                                                return;
                                                            }

                                                            const formData = new FormData();
                                                            formData.append('profile_picture', file);
                                                            formData.append('from_profile_page', '1'); // Flag to indicate we're coming from profile page

                                                            router.post('/settings/profile', formData, {
                                                                forceFormData: true,
                                                                preserveScroll: true,
                                                                onSuccess: () => {
                                                                    router.reload({ only: ['user', 'profile'] });
                                                                },
                                                                onError: (errors) => {
                                                                    if (errors.profile_picture) {
                                                                        alert(errors.profile_picture);
                                                                    } else {
                                                                        alert(t('profile.uploadError', { defaultValue: 'An error occurred while uploading the profile picture.' }));
                                                                    }
                                                                },
                                                            });
                                                        }}
                                                        className="hidden"
                                                    />
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 w-8 rounded-full border-2 border-white bg-[#096725] p-0 hover:bg-[#07501d]"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            document.getElementById('profile-picture-upload')?.click();
                                                        }}
                                                    >
                                                        <Camera className="h-4 w-4 text-white" />
                                                    </Button>
                                                </label>
                                            )}
                                        </div>
                                    </div>

                                    {/* Name & Title */}
                                    <div className="mb-4 text-center">
                                        <h2 className="text-xl font-bold text-gray-900">{user?.name}</h2>
                                        <p className="mt-1 text-sm text-gray-600">
                                            {userRole === 'matchmaker' ? 'Matchmaker' : user?.profile?.situation_professionnelle || 'Member'}
                                        </p>
                                        <div className="mt-2 flex items-center justify-center gap-1 text-sm text-gray-500">
                                            <MapPin className="h-4 w-4" />
                                            <span>
                                                {user?.city}, {user?.country}
                                            </span>
                                            </div>
                                            
                                            {/* Agency - Only for matchmaker/admin/manager */}
                                            {(userRole === 'matchmaker' || userRole === 'admin' || userRole === 'manager') && user?.agency && (
                                                <div className="mt-3">
                                                    <a
                                                        href={`/agencies/${user.agency.id}`}
                                                        className="text-sm font-medium text-[#096725] hover:text-[#07501d] hover:underline transition-colors"
                                                    >
                                                        {user.agency.name}
                                                    </a>
                                                </div>
                                            )}
                                            </div>
                                            
                                            {/* Social Networks - Only for matchmaker/admin/manager */}
                                            {(userRole === 'matchmaker' || userRole === 'admin' || userRole === 'manager') && (
                                                <div className="mb-4 flex justify-center gap-3">
                                                    {user?.facebook_url && (
                                                        <a
                                                            href={user.facebook_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className=" text-[#1877F2] transition-colors"
                                                            title="Facebook"
                                                        >
                                                            <Facebook className="h-5 w-5" />
                                                        </a>
                                                    )}
                                                    {user?.instagram_url && (
                                                        <a
                                                            href={user.instagram_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-[#E4405F] transition-colors"
                                                            title="Instagram"
                                                        >
                                                            <Instagram className="h-5 w-5" />
                                                        </a>
                                                    )}
                                                    {user?.linkedin_url && (
                                                        <a
                                                            href={user.linkedin_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-[#0077B5] transition-colors"
                                                            title="LinkedIn"
                                                        >
                                                            <Linkedin className="h-5 w-5" />
                                                        </a>
                                                    )}
                                                    {user?.youtube_url && (
                                                        <a
                                                            href={user.youtube_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-[#FF0000] transition-colors"
                                                            title="YouTube"
                                                        >
                                                            <Youtube className="h-5 w-5" />
                                                        </a>
                                                    )}
                                                </div>
                                            )}

                                    {/* Action Buttons */}
                                    <div className="mb-6 flex gap-3">
                                        {!isOwnProfile && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-10 w-10 rounded-full border-pink-300 p-0 hover:bg-pink-50"
                                            >
                                                <User className="h-5 w-5 text-pink-600" />
                                            </Button>
                                        )}
                                        {/* Book button - Only for non-user roles viewing matchmaker profiles */}
                                        {userRole === 'matchmaker' && !isOwnProfile && viewerRole !== 'user' && (
                                            <Button className="flex-1 gap-2 bg-[#096725] text-white hover:bg-[#07501d]">
                                                <BookOpen className="h-4 w-4" />
                                                Book {user?.name?.split(' ')[0]}
                                            </Button>
                                        )}
                                        {/* Matchmaker selection buttons - Only visible to users viewing a matchmaker profile */}
                                        {viewerRole === 'user' && userRole === 'matchmaker' && !isOwnProfile && (
                                            <>
                                                {/* Case 1: No matchmaker assigned - Show "Select Matchmaker" */}
                                                {!assignedMatchmakerId && (
                                                    <Button
                                                        className="flex-1 gap-2 bg-[#096725] text-white hover:bg-[#07501d]"
                                                        onClick={() => {
                                                            router.post(`/user/matchmakers/${user.id}/select`);
                                                        }}
                                                    >
                                                        <BookOpen className="h-4 w-4" />
                                                        Select Matchmaker
                                                    </Button>
                                                )}
                                                
                                                {/* Case 2: Visiting assigned matchmaker profile - Show "Contact Matchmaker" */}
                                                {assignedMatchmakerId === user?.id && (
                                                    <Button
                                                        className="flex-1 gap-2 bg-[#096725] text-white hover:bg-[#07501d]"
                                                        onClick={() => {
                                                            // Navigate to messages or contact page
                                                            router.get(`/messages?user=${user.id}`);
                                                        }}
                                                    >
                                                        <MessageSquareWarning className="h-4 w-4" />
                                                        Contact Matchmaker
                                                    </Button>
                                                )}
                                                
                                                {/* Case 3: Has matchmaker but visiting different matchmaker - Show "Change Matchmaker" */}
                                                {assignedMatchmakerId && assignedMatchmakerId !== user?.id && (
                                                    <Button
                                                        className="flex-1 gap-2 bg-[#096725] text-white hover:bg-[#07501d]"
                                                        onClick={() => {
                                                            router.post(`/user/matchmakers/${user.id}/select`);
                                                        }}
                                                    >
                                                        <BookOpen className="h-4 w-4" />
                                                        Change Matchmaker
                                                    </Button>
                                                )}
                                            </>
                                        )}
                                            </div>
                                        </CardContent>
                                    </Card>
                        </div>

                        {/* Main Content Area */}
                        <div className="space-y-6 lg:col-span-9">
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                {/* Tabs for regular users */}
                            {userRole === 'user' && (
                                    <TabsList className={`grid h-auto w-full rounded-none border-b bg-white p-0 ${
                                        canManage && canViewPhotos ? 'grid-cols-5' : 
                                        canManage ? 'grid-cols-4' : 
                                        canViewPhotos ? 'grid-cols-4' : 
                                        'grid-cols-3'
                                    }`}>
                                        <TabsTrigger
                                            value="personal"
                                            className="rounded-none px-4 py-3 data-[state=active]:border-b-2 data-[state=active]:border-[#096725] data-[state=active]:text-[#096725]"
                                        >
                                            Informations personnelles
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="lifestyle"
                                            className="rounded-none px-4 py-3 data-[state=active]:border-b-2 data-[state=active]:border-[#096725] data-[state=active]:text-[#096725]"
                                        >
                                            Mode de vie
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="partner"
                                            className="rounded-none px-4 py-3 data-[state=active]:border-b-2 data-[state=active]:border-[#096725] data-[state=active]:text-[#096725]"
                                        >
                                            Profil recherché
                                        </TabsTrigger>
                                        {canViewPhotos && (
                                            <TabsTrigger
                                                value="photos"
                                                className="rounded-none px-4 py-3 data-[state=active]:border-b-2 data-[state=active]:border-[#096725] data-[state=active]:text-[#096725]"
                                            >
                                                Photos
                                            </TabsTrigger>
                                        )}
                                        {canManage && (
                                            <TabsTrigger
                                                value="notes"
                                                className="rounded-none px-4 py-3 data-[state=active]:border-b-2 data-[state=active]:border-[#096725] data-[state=active]:text-[#096725]"
                                            >
                                                Notes et Évaluation du Matchmaker
                                            </TabsTrigger>
                                        )}
                                    </TabsList>
                                )}

                                {/* Tabs for matchmaker/admin/manager */}
                                {(userRole === 'matchmaker' || userRole === 'admin' || userRole === 'manager') && (
                                    <TabsList className="grid h-auto w-full grid-cols-2 rounded-none border-b bg-white p-0">
                                        <TabsTrigger
                                            value="info"
                                            className="rounded-none px-4 py-3 data-[state=active]:border-b-2 data-[state=active]:border-[#096725] data-[state=active]:text-[#096725]"
                                        >
                                            Informations
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="posts"
                                            className="rounded-none px-4 py-3 data-[state=active]:border-b-2 data-[state=active]:border-[#096725] data-[state=active]:text-[#096725]"
                                        >
                                            Posts
                                        </TabsTrigger>
                                    </TabsList>
                                )}

                                {/* Tab: Informations for matchmaker/admin/manager */}
                                {(userRole === 'matchmaker' || userRole === 'admin' || userRole === 'manager') && (
                                    <TabsContent value="info" className="mt-6 space-y-6">
                                        {/* About Me / Bio */}
                                        

                                        {/* Matchmaker Bio */}
                                        {userRole === 'matchmaker' && user?.matchmaker_bio && (
                                            <Card className="border-gray-200 bg-white">
                                                <CardContent className="p-6">
                                                    <h3 className="mb-3 text-lg font-semibold text-gray-900">Matchmaker Bio</h3>
                                                    <p className="leading-relaxed text-gray-700">{user.matchmaker_bio}</p>
                                                </CardContent>
                                            </Card>
                                        )}

                                        {/* Contact Information */}
                                        <Card className="border-gray-200 bg-white">
                                            <CardContent className="p-6">
                                                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                                                    <User className="h-5 w-5 text-[#096725]" />
                                                    Informations de contact
                                                </h3>
                                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                <div>
                                                        <div className="mb-1 text-sm text-gray-600">Nom</div>
                                                        <div className="font-medium text-gray-900">{user?.name || '—'}</div>
                                                    </div>
                                                    <div>
                                                        <div className="mb-1 text-sm text-gray-600">Email</div>
                                                        <div className="font-medium text-gray-900">{user?.email || '—'}</div>
                                                </div>
                                                <div>
                                                        <div className="mb-1 text-sm text-gray-600">Téléphone</div>
                                                        <div className="font-medium text-gray-900">{user?.phone || '—'}</div>
                                                </div>
                                                <div>
                                                        <div className="mb-1 text-sm text-gray-600">Localisation</div>
                                                        <div className="font-medium text-gray-900">
                                                            {user?.city && user?.country 
                                                                ? `${user.city}, ${user.country}` 
                                                                : user?.city || user?.country || '—'}
                                                </div>
                                                    </div>
                                                    {user?.agency && (
                                                <div>
                                                            <div className="mb-1 text-sm text-gray-600">Agence</div>
                                                            <div className="font-medium text-gray-900">{user.agency.name || '—'}</div>
                                                </div>
                                                    )}
                                            <div>
                                                        <div className="mb-1 text-sm text-gray-600">Rôle</div>
                                                        <div className="font-medium text-gray-900 capitalize">{userRole || '—'}</div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                        {/* Professional Statistics - Only for matchmakers */}
                                        {userRole === 'matchmaker' && (
                                            <Card className="border-gray-200 bg-white">
                                                <CardContent className="p-6">
                                                    <h3 className="mb-4 text-lg font-semibold text-gray-900">
                                                        {t('profile.userProfile.professionalStatistics')}
                                                    </h3>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="rounded-lg bg-blue-50 p-4 text-center">
                                                            <div className="text-2xl font-bold text-blue-600">12</div>
                                                            <div className="text-sm text-gray-600">{t('profile.userProfile.successfulMatches')}</div>
                                                </div>
                                                        <div className="rounded-lg bg-green-50 p-4 text-center">
                                                            <div className="text-2xl font-bold text-[#096725]">8</div>
                                                            <div className="text-sm text-gray-600">{t('profile.userProfile.happyCouples')}</div>
                                            </div>
                                                        <div className="rounded-lg bg-yellow-50 p-4 text-center">
                                                            <div className="text-2xl font-bold text-yellow-600">4.8</div>
                                                            <div className="text-sm text-gray-600">{t('profile.userProfile.rating')}</div>
                                                </div>
                                                        <div className="rounded-lg bg-purple-50 p-4 text-center">
                                                            <div className="text-2xl font-bold text-purple-600">2</div>
                                                            <div className="text-sm text-gray-600">{t('profile.userProfile.yearsExperience')}</div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                        )}
                                    </TabsContent>
                                )}


                                {/* Posts Tab for matchmaker/admin/manager */}
                                {(userRole === 'matchmaker' || userRole === 'admin' || userRole === 'manager') && (
                                    <TabsContent value="posts" className="mt-6 space-y-6">
                                        <Card className="border-gray-200 bg-white">
                                            <CardContent className="p-6">
                                                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                                                    <MessageSquareWarning className="h-5 w-5 text-[#096725]" />
                                                    {t('profile.userProfile.posts')}
                                                </h3>
                                                {isOwnProfile && (userRole === 'matchmaker' || userRole === 'admin' || userRole === 'manager') && (
                                                    <div className="mb-4">
                                                        <CreatePost />
                                                    </div>
                                                )}
                                                
                                                {/* Display Posts */}
                                                {user.posts && user.posts.length > 0 ? (
                                                    <div className="space-y-4">
                                                        {user.posts.map((post) => (
                                                            <PostCard key={post.id} post={post} />
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="py-8 text-center text-gray-500">
                                                        {isOwnProfile ? t('profile.userProfile.shareFirstPost') : t('profile.userProfile.noPostsYet')}
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </TabsContent>
                                )}

                                {/* Tab 1: Informations personnelles - Only for users */}
                                {userRole === 'user' && (
                                    <TabsContent value="personal" className="mt-6 space-y-6">
                                        {/* About Me Description */}
                                        {profile?.apropos_description && (
                                            <Card className="border-gray-200 bg-white">
                                                <CardContent className="p-6">
                                                    <h3 className="mb-3 text-lg font-semibold text-gray-900">À propos de moi</h3>
                                                    <p className="leading-relaxed text-gray-700">{profile.apropos_description}</p>
                                            </CardContent>
                                        </Card>
                                    )}

                                        {/* Basic Information */}
                                        <Card className="border-gray-200 bg-white">
                                            <CardContent className="p-6">
                                                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                                                    <User className="h-5 w-5 text-[#096725]" />
                                                {t('profile.userProfile.basicInfo')}
                                                </h3>
                                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                            <div>
                                                        <div className="mb-1 text-sm text-gray-600">
                                                            {t('profile.userProfile.matrimonialSituation')}
                                                        </div>
                                                        <div className="font-medium text-gray-900">{user?.profile?.etat_matrimonial || '—'}</div>
                                            </div>
                                            <div>
                                                        <div className="mb-1 text-sm text-gray-600">{t('profile.userProfile.haveChildren')}</div>
                                                        <div className="font-medium text-gray-900">
                                                            {user?.profile?.has_children == 1
                                                                ? `${t('profile.yes')}${user?.profile?.children_count ? ` (${user.profile.children_count})` : ''}`
                                                                : user?.profile?.has_children == 0
                                                                  ? t('profile.no')
                                                                  : '—'}
                                                        </div>
                                            </div>
                                            <div>
                                                        <div className="mb-1 text-sm text-gray-600">{t('profile.userProfile.educationLevel')}</div>
                                                        <div className="font-medium text-gray-900">{user?.profile?.niveau_etudes || '—'}</div>
                                            </div>
                                            <div>
                                                        <div className="mb-1 text-sm text-gray-600">
                                                            {t('profile.userProfile.professionalSituation')}
                                                        </div>
                                                        <div className="font-medium text-gray-900">
                                                            {user?.profile?.situation_professionnelle || '—'}
                                                        </div>
                                            </div>
                                            <div>
                                                        <div className="mb-1 text-sm text-gray-600">{t('profile.userProfile.activitySector')}</div>
                                                        <div className="font-medium text-gray-900">{user?.profile?.secteur || '—'}</div>
                                            </div>
                                            <div>
                                                        <div className="mb-1 text-sm text-gray-600">{t('profile.userProfile.monthlyIncome')}</div>
                                                        <div className="font-medium text-gray-900">{user?.profile?.revenu || '—'}</div>
                                            </div>
                                            <div>
                                                        <div className="mb-1 text-sm text-gray-600">{t('profile.userProfile.height')}</div>
                                                        <div className="font-medium text-gray-900">
                                                            {user?.profile?.taille ? `${user.profile.taille} cm` : '—'}
                                                        </div>
                                            </div>
                                            <div>
                                                        <div className="mb-1 text-sm text-gray-600">{t('profile.userProfile.weight')}</div>
                                                        <div className="font-medium text-gray-900">
                                                            {user?.profile?.poids ? `${user.profile.poids} kg` : '—'}
                                                        </div>
                                            </div>
                                            <div>
                                                        <div className="mb-1 text-sm text-gray-600">Origine</div>
                                                        <div className="font-medium text-gray-900">{user?.profile?.origine || '—'}</div>
                                            </div>
                                            <div>
                                                        <div className="mb-1 text-sm text-gray-600">Pays de résidence</div>
                                                        <div className="font-medium text-gray-900">{user?.profile?.pays_residence || '—'}</div>
                                            </div>
                                            <div>
                                                        <div className="mb-1 text-sm text-gray-600">Ville de résidence</div>
                                                        <div className="font-medium text-gray-900">{user?.profile?.ville_residence || '—'}</div>
                                            </div>
                                            <div>
                                                        <div className="mb-1 text-sm text-gray-600">Pays d'origine</div>
                                                        <div className="font-medium text-gray-900">{user?.profile?.pays_origine || '—'}</div>
                                            </div>
                                            <div>
                                                        <div className="mb-1 text-sm text-gray-600">Ville d'origine</div>
                                                        <div className="font-medium text-gray-900">{user?.profile?.ville_origine || '—'}</div>
                                            </div>
                                            <div>
                                                        <div className="mb-1 text-sm text-gray-600">Religion</div>
                                                        <div className="font-medium text-gray-900">{user?.profile?.religion || '—'}</div>
                                            </div>
                                            <div>
                                                        <div className="mb-1 text-sm text-gray-600">Logement</div>
                                                        <div className="font-medium text-gray-900">{user?.profile?.logement || '—'}</div>
                                                    </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    </TabsContent>
                                )}

                                {/* Tab 2: Mode de vie - Only for users */}
                                {userRole === 'user' && (
                                    <TabsContent value="lifestyle" className="mt-6 space-y-6">
                                    {/* Lifestyle Information */}
                                    <Card className="border-gray-200 bg-white">
                                        <CardContent className="p-6">
                                            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                                                <Heart className="h-5 w-5 text-[#ff343a]" />
                                                Mode de vie & Santé
                                            </h3>
                                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                <div>
                                                    <div className="mb-1 text-sm text-gray-600">
                                                        {t('profile.healthSituation', { defaultValue: 'Situation de santé' })}
                                                    </div>
                                                    <div className="font-medium text-gray-900">
                                                        {(() => {
                                                            const situationSante = user?.profile?.situation_sante;
                                                            if (!situationSante) return '—';

                                                            const situations = Array.isArray(situationSante) ? situationSante : [situationSante];
                                                            if (situations.length === 0) return '—';

                                                            const translations = {
                                                                sante_tres_bonne: t('profile.healthSituationVeryGood', {
                                                                    defaultValue: 'Santé très bonne',
                                                                }),
                                                                maladie_chronique: t('profile.healthSituationChronicDisease', {
                                                                    defaultValue: 'Maladie chronique',
                                                                }),
                                                                personne_handicap: t('profile.healthSituationDisabled', {
                                                                    defaultValue: 'Personne en situation de handicap',
                                                                }),
                                                                non_voyant_malvoyant: t('profile.healthSituationBlindLowVision', {
                                                                    defaultValue: 'Non voyant / Malvoyant',
                                                                }),
                                                                cecite_totale: t('profile.healthSituationTotalBlindness', {
                                                                    defaultValue: 'مكفوف (Cécité totale)',
                                                                }),
                                                                troubles_psychiques: t('profile.healthSituationMentalDisorder', {
                                                                    defaultValue: 'Troubles psychiques',
                                                                }),
                                                                autres: t('profile.healthSituationOther', { defaultValue: 'Autres' }),
                                                            };

                                                            return situations.map((s) => translations[s] || s).join(', ');
                                                        })()}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="mb-1 text-sm text-gray-600">{t('profile.userProfile.healthStatus')}</div>
                                                    <div className="font-medium text-gray-900">{user?.profile?.etat_sante || '—'}</div>
                                                </div>
                                                <div>
                                                    <div className="mb-1 text-sm text-gray-600">{t('profile.smoker')}</div>
                                                    <div className="font-medium text-gray-900">{user?.profile?.fumeur || '—'}</div>
                                                </div>
                                                <div>
                                                    <div className="mb-1 text-sm text-gray-600">{t('profile.drinker')}</div>
                                                    <div className="font-medium text-gray-900">{user?.profile?.buveur || '—'}</div>
                                                </div>
                                                <div>
                                                    <div className="mb-1 text-sm text-gray-600">{t('profile.sport')}</div>
                                                    <div className="font-medium text-gray-900">{user?.profile?.sport || '—'}</div>
                                            </div>
                                            <div>
                                                    <div className="mb-1 text-sm text-gray-600">{t('profile.motorized')}</div>
                                                    <div className="font-medium text-gray-900">{user?.profile?.motorise || '—'}</div>
                                                </div>
                                                <div className="md:col-span-2">
                                                    <div className="mb-1 text-sm text-gray-600">{t('profile.hobbies')}</div>
                                                    <div className="font-medium text-gray-900">{user?.profile?.loisirs || '—'}</div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    </TabsContent>
                                )}

                                {/* Tab 3: Profil recherché - Only for users */}
                                {userRole === 'user' && (
                                    <TabsContent value="partner" className="mt-6 space-y-6">
                                    {/* Partner Preferences */}
                                    <Card className="border-gray-200 bg-white">
                                        <CardContent className="p-6">
                                            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                                                <Heart className="h-5 w-5 text-[#ff343a]" />
                                                {t('profile.userProfile.soughtProfile')}
                                            </h3>
                                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                <div>
                                                    <div className="mb-1 text-sm text-gray-600">
                                                        {t('profile.userProfile.minimumAge')} / {t('profile.maximumAge')}
                                                    </div>
                                                    <div className="font-medium text-gray-900">
                                                        {user?.profile?.age_minimum && user?.profile?.age_maximum
                                                            ? `${user.profile.age_minimum} - ${user.profile.age_maximum} ${t('profile.years')}`
                                                            : user?.profile?.age_minimum
                                                              ? `${user.profile.age_minimum} ${t('profile.years')}`
                                                                : '—'}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="mb-1 text-sm text-gray-600">{t('profile.userProfile.matrimonialSituation')}</div>
                                                    <div className="font-medium text-gray-900">
                                                        {Array.isArray(user?.profile?.situation_matrimoniale_recherche)
                                                            ? user.profile.situation_matrimoniale_recherche.join(', ')
                                                            : user?.profile?.situation_matrimoniale_recherche || '—'}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="mb-1 text-sm text-gray-600">{t('common.country')}</div>
                                                    <div className="font-medium text-gray-900">
                                                        {Array.isArray(user?.profile?.pays_recherche)
                                                            ? user.profile.pays_recherche.join(', ')
                                                            : user?.profile?.pays_recherche || '—'}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="mb-1 text-sm text-gray-600">{t('profile.userProfile.residenceLocation')}</div>
                                                    <div className="font-medium text-gray-900">
                                                        {user?.profile?.villes_recherche && user?.profile?.villes_recherche.length > 0
                                                            ? (() => {
                                                                  const villes =
                                                                      typeof user?.profile?.villes_recherche === 'string'
                                                                          ? JSON.parse(user?.profile?.villes_recherche)
                                                                          : user?.profile?.villes_recherche;
                                                                  return Array.isArray(villes) && villes.length > 0
                                                                      ? villes.join(', ')
                                                                      : t('profile.notSpecified');
                                                              })()
                                                            : '—'}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="mb-1 text-sm text-gray-600">{t('profile.userProfile.educationLevel')}</div>
                                                    <div className="font-medium text-gray-900">{user?.profile?.niveau_etudes_recherche || '—'}</div>
                                                </div>
                                                <div>
                                                    <div className="mb-1 text-sm text-gray-600">{t('profile.userProfile.employmentStatus')}</div>
                                                    <div className="font-medium text-gray-900">{user?.profile?.statut_emploi_recherche || '—'}</div>
                                                </div>
                                            <div>
                                                    <div className="mb-1 text-sm text-gray-600">{t('profile.minimumIncome')}</div>
                                                    <div className="font-medium text-gray-900">{user?.profile?.revenu_minimum || '—'}</div>
                                                </div>
                                            <div>
                                                    <div className="mb-1 text-sm text-gray-600">{t('profile.soughtReligion')}</div>
                                                    <div className="font-medium text-gray-900">{user?.profile?.religion_recherche || '—'}</div>
                                                </div>
                                            </div>
                                            {profile?.profil_recherche_description && (
                                                <div className="mt-4">
                                                    <div className="mb-1 text-sm text-gray-600">{t('profile.userProfile.description')}</div>
                                                    <div className="rounded-md border border-gray-200 bg-gray-50 p-3 leading-relaxed text-gray-900">
                                                        {profile.profil_recherche_description}
                                                </div>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>

                                    {/* An Ideal Relationship To Me */}
                                    {profile?.profil_recherche_description && (
                                        <Card className="border-gray-200 bg-white">
                                            <CardContent className="p-6">
                                                <h3 className="mb-3 text-lg font-semibold text-gray-900">Une relation idéale pour moi</h3>
                                                <p className="leading-relaxed text-gray-700">{profile.profil_recherche_description}</p>
                                            </CardContent>
                                        </Card>
                                    )}
                                </TabsContent>
                                )}

                                {/* Notes & Evaluation Tab for users - Only visible to authorized staff */}
                                {userRole === 'user' && canManage && (
                                    <TabsContent value="notes" className="mt-6 space-y-6">
                                        <Card className="border-gray-200 bg-white">
                                            <CardContent className="p-6">
                                                <h3 className="mb-4 text-lg font-semibold text-gray-900">
                                                    {t('profile.userProfile.notesAndEvaluation')}
                                                </h3>
                                                
                                                {/* Notes list */}
                                                <div className="mb-6">
                                                    <div className="mb-2 text-sm text-gray-600">{t('profile.userProfile.assignedMatchmakerNotes')}</div>
                                                    <div className="space-y-3">
                                                        {Array.isArray(matchmakerNotes) && matchmakerNotes.length > 0 ? (
                                                            matchmakerNotes.map((n) => {
                                                                const isAuthor = n.author_id === auth?.user?.id;
                                                                return (
                                                                    <div key={n.id} className="rounded-md border border-gray-200 bg-gray-50 p-3">
                                                                        <div className="mb-1 flex items-center justify-between">
                                                                            <div className="text-xs text-gray-500">
                                                                                {n.author?.name} · {new Date(n.created_at).toLocaleString()}
                                                                            </div>
                                                                            {isAuthor && canWrite && (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => openDeleteDialog(n.id)}
                                                                                    className="text-[#ff343a] transition-colors hover:text-[#cc2a2f]"
                                                                                    title={t('profile.userProfile.deleteNote')}
                                                                                >
                                                                                    <Trash2 className="h-4 w-4" />
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                        <div className="text-sm text-gray-900">{n.content}</div>
                                                                    </div>
                                                                );
                                                            })
                                                        ) : (
                                                            <div className="text-sm text-gray-500">{t('profile.userProfile.noNotes')}</div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Add note - Only for assigned matchmaker */}
                                                {canWrite && (
                                                    <form onSubmit={addNote} className="mb-6 space-y-2">
                                                        <label className="text-sm text-gray-600">{t('profile.userProfile.addNote')}</label>
                                                    <textarea
                                                            className="w-full rounded-md border border-gray-300 p-3 focus:border-[#ff343a] focus:outline-none focus:ring-1 focus:ring-[#ff343a]"
                                                        rows={3}
                                                        value={newNote}
                                                        onChange={(e) => setNewNote(e.target.value)}
                                                        placeholder={t('profile.userProfile.enterNote')}
                                                    />
                                                    <div>
                                                            <button type="submit" className="inline-flex items-center rounded-md bg-[#096725] px-4 py-2 text-white hover:bg-[#07501d]">
                                                            {t('profile.userProfile.addNoteButton')}
                                                        </button>
                                                    </div>
                                                </form>
                                                )}

                                                {/* Evaluation - Read-only for admin/manager, editable for assigned matchmaker */}
                                                <form onSubmit={canWrite ? saveEvaluation : (e) => e.preventDefault()} className="space-y-4">
                                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                        <div>
                                                            <div className="mb-2 text-sm text-gray-600">{t('profile.userProfile.status')}</div>
                                                            <div className="flex gap-4 text-sm">
                                                                {['prospect','member','client'].map((val) => (
                                                                    <label key={val} className={`inline-flex items-center gap-2 ${!canWrite ? 'cursor-not-allowed opacity-60' : ''}`}>
                                                                        <input 
                                                                            type="radio" 
                                                                            name="status" 
                                                                            value={val} 
                                                                            checked={evaluation?.status === val} 
                                                                            onChange={(e)=>canWrite && setEvaluation({...evaluation, status: e.target.value})} 
                                                                            disabled={!canWrite}
                                                                            className="text-[#096725] focus:ring-[#096725] disabled:cursor-not-allowed" 
                                                                        />
                                                                        <span className="capitalize">{t(`profile.userProfile.${val}`)}</span>
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {[
                                                        ['appearance', t('profile.userProfile.generalAppearance')],
                                                        ['communication', t('profile.userProfile.communication')],
                                                        ['seriousness', t('profile.userProfile.seriousness')],
                                                        ['emotional_psychological', t('profile.userProfile.emotionalPsychological')],
                                                        ['values_principles', t('profile.userProfile.valuesPrinciples')],
                                                        ['social_compatibility', t('profile.userProfile.socialCompatibility')],
                                                        ['qualities', t('profile.userProfile.qualities')],
                                                        ['defects', t('profile.userProfile.defects')],
                                                    ].map(([key,label]) => (
                                                        <div key={key}>
                                                            <label className="mb-1 block text-sm text-gray-600">{label}</label>
                                                            <textarea
                                                                rows={2}
                                                                disabled={!canWrite}
                                                                className={`w-full rounded-md border border-gray-300 p-3 focus:border-[#096725] focus:outline-none focus:ring-1 focus:ring-[#096725] ${!canWrite ? 'bg-gray-50 cursor-not-allowed opacity-60' : ''}`}
                                                                value={evaluation[key] || ''}
                                                                onChange={(e)=>canWrite && setEvaluation({...evaluation, [key]: e.target.value})}
                                                            />
                                                        </div>
                                                    ))}

                                                    <div>
                                                        <div className="mb-2 text-sm text-gray-600">{t('profile.userProfile.matchmakerRecommendation')}</div>
                                                        <div className="flex gap-6 text-sm">
                                                            {[
                                                                ['ready', t('profile.userProfile.ready')],
                                                                ['accompany', t('profile.userProfile.accompany')],
                                                                ['not_ready', t('profile.userProfile.notReady')],
                                                            ].map(([val,label]) => (
                                                                <label key={val} className={`inline-flex items-center gap-2 ${!canWrite ? 'cursor-not-allowed opacity-60' : ''}`}>
                                                                    <input 
                                                                        type="radio" 
                                                                        name="recommendation" 
                                                                        value={val} 
                                                                        checked={evaluation.recommendation === val} 
                                                                        onChange={(e)=>canWrite && setEvaluation({...evaluation, recommendation: e.target.value})} 
                                                                        disabled={!canWrite}
                                                                        className="text-[#096725] focus:ring-[#096725] disabled:cursor-not-allowed" 
                                                                    />
                                                                    <span>{label}</span>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>
                
                                                    <div>
                                                        <label className="mb-1 block text-sm text-gray-600">{t('profile.userProfile.additionalRemarks')}</label>
                                                        <textarea 
                                                            rows={2} 
                                                            disabled={!canWrite}
                                                            className={`w-full rounded-md border border-gray-300 p-3 focus:border-[#096725] focus:outline-none focus:ring-1 focus:ring-[#096725] ${!canWrite ? 'bg-gray-50 cursor-not-allowed opacity-60' : ''}`}
                                                            value={evaluation.remarks} 
                                                            onChange={(e)=>canWrite && setEvaluation({...evaluation, remarks: e.target.value})} 
                                                        />
                                                    </div>

                                                    <div>
                                                        <div className="mb-2 text-sm font-medium text-gray-900">{t('profile.userProfile.feedbackAfterAppointment')}</div>
                                                        <div className="space-y-3">
                                                            <div>
                                                                <label className="mb-1 block text-sm text-gray-600">{t('profile.userProfile.behaviorDuringAppointment')}</label>
                                                                <textarea 
                                                                    rows={2} 
                                                                    disabled={!canWrite}
                                                                    className={`w-full rounded-md border border-gray-300 p-3 focus:border-[#096725] focus:outline-none focus:ring-1 focus:ring-[#096725] ${!canWrite ? 'bg-gray-50 cursor-not-allowed opacity-60' : ''}`}
                                                                    value={evaluation.feedback_behavior} 
                                                                    onChange={(e)=>canWrite && setEvaluation({...evaluation, feedback_behavior: e.target.value})} 
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="mb-1 block text-sm text-gray-600">{t('profile.userProfile.partnerImpression')}</label>
                                                                <textarea 
                                                                    rows={2} 
                                                                    disabled={!canWrite}
                                                                    className={`w-full rounded-md border border-gray-300 p-3 focus:border-[#096725] focus:outline-none focus:ring-1 focus:ring-[#096725] ${!canWrite ? 'bg-gray-50 cursor-not-allowed opacity-60' : ''}`}
                                                                    value={evaluation.feedback_partner_impression} 
                                                                    onChange={(e)=>canWrite && setEvaluation({...evaluation, feedback_partner_impression: e.target.value})} 
                                                                />
                                            </div>
                                            <div>
                                                                <label className="mb-1 block text-sm text-gray-600">{t('profile.userProfile.positiveNegativePoints')}</label>
                                                <textarea
                                                                    rows={2} 
                                                                    disabled={!canWrite}
                                                                    className={`w-full rounded-md border border-gray-300 p-3 focus:border-[#096725] focus:outline-none focus:ring-1 focus:ring-[#096725] ${!canWrite ? 'bg-gray-50 cursor-not-allowed opacity-60' : ''}`}
                                                                    value={evaluation.feedback_pos_neg} 
                                                                    onChange={(e)=>canWrite && setEvaluation({...evaluation, feedback_pos_neg: e.target.value})} 
                                                />
                                            </div>
                                            </div>
                                </div>

                                                    {canWrite && (
                                                    <div>
                                                            <button type="submit" className="inline-flex items-center rounded-md bg-[#096725] px-4 py-2 text-white hover:bg-[#07501d]">
                                                                {t('profile.userProfile.saveEvaluation')}
                                                            </button>
                                                </div>
                                                    )}
                                                </form>
                                        </CardContent>
                                    </Card>
                                    </TabsContent>
                            )}

                                {/* Tab: Photos - Only for users, visible to user, matchmaker, and manager */}
                                {userRole === 'user' && canViewPhotos && (
                                    <TabsContent value="photos" className="mt-6 space-y-6">
                                        <Card className="border-gray-200 bg-white">
                                            <CardContent className="p-6">
                                                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                                                    <Camera className="h-5 w-5 text-[#096725]" />
                                                    Photos
                                                </h3>
                                                {photos && photos.length > 0 ? (
                                                    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                                                        {photos.map((photo) => (
                                                            <div key={photo.id} className="aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                                                                <img
                                                                    src={photo.url}
                                                                    alt={photo.file_name || 'User photo'}
                                                                    className="h-full w-full object-cover"
                                                                    onError={(e) => {
                                                                        e.target.onerror = null;
                                                                        e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23e5e7eb" width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle" fill="%239ca3af" font-family="Arial" font-size="14"%3EImage non disponible%3C/text%3E%3C/svg%3E';
                                                                    }}
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="py-12 text-center text-gray-500">
                                                        <Camera className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                                                        <p>Aucune photo téléchargée</p>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </TabsContent>
                                )}
                            </Tabs>
                        </div>
                                    </div>
                                        </div>
            </div>

            {/* Delete Note Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('profile.userProfile.deleteNoteConfirm')}</DialogTitle>
                        <DialogDescription>{t('profile.userProfile.deleteNoteDescription')}</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setDeleteDialogOpen(false);
                                setNoteToDelete(null);
                            }}
                        >
                            {t('profile.userProfile.no')}
                        </Button>
                        <Button variant="destructive" onClick={deleteNote}>
                            {t('profile.userProfile.yesDelete')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
