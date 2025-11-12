import ProfileHeader from '@/components/profile/ProfileHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { Button as HeadlessButton } from '@headlessui/react';
import { Head, usePage, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Heart, MapPin, MessageCircleWarning, MessageSquareWarning, User, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { FaUser } from 'react-icons/fa';
import CreatePost from '@/components/posts/CreatePost';
import PostCard from '@/components/posts/PostCard';

export default function UserProfile({ user, profile, agency, matchmakerNotes = [], matchmakerEvaluation = null }) {
    const { t } = useTranslation();
    const { auth } = usePage().props;
    const isOwnProfile = auth?.user?.id === user?.id;
    console.log(auth.user);
    
    const assignedMatchmakerId = auth.user['assigned_matchmaker']?.id;
    console.log(user['id']);
    

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
    const canManage = viewerRole === 'admin'
        || (viewerRole === 'matchmaker' && user?.assigned_matchmaker_id === auth?.user?.id)
        || (viewerRole === 'manager' && user?.validated_by_manager_id === auth?.user?.id);

    // Notes form
    const [newNote, setNewNote] = useState('');
    const addNote = (e) => {
        e.preventDefault();
        if (!newNote.trim()) return;
        router.post(`/users/${user.id}/notes`, { content: newNote }, {
            onSuccess: () => setNewNote('')
        });
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

    return (
        <AppLayout>
            <Head title={`${user?.name} - ${t('common.profile')}`} />
            <div className="min-h-screen bg-background">
                {/* Profile Header */}

                <ProfileHeader user={user} profile={profile} isOwnProfile={isOwnProfile} age={age} />

                <div className="mx-auto max-w-6xl px-4 py-6">
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        {/* Main Content */}
                        <div className="space-y-6 lg:col-span-2">
                            {/* Role-based Content */}
                            {userRole === 'user' && (
                                <div className="space-y-6">
                                    {/* Infos de base */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <User className="h-5 w-5" color="green" />
                                                {t('profile.userProfile.basicInfo')}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                            <div>
                                                <div className="text-sm text-muted-foreground">{t('profile.userProfile.matrimonialSituation')}</div>
                                                <div className="font-medium">{user?.profile?.etat_matrimonial || '—'}</div>
                                            </div>
                                            <div>
                                                <div className="text-sm text-muted-foreground">{t('profile.userProfile.haveChildren')}</div>
                                                <div className="font-medium">{user?.profile?.has_children == 1 ? t('profile.yes') : t('profile.no') || '—'}</div>
                                            </div>
                                            <div>
                                                <div className="text-sm text-muted-foreground">{t('profile.userProfile.educationLevel')}</div>
                                                <div className="font-medium">{user?.profile?.niveau_etudes || '—'}</div>
                                            </div>
                                            <div>
                                                <div className="text-sm text-muted-foreground">{t('profile.userProfile.professionalSituation')}</div>
                                                <div className="font-medium">{user?.profile?.situation_professionnelle || '—'}</div>
                                            </div>
                                            <div>
                                                <div className="text-sm text-muted-foreground">{t('profile.userProfile.activitySector')}</div>
                                                <div className="font-medium">{user?.profile?.secteur || '—'}</div>
                                            </div>
                                            <div>
                                                <div className="text-sm text-muted-foreground">{t('profile.userProfile.monthlyIncome')}</div>
                                                <div className="font-medium">{user?.profile?.revenu || '—'}</div>
                                            </div>
                                            <div>
                                                <div className="text-sm text-muted-foreground">{t('profile.userProfile.weight')}</div>
                                                <div className="font-medium">{user?.profile?.poids || '—'} kg</div>
                                            </div>
                                            <div>
                                                <div className="text-sm text-muted-foreground">{t('profile.userProfile.height')}</div>
                                                <div className="font-medium">{user?.profile?.taille || '—'} cm</div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Profil recherché */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <Heart className="h-5 w-5" color="red" />
                                                {t('profile.userProfile.soughtProfile')}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                <div>
                                                    <div className="text-sm text-muted-foreground">{t('profile.userProfile.minimumAge')}</div>
                                                    <div className="font-medium">{user?.profile?.age_minimum ? `${user?.profile?.age_minimum} ${t('profile.years')}` : '—'}</div>
                                                </div>
                                                <div>
                                                    <div className="text-sm text-muted-foreground">{t('profile.userProfile.matrimonialSituation')}</div>
                                                    <div className="font-medium">{user?.profile?.situation_matrimoniale_recherche || '—'}</div>
                                                </div>
                                                <div>
                                                    <div className="text-sm text-muted-foreground">{t('common.country')}</div>
                                                    <div className="font-medium">{user?.profile?.pays_recherche || '—'}</div>
                                                </div>
                                                <div>
                                                    <div className="text-sm text-muted-foreground">{t('profile.userProfile.residenceLocation')}</div>
                                                    {/* <div className="font-medium">{user?.profile?.lieu_residence || '—'}</div> */}
                                                    <div className="flex flex-wrap gap-2">
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
                                                            : '--'}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-sm text-muted-foreground">{t('profile.userProfile.educationLevel')}</div>
                                                    <div className="font-medium">{user?.profile?.niveau_etudes_recherche || '—'}</div>
                                                </div>
                                                <div>
                                                    <div className="text-sm text-muted-foreground">{t('profile.userProfile.employmentStatus')}</div>
                                                    <div className="font-medium">{user?.profile?.statut_emploi_recherche || '—'}</div>
                                                </div>
                                                {/* <div>
                                                    <div className="text-sm text-muted-foreground">Secteur d'activité</div>
                                                    <div className="font-medium">{user?.profile?.secteur_activite || '—'}</div>
                                                </div> */}
                                            </div>
                                            {/* Description sur le profil recherché */}
                                            <div>
                                                <div className="mb-1 text-sm text-gray-500">{t('profile.userProfile.description')}</div>
                                                <div className="rounded-md border border-border bg-muted p-3 leading-relaxed">
                                                    {profile?.profil_recherche_description || '—'}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* À propos de moi */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <MessageCircleWarning className="h-5 w-5" color="purple" />{t('profile.userProfile.aboutMe')}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            {/* À propos de moi - Description */}
                                            <div>
                                                <div className="mb-1 text-sm text-gray-500">{t('profile.userProfile.description')}</div>
                                                <div className="rounded-md border border-border bg-muted p-3 leading-relaxed">
                                                    {profile?.apropos_description || '—'}
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                <div>
                                                    <div className="text-sm text-muted-foreground">{t('profile.userProfile.healthStatus')}</div>
                                                    <div className="font-medium">{user?.profile?.etat_sante || '—'}</div>
                                                </div>
                                                {/* Votre travail, votre vie professionnelle A ajouter plus tard */}
                                                <div>
                                                    <div className="text-sm text-muted-foreground">{t('profile.userProfile.work')}</div>
                                                    <div className="font-medium">{apropos?.travail || '—'}</div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Notes & Évaluation du Matchmaker */}
                                    {canManage && (
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="flex items-center justify-between">
                                                    <span>{t('profile.userProfile.notesAndEvaluation')}</span>
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-6">
                                                {/* Notes list */}
                                                <div>
                                                    <div className="mb-2 text-sm text-muted-foreground">{t('profile.userProfile.assignedMatchmakerNotes')}</div>
                                                    <div className="space-y-3">
                                                        {Array.isArray(matchmakerNotes) && matchmakerNotes.length > 0 ? (
                                                            matchmakerNotes.map((n) => {
                                                                const isAuthor = n.author_id === auth?.user?.id;
                                                                return (
                                                                    <div key={n.id} className="rounded-md border border-border bg-muted p-3">
                                                                        <div className="mb-1 flex items-center justify-between">
                                                                            <div className="text-xs text-muted-foreground">
                                                                                {n.author?.name} · {new Date(n.created_at).toLocaleString()}
                                                                            </div>
                                                                            {isAuthor && (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => openDeleteDialog(n.id)}
                                                                                    className="text-error hover:text-error/80 transition-colors"
                                                                                    title={t('profile.userProfile.deleteNote')}
                                                                                >
                                                                                    <Trash2 className="h-4 w-4" />
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                        <div className="text-sm">{n.content}</div>
                                                                    </div>
                                                                );
                                                            })
                                                        ) : (
                                                            <div className="text-sm text-muted-foreground">{t('profile.userProfile.noNotes')}</div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Add note */}
                                                <form onSubmit={addNote} className="space-y-2">
                                                    <label className="text-sm text-muted-foreground">{t('profile.userProfile.addNote')}</label>
                                                    <textarea
                                                        className="w-full rounded-md border border-border p-3 focus:border-error focus:ring-1 focus:ring-error focus:outline-none"
                                                        rows={3}
                                                        value={newNote}
                                                        onChange={(e) => setNewNote(e.target.value)}
                                                        placeholder={t('profile.userProfile.enterNote')}
                                                    />
                                                    <div>
                                                        <button type="submit" className="inline-flex items-center rounded-md bg-foreground px-4 py-2 text-background hover:opacity-90">
                                                            {t('profile.userProfile.addNoteButton')}
                                                        </button>
                                                    </div>
                                                </form>

                                                {/* Evaluation */}
                                                <form onSubmit={saveEvaluation} className="space-y-4">
                                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                        <div>
                                                            <div className="text-sm text-muted-foreground">{t('profile.userProfile.status')}</div>
                                                            <div className="mt-2 flex gap-4 text-sm">
                                                                {['prospect','member','client'].map((val) => (
                                                                    <label key={val} className="inline-flex items-center gap-2">
                                                                        <input type="radio" name="status" value={val} checked={evaluation?.status === val} onChange={(e)=>setEvaluation({...evaluation, status: e.target.value})} />
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
                                                            <label className="mb-1 block text-sm text-muted-foreground">{label}</label>
                                                            <textarea
                                                                rows={2}
                                                                className="w-full rounded-md border border-border p-3 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                                                                value={evaluation[key] || ''}
                                                                onChange={(e)=>setEvaluation({...evaluation, [key]: e.target.value})}
                                                            />
                                                        </div>
                                                    ))}

                                                    <div>
                                                        <div className="text-sm text-muted-foreground">{t('profile.userProfile.matchmakerRecommendation')}</div>
                                                        <div className="mt-2 flex gap-6 text-sm">
                                                            {[
                                                                ['ready', t('profile.userProfile.ready')],
                                                                ['accompany', t('profile.userProfile.accompany')],
                                                                ['not_ready', t('profile.userProfile.notReady')],
                                                            ].map(([val,label]) => (
                                                                <label key={val} className="inline-flex items-center gap-2">
                                                                    <input type="radio" name="recommendation" value={val} checked={evaluation.recommendation === val} onChange={(e)=>setEvaluation({...evaluation, recommendation: e.target.value})} />
                                                                    <span>{label}</span>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>

                
                                                    <div>
                                                        <label className="mb-1 block text-sm text-muted-foreground">{t('profile.userProfile.additionalRemarks')}</label>
                                                        <textarea rows={2} className="w-full rounded-md border border-gray-300 p-3 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none" value={evaluation.remarks} onChange={(e)=>setEvaluation({...evaluation, remarks: e.target.value})} />
                                                    </div>

                                                    <div>
                                                        <div className="mb-2 text-sm font-medium text-foreground">{t('profile.userProfile.feedbackAfterAppointment')}</div>
                                                        <div className="space-y-3">
                                                            <div>
                                                                <label className="mb-1 block text-sm text-muted-foreground">{t('profile.userProfile.behaviorDuringAppointment')}</label>
                                                                <textarea rows={2} className="w-full rounded-md border border-gray-300 p-3 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none" value={evaluation.feedback_behavior} onChange={(e)=>setEvaluation({...evaluation, feedback_behavior: e.target.value})} />
                                                            </div>
                                                            <div>
                                                                <label className="mb-1 block text-sm text-muted-foreground">{t('profile.userProfile.partnerImpression')}</label>
                                                                <textarea rows={2} className="w-full rounded-md border border-gray-300 p-3 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none" value={evaluation.feedback_partner_impression} onChange={(e)=>setEvaluation({...evaluation, feedback_partner_impression: e.target.value})} />
                                                            </div>
                                                            <div>
                                                                <label className="mb-1 block text-sm text-muted-foreground">{t('profile.userProfile.positiveNegativePoints')}</label>
                                                                <textarea rows={2} className="w-full rounded-md border border-gray-300 p-3 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none" value={evaluation.feedback_pos_neg} onChange={(e)=>setEvaluation({...evaluation, feedback_pos_neg: e.target.value})} />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <button type="submit" className="inline-flex items-center rounded-md bg-foreground px-4 py-2 text-background hover:opacity-90">{t('profile.userProfile.saveEvaluation')}</button>
                                                    </div>
                                                </form>
                                            </CardContent>
                                        </Card>
                                    )}

                                    {/* Donner votre avis  to be added later when the functionality of see proposition is implemented*/}
                                    {/* <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <MessageSquareWarning className="h-5 w-5" color="green" />
                                                {t('profile.userProfile.giveYourOpinion')}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="flex items-center gap-6">
                                                <label className="inline-flex items-center gap-2">
                                                    <input
                                                        type="radio"
                                                        name="avis"
                                                        value="interesse"
                                                        checked={avis === 'interesse'}
                                                        onChange={(e) => setAvis(e.target.value)}
                                                        className="text-red-600 focus:ring-red-500"
                                                    />
                                                    <span>{t('profile.userProfile.interested')}</span>
                                                </label>
                                                <label className="inline-flex items-center gap-2">
                                                    <input
                                                        type="radio"
                                                        name="avis"
                                                        value="pas_interesse"
                                                        checked={avis === 'pas_interesse'}
                                                        onChange={(e) => setAvis(e.target.value)}
                                                        className="text-red-600 focus:ring-red-500"
                                                    />
                                                    <span>{t('profile.userProfile.notInterested')}</span>
                                                </label>
                                            </div>
                                            <div>
                                                <label htmlFor="commentaire" className="mb-1 block text-sm text-gray-500">
                                                    {t('profile.userProfile.comment')}
                                                </label>
                                                <textarea
                                                    id="commentaire"
                                                    rows={4}
                                                    value={commentaire}
                                                    onChange={(e) => setCommentaire(e.target.value)}
                                                    className="w-full rounded-md border border-gray-300 p-3 focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none"
                                                    placeholder={t('profile.userProfile.addComment')}
                                                />
                                            </div>
                                            <div>
                                                <button
                                                    type="button"
                                                    className="inline-flex items-center rounded-md bg-error px-4 py-2 font-medium text-error-foreground transition-colors hover:opacity-90"
                                                >
                                                    {t('profile.userProfile.sendOpinion')}
                                                </button>
                                            </div>
                                        </CardContent>
                                    </Card> */}
                                </div>
                            )}

                            {userRole === 'matchmaker' && (
                                <div className="space-y-6">
                                    {/* changer matchmaker ou contacter mon matchmaker  functionality must be added later */}
                                    
                                    {
                                        auth.user?.roles?.[0]?.name === 'user' && (
                                            assignedMatchmakerId == user?.id ? (
                                                <Button className='bg-success text-success-foreground px-4 py-2 rounded-md cursor-pointer'>{t('profile.userProfile.contactMyMatchmaker')}</Button>
                                                // <h1>this is my matchmaker</h1>
                                            ) : assignedMatchmakerId !== null && assignedMatchmakerId !== user?.id ? (
                                                <Button className='bg-error text-error-foreground px-4 py-2 rounded-md cursor-pointer'>{t('profile.userProfile.chooseMatchmaker')}</Button>
    
                                            ) : (
                                                <Button className='bg-error text-error-foreground px-4 py-2 rounded-md cursor-pointer'>{t('profile.userProfile.changeMyMatchmaker')}</Button>
                                            )
                                        )
                                    }
                                    {/* Contact Information */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <FaUser className="h-5 w-5 text-info" />
                                                <span className="text-xl font-bold text-muted-foreground">{t('profile.userProfile.matchmakerBio')}</span>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <span className="text-sm">{user?.matchmaker_bio}</span>
                                        </CardContent>
                                    </Card>

                                    {/* Professional Stats */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>{t('profile.userProfile.professionalStatistics')}</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="rounded-lg bg-info-light p-4 text-center">
                                                    <div className="text-2xl font-bold text-info">12</div>
                                                    <div className="text-sm text-muted-foreground">{t('profile.userProfile.successfulMatches')}</div>
                                                </div>
                                                <div className="rounded-lg bg-success-bg p-4 text-center">
                                                    <div className="text-2xl font-bold text-success">8</div>
                                                    <div className="text-sm text-muted-foreground">{t('profile.userProfile.happyCouples')}</div>
                                                </div>
                                                <div className="rounded-lg bg-accent p-4 text-center">
                                                    <div className="text-2xl font-bold text-accent-foreground">4.8</div>
                                                    <div className="text-sm text-muted-foreground">{t('profile.userProfile.rating')}</div>
                                                </div>
                                                <div className="rounded-lg bg-warning-light p-4 text-center">
                                                    <div className="text-2xl font-bold text-warning">2</div>
                                                    <div className="text-sm text-muted-foreground">{t('profile.userProfile.yearsExperience')}</div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Posts Section */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <MessageSquareWarning className="h-5 w-5 text-blue-500" />
                                                {t('profile.userProfile.posts')}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            {isOwnProfile && userRole === 'matchmaker' && (
                                                <CreatePost />
                                            )}
                                            
                                            {/* Display Posts */}
                                            {user.posts && user.posts.length > 0 ? (
                                                <div className="space-y-4">
                                                    {user.posts.map((post) => (
                                                        <PostCard key={post.id} post={post} />
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-8 text-muted-foreground">
                                                    {isOwnProfile ? t('profile.userProfile.shareFirstPost') : t('profile.userProfile.noPostsYet')}
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
                                    <CardTitle>{t('profile.userProfile.basicInformation')}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <MapPin className="h-4 w-4 text-muted-foreground" />
                                        <span>
                                            {user?.city}, {user?.country}
                                        </span>
                                    </div>
                                    {age && (
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm text-muted-foreground">{t('profile.userProfile.age')}</span>
                                            <span>{age} {t('profile.years')}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm text-muted-foreground">{t('profile.userProfile.role')}</span>
                                        <Badge variant="outline" className="capitalize">
                                            {userRole}
                                        </Badge>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Stats Card */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>{t('profile.userProfile.statistics')}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="text-center">
                                                    <div className="text-2xl font-bold text-info">{userRole === 'user' ? '0' : '12'}</div>
                                            <div className="text-sm text-muted-foreground">{userRole === 'user' ? t('profile.userProfile.posts') : t('profile.userProfile.matches')}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-success">{userRole === 'user' ? '0' : '8'}</div>
                                            <div className="text-sm text-muted-foreground">{userRole === 'user' ? t('profile.userProfile.followers') : t('profile.userProfile.success')}</div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>

            {/* Delete Note Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('profile.userProfile.deleteNoteConfirm')}</DialogTitle>
                        <DialogDescription>
                            {t('profile.userProfile.deleteNoteDescription')}
                        </DialogDescription>
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
                        <Button
                            variant="destructive"
                            onClick={deleteNote}
                        >
                            {t('profile.userProfile.yesDelete')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
