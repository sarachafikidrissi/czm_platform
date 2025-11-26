import CreatePost from '@/components/posts/CreatePost';
import PostCard from '@/components/posts/PostCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import { Head, router, usePage } from '@inertiajs/react';
import { BookOpen, Heart, MapPin, MessageSquareWarning, Share2, Trash2, User } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function UserProfile({ user, profile, agency, matchmakerNotes = [], matchmakerEvaluation = null }) {
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

    // Visibility: who can manage notes/evaluation
    const viewerRole = auth?.user?.roles?.[0]?.name || 'user';
    const canManage =
        viewerRole === 'admin' ||
        (viewerRole === 'matchmaker' && user?.assigned_matchmaker_id === auth?.user?.id) ||
        (viewerRole === 'manager' && user?.validated_by_manager_id === auth?.user?.id);

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
    const getSkillsTags = () => {
        const skills = [];
        if (user?.profile?.sport && user.profile.sport !== 'non') skills.push('Sports');
        if (user?.profile?.motorise === 'oui') skills.push('Motorized');
        if (user?.profile?.loisirs) {
            const hobbies = user.profile.loisirs.split(',').slice(0, 3);
            skills.push(...hobbies.map((h) => h.trim()));
        }
        // Default skills if none available
        if (skills.length === 0) {
            return ['Communication', 'Interpersonal Skills', 'Team work'];
        }
        return skills.slice(0, 5);
    };

    const skillsTags = getSkillsTags();

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

    // Active tab state
    const [activeTab, setActiveTab] = useState('personal');

    return (
        <AppLayout>
            <Head title={`${user?.name} - ${t('common.profile')}`} />
            <div className="min-h-screen bg-gray-50">
                

                <div className="mx-auto max-w-7xl px-4 py-6">
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                        {/* Left Sidebar - Profile Card */}
                        <div className="lg:col-span-3">
                            <Card className="sticky top-6">
                                <CardContent className="p-6">
                                    {/* Profile Picture */}
                                    <div className="mb-4 flex justify-center">
                                        <div className="h-32 w-32 overflow-hidden rounded-full border-4 border-white shadow-lg">
                                            {profilePictureSrc ? (
                                                <img src={profilePictureSrc} alt={user?.name} className="h-full w-full object-cover" />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center bg-gray-200">
                                                    <span className="text-4xl font-bold text-gray-600">{user?.name?.charAt(0)}</span>
                                                </div>
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
                                    </div>

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
                                        {userRole === 'matchmaker' && !isOwnProfile && (
                                            <Button className="flex-1 gap-2 bg-[#096725] text-white hover:bg-[#07501d]">
                                                <BookOpen className="h-4 w-4" />
                                                Book {user?.name?.split(' ')[0]}
                                            </Button>
                                        )}
                                        {userRole === 'user' && !isOwnProfile && assignedMatchmakerId !== user?.id && (
                                            <Button
                                                className="flex-1 gap-2 bg-[#096725] text-white hover:bg-[#07501d]"
                                                onClick={() => {
                                                    if (userRole === 'matchmaker') {
                                                        router.post(`/user/matchmakers/${user.id}/select`);
                                                    }
                                                }}
                                            >
                                                <BookOpen className="h-4 w-4" />
                                                Select Matchmaker
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Main Content Area */}
                        <div className="space-y-6 lg:col-span-9">
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                <TabsList className="grid h-auto w-full grid-cols-3 rounded-none border-b bg-white p-0">
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
                                </TabsList>

                                {/* Tab 1: Informations personnelles */}
                                <TabsContent value="personal" className="mt-6 space-y-6">
                                    {/* About Me Description */}
                                    {profile?.apropos_description && (
                                        <Card className="border-gray-200 bg-white">
                                            <CardContent className="p-6">
                                                <h3 className="mb-3 text-lg font-semibold text-gray-900">
                                                    {userRole === 'matchmaker' ? 'Why I Became A Mentor' : 'À propos de moi'}
                                                </h3>
                                                <p className="leading-relaxed text-gray-700">{profile.apropos_description}</p>
                                            </CardContent>
                                        </Card>
                                    )}

                                    {/* Basic Information */}
                                    {userRole === 'user' && (
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
                                    )}

                                    {/* Matchmaker Bio */}
                                    {userRole === 'matchmaker' && user?.matchmaker_bio && (
                                        <Card className="border-gray-200 bg-white">
                                            <CardContent className="p-6">
                                                <h3 className="mb-3 text-lg font-semibold text-gray-900">Matchmaker Bio</h3>
                                                <p className="leading-relaxed text-gray-700">{user.matchmaker_bio}</p>
                                            </CardContent>
                                        </Card>
                                    )}
                                </TabsContent>

                                {/* Tab 2: Mode de vie */}
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

                                {/* Tab 3: Profil recherché */}
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

                                {/* Additional Content Tab - Notes, Evaluation, Posts */}
                                <TabsContent value="more" className="mt-6 space-y-6" style={{ display: 'none' }}>
                                    {/* Basic Information - Detailed */}
                                    {userRole === 'user' && (
                                        <>
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
                                                            <div className="mb-1 text-sm text-gray-600">
                                                                {t('profile.userProfile.educationLevel')}
                                                            </div>
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
                                                            <div className="mb-1 text-sm text-gray-600">
                                                                {t('profile.userProfile.activitySector')}
                                                            </div>
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

                                            {/* Lifestyle Information */}
                                            <Card className="border-gray-200 bg-white">
                                                <CardContent className="p-6">
                                                    <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                                                        <Heart className="h-5 w-5 text-[#ff343a]" />
                                                        Lifestyle & Health
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

                                                                    const situations = Array.isArray(situationSante)
                                                                        ? situationSante
                                                                        : [situationSante];
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
                                                            <div className="mb-1 text-sm text-gray-600">
                                                                {t('profile.userProfile.matrimonialSituation')}
                                                            </div>
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
                                                            <div className="mb-1 text-sm text-gray-600">
                                                                {t('profile.userProfile.residenceLocation')}
                                                            </div>
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
                                                            <div className="mb-1 text-sm text-gray-600">
                                                                {t('profile.userProfile.educationLevel')}
                                                            </div>
                                                            <div className="font-medium text-gray-900">
                                                                {user?.profile?.niveau_etudes_recherche || '—'}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="mb-1 text-sm text-gray-600">
                                                                {t('profile.userProfile.employmentStatus')}
                                                            </div>
                                                            <div className="font-medium text-gray-900">
                                                                {user?.profile?.statut_emploi_recherche || '—'}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="mb-1 text-sm text-gray-600">{t('profile.minimumIncome')}</div>
                                                            <div className="font-medium text-gray-900">{user?.profile?.revenu_minimum || '—'}</div>
                                                        </div>
                                                        <div>
                                                            <div className="mb-1 text-sm text-gray-600">{t('profile.soughtReligion')}</div>
                                                            <div className="font-medium text-gray-900">
                                                                {user?.profile?.religion_recherche || '—'}
                                                            </div>
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
                                        </>
                                    )}

                                    {/* Notes & Evaluation for Matchmakers */}
                                    {canManage && (
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
                                                                            </div>
                                                                            {isAuthor && (
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

                                                {/* Add note */}
                                                <form onSubmit={addNote} className="mb-6 space-y-2">
                                                    <label className="text-sm text-gray-600">{t('profile.userProfile.addNote')}</label>
                                                    <textarea
                                                        className="w-full rounded-md border border-gray-300 p-3 focus:border-[#ff343a] focus:ring-1 focus:ring-[#ff343a] focus:outline-none"
                                                        rows={3}
                                                        value={newNote}
                                                        onChange={(e) => setNewNote(e.target.value)}
                                                        placeholder={t('profile.userProfile.enterNote')}
                                                    />
                                                    <div>
                                                        <button
                                                            type="submit"
                                                            className="inline-flex items-center rounded-md bg-[#096725] px-4 py-2 text-white hover:bg-[#07501d]"
                                                        >
                                                            {t('profile.userProfile.addNoteButton')}
                                                        </button>
                                                    </div>
                                                </form>

                                                {/* Evaluation */}
                                                <form onSubmit={saveEvaluation} className="space-y-4">
                                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                        <div>
                                                            <div className="mb-2 text-sm text-gray-600">{t('profile.userProfile.status')}</div>
                                                            <div className="flex gap-4 text-sm">
                                                                {['prospect', 'member', 'client'].map((val) => (
                                                                    <label key={val} className="inline-flex items-center gap-2">
                                                                        <input
                                                                            type="radio"
                                                                            name="status"
                                                                            value={val}
                                                                            checked={evaluation?.status === val}
                                                                            onChange={(e) => setEvaluation({ ...evaluation, status: e.target.value })}
                                                                            className="text-[#096725] focus:ring-[#096725]"
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
                                                                className="w-full rounded-md border border-gray-300 p-3 focus:border-[#096725] focus:ring-1 focus:ring-[#096725] focus:outline-none"
                                                                value={evaluation[key] || ''}
                                                                onChange={(e) => setEvaluation({ ...evaluation, [key]: e.target.value })}
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
                                                                <label key={val} className="inline-flex items-center gap-2">
                                                                    <input
                                                                        type="radio"
                                                                        name="recommendation"
                                                                        value={val}
                                                                        checked={evaluation.recommendation === val}
                                                                        onChange={(e) =>
                                                                            setEvaluation({ ...evaluation, recommendation: e.target.value })
                                                                        }
                                                                        className="text-[#096725] focus:ring-[#096725]"
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
                                                            className="w-full rounded-md border border-gray-300 p-3 focus:border-[#096725] focus:ring-1 focus:ring-[#096725] focus:outline-none"
                                                            value={evaluation.remarks}
                                                            onChange={(e) => setEvaluation({ ...evaluation, remarks: e.target.value })}
                                                        />
                                                    </div>

                                                    <div>
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
                                                                    className="w-full rounded-md border border-gray-300 p-3 focus:border-[#096725] focus:ring-1 focus:ring-[#096725] focus:outline-none"
                                                                    value={evaluation.feedback_behavior}
                                                                    onChange={(e) =>
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
                                                                    className="w-full rounded-md border border-gray-300 p-3 focus:border-[#096725] focus:ring-1 focus:ring-[#096725] focus:outline-none"
                                                                    value={evaluation.feedback_partner_impression}
                                                                    onChange={(e) =>
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
                                                                    className="w-full rounded-md border border-gray-300 p-3 focus:border-[#096725] focus:ring-1 focus:ring-[#096725] focus:outline-none"
                                                                    value={evaluation.feedback_pos_neg}
                                                                    onChange={(e) =>
                                                                        setEvaluation({ ...evaluation, feedback_pos_neg: e.target.value })
                                                                    }
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <button
                                                            type="submit"
                                                            className="inline-flex items-center rounded-md bg-[#096725] px-4 py-2 text-white hover:bg-[#07501d]"
                                                        >
                                                            {t('profile.userProfile.saveEvaluation')}
                                                        </button>
                                                    </div>
                                                </form>
                                            </CardContent>
                                        </Card>
                                    )}

                                    {/* Posts Section for Matchmakers */}
                                    {userRole === 'matchmaker' && (
                                        <Card className="border-gray-200 bg-white">
                                            <CardContent className="p-6">
                                                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                                                    <MessageSquareWarning className="h-5 w-5 text-[#096725]" />
                                                    {t('profile.userProfile.posts')}
                                                </h3>
                                                {isOwnProfile && userRole === 'matchmaker' && (
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
                                    )}
                                </TabsContent>
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
