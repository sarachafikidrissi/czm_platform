import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
    User, 
    Heart, 
    Home, 
    Car, 
    Dumbbell, 
    Cigarette, 
    Wine, 
    Baby, 
    GraduationCap,
    Briefcase,
    MapPin,
    Calendar
} from 'lucide-react';

export default function ProfileDetails({ profile }) {
    if (!profile) {
        return (
            <Card>
                <CardContent className="p-6 text-center text-gray-500">
                    No profile information available
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Info De Base */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <User className="w-5 h-5" />
                        Info De Base
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3">
                            <GraduationCap className="w-4 h-4 text-gray-500" />
                            <div>
                                <div className="text-sm text-gray-500">Niveau d'études</div>
                                <div className="font-medium">{profile.niveau_etudes || 'Non spécifié'}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Briefcase className="w-4 h-4 text-gray-500" />
                            <div>
                                <div className="text-sm text-gray-500">Situation professionnelle</div>
                                <div className="font-medium">{profile.situation_professionnelle || 'Non spécifié'}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-4 h-4 text-gray-500">💰</div>
                            <div>
                                <div className="text-sm text-gray-500">Revenu</div>
                                <div className="font-medium">{profile.revenu || 'Non spécifié'}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-4 h-4 text-gray-500">🕌</div>
                            <div>
                                <div className="text-sm text-gray-500">Religion</div>
                                <div className="font-medium">{profile.religion || 'Non spécifié'}</div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Mode de Vie */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Heart className="w-5 h-5" />
                        Mode de Vie
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3">
                            <Home className="w-4 h-4 text-gray-500" />
                            <div>
                                <div className="text-sm text-gray-500">Logement</div>
                                <div className="font-medium">{profile.logement || 'Non spécifié'}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Car className="w-4 h-4 text-gray-500" />
                            <div>
                                <div className="text-sm text-gray-500">Motorisé</div>
                                <div className="font-medium">{profile.motorise || 'Non spécifié'}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Dumbbell className="w-4 h-4 text-gray-500" />
                            <div>
                                <div className="text-sm text-gray-500">Sport</div>
                                <div className="font-medium">{profile.sport || 'Non spécifié'}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Cigarette className="w-4 h-4 text-gray-500" />
                            <div>
                                <div className="text-sm text-gray-500">Fumeur</div>
                                <div className="font-medium">{profile.fumeur || 'Non spécifié'}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Wine className="w-4 h-4 text-gray-500" />
                            <div>
                                <div className="text-sm text-gray-500">Buveur</div>
                                <div className="font-medium">{profile.buveur || 'Non spécifié'}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Baby className="w-4 h-4 text-gray-500" />
                            <div>
                                <div className="text-sm text-gray-500">Enfants</div>
                                <div className="font-medium">
                                    {profile.has_children ? `${profile.children_count || 0} enfant(s)` : 'Aucun'}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Loisirs */}
                    {profile.loisirs && (
                        <div className="mt-4">
                            <div className="text-sm text-gray-500 mb-2">Loisirs</div>
                            <div className="flex flex-wrap gap-2">
                                {profile.loisirs.split(',').map((loisir, index) => (
                                    <Badge key={index} variant="outline" className="text-xs">
                                        {loisir.trim()}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Profil Recherché */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Heart className="w-5 h-5" />
                        Profil Recherché
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <div>
                                <div className="text-sm text-gray-500">Âge minimum</div>
                                <div className="font-medium">{profile.age_minimum || 'Non spécifié'}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <MapPin className="w-4 h-4 text-gray-500" />
                            <div>
                                <div className="text-sm text-gray-500">Pays recherché</div>
                                <div className="font-medium">{profile.pays_recherche || 'Non spécifié'}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <GraduationCap className="w-4 h-4 text-gray-500" />
                            <div>
                                <div className="text-sm text-gray-500">Niveau d'études recherché</div>
                                <div className="font-medium">{profile.niveau_etudes_recherche || 'Non spécifié'}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Briefcase className="w-4 h-4 text-gray-500" />
                            <div>
                                <div className="text-sm text-gray-500">Statut emploi recherché</div>
                                <div className="font-medium">{profile.statut_emploi_recherche || 'Non spécifié'}</div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Villes recherchées */}
                    {profile.villes_recherche && Array.isArray(profile.villes_recherche) && profile.villes_recherche.length > 0 && (
                        <div className="mt-4">
                            <div className="text-sm text-gray-500 mb-2">Villes recherchées</div>
                            <div className="flex flex-wrap gap-2">
                                {profile.villes_recherche.map((ville, index) => (
                                    <Badge key={index} variant="outline" className="text-xs">
                                        {ville}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
