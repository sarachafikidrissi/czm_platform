import AppLayout from '@/layouts/app-layout';
import { Head, usePage } from '@inertiajs/react';

export default function ProfileInfo() {
    const { auth, profile } = usePage().props;
    console.log(profile);

    if (!profile.isCompleted) {
        return (
            <AppLayout breadcrumbs={[{ title: 'Mon Profil', href: '/profile' }]}>
                <Head title="Mon Profil" />
                <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                    <div className="border-sidebar-border/70 dark:border-sidebar-border rounded-xl border p-6">
                        <div className="text-lg font-semibold">
                        {profile && profile.currentStep > 1 ? (
                                <span>Profil non créé.</span>
                            ) : (
                                <span>Profil non complété..</span>
                            )}

                        </div>
                        <div className="mt-2 text-sm text-neutral-700 dark:text-neutral-200">
                            {profile && profile.currentStep > 1 ? (
                                <span>Merci de compléter votre profil</span>
                            ) : (
                                <span>Votre profil n'a pas encore été créé.</span>
                            )}

                            <a href="/profile" className="ml-1 text-blue-600 hover:underline">
                                {profile && profile.currentStep > 1 ? <span>Compléter votre profil</span> : <span>Créer votre profil</span>}
                            </a>
                        </div>
                    </div>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout breadcrumbs={[{ title: 'Mon Profil', href: '/profile' }]}>
            <Head title="Mon Profil" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="flex flex-col items-center justify-between rounded-md bg-white/10 px-2 shadow-2xs sm:flex-row">
                    {/* Header */}
                    <div className="mb-8 text-center">
                        <h1 className="mb-2 text-3xl font-bold text-gray-900">Votre Profil</h1>
                        <p className="text-lg text-gray-600">Consultez les informations de votre profil</p>
                    </div>

                    {/* Profile Picture */}
                    {profile.profilePicturePath && (
                        <div className="mb-8 text-center">
                            <div className="mb-4 text-lg font-semibold">Photo de profil</div>
                            <img
                                src={`/storage/${profile.profilePicturePath}`}
                                alt="Photo de profil"
                                className="mx-auto h-32 w-32 rounded-full border-4 border-white object-cover shadow-lg"
                            />
                        </div>
                    )}

                    {/* Profile Status Banner */}
                    {profile?.isCompleted && (
                        <div className="mb-6 rounded-lg bg-green-50 p-4 text-center">
                            <p className="text-green-700">✓ Votre profil est complété</p>
                        </div>
                    )}
                </div>

                <div className="mx-auto w-full">
                    {/* Personal Information */}
                    <div className="mb-8">
                        <div className="mb-6 rounded-lg bg-white p-6 shadow-md">
                            <h2 className="mb-4 text-2xl font-bold text-gray-900">Informations personnelles</h2>
                            <div className="grid gap-6 md:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">Nom</label>
                                    <input
                                        type="text"
                                        value={profile.nom || 'Non renseigné'}
                                        disabled
                                        className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-gray-700"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">Prénom</label>
                                    <input
                                        type="text"
                                        value={profile.prenom || 'Non renseigné'}
                                        disabled
                                        className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-gray-700"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">Date de naissance</label>
                                    <input
                                        type="text"
                                        value={profile.dateNaissance || 'Non renseigné'}
                                        disabled
                                        className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-gray-700"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">Niveau d'études</label>
                                    <input
                                        type="text"
                                        value={profile.niveauEtudes || 'Non renseigné'}
                                        disabled
                                        className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-gray-700"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">Situation professionnelle</label>
                                    <input
                                        type="text"
                                        value={profile.situationProfessionnelle || 'Non renseigné'}
                                        disabled
                                        className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-gray-700"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">Secteur</label>
                                    <input
                                        type="text"
                                        value={profile.secteur || 'Non renseigné'}
                                        disabled
                                        className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-gray-700"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">Revenu</label>
                                    <input
                                        type="text"
                                        value={profile.revenu || 'Non renseigné'}
                                        disabled
                                        className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-gray-700"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">Religion</label>
                                    <input
                                        type="text"
                                        value={profile.religion || 'Non renseigné'}
                                        disabled
                                        className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-gray-700"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">Comment nous avez-vous connu</label>
                                    <input
                                        type="text"
                                        value={profile.heardAboutUs || 'Non renseigné'}
                                        disabled
                                        className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-gray-700"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">Référence de l'inscription</label>
                                    <input
                                        type="text"
                                        value={profile.heardAboutReference || 'Non renseigné'}
                                        disabled
                                        className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-gray-700"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Lifestyle Information */}
                    <div className="mb-8">
                        <div className="mb-6 rounded-lg bg-white p-6 shadow-md">
                            <h2 className="mb-4 text-2xl font-bold text-gray-900">Mode de vie</h2>
                            <div className="grid gap-6 md:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">État matrimonial</label>
                                    <input
                                        type="text"
                                        value={profile.etatMatrimonial || 'Non renseigné'}
                                        disabled
                                        className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-gray-700"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">Logement</label>
                                    <input
                                        type="text"
                                        value={profile.logement || 'Non renseigné'}
                                        disabled
                                        className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-gray-700"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">Taille</label>
                                    <input
                                        type="text"
                                        value={profile.taille ? `${profile.taille} cm` : 'Non renseigné'}
                                        disabled
                                        className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-gray-700"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">Poids</label>
                                    <input
                                        type="text"
                                        value={profile.poids ? `${profile.poids} kg` : 'Non renseigné'}
                                        disabled
                                        className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-gray-700"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">État de santé</label>
                                    <textarea
                                        value={profile.etatSante || 'Non renseigné'}
                                        disabled
                                        rows={3}
                                        className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-gray-700"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">Fumeur</label>
                                    <input
                                        type="text"
                                        value={profile.fumeur || 'Non renseigné'}
                                        disabled
                                        className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-gray-700"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">Buveur</label>
                                    <input
                                        type="text"
                                        value={profile.buveur || 'Non renseigné'}
                                        disabled
                                        className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-gray-700"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">Sport</label>
                                    <input
                                        type="text"
                                        value={profile.sport || 'Non renseigné'}
                                        disabled
                                        className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-gray-700"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">Motorisé</label>
                                    <input
                                        type="text"
                                        value={profile.motorise || 'Non renseigné'}
                                        disabled
                                        className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-gray-700"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">Enfants</label>
                                    <input
                                        type="text"
                                        value={profile.hasChildren === true ? `Oui${profile.childrenCount ? `, ${profile.childrenCount}` : ''}` : (profile.hasChildren === false ? 'Non' : 'Non renseigné')}
                                        disabled
                                        className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-gray-700"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">Tuteur des enfants</label>
                                    <input
                                        type="text"
                                        value={profile.childrenGuardian === 'mother' ? 'La mère' : profile.childrenGuardian === 'father' ? 'Le père' : 'Non renseigné'}
                                        disabled
                                        className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-gray-700"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">Voile / Niqab</label>
                                    <input
                                        type="text"
                                        value={{
                                            voile: 'Voile',
                                            non_voile: 'Non voile',
                                            niqab: 'Niqab',
                                            idea_niqab: 'Idée niqab',
                                            idea_hijab: 'Idée hijab',
                                        }[profile.hijabChoice] || 'Non renseigné'}
                                        disabled
                                        className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-gray-700"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="mb-1 block text-sm font-medium text-gray-700">Loisirs</label>
                                    <input
                                        type="text"
                                        value={profile.loisirs || 'Non renseigné'}
                                        disabled
                                        className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-gray-700"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Partner Preferences */}
                    <div className="mb-8">
                        <div className="mb-6 rounded-lg bg-white p-6 shadow-md">
                            <h2 className="mb-4 text-2xl font-bold text-gray-900">Préférences de partenaire</h2>
                            <div className="grid gap-6 md:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">Âge minimum</label>
                                    <input
                                        type="text"
                                        value={profile.ageMinimum ? `${profile.ageMinimum} ans` : 'Non renseigné'}
                                        disabled
                                        className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-gray-700"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">Situation matrimoniale recherchée</label>
                                    <input
                                        type="text"
                                        value={profile.situationMatrimonialeRecherche || 'Non renseigné'}
                                        disabled
                                        className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-gray-700"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">Pays recherché</label>
                                    <input
                                        type="text"
                                        value={profile.paysRecherche || 'Non renseigné'}
                                        disabled
                                        className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-gray-700"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">Villes recherchées</label>
                                    <input
                                        type="text"
                                        value={
                                            profile.villesRecherche && profile.villesRecherche.length > 0
                                                ? (() => {
                                                      const villes =
                                                          typeof profile.villesRecherche === 'string'
                                                              ? JSON.parse(profile.villesRecherche)
                                                              : profile.villesRecherche;
                                                      return Array.isArray(villes) && villes.length > 0 ? villes.join(', ') : 'Non renseigné';
                                                  })()
                                                : 'Non renseigné'
                                        }
                                        disabled
                                        className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-gray-700"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">Niveau d'études recherché</label>
                                    <input
                                        type="text"
                                        value={profile.niveauEtudesRecherche || 'Non renseigné'}
                                        disabled
                                        className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-gray-700"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">Statut d'emploi recherché</label>
                                    <input
                                        type="text"
                                        value={profile.statutEmploiRecherche || 'Non renseigné'}
                                        disabled
                                        className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-gray-700"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">Revenu minimum</label>
                                    <input
                                        type="text"
                                        value={profile.revenuMinimum || 'Non renseigné'}
                                        disabled
                                        className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-gray-700"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">Religion recherchée</label>
                                    <input
                                        type="text"
                                        value={profile.religionRecherche || 'Non renseigné'}
                                        disabled
                                        className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-gray-700"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Profile Status */}
                    <div className="mb-8">
                        <div className="rounded-lg bg-white p-6 shadow-md">
                            <h2 className="mb-4 text-2xl font-bold text-gray-900">Statut du profil</h2>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">Étape actuelle</label>
                                    <input
                                        type="text"
                                        value={`${profile.currentStep || 1} sur 4`}
                                        disabled
                                        className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-gray-700"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">Profil complété</label>
                                    <input
                                        type="text"
                                        value={profile.isCompleted ? 'Oui' : 'Non'}
                                        disabled
                                        className={`w-full rounded-lg border px-4 py-3 font-medium ${
                                            profile.isCompleted
                                                ? 'border-green-300 bg-green-50 text-green-700'
                                                : 'border-yellow-300 bg-yellow-50 text-yellow-700'
                                        }`}
                                    />
                                </div>
                                {profile.isCompleted && profile.completedAt && (
                                    <div className="md:col-span-2">
                                        <label className="mb-1 block text-sm font-medium text-gray-700">Complété le</label>
                                        <input
                                            type="text"
                                            value={profile.completedAt}
                                            disabled
                                            className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-gray-700"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4 pt-6">
                        <a href="/profile" className="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-700">
                            Modifier le profil
                        </a>
                        <a
                            href="/dashboard"
                            className="rounded-lg border border-gray-300 bg-white px-6 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50"
                        >
                            Retour au tableau de bord
                        </a>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
