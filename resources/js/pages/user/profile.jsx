import CreatePost from '@/components/posts/CreatePost';
import PostCard from '@/components/posts/PostCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import AppLayout from '@/layouts/app-layout';
import { Head, router, usePage } from '@inertiajs/react';
import { BookOpen, Camera, Facebook, Heart, Instagram, Linkedin, MapPin, MessageSquareWarning, User, X, Youtube, Trash2, MoreVertical, UserCircle, Image, ThumbsUp, CheckCircle, Coffee, CreditCard, Lightbulb, Phone, ArrowRightLeft, Pencil, FileText, Calendar, Search, ShoppingCart, GraduationCap, Briefcase } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';

export default function UserProfile({
    user,
    profile,
    agency,
    matchmakerNotes = [],
    matchmakerEvaluation = null,
    photos = [],
    bills = [],
    subscriptions = [],
    matchmakingSearch = null,
    matchmakingResults = null,
    propositionToRespond = null,
}) {
    const { t } = useTranslation();
    const { auth } = usePage().props;
    const { showToast } = useToast();

    // Use Number conversion to handle string/number type differences in IDs
    // Also check with string comparison as fallback
    const authUserId = auth?.user?.id;
    const profileUserId = user?.id;
    const isOwnProfile =
        authUserId != null && profileUserId != null && (Number(authUserId) === Number(profileUserId) || String(authUserId) === String(profileUserId));

    const assignedMatchmakerId = auth?.user?.['assigned_matchmaker']?.id;

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

    // Countries and cities data for selects
    const [countries, setCountries] = useState([]);
    const [countryCodeToCities, setCountryCodeToCities] = useState({});
    const [loadingCountries, setLoadingCountries] = useState(false);

    // Fetch countries and cities from API
    useEffect(() => {
        let isMounted = true;
        const fetchCountries = async () => {
            try {
                setLoadingCountries(true);
                const response = await axios.get('/locations');
                if (!isMounted) return;
                
                const countriesData = Array.isArray(response.data?.countries) ? response.data.countries : [];
                
                const normalized = countriesData
                    .filter((item) => item?.iso2)
                    .map((item) => ({
                        iso2: item.iso2,
                        iso3: item.iso3,
                        englishName: item.name,
                        frenchName: item.frenchName || item.name,
                        cities: Array.isArray(item.cities) ? item.cities : [],
                    }))
                    .sort((a, b) => a.frenchName.localeCompare(b.frenchName, 'fr'));

                const codeToCities = normalized.reduce((acc, item) => {
                    acc[item.iso2] = item.cities;
                    return acc;
                }, {});

                if (isMounted) {
                    setCountries(normalized);
                    setCountryCodeToCities(codeToCities);
                }
            } catch (err) {
                // Silently fail - we'll show stored values anyway
            } finally {
                if (isMounted) setLoadingCountries(false);
            }
        };
        fetchCountries();
        return () => {
            isMounted = false;
        };
    }, []);

    // Feedback local state
    const [avis, setAvis] = useState('');
    const [commentaire, setCommentaire] = useState('');

    // Proposition response state (for profile view)
    const [propositionToRespondState, setPropositionToRespondState] = useState(propositionToRespond);
    const [responseMessages, setResponseMessages] = useState({});
    const [responseProcessingIds, setResponseProcessingIds] = useState({});
    const [responseErrors, setResponseErrors] = useState({});
    const [responseSelections, setResponseSelections] = useState({});

    useEffect(() => {
        setPropositionToRespondState(propositionToRespond);
        if (propositionToRespond?.id) {
            setResponseSelections((prev) => ({
                ...prev,
                [propositionToRespond.id]: '',
            }));
        }
    }, [propositionToRespond]);

    const handlePropositionRespond = async (propositionId, status) => {
        const message = (responseMessages[propositionId] || '').trim();
        if (!status) {
            setResponseErrors((prev) => ({ ...prev, [propositionId]: 'Veuillez sélectionner une réponse.' }));
            return;
        }
        if (!message) {
            setResponseErrors((prev) => ({ ...prev, [propositionId]: 'Veuillez saisir un motif.' }));
            return;
        }

        setResponseProcessingIds((prev) => ({ ...prev, [propositionId]: true }));
        setResponseErrors((prev) => ({ ...prev, [propositionId]: '' }));
        try {
            await axios.post(`/propositions/${propositionId}/respond`, {
                status,
                response_message: message || null,
            });

            const mappedStatus = status === 'accepted' ? 'interested' : 'not_interested';
            setPropositionToRespondState((prev) =>
                prev && prev.id === propositionId
                    ? {
                          ...prev,
                          status: mappedStatus,
                          response_message: message || null,
                          responded_at: new Date().toISOString(),
                      }
                    : prev,
            );
        } catch (error) {
            const messageText = error?.response?.data?.message || 'Une erreur est survenue.';
            setResponseErrors((prev) => ({ ...prev, [propositionId]: messageText }));
        } finally {
            setResponseProcessingIds((prev) => ({ ...prev, [propositionId]: false }));
        }
    };

    // Visibility: who can see notes/evaluation
    const viewerRole = auth?.user?.roles?.[0]?.name || 'user';

    // Helper function to check if matchmaker belongs to manager's agency
    const isMatchmakerFromManagerAgency = () => {
        if (!user?.assigned_matchmaker_id || !auth?.user?.agency_id) {
            return false;
        }
        // Handle both naming conventions (camelCase and snake_case)
        const matchmaker = user?.assignedMatchmaker || user?.assigned_matchmaker;
        if (!matchmaker || !matchmaker.agency_id) {
            return false;
        }
        // Ensure type-safe comparison (convert both to numbers or strings)
        const matchmakerAgencyId = Number(matchmaker.agency_id);
        const managerAgencyId = Number(auth.user.agency_id);
        // Check for NaN (in case of null/undefined conversion)
        if (isNaN(matchmakerAgencyId) || isNaN(managerAgencyId)) {
            return false;
        }
        return matchmakerAgencyId === managerAgencyId;
    };

    const canManage =
        viewerRole === 'admin' ||
        (viewerRole === 'matchmaker' && user?.assigned_matchmaker_id === auth?.user?.id) ||
        (viewerRole === 'manager' &&
            (user?.validated_by_manager_id === auth?.user?.id ||
                // Manager can view if prospect was validated by a matchmaker from their agency
                isMatchmakerFromManagerAgency()));

    // Write permissions: only assigned matchmaker OR manager who validated the prospect can write/edit (NOT admin)
    const canWrite =
        (viewerRole === 'matchmaker' && user?.assigned_matchmaker_id === auth?.user?.id) ||
        (viewerRole === 'manager' && user?.validated_by_manager_id === auth?.user?.id);

    // Visibility for photos: user themselves, assigned matchmaker, or manager of their agency
    const canViewPhotos =
        isOwnProfile ||
        viewerRole === 'admin' ||
        (viewerRole === 'matchmaker' && user?.assigned_matchmaker_id === auth?.user?.id) ||
        (viewerRole === 'manager' && user?.agency_id && user?.agency_id === auth?.user?.agency_id);
    viewerRole === 'manager' && user?.agency_id && user?.agency_id === auth?.user?.agency_id;

    // Can delete photos: user can delete their own, matchmaker can delete assigned user's photos
    const canDeletePhotos =
        isOwnProfile ||
        (viewerRole === 'matchmaker' && user?.assigned_matchmaker_id === auth?.user?.id) ||
        (viewerRole === 'admin');

    const normalizedPropositionStatus = propositionToRespondState
        ? propositionToRespondState.is_expired
            ? 'expired'
            : propositionToRespondState.status === 'interested' || propositionToRespondState.status === 'accepted'
              ? 'accepted'
              : propositionToRespondState.status === 'not_interested' || propositionToRespondState.status === 'rejected'
                ? 'rejected'
                : 'pending'
        : null;
    const isPropositionPending = normalizedPropositionStatus === 'pending';
    const isPropositionProcessing = propositionToRespondState ? responseProcessingIds[propositionToRespondState.id] : false;

    // Photo deletion state
    const [photoToDelete, setPhotoToDelete] = useState(null);

    // Handle photo deletion
    const handleDeletePhoto = (photoId) => {
        const photo = photos.find(p => p.id === photoId);
        setPhotoToDelete(photo);
    };

    const confirmDeletePhoto = () => {
        if (photoToDelete) {
            router.delete(`/photos/${photoToDelete.id}`, {
                preserveScroll: true,
                onSuccess: () => {
                    setPhotoToDelete(null);
                },
            });
        }
    };

    // Notes form
    const [newNote, setNewNote] = useState('');
    const [contactType, setContactType] = useState('');
    const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);

    const addNote = (e) => {
        e.preventDefault();
        if (!newNote.trim()) return;
        router.post(
            `/users/${user.id}/notes`,
            {
                content: newNote,
                contact_type: contactType || null,
            },
            {
                onSuccess: () => {
                    setNewNote('');
                    setContactType('');
                    setIsNoteModalOpen(false);
                },
            },
        );
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

    // Transfer handlers
    const handleTransferClick = async () => {
        setSelectedMatchmakerId('');
        setTransferReason('');
        setLoadingMatchmakers(true);
        setTransferDialogOpen(true);
        
        try {
            const response = await fetch('/staff/matchmakers-for-transfer');
            const data = await response.json();
            setMatchmakers(data);
        } catch (error) {
            console.error('Error fetching matchmakers:', error);
        } finally {
            setLoadingMatchmakers(false);
        }
    };

    const handleTransferSubmit = () => {
        if (!selectedMatchmakerId) {
            return;
        }
        
        setTransferring(true);
        router.post('/staff/transfer-requests', {
            user_id: user.id,
            to_matchmaker_id: selectedMatchmakerId,
            reason: transferReason,
        }, {
            onSuccess: () => {
                setTransferDialogOpen(false);
                setSelectedMatchmakerId('');
                setTransferReason('');
                setTransferring(false);
                router.reload();
            },
            onError: () => {
                setTransferring(false);
            }
        });
    };

    // Helper function to get step
    const getStep = () => {
        return user?.profile?.matrimonial_pack?.name || 
               (user?.profile?.service_id ? 'Service' : null) || 
               'N/A';
    };

    // Helper function to get status info
    const getStatusInfo = (userStatus) => {
        switch (userStatus) {
            case 'member':
                return { label: 'Member', className: 'bg-blue-500 text-white' };
            case 'client':
                return { label: 'Client', className: 'bg-green-500 text-white' };
            case 'client_expire':
                return { label: 'Client Expiré', className: 'bg-orange-500 text-white' };
            default:
                return { label: userStatus || 'Unknown', className: 'bg-gray-500 text-white' };
        }
    };

    // Handle profile picture upload for matchmakers
    const handleProfilePictureUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showToast(t('profile.invalidImageType', { defaultValue: 'Please select a valid image file.' }), undefined, 'error');
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            showToast(t('profile.imageTooLarge', { defaultValue: 'Image size must be less than 2MB.' }), undefined, 'error');
            return;
        }

        const formData = new FormData();
        formData.append('profile_picture', file);
        formData.append('user_id', user.id);
        formData.append('from_matchmaker', '1');

        router.post('/staff/users/upload-profile-picture', formData, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                router.reload({ only: ['user', 'profile'] });
            },
            onError: (errors) => {
                if (errors.profile_picture) {
                    showToast(t('profile.uploadError', { defaultValue: 'Error' }), errors.profile_picture, 'error');
                } else {
                    showToast(t('profile.uploadError', { defaultValue: 'An error occurred while uploading the profile picture.' }), undefined, 'error');
                }
            },
        });
    };

    // Handle cover picture upload for matchmakers
    const handleCoverPictureUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showToast(t('profile.invalidImageType', { defaultValue: 'Please select a valid image file.' }), undefined, 'error');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            showToast(t('profile.imageTooLarge', { defaultValue: 'Image size must be less than 5MB.' }), undefined, 'error');
            return;
        }

        const formData = new FormData();
        formData.append('banner_image', file);
        formData.append('user_id', user.id);
        formData.append('from_matchmaker', '1');

        router.post('/staff/users/upload-cover-picture', formData, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                router.reload({ only: ['user', 'profile'] });
            },
            onError: (errors) => {
                if (errors.banner_image) {
                    showToast(t('profile.uploadError', { defaultValue: 'Error' }), errors.banner_image, 'error');
                } else {
                    showToast(t('profile.uploadError', { defaultValue: 'An error occurred while uploading the cover picture.' }), undefined, 'error');
                }
            },
        });
    };

    // Handle activate account
    const handleActivateAccount = () => {
        router.post(`/staff/users/${user.id}/activate`, {
            reason: statusReason,
        }, {
            onSuccess: () => {
                setActivateDialogOpen(false);
                setStatusReason('');
                router.reload();
            },
        });
    };

    // Handle deactivate account
    const handleDeactivateAccount = () => {
        router.post(`/staff/users/${user.id}/deactivate`, {
            reason: statusReason,
        }, {
            onSuccess: () => {
                setDeactivateDialogOpen(false);
                setStatusReason('');
                router.reload();
            },
        });
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
            showToast(t('profile.invalidImageType', { defaultValue: 'Please select a valid image file.' }), undefined, 'error');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            showToast(t('profile.imageTooLarge', { defaultValue: 'Image size must be less than 5MB.' }), undefined, 'error');
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
                    showToast(t('profile.uploadError', { defaultValue: 'Error' }), errors.banner_image, 'error');
                } else {
                    showToast(t('profile.uploadError', { defaultValue: 'An error occurred while uploading the banner image.' }), undefined, 'error');
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
                showToast(t('profile.deleteError', { defaultValue: 'An error occurred while deleting the banner image.' }), undefined, 'error');
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

    // Active matchmaker action tab state (for matchmakers viewing user profiles)
    const [activeMatchmakerTab, setActiveMatchmakerTab] = useState('actions');

    // Transfer dialog state
    const [transferDialogOpen, setTransferDialogOpen] = useState(false);
    const [matchmakers, setMatchmakers] = useState([]);
    const [selectedMatchmakerId, setSelectedMatchmakerId] = useState('');
    const [transferReason, setTransferReason] = useState('');
    const [loadingMatchmakers, setLoadingMatchmakers] = useState(false);
    const [transferring, setTransferring] = useState(false);

    // Activate/Deactivate dialog state
    const [activateDialogOpen, setActivateDialogOpen] = useState(false);
    const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
    const [statusReason, setStatusReason] = useState('');

    // Check if current user is the assigned matchmaker viewing their assigned user profile
    // Only the assigned matchmaker can see the action tabs
    const isMatchmakerViewingUser = 
        viewerRole === 'matchmaker' && 
        userRole === 'user' && 
        user?.assigned_matchmaker_id != null &&
        (Number(user?.assigned_matchmaker_id) === Number(auth?.user?.id) || 
         String(user?.assigned_matchmaker_id) === String(auth?.user?.id));

    return (
        <AppLayout>
            <Head title={`${user?.name} - ${t('common.profile')}`}>
                <style>{`
                    input[type="checkbox"] {
                        -webkit-appearance: none;
                        -moz-appearance: none;
                        appearance: none;
                        width: 1rem;
                        height: 1rem;
                        border: 1px solid #d1d5db;
                        border-radius: 0.25rem;
                        background-color: white;
                        cursor: default;
                        position: relative;
                    }
                    input[type="checkbox"]:checked {
                        background-color: #16a34a !important;
                        border-color: #16a34a !important;
                    }
                    input[type="checkbox"]:checked:disabled {
                        background-color: #16a34a !important;
                        border-color: #16a34a !important;
                        opacity: 1 !important;
                    }
                    input[type="checkbox"]:checked::after {
                        content: "";
                        position: absolute;
                        left: 3px;
                        top: 0px;
                        width: 4px;
                        height: 8px;
                        border: solid white;
                        border-width: 0 2px 2px 0;
                        transform: rotate(45deg);
                    }
                `}</style>
            </Head>
            <div className="min-h-screen bg-gray-50">
                {/* Banner Image Section */}
                <div className="relative h-64 w-full overflow-hidden bg-gradient-to-r from-blue-600 to-purple-600 md:h-80">
                    {bannerImageSrc ? (
                        <img src={bannerImageSrc} alt={`${user?.name} banner`} className="h-full w-full object-cover" />
                    ) : (
                        <div className="h-full w-full bg-gradient-to-r from-blue-600 to-purple-600" />
                    )}
                    {(isOwnProfile || (isMatchmakerViewingUser && canWrite)) && (
                        <div className="absolute top-4 right-4 z-20 flex gap-2">
                            <label htmlFor="banner-upload-input" className="cursor-pointer">
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    onChange={isOwnProfile ? handleBannerUpload : handleCoverPictureUpload} 
                                    className="hidden" 
                                    id="banner-upload-input" 
                                />
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    className="border border-gray-200 bg-white text-gray-700 shadow-lg hover:bg-gray-50"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        document.getElementById('banner-upload-input')?.click();
                                    }}
                                >
                                    <Camera className="mr-2 h-4 w-4" />
                                    {bannerImageSrc
                                        ? t('profile.changeBanner', { defaultValue: 'Change' })
                                        : t('profile.uploadBanner', { defaultValue: 'Upload' })}
                                </Button>
                            </label>
                            {bannerImageSrc && (
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    className="border border-gray-200 bg-white text-red-600 shadow-lg hover:bg-gray-50"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleBannerDelete();
                                    }}
                                >
                                    <X className="mr-2 h-4 w-4" />
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
                                            {(isOwnProfile || (isMatchmakerViewingUser && canWrite)) && (
                                                <label className="absolute -right-2 -bottom-2 cursor-pointer">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        id="profile-picture-upload"
                                                        onChange={isOwnProfile ? (e) => {
                                                            const file = e.target.files[0];
                                                            if (!file) return;

                                                            // Validate file type
                                                            if (!file.type.startsWith('image/')) {
                                                                showToast(
                                                                    t('profile.invalidImageType', {
                                                                        defaultValue: 'Please select a valid image file.',
                                                                    }),
                                                                    undefined,
                                                                    'error'
                                                                );
                                                                return;
                                                            }

                                                            // Validate file size (max 2MB)
                                                            if (file.size > 2 * 1024 * 1024) {
                                                                showToast(
                                                                    t('profile.imageTooLarge', { defaultValue: 'Image size must be less than 2MB.' }),
                                                                    undefined,
                                                                    'error'
                                                                );
                                                                return;
                                                            }

                                                            const formData = new FormData();
                                                            formData.append('profile_picture', file);
                                                            formData.append('from_profile_page', '1');

                                                            router.post('/settings/profile', formData, {
                                                                forceFormData: true,
                                                                preserveScroll: true,
                                                                onSuccess: () => {
                                                                    router.reload({ only: ['user', 'profile'] });
                                                                },
                                                                onError: (errors) => {
                                                                    if (errors.profile_picture) {
                                                                        showToast(t('profile.uploadError', { defaultValue: 'Error' }), errors.profile_picture, 'error');
                                                                    } else {
                                                                        showToast(
                                                                            t('profile.uploadError', {
                                                                                defaultValue:
                                                                                    'An error occurred while uploading the profile picture.',
                                                                            }),
                                                                            undefined,
                                                                            'error'
                                                                        );
                                                                    }
                                                                },
                                                            });
                                                        } : handleProfilePictureUpload}
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
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm font-medium text-[#096725] transition-colors hover:text-[#07501d] hover:underline"
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
                                                    className="text-[#1877F2] transition-colors"
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
                            {/* Matchmaker Action Tabs Navigation - Only for matchmakers viewing user profiles */}
                            {isMatchmakerViewingUser && (
                                <div className="w-full">
                                    {/* <div className="mb-2 flex items-center justify-end">
                                        <span className="rounded bg-red-600 px-3 py-1 text-sm font-semibold text-white">
                                            Message prive
                                        </span>
                                    </div> */}
                                    <div className="flex items-center gap-1 rounded-lg border border-black bg-[#F5F5DC] p-1">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                setActiveMatchmakerTab('actions');
                                            }}
                                            className={`flex flex-1 items-center justify-center gap-2 rounded px-3 py-2 text-sm font-medium transition-colors ${
                                                activeMatchmakerTab === 'actions'
                                                    ? 'bg-red-600 text-white'
                                                    : 'text-red-600 hover:bg-red-50'
                                            }`}
                                        >
                                            <UserCircle className="h-5 w-5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                setActiveMatchmakerTab('photos');
                                            }}
                                            className={`flex flex-1 items-center justify-center gap-2 rounded px-3 py-2 text-sm font-medium transition-colors ${
                                                activeMatchmakerTab === 'photos'
                                                    ? 'bg-red-600 text-white'
                                                    : 'text-red-600 hover:bg-red-50'
                                            }`}
                                        >
                                            <Image className="h-5 w-5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                setActiveMatchmakerTab('likes');
                                            }}
                                            className={`flex flex-1 items-center justify-center gap-2 rounded px-3 py-2 text-sm font-medium transition-colors ${
                                                activeMatchmakerTab === 'likes'
                                                    ? 'bg-red-600 text-white'
                                                    : 'text-red-600 hover:bg-red-50'
                                            }`}
                                        >
                                            <ThumbsUp className="h-5 w-5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                setActiveMatchmakerTab('rdv');
                                            }}
                                            className={`flex flex-1 items-center justify-center gap-2 rounded px-3 py-2 text-sm font-medium transition-colors ${
                                                activeMatchmakerTab === 'rdv'
                                                    ? 'bg-red-600 text-white'
                                                    : 'text-red-600 hover:bg-red-50'
                                            }`}
                                        >
                                            {/* <CheckCircle className="h-5 w-5" /> */}
                                            <Coffee className="h-5 w-5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                setActiveMatchmakerTab('orders');
                                            }}
                                            className={`flex flex-1 items-center justify-center gap-2 rounded px-3 py-2 text-sm font-medium transition-colors ${
                                                activeMatchmakerTab === 'orders'
                                                    ? 'bg-red-600 text-white'
                                                    : 'text-red-600 hover:bg-red-50'
                                            }`}
                                        >
                                            <ShoppingCart className="h-5 w-5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                setActiveMatchmakerTab('subscription');
                                            }}
                                            className={`flex flex-1 items-center justify-center gap-2 rounded px-3 py-2 text-sm font-medium transition-colors ${
                                                activeMatchmakerTab === 'subscription'
                                                    ? 'bg-red-600 text-white'
                                                    : 'text-red-600 hover:bg-red-50'
                                            }`}
                                        >
                                            <CreditCard className="h-5 w-5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                setActiveMatchmakerTab('matchmaking');
                                            }}
                                            className={`flex flex-1 items-center justify-center gap-2 rounded px-3 py-2 text-sm font-medium transition-colors ${
                                                activeMatchmakerTab === 'matchmaking'
                                                    ? 'bg-red-600 text-white'
                                                    : 'text-red-600 hover:bg-red-50'
                                            }`}
                                        >
                                            <Lightbulb className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            )}
                            {/* Matchmaker Action Tabs Content - Only for matchmakers viewing user profiles */}
                            {isMatchmakerViewingUser && (
                                <div className="w-full">
                                    {/* Actions Tab */}
                                    {activeMatchmakerTab === 'actions' && (
                                            <div className="mt-6 space-y-4">
                                                <Card className="border-gray-200 bg-white">
                                                    <CardContent className="p-6">
                                                        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                                                            <UserCircle className="h-5 w-5 text-red-600" />
                                                            Actions du membre
                                                        </h3>
                                                        
                                                        {/* Step and Status Display */}
                                                        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                                                            <div>
                                                                <p className="text-sm font-medium text-gray-600 mb-2">Étape</p>
                                                                <Badge className="bg-foreground text-background">
                                                                    {getStep()}
                                                                </Badge>
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium text-gray-600 mb-2">Statut</p>
                                                                <Badge className={getStatusInfo(user?.status).className}>
                                                                    {getStatusInfo(user?.status).label}
                                                                </Badge>
                                                            </div>
                                                            {user?.profile?.account_status && (
                                                                <div>
                                                                    <p className="text-sm font-medium text-gray-600 mb-2">Statut du compte</p>
                                                                    <Badge className={user.profile.account_status === 'active' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}>
                                                                        {user.profile.account_status === 'active' ? 'Actif' : 'Désactivé'}
                                                                    </Badge>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                                            {(user?.status === 'member' || user?.status === 'client_expire') && !user?.has_bill && (
                                                                <Button
                                                                    variant="default"
                                                                    size="sm"
                                                                    className="bg-info hover:opacity-90"
                                                                    onClick={() => router.visit(`/staff/prospects/${user.id}/subscription`)}
                                                                >
                                                                    <CreditCard className="w-4 h-4 mr-2" />
                                                                    Abonnement
                                                                </Button>
                                                            )}
                                                            {(user?.status === 'member' || user?.status === 'client_expire') && user?.has_bill && (
                                                                <Button
                                                                    variant="default"
                                                                    size="sm"
                                                                    className="bg-success hover:opacity-90"
                                                                    onClick={() => {
                                                                        router.post('/staff/mark-as-client', {
                                                                            user_id: user.id
                                                                        });
                                                                    }}
                                                                >
                                                                    <CheckCircle className="w-4 h-4 mr-2" />
                                                                    Marquer comme Client
                                                                </Button>
                                                            )}
                                                            {canWrite && (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="border-blue-500 text-blue-600 hover:bg-blue-50"
                                                                    onClick={() => router.visit(`/staff/prospects/${user.id}/profile/edit`)}
                                                                >
                                                                    <Pencil className="w-4 h-4 mr-2" />
                                                                    Modifier le profil
                                                                </Button>
                                                            )}
                                                            {user?.status === 'client_expire' && !user?.to_rappeler && (
                                                                <Button
                                                                    variant="default"
                                                                    size="sm"
                                                                    className="bg-warning hover:opacity-90"
                                                                    onClick={() => {
                                                                        router.post(`/staff/prospects/${user.id}/rappeler`, {}, {
                                                                            onSuccess: () => router.reload()
                                                                        });
                                                                    }}
                                                                >
                                                                    <Phone className="w-4 h-4 mr-2" />
                                                                    Rappeler
                                                                </Button>
                                                            )}
                                                            {canWrite && (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={handleTransferClick}
                                                                >
                                                                    <ArrowRightLeft className="w-4 h-4 mr-2" />
                                                                    Transférer
                                                                </Button>
                                                            )}
                                                            {canWrite && (
                                                                user?.profile?.account_status === 'desactivated' ? (
                                                                    <Button
                                                                        variant="default"
                                                                        size="sm"
                                                                        className="bg-green-600 hover:bg-green-700"
                                                                        onClick={() => {
                                                                            setStatusReason('');
                                                                            setActivateDialogOpen(true);
                                                                        }}
                                                                    >
                                                                        <CheckCircle className="w-4 h-4 mr-2" />
                                                                        Activer le compte
                                                                    </Button>
                                                                ) : (
                                                                    <Button
                                                                        variant="destructive"
                                                                        size="sm"
                                                                        onClick={() => {
                                                                            setStatusReason('');
                                                                            setDeactivateDialogOpen(true);
                                                                        }}
                                                                    >
                                                                        <X className="w-4 h-4 mr-2" />
                                                                        Désactiver le compte
                                                                    </Button>
                                                                )
                                                            )}
                                                            {(!canWrite && 
                                                              !((user?.status === 'member' || user?.status === 'client_expire') && !user?.has_bill) &&
                                                              !((user?.status === 'member' || user?.status === 'client_expire') && user?.has_bill) &&
                                                              !(user?.status === 'client_expire' && !user?.to_rappeler)) && (
                                                                <p className="text-gray-500 text-sm">Aucune action disponible pour ce membre.</p>
                                                            )}
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </div>
                                        )}

                                        {/* Subscription Details Tab */}
                                        {activeMatchmakerTab === 'subscription' && (
                                            <div className="mt-6 space-y-4">
                                                <Card className="border-gray-200 bg-white">
                                                    <CardContent className="p-6">
                                                        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                                                            <CreditCard className="h-5 w-5 text-red-600" />
                                                            Détails de l'abonnement
                                                        </h3>
                                                        {subscriptions && subscriptions.length > 0 ? (
                                                            <div className="space-y-4">
                                                                {subscriptions.map((subscription) => (
                                                                    <Card key={subscription.id} className="border-gray-200">
                                                                        <CardContent className="p-4">
                                                                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                                                                <div>
                                                                                    <p className="text-sm font-medium text-gray-600">Pack</p>
                                                                                    <p className="text-base font-semibold">{subscription.matrimonial_pack?.name || 'N/A'}</p>
                                                                                </div>
                                                                                <div>
                                                                                    <p className="text-sm font-medium text-gray-600">Statut</p>
                                                                                    <Badge className={subscription.status === 'active' ? 'bg-green-600' : subscription.status === 'expired' ? 'bg-red-600' : 'bg-gray-600'}>
                                                                                        {subscription.status === 'active' ? 'Actif' : subscription.status === 'expired' ? 'Expiré' : 'Annulé'}
                                                                                    </Badge>
                                                                                </div>
                                                                                <div>
                                                                                    <p className="text-sm font-medium text-gray-600">Date de début</p>
                                                                                    <p className="text-base">{subscription.subscription_start ? new Date(subscription.subscription_start).toLocaleDateString('fr-FR') : 'N/A'}</p>
                                                                                </div>
                                                                                <div>
                                                                                    <p className="text-sm font-medium text-gray-600">Date de fin</p>
                                                                                    <p className="text-base">{subscription.subscription_end ? new Date(subscription.subscription_end).toLocaleDateString('fr-FR') : 'N/A'}</p>
                                                                                </div>
                                                                                <div>
                                                                                    <p className="text-sm font-medium text-gray-600">Durée</p>
                                                                                    <p className="text-base">{subscription.duration_months} mois</p>
                                                                                </div>
                                                                                <div>
                                                                                    <p className="text-sm font-medium text-gray-600">Prix</p>
                                                                                    <p className="text-base font-semibold">{subscription.pack_price} MAD</p>
                                                                                </div>
                                                                                {subscription.days_remaining !== null && subscription.days_remaining > 0 && (
                                                                                    <div>
                                                                                        <p className="text-sm font-medium text-gray-600">Jours restants</p>
                                                                                        <p className="text-base">{subscription.days_remaining} jours</p>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </CardContent>
                                                                    </Card>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <p className="text-gray-500">Aucun abonnement trouvé</p>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            </div>
                                        )}

                                        {/* Order Details (Bills) Tab */}
                                        {activeMatchmakerTab === 'orders' && (
                                            <div className="mt-6 space-y-4">
                                                <Card className="border-gray-200 bg-white">
                                                    <CardContent className="p-6">
                                                        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                                                            <FileText className="h-5 w-5 text-red-600" />
                                                            Détails des commandes (Factures)
                                                        </h3>
                                                        {bills && bills.length > 0 ? (
                                                            <div className="overflow-x-auto">
                                                                <Table>
                                                                    <TableHeader>
                                                                        <TableRow>
                                                                            <TableHead>Numéro de facture</TableHead>
                                                                            <TableHead>Numéro de commande</TableHead>
                                                                            <TableHead>Date</TableHead>
                                                                            <TableHead>Montant</TableHead>
                                                                            <TableHead>Statut</TableHead>
                                                                            <TableHead>Mode de paiement</TableHead>
                                                                        </TableRow>
                                                                    </TableHeader>
                                                                    <TableBody>
                                                                        {bills.map((bill) => (
                                                                            <TableRow key={bill.id}>
                                                                                <TableCell className="font-medium">{bill.bill_number}</TableCell>
                                                                                <TableCell>{bill.order_number}</TableCell>
                                                                                <TableCell>{bill.bill_date ? new Date(bill.bill_date).toLocaleDateString('fr-FR') : 'N/A'}</TableCell>
                                                                                <TableCell>{bill.total_amount} {bill.currency}</TableCell>
                                                                                <TableCell>
                                                                                    <Badge className={bill.status === 'paid' ? 'bg-green-600' : bill.status === 'unpaid' ? 'bg-red-600' : 'bg-gray-600'}>
                                                                                        {bill.status === 'paid' ? 'Payé' : bill.status === 'unpaid' ? 'Non payé' : bill.status}
                                                                                    </Badge>
                                                                                </TableCell>
                                                                                <TableCell>{bill.payment_method}</TableCell>
                                                                            </TableRow>
                                                                        ))}
                                                                    </TableBody>
                                                                </Table>
                                                            </div>
                                                        ) : (
                                                            <p className="text-gray-500">Aucune facture trouvée</p>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            </div>
                                        )}

                                        {/* Rendez-vous Details Tab */}
                                        {activeMatchmakerTab === 'rdv' && (
                                            <div className="mt-6 space-y-4">
                                                <Card className="border-gray-200 bg-white">
                                                    <CardContent className="p-6">
                                                        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                                                            <Calendar className="h-5 w-5 text-red-600" />
                                                            Détails des rendez-vous
                                                        </h3>
                                                        <div className="space-y-4">
                                                            <div>
                                                                <p className="text-sm font-medium text-gray-600">Statut</p>
                                                                <Badge className={user?.status === 'en_rdv' ? 'bg-blue-600' : 'bg-gray-400'}>
                                                                    {user?.status === 'en_rdv' ? 'En rendez-vous' : 'Pas de rendez-vous'}
                                                                </Badge>
                                                            </div>
                                                            {user?.status === 'en_rdv' && (
                                                                <div>
                                                                    <p className="text-sm font-medium text-gray-600">Informations</p>
                                                                    <p className="text-base text-gray-700">Le membre est actuellement en rendez-vous.</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </div>
                                        )}

                                        {/* Matchmaking Search Tab */}
                                        {activeMatchmakerTab === 'matchmaking' && (
                                            <div className="mt-6 space-y-4">
                                                <Card className="border-gray-200 bg-white">
                                                    <CardContent className="p-6">
                                                        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                                                            <Search className="h-5 w-5 text-red-600" />
                                                            Recherche de Matchmaking
                                                        </h3>
                                                        {matchmakingSearch ? (
                                                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                                {matchmakingSearch.age_minimum && matchmakingSearch.age_maximum && (
                                                                    <div>
                                                                        <p className="text-sm font-medium text-gray-600">Tranche d'âge</p>
                                                                        <p className="text-base">{matchmakingSearch.age_minimum} - {matchmakingSearch.age_maximum} ans</p>
                                                                    </div>
                                                                )}
                                                                {matchmakingSearch.situation_matrimoniale_recherche && (
                                                                    <div>
                                                                        <p className="text-sm font-medium text-gray-600">Situation matrimoniale recherchée</p>
                                                                        <p className="text-base">
                                                                            {Array.isArray(matchmakingSearch.situation_matrimoniale_recherche)
                                                                                ? matchmakingSearch.situation_matrimoniale_recherche.join(', ')
                                                                                : matchmakingSearch.situation_matrimoniale_recherche}
                                                                        </p>
                                                                    </div>
                                                                )}
                                                                {matchmakingSearch.pays_recherche && (
                                                                    <div>
                                                                        <p className="text-sm font-medium text-gray-600">Pays recherché</p>
                                                                        <p className="text-base">
                                                                            {Array.isArray(matchmakingSearch.pays_recherche)
                                                                                ? matchmakingSearch.pays_recherche.join(', ')
                                                                                : matchmakingSearch.pays_recherche}
                                                                        </p>
                                                                    </div>
                                                                )}
                                                                {matchmakingSearch.villes_recherche && matchmakingSearch.villes_recherche.length > 0 && (
                                                                    <div>
                                                                        <p className="text-sm font-medium text-gray-600">Villes recherchées</p>
                                                                        <p className="text-base">
                                                                            {Array.isArray(matchmakingSearch.villes_recherche)
                                                                                ? matchmakingSearch.villes_recherche.join(', ')
                                                                                : matchmakingSearch.villes_recherche}
                                                                        </p>
                                                                    </div>
                                                                )}
                                                                {matchmakingSearch.niveau_etudes_recherche && (
                                                                    <div>
                                                                        <p className="text-sm font-medium text-gray-600">Niveau d'études recherché</p>
                                                                        <p className="text-base">{matchmakingSearch.niveau_etudes_recherche}</p>
                                                                    </div>
                                                                )}
                                                                {matchmakingSearch.statut_emploi_recherche && (
                                                                    <div>
                                                                        <p className="text-sm font-medium text-gray-600">Statut d'emploi recherché</p>
                                                                        <p className="text-base">{matchmakingSearch.statut_emploi_recherche}</p>
                                                                    </div>
                                                                )}
                                                                {matchmakingSearch.revenu_minimum && (
                                                                    <div>
                                                                        <p className="text-sm font-medium text-gray-600">Revenu minimum recherché</p>
                                                                        <p className="text-base">{matchmakingSearch.revenu_minimum}</p>
                                                                    </div>
                                                                )}
                                                                {matchmakingSearch.religion_recherche && (
                                                                    <div>
                                                                        <p className="text-sm font-medium text-gray-600">Religion recherchée</p>
                                                                        <p className="text-base">{matchmakingSearch.religion_recherche}</p>
                                                                    </div>
                                                                )}
                                                                {matchmakingSearch.profil_recherche_description && (
                                                                    <div className="md:col-span-2">
                                                                        <p className="text-sm font-medium text-gray-600">Description du profil recherché</p>
                                                                        <p className="text-base">{matchmakingSearch.profil_recherche_description}</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <p className="text-gray-500">Aucune information de recherche de matchmaking disponible</p>
                                                        )}
                                                    </CardContent>
                                                </Card>

                                                {/* Matchmaking Results (À proposer) */}
                                                {matchmakingResults && matchmakingResults.length > 0 && (
                                                    <Card className="border-gray-200 bg-white">
                                                        <CardContent className="p-6">
                                                            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                                                                <Heart className="h-5 w-5 text-red-600" />
                                                                Résultats de Matchmaking ({matchmakingResults.length} profil{matchmakingResults.length > 1 ? 's' : ''} compatible{matchmakingResults.length > 1 ? 's' : ''})
                                                            </h3>
                                                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                                                {matchmakingResults.map((match) => {
                                                                    // Helper functions for display
                                                                    const getProfilePicture = (user, profile) => {
                                                                        const profilePicturePath = profile?.profile_picture_path;
                                                                        if (profilePicturePath) {
                                                                            return `/storage/${profilePicturePath}`;
                                                                        }
                                                                        return `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`;
                                                                    };

                                                                    const getLocation = (profile) => {
                                                                        const city = profile?.ville_residence || profile?.ville_origine || '';
                                                                        const country = profile?.pays_residence || profile?.pays_origine || '';
                                                                        if (city && country) {
                                                                            return `${city}, ${country}`;
                                                                        }
                                                                        return city || country || 'Non spécifié';
                                                                    };

                                                                    const getAge = (profile) => {
                                                                        if (!profile?.date_naissance) return null;
                                                                        const birthDate = new Date(profile.date_naissance);
                                                                        const today = new Date();
                                                                        let age = today.getFullYear() - birthDate.getFullYear();
                                                                        const monthDiff = today.getMonth() - birthDate.getMonth();
                                                                        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                                                                            age--;
                                                                        }
                                                                        return age;
                                                                    };

                                                                    const getScoreColor = (score) => {
                                                                        if (score >= 70) return 'text-green-600 border-green-600';
                                                                        if (score >= 50) return 'text-yellow-600 border-yellow-600';
                                                                        return 'text-orange-600 border-orange-600';
                                                                    };

                                                                    return (
                                                                        <Card 
                                                                            key={match.user.id} 
                                                                            className="hover:shadow-md transition-shadow"
                                                                        >
                                                                            <CardContent className="p-4">
                                                                                <div className="flex items-start gap-3 mb-3">
                                                                                    <img
                                                                                        src={getProfilePicture(match.user, match.profile)}
                                                                                        alt={match.user.name}
                                                                                        className="w-12 h-12 rounded-full object-cover"
                                                                                    />
                                                                                    <div className="flex-1 min-w-0">
                                                                                        <h4 className="font-semibold text-sm truncate">{match.user.name}</h4>
                                                                                        <p className="text-xs text-gray-500 truncate">{match.user.email}</p>
                                                                                    </div>
                                                                                    <Badge 
                                                                                        variant="outline" 
                                                                                        className={`${getScoreColor(match.score)} text-xs font-semibold`}
                                                                                    >
                                                                                        {match.score.toFixed(1)}%
                                                                                    </Badge>
                                                                                </div>
                                                                                <div className="space-y-1.5 text-xs text-gray-600">
                                                                                    {getAge(match.profile) && (
                                                                                        <div className="flex items-center gap-1">
                                                                                            <Calendar className="w-3 h-3" />
                                                                                            <span>{getAge(match.profile)} ans</span>
                                                                                        </div>
                                                                                    )}
                                                                                    <div className="flex items-center gap-1">
                                                                                        <MapPin className="w-3 h-3" />
                                                                                        <span className="truncate">{getLocation(match.profile)}</span>
                                                                                    </div>
                                                                                    {match.profile.niveau_etudes && (
                                                                                        <div className="flex items-center gap-1">
                                                                                            <GraduationCap className="w-3 h-3" />
                                                                                            <span className="truncate">{match.profile.niveau_etudes}</span>
                                                                                        </div>
                                                                                    )}
                                                                                    {match.profile.situation_professionnelle && (
                                                                                        <div className="flex items-center gap-1">
                                                                                            <Briefcase className="w-3 h-3" />
                                                                                            <span className="truncate">{match.profile.situation_professionnelle}</span>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                                <div className="mt-3 pt-3 border-t">
                                                                                    <Button
                                                                                        variant="outline"
                                                                                        size="sm"
                                                                                        className="w-full text-xs"
                                                                                        onClick={() => window.open(`/profile/${match.user.username || match.user.id}`, '_blank', 'noopener,noreferrer')}
                                                                                    >
                                                                                        <User className="w-3 h-3 mr-1" />
                                                                                        Voir le profil
                                                                                    </Button>
                                                                                </div>
                                                                            </CardContent>
                                                                        </Card>
                                                                    );
                                                                })}
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                )}
                                            </div>
                                        )}

                                        {/* Photos Tab (reuse existing photos tab) */}
                                        {activeMatchmakerTab === 'photos' && (
                                            <div className="mt-6 space-y-6">
                                                <Card className="border-gray-200 bg-white">
                                                    <CardContent className="p-6">
                                                        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                                                            <Image className="h-5 w-5 text-red-600" />
                                                            Photos
                                                        </h3>
                                                        {photos && photos.length > 0 ? (
                                                            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                                                                {photos.map((photo) => (
                                                                    <div
                                                                        key={photo.id}
                                                                        className="group relative aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-100"
                                                                    >
                                                                        <img
                                                                            src={photo.url}
                                                                            alt={photo.file_name || 'User photo'}
                                                                            className="h-full w-full object-cover"
                                                                        />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="py-12 text-center text-gray-500">
                                                                <Image className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                                                                <p>Aucune photo téléchargée</p>
                                                            </div>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            </div>
                                        )}

                                        {/* Likes Tab (placeholder) */}
                                        {activeMatchmakerTab === 'likes' && (
                                            <div className="mt-6 space-y-4">
                                                <Card className="border-gray-200 bg-white">
                                                    <CardContent className="p-6">
                                                        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                                                            <ThumbsUp className="h-5 w-5 text-red-600" />
                                                            J'aimes
                                                        </h3>
                                                        <p className="text-gray-500">Fonctionnalité à venir</p>
                                                    </CardContent>
                                                </Card>
                                            </div>
                                        )}
                                </div>
                            )}

                            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                {/* Tabs for regular users */}
                                {userRole === 'user' && (
                                    <TabsList
                                        className={`grid h-auto w-full rounded-none border-b bg-white p-0 ${
                                            canManage && canViewPhotos
                                                ? 'grid-cols-5'
                                                : canManage
                                                  ? 'grid-cols-4'
                                                  : canViewPhotos
                                                    ? 'grid-cols-4'
                                                    : 'grid-cols-3'
                                        }`}
                                    >
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
                                                    <h3 className="mb-4 text-lg font-semibold text-gray-900">À propos de moi</h3>
                                                    <div>
                                                        <label className="mb-1 block text-sm font-medium text-gray-700">
                                                            {t('profile.userProfile.aboutMe')}
                                                        </label>
                                                        <textarea
                                                            value={profile.apropos_description}
                                                            disabled
                                                            rows={6}
                                                            className="w-full rounded-lg border-2 border-red-500 bg-gray-50 px-4 py-3 text-gray-700 disabled:cursor-not-allowed"
                                                        />
                                                    </div>
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
                                                <div className="space-y-6">
                                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                    <div>
                                                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                                            {t('profile.userProfile.matrimonialSituation')}
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={user?.profile?.etat_matrimonial || ''}
                                                                disabled
                                                                className="w-full rounded-lg border-2 border-red-500 bg-gray-50 px-4 py-3 text-gray-700 disabled:cursor-not-allowed"
                                                            />
                                                    </div>
                                                    <div>
                                                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                                                {t('profile.userProfile.haveChildren')}
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={
                                                                    user?.profile?.has_children == 1
                                                                ? `${t('profile.yes')}${user?.profile?.children_count ? ` (${user.profile.children_count})` : ''}`
                                                                : user?.profile?.has_children == 0
                                                                  ? t('profile.no')
                                                                          : ''
                                                                }
                                                                disabled
                                                                className="w-full rounded-lg border-2 border-red-500 bg-gray-50 px-4 py-3 text-gray-700 disabled:cursor-not-allowed"
                                                            />
                                                    </div>
                                                    <div>
                                                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                                                {t('profile.userProfile.educationLevel')}
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={user?.profile?.niveau_etudes || ''}
                                                                disabled
                                                                className="w-full rounded-lg border-2 border-red-500 bg-gray-50 px-4 py-3 text-gray-700 disabled:cursor-not-allowed"
                                                            />
                                                    </div>
                                                    <div>
                                                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                                            {t('profile.userProfile.professionalSituation')}
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={user?.profile?.situation_professionnelle || ''}
                                                                disabled
                                                                className="w-full rounded-lg border-2 border-red-500 bg-gray-50 px-4 py-3 text-gray-700 disabled:cursor-not-allowed"
                                                            />
                                                    </div>
                                                    <div>
                                                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                                                {t('profile.userProfile.activitySector')}
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={user?.profile?.secteur || ''}
                                                                disabled
                                                                className="w-full rounded-lg border-2 border-red-500 bg-gray-50 px-4 py-3 text-gray-700 disabled:cursor-not-allowed"
                                                            />
                                                    </div>
                                                    <div>
                                                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                                                {t('profile.userProfile.monthlyIncome')}
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={user?.profile?.revenu || ''}
                                                                disabled
                                                                className="w-full rounded-lg border-2 border-red-500 bg-gray-50 px-4 py-3 text-gray-700 disabled:cursor-not-allowed"
                                                            />
                                                    </div>
                                                    <div>
                                                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                                                {t('profile.userProfile.height')}
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={user?.profile?.taille ? `${user.profile.taille} cm` : ''}
                                                                disabled
                                                                className="w-full rounded-lg border-2 border-red-500 bg-gray-50 px-4 py-3 text-gray-700 disabled:cursor-not-allowed"
                                                            />
                                                    </div>
                                                    <div>
                                                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                                                {t('profile.userProfile.weight')}
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={user?.profile?.poids ? `${user.profile.poids} kg` : ''}
                                                                disabled
                                                                className="w-full rounded-lg border-2 border-red-500 bg-gray-50 px-4 py-3 text-gray-700 disabled:cursor-not-allowed"
                                                            />
                                                    </div>
                                                    <div>
                                                            <label className="mb-1 block text-sm font-medium text-gray-700">Origine</label>
                                                            <input
                                                                type="text"
                                                                value={user?.profile?.origine || ''}
                                                                disabled
                                                                className="w-full rounded-lg border-2 border-red-500 bg-gray-50 px-4 py-3 text-gray-700 disabled:cursor-not-allowed"
                                                            />
                                                    </div>
                                                    <div>
                                                            <label className="mb-1 block text-sm font-medium text-gray-700">Pays de résidence</label>
                                                            <input
                                                                type="text"
                                                                value={user?.profile?.pays_residence || ''}
                                                                disabled
                                                                className="w-full rounded-lg border-2 border-red-500 bg-gray-50 px-4 py-3 text-gray-700 disabled:cursor-not-allowed"
                                                            />
                                                    </div>
                                                    <div>
                                                            <label className="mb-1 block text-sm font-medium text-gray-700">Ville de résidence</label>
                                                            <input
                                                                type="text"
                                                                value={user?.profile?.ville_residence || ''}
                                                                disabled
                                                                className="w-full rounded-lg border-2 border-red-500 bg-gray-50 px-4 py-3 text-gray-700 disabled:cursor-not-allowed"
                                                            />
                                                    </div>
                                                    <div>
                                                            <label className="mb-1 block text-sm font-medium text-gray-700">Pays d'origine</label>
                                                            <input
                                                                type="text"
                                                                value={user?.profile?.pays_origine || ''}
                                                                disabled
                                                                className="w-full rounded-lg border-2 border-red-500 bg-gray-50 px-4 py-3 text-gray-700 disabled:cursor-not-allowed"
                                                            />
                                                    </div>
                                                    <div>
                                                            <label className="mb-1 block text-sm font-medium text-gray-700">Ville d'origine</label>
                                                            <input
                                                                type="text"
                                                                value={user?.profile?.ville_origine || ''}
                                                                disabled
                                                                className="w-full rounded-lg border-2 border-red-500 bg-gray-50 px-4 py-3 text-gray-700 disabled:cursor-not-allowed"
                                                            />
                                                    </div>
                                                    <div>
                                                            <label className="mb-1 block text-sm font-medium text-gray-700">Religion</label>
                                                            <input
                                                                type="text"
                                                                value={user?.profile?.religion || ''}
                                                                disabled
                                                                className="w-full rounded-lg border-2 border-red-500 bg-gray-50 px-4 py-3 text-gray-700 disabled:cursor-not-allowed"
                                                            />
                                                    </div>
                                                    <div>
                                                            <label className="mb-1 block text-sm font-medium text-gray-700">Logement</label>
                                                            <input
                                                                type="text"
                                                                value={user?.profile?.logement || ''}
                                                                disabled
                                                                className="w-full rounded-lg border-2 border-red-500 bg-gray-50 px-4 py-3 text-gray-700 disabled:cursor-not-allowed"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        {propositionToRespondState && (
                                            <Card className="border border-[#e6d7c3] bg-[#fff7e8]">
                                                <CardContent className="p-6">
                                                    <h3 className="mb-4 text-center text-xl font-extrabold text-[#e53935]">Donner votre avis</h3>
                                                    <div className="space-y-4">
                                                        <div className="space-y-3">
                                                            <label className="flex items-center gap-3 text-sm text-gray-700">
                                                                <input
                                                                    type="radio"
                                                                    name={`proposition-${propositionToRespondState.id}`}
                                                                    value="accepted"
                                                                    checked={responseSelections[propositionToRespondState.id] === 'accepted'}
                                                                    disabled={!isPropositionPending || isPropositionProcessing}
                                                                    onChange={() =>
                                                                        setResponseSelections((prev) => ({
                                                                            ...prev,
                                                                            [propositionToRespondState.id]: 'accepted',
                                                                        }))
                                                                    }
                                                                />
                                                                Intéressé
                                                            </label>
                                                            <label className="flex items-center gap-3 text-sm text-gray-700">
                                                                <input
                                                                    type="radio"
                                                                    name={`proposition-${propositionToRespondState.id}`}
                                                                    value="rejected"
                                                                    checked={responseSelections[propositionToRespondState.id] === 'rejected'}
                                                                    disabled={!isPropositionPending || isPropositionProcessing}
                                                                    onChange={() =>
                                                                        setResponseSelections((prev) => ({
                                                                            ...prev,
                                                                            [propositionToRespondState.id]: 'rejected',
                                                                        }))
                                                                    }
                                                                />
                                                                Pas intéressé
                                                            </label>
                                                        </div>
                                                        <Textarea
                                                            value={responseMessages[propositionToRespondState.id] || ''}
                                                            onChange={(event) =>
                                                                setResponseMessages((prev) => ({
                                                                    ...prev,
                                                                    [propositionToRespondState.id]: event.target.value,
                                                                }))
                                                            }
                                                            placeholder="Veuillez donner plus de détails"
                                                            disabled={!isPropositionPending || isPropositionProcessing}
                                                            className="min-h-[90px] bg-white"
                                                        />
                                                        {responseErrors[propositionToRespondState.id] && (
                                                            <div className="text-sm text-red-600">{responseErrors[propositionToRespondState.id]}</div>
                                                        )}
                                                        <Button
                                                            type="button"
                                                            className="bg-[#e53935] text-white hover:bg-[#cf2f2b]"
                                                            disabled={!isPropositionPending || isPropositionProcessing}
                                                            onClick={() =>
                                                                handlePropositionRespond(
                                                                    propositionToRespondState.id,
                                                                    responseSelections[propositionToRespondState.id],
                                                                )
                                                            }
                                                        >
                                                            Soumettre
                                                        </Button>
                                                        {propositionToRespondState.response_message && !isPropositionPending && (
                                                            <div className="rounded-lg bg-white p-3 text-sm text-gray-700">
                                                                Votre réponse: {propositionToRespondState.response_message}
                                                            </div>
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        )}
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
                                                <div className="space-y-6">
                                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                        <div className="md:col-span-2">
                                                            <label className="mb-2 block text-sm font-medium text-gray-700">
                                                            {t('profile.healthSituation', { defaultValue: 'Situation de santé' })}
                                                            </label>
                                                            <div className="grid grid-cols-2 gap-3 rounded-lg border-2 border-red-500 bg-gray-50 p-4">
                                                            {(() => {
                                                                const situationSante = user?.profile?.situation_sante;
                                                                    const situations = Array.isArray(situationSante) ? situationSante : (situationSante ? [situationSante] : []);
                                                                    
                                                                    const allOptions = [
                                                                        { value: 'sante_tres_bonne', label: t('profile.healthSituationVeryGood', { defaultValue: 'Santé très bonne' }) },
                                                                        { value: 'maladie_chronique', label: t('profile.healthSituationChronicDisease', { defaultValue: 'Maladie chronique' }) },
                                                                        { value: 'personne_handicap', label: t('profile.healthSituationDisabled', { defaultValue: 'Personne en situation de handicap' }) },
                                                                        { value: 'non_voyant_malvoyant', label: t('profile.healthSituationBlindLowVision', { defaultValue: 'Non voyant / Malvoyant' }) },
                                                                        { value: 'cecite_totale', label: t('profile.healthSituationTotalBlindness', { defaultValue: 'مكفوف (Cécité totale)' }) },
                                                                        { value: 'troubles_psychiques', label: t('profile.healthSituationMentalDisorder', { defaultValue: 'Troubles psychiques' }) },
                                                                        { value: 'autres', label: t('profile.healthSituationOther', { defaultValue: 'Autres' }) },
                                                                    ];

                                                                    return allOptions.map((option) => {
                                                                        const isChecked = situations.includes(option.value);
                                                                        return (
                                                                            <label key={option.value} className="flex items-center gap-2 cursor-default">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={isChecked}
                                                                                    disabled
                                                                                    className="h-4 w-4 rounded border-gray-300 checked:bg-green-600 checked:border-green-600 focus:ring-green-500 disabled:cursor-not-allowed disabled:opacity-100"
                                                                                    style={{ accentColor: '#16a34a' }}
                                                                                />
                                                                                <span className="text-sm text-gray-700">{option.label}</span>
                                                                            </label>
                                                                        );
                                                                    });
                                                            })()}
                                                        </div>
                                                    </div>
                                                    <div>
                                                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                                                {t('profile.userProfile.healthStatus')}
                                                            </label>
                                                            <textarea
                                                                value={user?.profile?.etat_sante || ''}
                                                                disabled
                                                                rows={3}
                                                                className="w-full rounded-lg border-2 border-red-500 bg-gray-50 px-4 py-3 text-gray-700 disabled:cursor-not-allowed"
                                                            />
                                                    </div>
                                                    <div>
                                                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                                                {t('profile.smoker')}
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={user?.profile?.fumeur || ''}
                                                                disabled
                                                                className="w-full rounded-lg border-2 border-red-500 bg-gray-50 px-4 py-3 text-gray-700 disabled:cursor-not-allowed"
                                                            />
                                                    </div>
                                                    <div>
                                                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                                                {t('profile.drinker')}
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={user?.profile?.buveur || ''}
                                                                disabled
                                                                className="w-full rounded-lg border-2 border-red-500 bg-gray-50 px-4 py-3 text-gray-700 disabled:cursor-not-allowed"
                                                            />
                                                    </div>
                                                    <div>
                                                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                                                {t('profile.sport')}
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={user?.profile?.sport || ''}
                                                                disabled
                                                                className="w-full rounded-lg border-2 border-red-500 bg-gray-50 px-4 py-3 text-gray-700 disabled:cursor-not-allowed"
                                                            />
                                                    </div>
                                                    <div>
                                                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                                                {t('profile.motorized')}
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={user?.profile?.motorise || ''}
                                                                disabled
                                                                className="w-full rounded-lg border-2 border-red-500 bg-gray-50 px-4 py-3 text-gray-700 disabled:cursor-not-allowed"
                                                            />
                                                    </div>
                                                    <div className="md:col-span-2">
                                                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                                                {t('profile.hobbies')}
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={user?.profile?.loisirs || ''}
                                                                disabled
                                                                className="w-full rounded-lg border-2 border-red-500 bg-gray-50 px-4 py-3 text-gray-700 disabled:cursor-not-allowed"
                                                            />
                                                    </div>
                                                    </div>

                                                    {/* Female-only fields */}
                                                    {user?.gender === 'female' && (
                                                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                            {/* 1. Voile */}
                                                            <div>
                                                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                                                    {t('profile.veil')}
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    value={(() => {
                                                                        const veil = user?.profile?.veil;
                                                                        if (!veil) return '';
                                                                        const translations = {
                                                                            veiled: t('profile.veiled'),
                                                                            non_veiled: t('profile.nonVeiled'),
                                                                        };
                                                                        return translations[veil] || veil;
                                                                    })()}
                                                                    disabled
                                                                    className="w-full rounded-lg border-2 border-red-500 bg-gray-50 px-4 py-3 text-gray-700 disabled:cursor-not-allowed"
                                                                />
                                                            </div>

                                                            {/* 2. Souhait de porter un voile particulier */}
                                                            <div>
                                                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                                                    {t('profile.specificVeilWish')}
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    value={(() => {
                                                                        const specificVeilWish = user?.profile?.specific_veil_wish;
                                                                        if (!specificVeilWish) return '';
                                                                        const translations = {
                                                                            hijab: t('profile.veilHijab'),
                                                                            niqab: t('profile.veilNiqab'),
                                                                            neither: t('profile.veilNeither'),
                                                                        };
                                                                        return translations[specificVeilWish] || specificVeilWish;
                                                                    })()}
                                                                    disabled
                                                                    className="w-full rounded-lg border-2 border-red-500 bg-gray-50 px-4 py-3 text-gray-700 disabled:cursor-not-allowed"
                                                                />
                                                            </div>

                                                            {/* 3. Acceptation du niqab */}
                                                            <div>
                                                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                                                    {t('profile.niqabAcceptance')}
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    value={(() => {
                                                                        const niqabAcceptance = user?.profile?.niqab_acceptance;
                                                                        if (!niqabAcceptance) return '';
                                                                        const translations = {
                                                                            yes: t('profile.yes'),
                                                                            no: t('profile.no'),
                                                                            to_discuss: t('profile.toDiscuss'),
                                                                        };
                                                                        return translations[niqabAcceptance] || niqabAcceptance;
                                                                    })()}
                                                                    disabled
                                                                    className="w-full rounded-lg border-2 border-red-500 bg-gray-50 px-4 py-3 text-gray-700 disabled:cursor-not-allowed"
                                                                />
                                                            </div>

                                                            {/* 4. Polygamie */}
                                                            <div>
                                                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                                                    {t('profile.polygamy')}
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    value={(() => {
                                                                        const polygamy = user?.profile?.polygamy;
                                                                        if (!polygamy) return '';
                                                                        const translations = {
                                                                            accepted: t('profile.accepted'),
                                                                            not_accepted: t('profile.notAccepted'),
                                                                            to_discuss: t('profile.toDiscuss'),
                                                                        };
                                                                        return translations[polygamy] || polygamy;
                                                                    })()}
                                                                    disabled
                                                                    className="w-full rounded-lg border-2 border-red-500 bg-gray-50 px-4 py-3 text-gray-700 disabled:cursor-not-allowed"
                                                                />
                                                            </div>

                                                            {/* 5. Mariage avec une personne étrangère */}
                                                            <div>
                                                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                                                    {t('profile.foreignMarriage')}
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    value={(() => {
                                                                        const foreignMarriage = user?.profile?.foreign_marriage;
                                                                        if (!foreignMarriage) return '';
                                                                        const translations = {
                                                                            yes: t('profile.yes'),
                                                                            no: t('profile.no'),
                                                                            maybe_discuss: t('profile.maybeDiscuss'),
                                                                        };
                                                                        return translations[foreignMarriage] || foreignMarriage;
                                                                    })()}
                                                                    disabled
                                                                    className="w-full rounded-lg border-2 border-red-500 bg-gray-50 px-4 py-3 text-gray-700 disabled:cursor-not-allowed"
                                                                />
                                                            </div>

                                                            {/* 6. Travail après le mariage */}
                                                            <div>
                                                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                                                    {t('profile.workAfterMarriage')}
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    value={(() => {
                                                                        const workAfterMarriage = user?.profile?.work_after_marriage;
                                                                        if (!workAfterMarriage) return '';
                                                                        const translations = {
                                                                            yes: t('profile.yes'),
                                                                            no: t('profile.no'),
                                                                            maybe: t('profile.maybe'),
                                                                            depending_situation: t('profile.dependingOnSituation'),
                                                                        };
                                                                        return translations[workAfterMarriage] || workAfterMarriage;
                                                                    })()}
                                                                    disabled
                                                                    className="w-full rounded-lg border-2 border-red-500 bg-gray-50 px-4 py-3 text-gray-700 disabled:cursor-not-allowed"
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
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
                                                <div className="space-y-6">
                                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                    <div>
                                                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                                            {t('profile.userProfile.minimumAge')} / {t('profile.maximumAge')}
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={
                                                                    user?.profile?.age_minimum && user?.profile?.age_maximum
                                                                ? `${user.profile.age_minimum} - ${user.profile.age_maximum} ${t('profile.years')}`
                                                                : user?.profile?.age_minimum
                                                                  ? `${user.profile.age_minimum} ${t('profile.years')}`
                                                                          : ''
                                                                }
                                                                disabled
                                                                className="w-full rounded-lg border-2 border-red-500 bg-gray-50 px-4 py-3 text-gray-700 disabled:cursor-not-allowed"
                                                            />
                                                        </div>
                                                        <div className="md:col-span-2">
                                                            <label className="mb-2 block text-sm font-medium text-gray-700">
                                                            {t('profile.userProfile.matrimonialSituation')}
                                                            </label>
                                                            <div className="grid grid-cols-2 gap-3 rounded-lg border-2 border-red-500 bg-gray-50 p-4">
                                                                {[
                                                                    { value: 'celibataire', label: t('profile.matrimonialSituationSingle') },
                                                                    { value: 'marie', label: t('profile.matrimonialSituationMarried') },
                                                                    { value: 'divorce', label: t('profile.matrimonialSituationDivorced') },
                                                                    { value: 'veuf', label: t('profile.matrimonialSituationWidowed') },
                                                                ].map((option) => {
                                                                    const selectedValues = Array.isArray(user?.profile?.situation_matrimoniale_recherche)
                                                                        ? user.profile.situation_matrimoniale_recherche
                                                                        : user?.profile?.situation_matrimoniale_recherche
                                                                          ? [user.profile.situation_matrimoniale_recherche]
                                                                          : [];
                                                                    const isChecked = selectedValues.includes(option.value);
                                                                    return (
                                                                        <label key={option.value} className="flex items-center gap-2 cursor-default">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={isChecked}
                                                                                disabled
                                                                                className="h-4 w-4 rounded border-gray-300 checked:bg-green-600 checked:border-green-600 focus:ring-green-500 disabled:cursor-not-allowed disabled:opacity-100"
                                                                                style={{ accentColor: '#16a34a' }}
                                                                            />
                                                                            <span className="text-sm text-gray-700">{option.label}</span>
                                                                        </label>
                                                                    );
                                                                })}
                                                        </div>
                                                        </div>
                                                        <div className="md:col-span-2">
                                                            <label className="mb-2 block text-sm font-medium text-gray-700">
                                                                {t('profile.soughtCountry')}
                                                            </label>
                                                            {(() => {
                                                                const selectedCountries = Array.isArray(user?.profile?.pays_recherche)
                                                                    ? user.profile.pays_recherche
                                                                    : user?.profile?.pays_recherche
                                                                      ? [user.profile.pays_recherche]
                                                                      : [];
                                                                
                                                                if (selectedCountries.length === 0) {
                                                                    return (
                                                                        <div className="rounded-lg border-2 border-red-500 bg-gray-50 px-4 py-3">
                                                                            <span className="text-sm text-gray-700">—</span>
                                                    </div>
                                                                    );
                                                                }
                                                                
                                                                // Get country names for selected country codes
                                                                const selectedCountryNames = selectedCountries.map((code) => {
                                                                    const country = countries.find((c) => c.iso2 === code);
                                                                    return country ? country.frenchName : code;
                                                                });
                                                                
                                                                return (
                                                                    <div className="grid grid-cols-2 gap-3 rounded-lg border-2 border-red-500 bg-gray-50 p-4">
                                                                        {selectedCountryNames.map((countryName, index) => {
                                                                            const countryCode = selectedCountries[index];
                                                                            return (
                                                                                <label key={countryCode || index} className="flex items-center gap-2 cursor-default">
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        checked={true}
                                                                                        disabled
                                                                                        className="h-4 w-4 rounded border-gray-300 checked:bg-green-600 checked:border-green-600 focus:ring-green-500 disabled:cursor-not-allowed disabled:opacity-100"
                                                                                        style={{ accentColor: '#16a34a' }}
                                                                                    />
                                                                                    <span className="text-sm text-gray-700">{countryName}</span>
                                                                                </label>
                                                                            );
                                                                        })}
                                                        </div>
                                                                );
                                                            })()}
                                                    </div>
                                                        <div className="md:col-span-2">
                                                            <label className="mb-2 block text-sm font-medium text-gray-700">
                                                                {t('profile.userProfile.residenceLocation')}
                                                            </label>
                                                            <div className="grid grid-cols-2 gap-3 rounded-lg border-2 border-red-500 bg-gray-50 p-4 max-h-60 overflow-y-auto">
                                                                {(() => {
                                                                    const villes = user?.profile?.villes_recherche && user?.profile?.villes_recherche.length > 0
                                                                ? (() => {
                                                                              const villesData =
                                                                          typeof user?.profile?.villes_recherche === 'string'
                                                                              ? JSON.parse(user?.profile?.villes_recherche)
                                                                              : user?.profile?.villes_recherche;
                                                                              return Array.isArray(villesData) && villesData.length > 0 ? villesData : [];
                                                                          })()
                                                                        : [];
                                                                    
                                                                    // Get cities from selected countries
                                                                    const selectedCountries = Array.isArray(user?.profile?.pays_recherche)
                                                                        ? user.profile.pays_recherche
                                                                        : user?.profile?.pays_recherche
                                                                          ? [user.profile.pays_recherche]
                                                                          : [];
                                                                    
                                                                    const allCities = [];
                                                                    selectedCountries.forEach((code) => {
                                                                        const countryCities = countryCodeToCities[code] || [];
                                                                        allCities.push(...countryCities);
                                                                    });
                                                                    const uniqueCities = [...new Set(allCities)].sort();
                                                                    
                                                                    // Show selected cities and available cities
                                                                    const citiesToShow = uniqueCities.length > 0 ? uniqueCities : villes;
                                                                    
                                                                    return citiesToShow.length > 0 ? citiesToShow.map((city) => {
                                                                        const isChecked = villes.includes(city);
                                                                        return (
                                                                            <label key={city} className="flex items-center gap-2 cursor-default">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={isChecked}
                                                                                    disabled
                                                                                    className="h-4 w-4 rounded border-gray-300 checked:bg-green-600 checked:border-green-600 focus:ring-green-500 disabled:cursor-not-allowed disabled:opacity-100"
                                                                                    style={{ accentColor: '#16a34a' }}
                                                                                />
                                                                                <span className="text-sm text-gray-700">{city}</span>
                                                                            </label>
                                                                        );
                                                                    }) : (
                                                                        <div className="col-span-2 text-sm text-gray-500">Aucune ville sélectionnée</div>
                                                                    );
                                                                })()}
                                                        </div>
                                                    </div>
                                                    <div>
                                                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                                                {t('profile.userProfile.educationLevel')}
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={user?.profile?.niveau_etudes_recherche || ''}
                                                                disabled
                                                                className="w-full rounded-lg border-2 border-red-500 bg-gray-50 px-4 py-3 text-gray-700 disabled:cursor-not-allowed"
                                                            />
                                                    </div>
                                                    <div>
                                                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                                                {t('profile.userProfile.employmentStatus')}
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={user?.profile?.statut_emploi_recherche || ''}
                                                                disabled
                                                                className="w-full rounded-lg border-2 border-red-500 bg-gray-50 px-4 py-3 text-gray-700 disabled:cursor-not-allowed"
                                                            />
                                                    </div>
                                                    <div>
                                                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                                                {t('profile.minimumIncome')}
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={user?.profile?.revenu_minimum || ''}
                                                                disabled
                                                                className="w-full rounded-lg border-2 border-red-500 bg-gray-50 px-4 py-3 text-gray-700 disabled:cursor-not-allowed"
                                                            />
                                                    </div>
                                                    <div>
                                                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                                                {t('profile.soughtReligion')}
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={user?.profile?.religion_recherche || ''}
                                                                disabled
                                                                className="w-full rounded-lg border-2 border-red-500 bg-gray-50 px-4 py-3 text-gray-700 disabled:cursor-not-allowed"
                                                            />
                                                    </div>
                                                </div>
                                                {profile?.profil_recherche_description && (
                                                        <div>
                                                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                                                {t('profile.userProfile.description')}
                                                            </label>
                                                            <textarea
                                                                value={profile.profil_recherche_description}
                                                                disabled
                                                                rows={6}
                                                                className="w-full rounded-lg border-2 border-red-500 bg-gray-50 px-4 py-3 text-gray-700 disabled:cursor-not-allowed"
                                                            />
                                                    </div>
                                                )}
                                                </div>
                                            </CardContent>
                                        </Card>

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
                                                    <div className="mb-2 text-sm text-gray-600">
                                                        {t('profile.userProfile.assignedMatchmakerNotes')}
                                                    </div>
                                                    <div className="space-y-3">
                                                        {Array.isArray(matchmakerNotes) && matchmakerNotes.length > 0 ? (
                                                            matchmakerNotes.map((n) => {
                                                                const isAuthor = n.author_id === auth?.user?.id;
                                                                return (
                                                                    <div key={n.id} className="rounded-md border border-gray-200 bg-gray-50 p-3">
                                                                        <div className="mb-1 flex items-center justify-between">
                                                                            <div className="text-xs text-gray-500">
                                                                                {n.author?.name} · {new Date(n.created_at).toLocaleString()}
                                                                                {n.contact_type && (
                                                                                    <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                                                                                        {n.contact_type === 'distance' ? 'À distance' : 'Présentiel'}
                                                                                    </span>
                                                                                )}
                                                                                {n.created_during_validation && (
                                                                                    <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                                                                                        Prise lors de la validation
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-sm text-gray-900">{n.content}</div>
                                                                        <div className="mt-2 space-y-1">
                                                                            {n.contact_type && (
                                                                                <div className="text-xs text-gray-600">
                                                                                    <span className="font-medium">Type de contact:</span>{' '}
                                                                                    {n.contact_type === 'distance' ? 'À distance' : 'Présentiel'}
                                                                                </div>
                                                                            )}
                                                                            {n.created_during_validation && (
                                                                                <div className="text-xs text-gray-600">
                                                                                    <span className="font-medium">Contexte:</span> Cette note a été
                                                                                    prise lors de la validation du prospect
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })
                                                        ) : (
                                                            <div className="text-sm text-gray-500">{t('profile.userProfile.noNotes')}</div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Add note - For assigned matchmaker or manager who validated the prospect */}
                                                {canWrite && (
                                                    <div className="mb-6">
                                                        <button
                                                            type="button"
                                                            onClick={() => setIsNoteModalOpen(true)}
                                                            className="inline-flex items-center rounded-md bg-[#096725] px-4 py-2 text-white hover:bg-[#07501d]"
                                                        >
                                                            {t('profile.userProfile.addNoteButton')}
                                                        </button>

                                                        <Dialog open={isNoteModalOpen} onOpenChange={setIsNoteModalOpen}>
                                                            <DialogContent>
                                                                <DialogHeader>
                                                                    <DialogTitle>{t('profile.userProfile.addNote')}</DialogTitle>
                                                                    <DialogDescription>
                                                                        {t('profile.userProfile.addNoteDescription', {
                                                                            defaultValue: 'Ajoutez une note pour ce prospect',
                                                                        })}
                                                                    </DialogDescription>
                                                                </DialogHeader>
                                                                <form onSubmit={addNote} className="space-y-4">
                                                                    <div>
                                                                        <label className="mb-2 block text-sm font-medium text-gray-700">
                                                                            {t('profile.userProfile.noteContent', {
                                                                                defaultValue: 'Contenu de la note',
                                                                            })}
                                                                        </label>
                                                                        <textarea
                                                                            className="w-full rounded-md border border-gray-300 p-3 focus:border-[#096725] focus:ring-1 focus:ring-[#096725] focus:outline-none"
                                                                            rows={4}
                                                                            value={newNote}
                                                                            onChange={(e) => setNewNote(e.target.value)}
                                                                            placeholder={t('profile.userProfile.enterNote')}
                                                                            required
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="mb-2 block text-sm font-medium text-gray-700">
                                                                            {t('profile.userProfile.contactType', {
                                                                                defaultValue: 'Type de contact',
                                                                            })}
                                                                        </label>
                                                                        <Select value={contactType} onValueChange={setContactType}>
                                                                            <SelectTrigger className="w-full">
                                                                                <SelectValue
                                                                                    placeholder={t('profile.userProfile.selectContactType', {
                                                                                        defaultValue: 'Sélectionnez le type de contact',
                                                                                    })}
                                                                                />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                <SelectItem value="distance">À distance</SelectItem>
                                                                                <SelectItem value="presentiel">Présentiel</SelectItem>
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </div>
                                                                    <DialogFooter>
                                                                        <Button
                                                                            type="button"
                                                                            variant="outline"
                                                                            onClick={() => {
                                                                                setIsNoteModalOpen(false);
                                                                                setNewNote('');
                                                                                setContactType('');
                                                                            }}
                                                                        >
                                                                            {t('common.cancel', { defaultValue: 'Annuler' })}
                                                                        </Button>
                                                                        <Button
                                                                            type="submit"
                                                                            className="bg-[#096725] hover:bg-[#07501d]"
                                                                            disabled={!newNote.trim()}
                                                                        >
                                                                            {t('profile.userProfile.addNoteButton')}
                                                                        </Button>
                                                                    </DialogFooter>
                                                                </form>
                                                            </DialogContent>
                                                        </Dialog>
                                                    </div>
                                                )}

                                                {/* Evaluation - Editable for assigned matchmaker or manager who validated the prospect */}
                                                <form onSubmit={canWrite ? saveEvaluation : (e) => e.preventDefault()} className="space-y-4">
                                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                        <div>
                                                            <div className="mb-2 text-sm text-gray-600">{t('profile.userProfile.status')}</div>
                                                            <div className="flex gap-4 text-sm">
                                                                {['prospect', 'member', 'client'].map((val) => (
                                                                    <label
                                                                        key={val}
                                                                        className={`inline-flex items-center gap-2 ${!canWrite ? 'cursor-not-allowed opacity-60' : ''}`}
                                                                    >
                                                                        <input
                                                                            type="radio"
                                                                            name="status"
                                                                            value={val}
                                                                            checked={evaluation?.status === val}
                                                                            onChange={(e) =>
                                                                                canWrite && setEvaluation({ ...evaluation, status: e.target.value })
                                                                            }
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
                                                    ].map(([key, label]) => (
                                                        <div key={key}>
                                                            <label className="mb-1 block text-sm text-gray-600">{label}</label>
                                                            <textarea
                                                                rows={2}
                                                                disabled={!canWrite}
                                                                className={`w-full rounded-md border border-gray-300 p-3 focus:border-[#096725] focus:ring-1 focus:ring-[#096725] focus:outline-none ${!canWrite ? 'cursor-not-allowed bg-gray-50 opacity-60' : ''}`}
                                                                value={evaluation[key] || ''}
                                                                onChange={(e) => canWrite && setEvaluation({ ...evaluation, [key]: e.target.value })}
                                                            />
                                                        </div>
                                                    ))}

                                                    <div>
                                                        <div className="mb-2 text-sm text-gray-600">
                                                            {t('profile.userProfile.matchmakerRecommendation')}
                                                        </div>
                                                        <div className="flex gap-6 text-sm">
                                                            {[
                                                                ['ready', t('profile.userProfile.ready')],
                                                                ['accompany', t('profile.userProfile.accompany')],
                                                                ['not_ready', t('profile.userProfile.notReady')],
                                                            ].map(([val, label]) => (
                                                                <label
                                                                    key={val}
                                                                    className={`inline-flex items-center gap-2 ${!canWrite ? 'cursor-not-allowed opacity-60' : ''}`}
                                                                >
                                                                    <input
                                                                        type="radio"
                                                                        name="recommendation"
                                                                        value={val}
                                                                        checked={evaluation.recommendation === val}
                                                                        onChange={(e) =>
                                                                            canWrite &&
                                                                            setEvaluation({ ...evaluation, recommendation: e.target.value })
                                                                        }
                                                                        disabled={!canWrite}
                                                                        className="text-[#096725] focus:ring-[#096725] disabled:cursor-not-allowed"
                                                                    />
                                                                    <span>{label}</span>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="mb-1 block text-sm text-gray-600">
                                                            {t('profile.userProfile.additionalRemarks')}
                                                        </label>
                                                        <textarea
                                                            rows={2}
                                                            disabled={!canWrite}
                                                            className={`w-full rounded-md border border-gray-300 p-3 focus:border-[#096725] focus:ring-1 focus:ring-[#096725] focus:outline-none ${!canWrite ? 'cursor-not-allowed bg-gray-50 opacity-60' : ''}`}
                                                            value={evaluation.remarks}
                                                            onChange={(e) => canWrite && setEvaluation({ ...evaluation, remarks: e.target.value })}
                                                        />
                                                    </div>
                                                            {/* this must be moved to rdv feedback later  */}
                                                    {/* <div>
                                                        <div className="mb-2 text-sm font-medium text-gray-900">
                                                            {t('profile.userProfile.feedbackAfterAppointment')}
                                                        </div>
                                                        <div className="space-y-3">
                                                            <div>
                                                                <label className="mb-1 block text-sm text-gray-600">
                                                                    {t('profile.userProfile.behaviorDuringAppointment')}
                                                                </label>
                                                                <textarea
                                                                    rows={2}
                                                                    disabled={!canWrite}
                                                                    className={`w-full rounded-md border border-gray-300 p-3 focus:border-[#096725] focus:ring-1 focus:ring-[#096725] focus:outline-none ${!canWrite ? 'cursor-not-allowed bg-gray-50 opacity-60' : ''}`}
                                                                    value={evaluation.feedback_behavior}
                                                                    onChange={(e) =>
                                                                        canWrite &&
                                                                        setEvaluation({ ...evaluation, feedback_behavior: e.target.value })
                                                                    }
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="mb-1 block text-sm text-gray-600">
                                                                    {t('profile.userProfile.partnerImpression')}
                                                                </label>
                                                                <textarea
                                                                    rows={2}
                                                                    disabled={!canWrite}
                                                                    className={`w-full rounded-md border border-gray-300 p-3 focus:border-[#096725] focus:ring-1 focus:ring-[#096725] focus:outline-none ${!canWrite ? 'cursor-not-allowed bg-gray-50 opacity-60' : ''}`}
                                                                    value={evaluation.feedback_partner_impression}
                                                                    onChange={(e) =>
                                                                        canWrite &&
                                                                        setEvaluation({ ...evaluation, feedback_partner_impression: e.target.value })
                                                                    }
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="mb-1 block text-sm text-gray-600">
                                                                    {t('profile.userProfile.positiveNegativePoints')}
                                                                </label>
                                                                <textarea
                                                                    rows={2}
                                                                    disabled={!canWrite}
                                                                    className={`w-full rounded-md border border-gray-300 p-3 focus:border-[#096725] focus:ring-1 focus:ring-[#096725] focus:outline-none ${!canWrite ? 'cursor-not-allowed bg-gray-50 opacity-60' : ''}`}
                                                                    value={evaluation.feedback_pos_neg}
                                                                    onChange={(e) =>
                                                                        canWrite && setEvaluation({ ...evaluation, feedback_pos_neg: e.target.value })
                                                                    }
                                                                />
                                                            </div>
                                                        </div>
                                                    </div> */}

                                                    {canWrite && (
                                                        <div>
                                                            <button
                                                                type="submit"
                                                                className="inline-flex items-center rounded-md bg-[#096725] px-4 py-2 text-white hover:bg-[#07501d]"
                                                            >
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
                                                            <div
                                                                key={photo.id}
                                                                className="group relative aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-100"
                                                            >
                                                                <img
                                                                    src={photo.url}
                                                                    alt={photo.file_name || 'User photo'}
                                                                    className="h-full w-full object-cover"
                                                                    onError={(e) => {
                                                                        e.target.onerror = null;
                                                                        e.target.src =
                                                                            'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23e5e7eb" width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle" fill="%239ca3af" font-family="Arial" font-size="14"%3EImage non disponible%3C/text%3E%3C/svg%3E';
                                                                    }}
                                                                />
                                                                {/* Delete button - Only show if user can delete this specific photo */}
                                                                {photo.can_delete && (
                                                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <DropdownMenu>
                                                                            <DropdownMenuTrigger asChild>
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="sm"
                                                                                    className="h-8 w-8 p-0 bg-black/50 hover:bg-black/70 text-white"
                                                                                >
                                                                                    <MoreVertical className="h-4 w-4" />
                                                                                </Button>
                                                                            </DropdownMenuTrigger>
                                                                            <DropdownMenuContent align="end">
                                                                                <DropdownMenuItem
                                                                                    onClick={() => handleDeletePhoto(photo.id)}
                                                                                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                                                                >
                                                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                                                    Supprimer
                                                                                </DropdownMenuItem>
                                                                            </DropdownMenuContent>
                                                                        </DropdownMenu>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="py-12 text-center text-gray-500">
                                                        <Camera className="mx-auto mb-4 h-12 w-12 text-gray-400" />
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

            {/* Delete Photo Confirmation Dialog */}
            <Dialog open={!!photoToDelete} onOpenChange={(open) => { if (!open) setPhotoToDelete(null); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Supprimer la photo</DialogTitle>
                        <DialogDescription>
                            Êtes-vous sûr de vouloir supprimer cette photo ? Cette action est irréversible.
                            {photoToDelete && (
                                <span className="block mt-2 text-sm font-medium">{photoToDelete.file_name}</span>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setPhotoToDelete(null)}
                        >
                            Annuler
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmDeletePhoto}
                        >
                            Supprimer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Transfer Dialog */}
            <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Transférer le membre</DialogTitle>
                        <DialogDescription>
                            Sélectionnez le matchmaker vers lequel transférer {user?.name}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        {loadingMatchmakers ? (
                            <p className="text-sm text-gray-500">Chargement des matchmakers...</p>
                        ) : (
                            <>
                                <div className="space-y-2">
                                    <Label>Matchmaker</Label>
                                    <Select
                                        value={selectedMatchmakerId}
                                        onValueChange={setSelectedMatchmakerId}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Sélectionnez un matchmaker" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {matchmakers.map((matchmaker) => (
                                                <SelectItem key={matchmaker.id} value={String(matchmaker.id)}>
                                                    {matchmaker.name} {matchmaker.email ? `(${matchmaker.email})` : ''}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Raison (optionnel)</Label>
                                    <textarea
                                        className="w-full min-h-[100px] rounded-md border border-gray-300 px-3 py-2"
                                        value={transferReason}
                                        onChange={(e) => setTransferReason(e.target.value)}
                                        placeholder="Raison du transfert..."
                                    />
                                </div>
                            </>
                        )}
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setTransferDialogOpen(false)}
                            disabled={transferring}
                        >
                            Annuler
                        </Button>
                        <Button
                            onClick={handleTransferSubmit}
                            disabled={!selectedMatchmakerId || transferring || loadingMatchmakers}
                        >
                            {transferring ? 'Envoi...' : 'Envoyer la demande'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Activate Account Dialog */}
            <Dialog open={activateDialogOpen} onOpenChange={setActivateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Activer le compte</DialogTitle>
                        <DialogDescription>
                            Vous êtes sur le point d'activer le compte de {user?.name}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Raison (optionnel)</Label>
                            <textarea
                                className="w-full min-h-[100px] rounded-md border border-gray-300 px-3 py-2"
                                value={statusReason}
                                onChange={(e) => setStatusReason(e.target.value)}
                                placeholder="Raison de l'activation..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setActivateDialogOpen(false)}
                        >
                            Annuler
                        </Button>
                        <Button
                            onClick={handleActivateAccount}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Activer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Deactivate Account Dialog */}
            <Dialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Désactiver le compte</DialogTitle>
                        <DialogDescription>
                            Vous êtes sur le point de désactiver le compte de {user?.name}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Raison (optionnel)</Label>
                            <textarea
                                className="w-full min-h-[100px] rounded-md border border-gray-300 px-3 py-2"
                                value={statusReason}
                                onChange={(e) => setStatusReason(e.target.value)}
                                placeholder="Raison de la désactivation..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDeactivateDialogOpen(false)}
                        >
                            Annuler
                        </Button>
                        <Button
                            onClick={handleDeactivateAccount}
                            variant="destructive"
                        >
                            <X className="w-4 h-4 mr-2" />
                            Désactiver
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
