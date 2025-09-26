import AppLayout from '@/layouts/app-layout';
import { Head, usePage } from '@inertiajs/react';

export default function ProfileInfo() {
    const { auth, profile } = usePage().props;

    if (!profile) {
        return (
            <AppLayout breadcrumbs={[{ title: 'Mon Profil', href: '/profile' }]}>
                <Head title="Mon Profil" />
                <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                    <div className="border-sidebar-border/70 dark:border-sidebar-border rounded-xl border p-6">
                        <div className="text-lg font-semibold">Profil non trouvé</div>
                        <div className="mt-2 text-sm text-neutral-700 dark:text-neutral-200">
                            Votre profil n'a pas encore été créé.
                            <a href="/profile" className="ml-1 text-blue-600 hover:underline">
                                Créer votre profil
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
                <div className="mb-6 text-2xl font-bold">Mon Profil</div>

                {/* Profile Picture */}
                {profile.profilePicturePath && (
                    <div className="mb-6">
                        <div className="mb-2 text-lg font-semibold">Photo de profil</div>
                        <img
                            src={`/storage/${profile.profilePicturePath}`}
                            alt="Photo de profil"
                            className="h-32 w-32 rounded-lg border object-cover"
                        />
                    </div>
                )}

                {/* Personal Information */}
                <div className="grid gap-6 md:grid-cols-2">
                    <div className="border-sidebar-border/70 dark:border-sidebar-border rounded-xl border p-6">
                        <h3 className="mb-4 text-lg font-semibold">Informations personnelles</h3>
                        <div className="space-y-3">
                            <div>
                                <span className="font-medium">Nom:</span> {profile.nom || 'Non renseigné'}
                            </div>
                            <div>
                                <span className="font-medium">Prénom:</span> {profile.prenom || 'Non renseigné'}
                            </div>
                            <div>
                                <span className="font-medium">Date de naissance:</span> {profile.dateNaissance || 'Non renseigné'}
                            </div>
                            <div>
                                <span className="font-medium">Niveau d'études:</span> {profile.niveauEtudes || 'Non renseigné'}
                            </div>
                            <div>
                                <span className="font-medium">Situation professionnelle:</span> {profile.situationProfessionnelle || 'Non renseigné'}
                            </div>
                            <div>
                                <span className="font-medium">Secteur:</span> {profile.secteur || 'Non renseigné'}
                            </div>
                            <div>
                                <span className="font-medium">Revenu:</span> {profile.revenu || 'Non renseigné'}
                            </div>
                            <div>
                                <span className="font-medium">Religion:</span> {profile.religion || 'Non renseigné'}
                            </div>
                        </div>
                    </div>

                    {/* Lifestyle Information */}
                    <div className="border-sidebar-border/70 dark:border-sidebar-border rounded-xl border p-6">
                        <h3 className="mb-4 text-lg font-semibold">Mode de vie</h3>
                        <div className="space-y-3">
                            <div>
                                <span className="font-medium">État matrimonial:</span> {profile.etatMatrimonial || 'Non renseigné'}
                            </div>
                            <div>
                                <span className="font-medium">Logement:</span> {profile.logement || 'Non renseigné'}
                            </div>
                            <div>
                                <span className="font-medium">Taille:</span> {profile.taille ? `${profile.taille} cm` : 'Non renseigné'}
                            </div>
                            <div>
                                <span className="font-medium">Poids:</span> {profile.poids ? `${profile.poids} kg` : 'Non renseigné'}
                            </div>
                            <div>
                                <span className="font-medium">État de santé:</span> {profile.etatSante || 'Non renseigné'}
                            </div>
                            <div>
                                <span className="font-medium">Fumeur:</span> {profile.fumeur || 'Non renseigné'}
                            </div>
                            <div>
                                <span className="font-medium">Buveur:</span> {profile.buveur || 'Non renseigné'}
                            </div>
                            <div>
                                <span className="font-medium">Sport:</span> {profile.sport || 'Non renseigné'}
                            </div>
                            <div>
                                <span className="font-medium">Motorisé:</span> {profile.motorise || 'Non renseigné'}
                            </div>
                            <div>
                                <span className="font-medium">Loisirs:</span> {profile.loisirs || 'Non renseigné'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Partner Preferences */}
                <div className="border-sidebar-border/70 dark:border-sidebar-border rounded-xl border p-6">
                    <h3 className="mb-4 text-lg font-semibold">Préférences de partenaire</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-3">
                            <div>
                                <span className="font-medium">Âge minimum:</span> {profile.ageMinimum || 'Non renseigné'}
                            </div>
                            <div>
                                <span className="font-medium">Situation matrimoniale recherchée:</span>{' '}
                                {profile.situationMatrimonialeRecherche || 'Non renseigné'}
                            </div>
                            <div>
                                <span className="font-medium">Pays recherché:</span> {profile.paysRecherche || 'Non renseigné'}
                            </div>
                            <div>
                                <span className="font-medium">Villes recherchées:</span>{' '}
                                {profile.villesRecherche && profile.villesRecherche.length > 0
                                    ? (() => {
                                          // Parse the JSON string if it's a string, otherwise use as-is
                                          const villes =
                                              typeof profile.villesRecherche === 'string'
                                                  ? JSON.parse(profile.villesRecherche)
                                                  : profile.villesRecherche;

                                          return Array.isArray(villes) && villes.length > 0 ? villes.join(', ') : 'Non renseigné';
                                      })()
                                    : 'Non renseigné'}
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <span className="font-medium">Niveau d'études recherché:</span> {profile.niveauEtudesRecherche || 'Non renseigné'}
                            </div>
                            <div>
                                <span className="font-medium">Statut d'emploi recherché:</span> {profile.statutEmploiRecherche || 'Non renseigné'}
                            </div>
                            <div>
                                <span className="font-medium">Revenu minimum:</span> {profile.revenuMinimum || 'Non renseigné'}
                            </div>
                            <div>
                                <span className="font-medium">Religion recherchée:</span> {profile.religionRecherche || 'Non renseigné'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Profile Status */}
                <div className="border-sidebar-border/70 dark:border-sidebar-border rounded-xl border p-6">
                    <h3 className="mb-4 text-lg font-semibold">Statut du profil</h3>
                    <div className="space-y-2">
                        <div>
                            <span className="font-medium">Étape actuelle:</span> {profile.currentStep || 1} sur 4
                        </div>
                        <div>
                            <span className="font-medium">Profil complété:</span>
                            <span
                                className={`ml-2 rounded px-2 py-1 text-sm ${
                                    profile.isCompleted ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                }`}
                            >
                                {profile.isCompleted ? 'Oui' : 'Non'}
                            </span>
                        </div>
                        {profile.isCompleted && (
                            <div>
                                <span className="font-medium">Complété le:</span> {profile.completedAt || 'Date non disponible'}
                            </div>
                        )}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4">
                    <a href="/profile" className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700">
                        Modifier le profil
                    </a>
                    <a href="/dashboard" className="rounded-lg bg-gray-600 px-4 py-2 text-white transition-colors hover:bg-gray-700">
                        Retour au tableau de bord
                    </a>
                </div>
            </div>
        </AppLayout>
    );
}
