import ProfileHeader from '@/components/profile/ProfileHeader';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@headlessui/react';
import { Head, usePage } from '@inertiajs/react';
import { Heart, MapPin, MessageCircleWarning, MessageSquareWarning, User } from 'lucide-react';
import { useState } from 'react';
import { FaUser } from 'react-icons/fa';
import CreatePost from '@/components/posts/CreatePost';
import PostCard from '@/components/posts/PostCard';

export default function UserProfile({ user, profile, agency }) {
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

    return (
        <AppLayout>
            <Head title={`${user?.name} - Profile`} />
            <div className="min-h-screen bg-gray-50">
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
                                                Infos de base
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                            <div>
                                                <div className="text-sm text-gray-500">Situation matrimoniale</div>
                                                <div className="font-medium">{user?.profile?.etat_matrimonial || '—'}</div>
                                            </div>
                                            <div>
                                                <div className="text-sm text-gray-500">Vous avez des enfants ?</div>
                                                <div className="font-medium">{user?.profile?.has_children == 1 ? 'Oui' : 'Non' || '—'}</div>
                                            </div>
                                            <div>
                                                <div className="text-sm text-gray-500">Niveau d’études</div>
                                                <div className="font-medium">{user?.profile?.niveau_etudes || '—'}</div>
                                            </div>
                                            <div>
                                                <div className="text-sm text-gray-500">Situation professionnelle</div>
                                                <div className="font-medium">{user?.profile?.situation_professionnelle || '—'}</div>
                                            </div>
                                            <div>
                                                <div className="text-sm text-gray-500">Secteur d’activité</div>
                                                <div className="font-medium">{user?.profile?.secteur || '—'}</div>
                                            </div>
                                            <div>
                                                <div className="text-sm text-gray-500">Revenu mensuel</div>
                                                <div className="font-medium">{user?.profile?.revenu || '—'}</div>
                                            </div>
                                            <div>
                                                <div className="text-sm text-gray-500">Poids</div>
                                                <div className="font-medium">{user?.profile?.poids || '—'} kg</div>
                                            </div>
                                            <div>
                                                <div className="text-sm text-gray-500">Taille</div>
                                                <div className="font-medium">{user?.profile?.taille || '—'} cm</div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Profil recherché */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <Heart className="h-5 w-5" color="red" />
                                                Profil recherché
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                <div>
                                                    <div className="text-sm text-gray-500">Âge minimum / maximum</div>
                                                    <div className="font-medium">{user?.profile?.age_minimum + ' ans' ?? '—'}</div>
                                                </div>
                                                <div>
                                                    <div className="text-sm text-gray-500">Situation matrimoniale</div>
                                                    <div className="font-medium">{user?.profile?.situation_matrimoniale_recherche || '—'}</div>
                                                </div>
                                                <div>
                                                    <div className="text-sm text-gray-500">Pays</div>
                                                    <div className="font-medium">{user?.profile?.pays_recherche || '—'}</div>
                                                </div>
                                                <div>
                                                    <div className="text-sm text-gray-500">Lieu de résidence</div>
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
                                                                      : 'Non renseigné';
                                                              })()
                                                            : '--'}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-sm text-gray-500">Niveau d’études</div>
                                                    <div className="font-medium">{user?.profile?.niveau_etudes_recherche || '—'}</div>
                                                </div>
                                                <div>
                                                    <div className="text-sm text-gray-500">Statut d’emploi</div>
                                                    <div className="font-medium">{user?.profile?.statut_emploi_recherche || '—'}</div>
                                                </div>
                                                {/* <div>
                                                    <div className="text-sm text-gray-500">Secteur d’activité</div>
                                                    <div className="font-medium">{user?.profile?.secteur_activite || '—'}</div>
                                                </div> */}
                                            </div>
                                            {/* Description (Arabic) sur le profil recherché A ajouter plus tard */}
                                            <div>
                                                <div className="mb-1 text-sm text-gray-500">Description</div>
                                                <div className="rounded-md border border-gray-200 bg-gray-50 p-3 leading-relaxed">
                                                    {user?.description || '—'}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* À propos de moi */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <MessageCircleWarning className="h-5 w-5" color="purple" />À propos de moi
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            {/* Parlez-nous de vous, vos loisirs, votre personnalité : A ajouter  plus tard */}
                                            <div>
                                                <div className="mb-1 text-sm text-gray-500">Description</div>
                                                <div className="rounded-md border border-gray-200 bg-gray-50 p-3 leading-relaxed">
                                                    {apropos?.description || '—'}
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                <div>
                                                    <div className="text-sm text-gray-500">État de santé</div>
                                                    <div className="font-medium">{user?.profile?.etat_sante || '—'}</div>
                                                </div>
                                                {/* Votre travail, votre vie professionnelle A ajouter plus tard */}
                                                <div>
                                                    <div className="text-sm text-gray-500">Travail</div>
                                                    <div className="font-medium">{apropos?.travail || '—'}</div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Donner votre avis */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <MessageSquareWarning className="h-5 w-5" color="green" />
                                                Donner votre avis
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
                                                    <span>Intéressé</span>
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
                                                    <span>Pas intéressé</span>
                                                </label>
                                            </div>
                                            <div>
                                                <label htmlFor="commentaire" className="mb-1 block text-sm text-gray-500">
                                                    Commentaire
                                                </label>
                                                <textarea
                                                    id="commentaire"
                                                    rows={4}
                                                    value={commentaire}
                                                    onChange={(e) => setCommentaire(e.target.value)}
                                                    className="w-full rounded-md border border-gray-300 p-3 focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none"
                                                    placeholder="Ajoutez un commentaire..."
                                                />
                                            </div>
                                            <div>
                                                <button
                                                    type="button"
                                                    className="inline-flex items-center rounded-md bg-red-600 px-4 py-2 font-medium text-white transition-colors hover:bg-red-700"
                                                >
                                                    Envoyer l'avis
                                                </button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            )}

                            {userRole === 'matchmaker' && (
                                <div className="space-y-6">
                                    {/* changer matchmaker ou contacter mon matchmaker  functionality must be added later */}
                                    
                                    {
                                        assignedMatchmakerId == user?.id ? (
                                            <Button className='bg-green-500 text-white px-4 py-2 rounded-md cursor-pointer'>Conatcter mon matchmaker</Button>
                                            // <h1>this is my matchmaker</h1>
                                        ) : (
                                            <Button className='bg-red-500 text-white px-4 py-2 rounded-md cursor-pointer'>Changer mon matchmaker</Button>

                                        )
                                    }
                                    {/* Contact Information */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <FaUser className="h-5 w-5 text-blue-500" />
                                                <span className="text-xl font-bold text-gray-600">Matchmaker Bio</span>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <span className="text-sm">{user?.matchmaker_bio}</span>
                                        </CardContent>
                                    </Card>

                                    {/* Professional Stats */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Professional Statistics</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="rounded-lg bg-blue-50 p-4 text-center">
                                                    <div className="text-2xl font-bold text-blue-600">12</div>
                                                    <div className="text-sm text-gray-500">Successful Matches</div>
                                                </div>
                                                <div className="rounded-lg bg-green-50 p-4 text-center">
                                                    <div className="text-2xl font-bold text-green-600">8</div>
                                                    <div className="text-sm text-gray-500">Happy Couples</div>
                                                </div>
                                                <div className="rounded-lg bg-purple-50 p-4 text-center">
                                                    <div className="text-2xl font-bold text-purple-600">4.8</div>
                                                    <div className="text-sm text-gray-500">Rating</div>
                                                </div>
                                                <div className="rounded-lg bg-orange-50 p-4 text-center">
                                                    <div className="text-2xl font-bold text-orange-600">2</div>
                                                    <div className="text-sm text-gray-500">Years Experience</div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Posts Section */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <MessageSquareWarning className="h-5 w-5 text-blue-500" />
                                                Posts
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
                                                <div className="text-center py-8 text-gray-500">
                                                    {isOwnProfile ? 'No posts yet. Share your first post!' : 'No posts yet.'}
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
                                        <MapPin className="h-4 w-4 text-gray-500" />
                                        <span>
                                            {user?.city}, {user?.country}
                                        </span>
                                    </div>
                                    {age && (
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm text-gray-500">Age:</span>
                                            <span>{age} ans</span>
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
                                            <div className="text-2xl font-bold text-blue-600">{userRole === 'user' ? '0' : '12'}</div>
                                            <div className="text-sm text-gray-500">{userRole === 'user' ? 'Posts' : 'Matches'}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-green-600">{userRole === 'user' ? '0' : '8'}</div>
                                            <div className="text-sm text-gray-500">{userRole === 'user' ? 'Followers' : 'Success'}</div>
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
