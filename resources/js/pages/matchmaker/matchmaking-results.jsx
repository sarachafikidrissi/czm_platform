import { Head, router } from '@inertiajs/react';
import MatchResultMatchCard from '@/components/matchmaking/MatchResultMatchCard';
import MatchmakingProposeRequestModals from '@/components/matchmaking/MatchmakingProposeRequestModals';
import MatchmakerRespondToPropositionDialog from '@/components/matchmaking/MatchmakerRespondToPropositionDialog';
import MatchmakingFiltersSheet from '@/components/matchmaking/MatchmakingFiltersSheet';
import { useMatchmakingFilters } from '@/hooks/use-matchmaking-filters';
import MatchResultsToolbar, { MatchResultsPagination } from '@/components/matchmaking/MatchResultsToolbar';
import { useMatchResultsBrowser } from '@/hooks/use-match-results-browser';
import { useMatchmakingProposeRequestFlow } from '@/hooks/use-matchmaking-propose-request-flow';
import { getProfilePicture, getAge, getLocation, getScoreColor } from '@/lib/matchmaking-result-display';
import { useState, useEffect, useMemo, useCallback } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { 
    ArrowLeft, 
    Filter, 
    RotateCcw, 
    User, 
    MapPin, 
    Calendar, 
    GraduationCap,
    Briefcase,
    DollarSign,
    TrendingUp,
    CheckCircle2,
    XCircle,
    Info
} from 'lucide-react';
import axios from 'axios';
import { useToast } from '@/hooks/use-toast';
import { propositionToastFr } from '@/lib/proposition-toast-messages';

export default function MatchmakingResults({ userA, matches: initialMatches, defaultFilters, appliedFilters: initialAppliedFilters, resultFilterOptions = null }) {
    const { showToast } = useToast();
    const [matches, setMatches] = useState(initialMatches || []);
    const proposeFlow = useMatchmakingProposeRequestFlow(userA, {
        onAfterProposeSuccess: () =>
            router.reload({ only: ['matches', 'appliedFilters', 'defaultFilters', 'userA'] }),
        onAfterRequestSuccess: () =>
            router.reload({ only: ['matches', 'appliedFilters', 'defaultFilters', 'userA'] }),
    });
    const [cancellingPropositionId, setCancellingPropositionId] = useState(null);
    const [respondDialog, setRespondDialog] = useState({ open: false, propositionId: null });
    const matchFilters = useMatchmakingFilters({ userId: userA?.id, initialAppliedFilters, onResults: setMatches });
    const { filters, isLoading, showFilters, setShowFilters, handleResetFilters, activeFilterCount } = matchFilters;
    const [selectedMatch, setSelectedMatch] = useState(null);
    const [showCompatibilityModal, setShowCompatibilityModal] = useState(false);
    const [pendingOpenProposeId, setPendingOpenProposeId] = useState(null);
    const [hasOpenedProposeFromQuery, setHasOpenedProposeFromQuery] = useState(false);

    const lockedPairCounterpartId = useMemo(() => {
        if (userA?.id == null) {
            return null;
        }

        const refId = Number(userA.id);
        const pair = userA?.proposition?.exists ? userA.proposition : userA?.rdv?.exists ? userA.rdv : null;
        if (!pair) {
            return null;
        }

        const r = Number(pair.reference_user_id);
        const c = Number(pair.compatible_user_id);
        return r === refId ? c : r;
    }, [userA?.id, userA?.proposition, userA?.rdv]);

    const displayMatches = useMemo(() => {
        const list = matches || [];
        const hasLockedPair = Boolean(userA?.proposition?.exists || userA?.rdv?.exists);
        if (!hasLockedPair) {
            return list;
        }
        if (lockedPairCounterpartId == null) {
            return list;
        }
        return list.filter((m) => Number(m.user?.id) === lockedPairCounterpartId);
    }, [matches, userA?.proposition?.exists, userA?.rdv?.exists, lockedPairCounterpartId]);

    const showActivePairMissingInList = Boolean(
        (userA?.proposition?.exists || userA?.rdv?.exists) && (matches || []).length > 0 && displayMatches.length === 0,
    );

    const handleRefreshMatchmakingPage = useCallback(() => {
        router.reload({ only: ['matches', 'appliedFilters', 'defaultFilters', 'userA'] });
    }, []);

    const getCompatibilityDetails = (scoreDetails, profileA, profileB) => {
        const details = [];
        const maxScores = {
            age: 20,
            country: 10,
            city: 10,
            religion: 10,
            income: 10,
            education: 15,
            employment: 10,
            marital_status: 10,
            health: 10,
            smoking: 5,
            drinking: 5,
            has_children: 5,
            housing: 5,
            sport: 5,
            hobbies: 5,
            origin: 5,
        };

        // Age compatibility
        // Symmetric range: [userAAge - age_minimum, userAAge + age_minimum] (minimum 18)
        // Default: [userAAge - 10, userAAge + 10] if no preference
        if (scoreDetails.age !== undefined) {
            const ageB = getAge(profileB);
            const ageA = getAge(profileA);
            if (ageA && ageB) {
                const ageDiff = Math.abs(ageA - ageB);
                let ageRange = '';
                if (profileA.age_minimum) {
                    const ageMinRange = Math.max(18, ageA - profileA.age_minimum);
                    const ageMaxRange = ageA + profileA.age_minimum;
                    ageRange = `Plage recherchée: ${ageMinRange}-${ageMaxRange} ans`;
                } else {
                    const ageMinRange = Math.max(18, ageA - 10);
                    const ageMaxRange = ageA + 10;
                    ageRange = `Plage recherchée (défaut): ${ageMinRange}-${ageMaxRange} ans`;
                }
                details.push({
                    label: 'Âge',
                    score: scoreDetails.age,
                    maxScore: maxScores.age,
                    matched: true,
                    description: `${ageB} ans (différence: ${ageDiff} ans). ${ageRange}`
                });
            }
        } else if (profileA.date_naissance && profileB.date_naissance) {
            const ageA = getAge(profileA);
            const ageB = getAge(profileB);
            let ageRange = '';
            if (profileA.age_minimum) {
                const ageMinRange = Math.max(18, ageA - profileA.age_minimum);
                const ageMaxRange = ageA + profileA.age_minimum;
                ageRange = `Plage recherchée: ${ageMinRange}-${ageMaxRange} ans`;
            } else {
                const ageMinRange = Math.max(18, ageA - 10);
                const ageMaxRange = ageA + 10;
                ageRange = `Plage recherchée (défaut): ${ageMinRange}-${ageMaxRange} ans`;
            }
            details.push({
                label: 'Âge',
                score: 0,
                maxScore: maxScores.age,
                matched: false,
                description: `${ageB} ans ne correspond pas. ${ageRange}`
            });
        }

        // Education compatibility
        // Exact match with candidate's niveau_etudes
        if (scoreDetails.education !== undefined) {
            details.push({
                label: 'Niveau d\'études',
                score: scoreDetails.education,
                maxScore: maxScores.education,
                matched: true,
                description: `${profileB.niveau_etudes || 'Non spécifié'} - Correspond au niveau recherché: ${profileA.niveau_etudes_recherche || 'Non spécifié'}`
            });
        } else if (profileA.niveau_etudes_recherche) {
            details.push({
                label: 'Niveau d\'études',
                score: 0,
                maxScore: maxScores.education,
                matched: false,
                description: `${profileB.niveau_etudes || 'Non spécifié'} ne correspond pas au niveau recherché: ${profileA.niveau_etudes_recherche}`
            });
        }

        // Employment status compatibility
        // Exact match with candidate's situation_professionnelle
        if (scoreDetails.employment !== undefined) {
            details.push({
                label: 'Situation professionnelle',
                score: scoreDetails.employment,
                maxScore: maxScores.employment,
                matched: true,
                description: `${profileB.situation_professionnelle || 'Non spécifié'} - Correspond au statut recherché: ${profileA.statut_emploi_recherche || 'Non spécifié'}`
            });
        } else if (profileA.statut_emploi_recherche) {
            details.push({
                label: 'Situation professionnelle',
                score: 0,
                maxScore: maxScores.employment,
                matched: false,
                description: `${profileB.situation_professionnelle || 'Non spécifié'} ne correspond pas au statut recherché: ${profileA.statut_emploi_recherche}`
            });
        }

        // Marital status compatibility
        // Candidate's etat_matrimonial must be in User A's preferred statuses
        if (scoreDetails.marital_status !== undefined) {
            const preferredStatuses = profileA.situation_matrimoniale_recherche || [];
            const preferredArray = Array.isArray(preferredStatuses) ? preferredStatuses : [preferredStatuses];
            const candidateStatus = profileB.etat_matrimonial || '';
            const candidateArray = Array.isArray(candidateStatus) ? candidateStatus : [candidateStatus];
            details.push({
                label: 'État matrimonial',
                score: scoreDetails.marital_status,
                maxScore: maxScores.marital_status,
                matched: true,
                description: `${candidateArray.join(', ')} - Correspond aux statuts recherchés: ${preferredArray.join(', ')}`
            });
        } else if (profileA.situation_matrimoniale_recherche && (Array.isArray(profileA.situation_matrimoniale_recherche) ? profileA.situation_matrimoniale_recherche.length > 0 : profileA.situation_matrimoniale_recherche)) {
            const preferredStatuses = profileA.situation_matrimoniale_recherche || [];
            const preferredArray = Array.isArray(preferredStatuses) ? preferredStatuses : [preferredStatuses];
            const candidateStatus = profileB.etat_matrimonial || '';
            const candidateArray = Array.isArray(candidateStatus) ? candidateStatus : [candidateStatus];
            details.push({
                label: 'État matrimonial',
                score: 0,
                maxScore: maxScores.marital_status,
                matched: false,
                description: `${candidateArray.join(', ')} ne correspond pas aux statuts recherchés: ${preferredArray.join(', ')}`
            });
        }

        // Country compatibility
        // Matches if candidate's pays_residence or pays_origine is in User A's preferred countries
        if (scoreDetails.country !== undefined) {
            const paysResidence = profileB.pays_residence || '';
            const paysOrigine = profileB.pays_origine || '';
            const paysRecherche = profileA.pays_recherche || [];
            const paysArray = Array.isArray(paysRecherche) ? paysRecherche : [paysRecherche];
            
            let matchedCountry = '';
            let matchedType = '';
            if (paysResidence && paysArray.includes(paysResidence)) {
                matchedCountry = paysResidence;
                matchedType = 'résidence';
            } else if (paysOrigine && paysArray.includes(paysOrigine)) {
                matchedCountry = paysOrigine;
                matchedType = 'origine';
            }
            
            details.push({
                label: 'Pays',
                score: scoreDetails.country,
                maxScore: maxScores.country,
                matched: true,
                description: `${matchedCountry} (${matchedType}) - Correspond aux pays recherchés: ${paysArray.join(', ')}`
            });
        } else if (profileA.pays_recherche && (Array.isArray(profileA.pays_recherche) ? profileA.pays_recherche.length > 0 : profileA.pays_recherche)) {
            const paysRecherche = profileA.pays_recherche || [];
            const paysArray = Array.isArray(paysRecherche) ? paysRecherche : [paysRecherche];
            details.push({
                label: 'Pays',
                score: 0,
                maxScore: maxScores.country,
                matched: false,
                description: `Ne correspond pas aux pays recherchés: ${paysArray.join(', ')}`
            });
        }

        // City compatibility
        // Matches if candidate's ville_residence or ville_origine is in User A's preferred cities
        if (scoreDetails.city !== undefined) {
            const cityResidence = profileB.ville_residence || '';
            const cityOrigine = profileB.ville_origine || '';
            const villesRecherche = profileA.villes_recherche || [];
            const villesArray = Array.isArray(villesRecherche) ? villesRecherche : [villesRecherche];
            
            let matchedCity = '';
            let matchedType = '';
            if (cityResidence && villesArray.includes(cityResidence)) {
                matchedCity = cityResidence;
                matchedType = 'résidence';
            } else if (cityOrigine && villesArray.includes(cityOrigine)) {
                matchedCity = cityOrigine;
                matchedType = 'origine';
            }
            
            details.push({
                label: 'Ville',
                score: scoreDetails.city,
                maxScore: maxScores.city,
                matched: true,
                description: `${matchedCity} (${matchedType}) - Correspond aux villes recherchées: ${villesArray.join(', ')}`
            });
        } else if (profileA.villes_recherche && Array.isArray(profileA.villes_recherche) && profileA.villes_recherche.length > 0) {
            details.push({
                label: 'Ville',
                score: 0,
                maxScore: maxScores.city,
                matched: false,
                description: `Ne correspond pas aux villes recherchées: ${profileA.villes_recherche.join(', ')}`
            });
        }

        // Religion compatibility
        // Exact match with candidate's religion
        if (scoreDetails.religion !== undefined) {
            details.push({
                label: 'Religion',
                score: scoreDetails.religion,
                maxScore: maxScores.religion,
                matched: true,
                description: `${profileB.religion || 'Non spécifié'} - Correspond à la religion recherchée: ${profileA.religion_recherche || 'Non spécifié'}`
            });
        } else if (profileA.religion_recherche) {
            details.push({
                label: 'Religion',
                score: 0,
                maxScore: maxScores.religion,
                matched: false,
                description: `${profileB.religion || 'Non spécifié'} ne correspond pas à la religion recherchée: ${profileA.religion_recherche}`
            });
        }

        // Income compatibility
        // Income hierarchy: 0-2500 (1), 2500-5000 (2), 5000-10000 (3), 10000-20000 (4), 20000-50000 (5), 50000+ (6)
        // Candidate's income must be at or above User A's minimum level
        if (scoreDetails.income !== undefined) {
            const incomeHierarchy = {
                '0-2500': 1,
                '2500-5000': 2,
                '5000-10000': 3,
                '10000-20000': 4,
                '20000-50000': 5,
                '50000+': 6
            };
            const candidateLevel = incomeHierarchy[profileB.revenu] || 0;
            const minimumLevel = incomeHierarchy[profileA.revenu_minimum] || 0;
            details.push({
                label: 'Revenu',
                score: scoreDetails.income,
                maxScore: maxScores.income,
                matched: true,
                description: `${profileB.revenu || 'Non spécifié'} (niveau ${candidateLevel}) - Supérieur ou égal au minimum recherché: ${profileA.revenu_minimum || 'Non spécifié'} (niveau ${minimumLevel})`
            });
        } else if (profileA.revenu_minimum) {
            const incomeHierarchy = {
                '0-2500': 1,
                '2500-5000': 2,
                '5000-10000': 3,
                '10000-20000': 4,
                '20000-50000': 5,
                '50000+': 6
            };
            const candidateLevel = incomeHierarchy[profileB.revenu] || 0;
            const minimumLevel = incomeHierarchy[profileA.revenu_minimum] || 0;
            details.push({
                label: 'Revenu',
                score: 0,
                maxScore: maxScores.income,
                matched: false,
                description: `${profileB.revenu || 'Non spécifié'} (niveau ${candidateLevel}) est inférieur au minimum recherché: ${profileA.revenu_minimum} (niveau ${minimumLevel})`
            });
        }

        // Health status compatibility
        // Candidate's situation_sante must be in User A's preferred health statuses
        if (scoreDetails.health !== undefined) {
            const preferredHealth = profileA.situation_sante || [];
            const preferredArray = Array.isArray(preferredHealth) ? preferredHealth : [preferredHealth];
            const candidateHealth = profileB.situation_sante || [];
            const candidateArray = Array.isArray(candidateHealth) ? candidateHealth : [candidateHealth];
            
            // Get human-readable labels for health situations
            const healthLabels = {
                'sante_tres_bonne': 'Santé très bonne',
                'maladie_chronique': 'Maladie chronique',
                'personne_handicap': 'Personne en situation de handicap',
                'non_voyant_malvoyant': 'Non voyant / Malvoyant',
                'cecite_totale': 'مكفوف (Cécité totale)',
                'troubles_psychiques': 'Troubles psychiques',
                'autres': 'Autres'
            };
            
            const candidateLabels = candidateArray.map(s => healthLabels[s] || s).join(', ');
            const preferredLabels = preferredArray.map(s => healthLabels[s] || s).join(', ');
            
            details.push({
                label: 'Situation de santé',
                score: scoreDetails.health,
                maxScore: maxScores.health,
                matched: true,
                description: `${candidateLabels || 'Non spécifié'} - Correspond aux situations recherchées: ${preferredLabels}`
            });
        } else if (profileA.situation_sante && (Array.isArray(profileA.situation_sante) ? profileA.situation_sante.length > 0 : profileA.situation_sante)) {
            const preferredHealth = profileA.situation_sante || [];
            const preferredArray = Array.isArray(preferredHealth) ? preferredHealth : [preferredHealth];
            const candidateHealth = profileB.situation_sante || [];
            const candidateArray = Array.isArray(candidateHealth) ? candidateHealth : [candidateHealth];
            
            // Get human-readable labels for health situations
            const healthLabels = {
                'sante_tres_bonne': 'Santé très bonne',
                'maladie_chronique': 'Maladie chronique',
                'personne_handicap': 'Personne en situation de handicap',
                'non_voyant_malvoyant': 'Non voyant / Malvoyant',
                'cecite_totale': 'مكفوف (Cécité totale)',
                'troubles_psychiques': 'Troubles psychiques',
                'autres': 'Autres'
            };
            
            const candidateLabels = candidateArray.length > 0 ? candidateArray.map(s => healthLabels[s] || s).join(', ') : 'Non spécifié';
            const preferredLabels = preferredArray.map(s => healthLabels[s] || s).join(', ');
            
            details.push({
                label: 'Situation de santé',
                score: 0,
                maxScore: maxScores.health,
                matched: false,
                description: `${candidateLabels} ne correspond pas aux situations recherchées: ${preferredLabels}`
            });
        }

        // Smoking compatibility
        // Exact match with candidate's fumeur
        if (scoreDetails.smoking !== undefined) {
            details.push({
                label: 'Fumeur',
                score: scoreDetails.smoking,
                maxScore: maxScores.smoking,
                matched: true,
                description: `${profileB.fumeur || 'Non spécifié'} - Correspond à la préférence: ${profileA.fumeur || 'Non spécifié'}`
            });
        } else if (profileA.fumeur) {
            details.push({
                label: 'Fumeur',
                score: 0,
                maxScore: maxScores.smoking,
                matched: false,
                description: `${profileB.fumeur || 'Non spécifié'} ne correspond pas à la préférence: ${profileA.fumeur}`
            });
        }

        // Drinking compatibility
        // Exact match with candidate's buveur
        if (scoreDetails.drinking !== undefined) {
            details.push({
                label: 'Buveur',
                score: scoreDetails.drinking,
                maxScore: maxScores.drinking,
                matched: true,
                description: `${profileB.buveur || 'Non spécifié'} - Correspond à la préférence: ${profileA.buveur || 'Non spécifié'}`
            });
        } else if (profileA.buveur) {
            details.push({
                label: 'Buveur',
                score: 0,
                maxScore: maxScores.drinking,
                matched: false,
                description: `${profileB.buveur || 'Non spécifié'} ne correspond pas à la préférence: ${profileA.buveur}`
            });
        }

        // Has children compatibility
        // Exact match with candidate's has_children
        if (scoreDetails.has_children !== undefined) {
            details.push({
                label: 'Avoir des enfants',
                score: scoreDetails.has_children,
                maxScore: maxScores.has_children,
                matched: true,
                description: `${profileB.has_children ? 'Oui' : 'Non'} - Correspond à la préférence: ${profileA.has_children ? 'Oui' : 'Non'}`
            });
        } else if (profileA.has_children !== null && profileA.has_children !== undefined) {
            details.push({
                label: 'Avoir des enfants',
                score: 0,
                maxScore: maxScores.has_children,
                matched: false,
                description: `${profileB.has_children ? 'Oui' : 'Non'} ne correspond pas à la préférence: ${profileA.has_children ? 'Oui' : 'Non'}`
            });
        }

        // Housing compatibility
        // Exact match with candidate's logement
        if (scoreDetails.housing !== undefined) {
            details.push({
                label: 'Logement',
                score: scoreDetails.housing,
                maxScore: maxScores.housing,
                matched: true,
                description: `${profileB.logement || 'Non spécifié'} - Correspond à la préférence: ${profileA.logement || 'Non spécifié'}`
            });
        } else if (profileA.logement) {
            details.push({
                label: 'Logement',
                score: 0,
                maxScore: maxScores.housing,
                matched: false,
                description: `${profileB.logement || 'Non spécifié'} ne correspond pas à la préférence: ${profileA.logement}`
            });
        }

        // Sport compatibility
        if (scoreDetails.sport !== undefined) {
            details.push({
                label: 'Sport',
                score: scoreDetails.sport,
                maxScore: maxScores.sport,
                matched: true,
                description: `${profileB.sport || 'Non spécifié'} - Correspond à la préférence: ${profileA.sport || 'Non spécifié'}`
            });
        }


        // Hobbies compatibility
        if (scoreDetails.hobbies !== undefined) {
            details.push({
                label: 'Loisirs',
                score: scoreDetails.hobbies,
                maxScore: maxScores.hobbies,
                matched: true,
                description: `${scoreDetails.hobbies} loisir(s) en commun`
            });
        }

        // Origin compatibility
        if (scoreDetails.origin !== undefined) {
            details.push({
                label: 'Origine',
                score: scoreDetails.origin,
                maxScore: maxScores.origin,
                matched: true,
                description: profileB.origine || 'Non spécifié'
            });
        }

        return details;
    };

    const handleCardClick = (match) => {
        setSelectedMatch(match);
        setShowCompatibilityModal(true);
    };

    const handleCancelProposition = async (propositionId) => {
        setCancellingPropositionId(propositionId);
        try {
            const { data } = await axios.patch(`/staff/propositions/${propositionId}/cancel`);
            const pairToast = data?.pair_was_cancelled ? propositionToastFr.cancelSuccessPaired : propositionToastFr.cancelSuccess;
            showToast(pairToast, undefined, 'success');
            router.reload({ only: ['matches', 'appliedFilters', 'defaultFilters', 'userA'] });
        } catch (error) {
            const status = error?.response?.status;
            const backendMsg = error?.response?.data?.message;
            if (status === 403) {
                showToast(propositionToastFr.cancelUnauthorized, undefined, 'error');
            } else if (status === 422 && backendMsg === propositionToastFr.cancelInvalidState) {
                showToast(propositionToastFr.cancelInvalidState, undefined, 'warning');
            } else {
                showToast(propositionToastFr.cancelError, undefined, 'error');
            }
        } finally {
            setCancellingPropositionId(null);
        }
    };

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const params = new URLSearchParams(window.location.search);
        const openProposeId = params.get('openPropose');
        if (openProposeId) {
            const parsed = Number(openProposeId);
            if (!Number.isNaN(parsed)) {
                setPendingOpenProposeId(parsed);
            }
        }
    }, []);

    useEffect(() => {
        if (!pendingOpenProposeId || hasOpenedProposeFromQuery || matches.length === 0) return;
        const match = matches.find((item) => item?.user?.id === pendingOpenProposeId);
        const canProposeFromRequest = Boolean(match?.can_propose_from_request);
        if (match && (match.isAssignedToMe || canProposeFromRequest)) {
            proposeFlow.openProposeModal(match);
            setHasOpenedProposeFromQuery(true);
        }
        // proposeFlow.openProposeModal is stable (useCallback in hook)
        // eslint-disable-next-line react-hooks/exhaustive-deps -- avoid re-running when flow object identity changes
    }, [pendingOpenProposeId, hasOpenedProposeFromQuery, matches]);

    // Search, agency / matchmaker filters and pages of 6 (back to page 1 when the list changes).
    const resultsBrowser = useMatchResultsBrowser(displayMatches, resultFilterOptions, userA?.id ? `/staff/match/search/${userA.id}` : null);
    const { totalPages, from, to, pageRows: paginatedMatches } = resultsBrowser;

    return (
        <AppLayout>
            <Head title="Résultats de Matchmaking" />
            
            <div className="space-y-8 p-6 md:p-8">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => router.visit('/staff/match/search')}
                            className="shrink-0 rounded-lg border-border focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:bg-muted/50"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                        <div className="min-w-0">
                            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Résultats de Matchmaking</h1>
                            <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                                Profils compatibles pour {userA?.name}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant={showFilters ? 'default' : 'outline'}
                            onClick={() => setShowFilters(true)}
                            className="rounded-lg border-border focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                            <Filter className="w-4 h-4 mr-2" />
                            Filtres
                            {activeFilterCount > 0 && (
                                <span className="ml-2 rounded-full bg-primary text-primary-foreground text-xs px-1.5 py-0.5 font-medium">
                                    {activeFilterCount}
                                </span>
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleResetFilters}
                            disabled={isLoading}
                            className="rounded-lg border-border focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
                        >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Réinitialiser
                        </Button>
                    </div>
                </div>

                {/* User A Info Card - Reference Profile */}
                <section className="space-y-3">
                    <h2 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#8B2635]" aria-hidden />
                        PROFIL DE RÉFÉRENCE
                    </h2>
                    <Card className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                        <CardContent className="p-5">
                            <div className="flex items-center gap-4">
                                <div className="relative shrink-0">
                                    <img
                                        src={getProfilePicture(userA, userA.profile)}
                                        alt={userA.name}
                                        className="h-16 w-16 rounded-full object-cover"
                                    />
                                    <span className="absolute bottom-0 left-0 h-3 w-3 rounded-full border-2 border-card bg-green-500" aria-hidden />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="font-semibold text-foreground">{userA.name}</h3>
                                        {userA.profile?.religion && (
                                            <Badge className="rounded-md bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                                                {String(userA.profile.religion).toUpperCase()}
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground">{userA.email}</p>
                                    {userA.profile && (
                                        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                            {getAge(userA.profile) && (
                                                <span className="flex items-center gap-1.5">
                                                    <Calendar className="h-4 w-4 shrink-0" />
                                                    {getAge(userA.profile)} ans
                                                </span>
                                            )}
                                            {/* gender */}
                                            {userA.gender && (
                                                <span className="flex items-center gap-1.5">
                                                    <User className="h-4 w-4 shrink-0" />
                                                    {userA.gender === 'male' ? 'Homme' : 'Femme'}
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1.5">
                                                <MapPin className="h-4 w-4 shrink-0" />
                                                {getLocation(userA.profile)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </section>

                {/* Filters Panel */}
                <MatchmakingFiltersSheet filtersState={matchFilters} gender={userA?.gender} />

                {/* Results */}
                <section className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2 className="text-lg font-semibold text-foreground">
                            {displayMatches.length} profil{displayMatches.length > 1 ? 's' : ''} compatible
                            {displayMatches.length > 1 ? 's' : ''}
                            {userA?.proposition?.exists ? (
                                <span className="ml-2 text-sm font-normal text-muted-foreground">
                                    (proposition en cours — filtre actif)
                                </span>
                            ) : null}
                        </h2>
                        {resultsBrowser.total > 0 && (totalPages > 1 || resultsBrowser.hasCriteria) && (
                            <p className="text-sm text-muted-foreground">
                                {from}&ndash;{to} sur {resultsBrowser.total}
                            </p>
                        )}
                    </div>
                    {/* Search the whole base (hidden while the profile has an active proposition / RDV). */}
                    {!userA?.proposition?.exists && !userA?.rdv?.exists && <MatchResultsToolbar browser={resultsBrowser} />}

                    {matches.length === 0 && !resultsBrowser.serverMode ? (
                        <Card className="overflow-hidden rounded-xl border border-border shadow-sm">
                            <CardContent className="py-16 text-center space-y-3">
                                <p className="text-muted-foreground">
                                    {userA?.proposition?.exists
                                        ? 'Aucun profil compatible ne correspond aux filtres alors qu’une proposition est en cours pour ce membre. Actualisez ou ajustez les filtres.'
                                        : userA?.rdv?.exists
                                          ? 'Aucun profil compatible ne correspond aux filtres alors qu’un RDV est en cours/réussi pour ce membre. Actualisez ou ajustez les filtres.'
                                        : 'Aucun profil compatible trouvé avec les filtres actuels.'}
                                </p>
                                {userA?.proposition?.exists || userA?.rdv?.exists ? (
                                    <Button type="button" variant="outline" onClick={handleRefreshMatchmakingPage}>
                                        Actualiser
                                    </Button>
                                ) : null}
                            </CardContent>
                        </Card>
                    ) : showActivePairMissingInList && !resultsBrowser.serverMode ? (
                        <Card className="overflow-hidden rounded-xl border border-border shadow-sm">
                            <CardContent className="py-16 text-center space-y-3">
                                <p className="text-muted-foreground">
                                    Une proposition ou un RDV est en cours/réussi, mais le profil partenaire n’apparaît pas dans les résultats
                                    filtrés. Ajustez les filtres ou actualisez la page.
                                </p>
                                <Button type="button" variant="outline" onClick={handleRefreshMatchmakingPage}>
                                    Actualiser
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <>
                        {resultsBrowser.total === 0 && !resultsBrowser.loading && (
                            <p className="py-10 text-center text-sm text-muted-foreground">Aucun profil ne correspond à cette recherche.</p>
                        )}
                        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                            {paginatedMatches.map((match) => {
                                const isActivePairCard =
                                    Boolean(userA?.proposition?.exists || userA?.rdv?.exists) &&
                                    Number(match.user?.id) === lockedPairCounterpartId;
                                return (
                                <MatchResultMatchCard
                                    key={match.user.id}
                                    match={match}
                                    onCardClick={handleCardClick}
                                    onOpenPropose={proposeFlow.openProposeModal}
                                    onOpenRequest={proposeFlow.openRequestModal}
                                    onCancelProposition={handleCancelProposition}
                                    cancellingPropositionId={cancellingPropositionId}
                                    onOpenRespondDialog={(propositionId) =>
                                        setRespondDialog({ open: true, propositionId })
                                    }
                                    referenceActivePairMode={isActivePairCard}
                                    referencePendingResponsePropositionId={
                                        isActivePairCard
                                            ? userA?.proposition?.pending_response_proposition_id ?? null
                                            : null
                                    }
                                    activePairCancelPropositionId={
                                        isActivePairCard
                                            ? match.cancellable_proposition?.id ??
                                              userA?.proposition?.proposition_id ??
                                              null
                                            : null
                                    }
                                />
                                );
                            })}
                        </div>

                        <MatchResultsPagination browser={resultsBrowser} />
                        </>
                    )}
                </section>
            </div>

            {/* Compatibility Details Modal */}
            <Dialog open={showCompatibilityModal} onOpenChange={setShowCompatibilityModal}>
                <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-xl border border-border shadow-lg">
                    <DialogHeader className="space-y-2">
                        <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
                            <TrendingUp className="h-5 w-5" />
                            Détails de compatibilité
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            Analyse détaillée de la compatibilité avec le profil de référence
                        </DialogDescription>
                    </DialogHeader>

                    {selectedMatch && (
                        <div className="space-y-6">
                            {/* Profile Summary */}
                            <div className="flex items-start gap-4 rounded-xl bg-muted/50 p-4">
                                <img
                                    src={getProfilePicture(selectedMatch.user, selectedMatch.profile)}
                                    alt={selectedMatch.user.name}
                                    className="w-16 h-16 rounded-full object-cover"
                                />
                                <div className="flex-1">
                                    <h3 className="font-semibold text-lg">{selectedMatch.user.name}</h3>
                                    <p className="text-sm text-muted-foreground">{selectedMatch.user.email}</p>
                                    <div className="mt-2 flex items-center gap-4 text-sm">
                                        {getAge(selectedMatch.profile) && (
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-4 h-4" />
                                                {getAge(selectedMatch.profile)} ans
                                            </span>
                                        )}
                                        <span className="flex items-center gap-1">
                                            <MapPin className="w-4 h-4" />
                                            {getLocation(selectedMatch.profile)}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className={`text-2xl font-bold ${getScoreColor(selectedMatch.score)}`}>
                                        {selectedMatch.score.toFixed(1)}%
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        Compatibilité totale
                                    </div>
                                </div>
                            </div>

                            {/* Compatibility Breakdown */}
                            <div className="space-y-4">
                                <h4 className="font-semibold text-base">Critères de compatibilité</h4>
                                <div className="space-y-3">
                                    {getCompatibilityDetails(selectedMatch.scoreDetails || {}, userA.profile, selectedMatch.profile).map((detail, index) => (
                                        <div key={index} className="rounded-xl border border-border p-4">
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    {detail.matched ? (
                                                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                                                    ) : (
                                                        <XCircle className="w-5 h-5 text-red-600" />
                                                    )}
                                                    <span className="font-medium">{detail.label}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`font-semibold ${detail.matched ? 'text-green-600' : 'text-red-600'}`}>
                                                        {detail.score.toFixed(1)} / {detail.maxScore}
                                                    </span>
                                                    <div className="text-xs text-muted-foreground">
                                                        {detail.maxScore > 0 ? ((detail.score / detail.maxScore) * 100).toFixed(0) : 0}%
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-2">
                                                <div className="w-full bg-muted rounded-full h-2">
                                                    <div
                                                        className={`h-2 rounded-full ${detail.matched ? 'bg-green-600' : 'bg-red-600'}`}
                                                        style={{ width: `${detail.maxScore > 0 ? (detail.score / detail.maxScore) * 100 : 0}%` }}
                                                    />
                                                </div>
                                            </div>
                                            <p className="text-sm text-muted-foreground mt-2">{detail.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Profile Completeness */}
                            <div className="rounded-xl border border-border bg-muted/50 p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium flex items-center gap-2">
                                        <Info className="w-4 h-4" />
                                        Complétude du profil
                                    </span>
                                    <span className="font-semibold">
                                        {selectedMatch.completeness.toFixed(0)}%
                                    </span>
                                </div>
                                <div className="w-full bg-muted rounded-full h-2">
                                    <div
                                        className="bg-blue-600 h-2 rounded-full"
                                        style={{ width: `${selectedMatch.completeness}%` }}
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">
                                    Information à titre indicatif uniquement (non incluse dans le score de compatibilité)
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 border-t border-border pt-4">
                                <Button
                                    variant="outline"
                                    className="flex-1 rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    onClick={() => setShowCompatibilityModal(false)}
                                >
                                    Fermer
                                </Button>
                                <Button
                                    className="flex-1 rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    onClick={() => {
                                        setShowCompatibilityModal(false);
                                        window.open(`/profile/${selectedMatch.user.username || selectedMatch.user.id}`, '_blank', 'noopener,noreferrer');
                                    }}
                                >
                                    <User className="mr-2 w-4 h-4" />
                                    Voir le profil complet
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <MatchmakingProposeRequestModals userA={userA} {...proposeFlow} />

            <MatchmakerRespondToPropositionDialog
                open={respondDialog.open}
                onOpenChange={(open) => setRespondDialog((prev) => ({ ...prev, open }))}
                propositionId={respondDialog.propositionId}
                onSuccess={() =>
                    router.reload({ only: ['matches', 'appliedFilters', 'defaultFilters', 'userA'] })
                }
            />
        </AppLayout>
    );
}

