import { Head, router } from '@inertiajs/react';
import { useState, useEffect, useMemo } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { SearchableMultiSelect } from '@/components/ui/searchable-multi-select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { 
    ArrowLeft, 
    Filter, 
    X, 
    RotateCcw, 
    User, 
    MapPin, 
    Calendar, 
    GraduationCap,
    Briefcase,
    DollarSign,
    Heart,
    TrendingUp,
    CheckCircle2,
    XCircle,
    Info
} from 'lucide-react';
import axios from 'axios';

export default function MatchmakingResults({ userA, matches: initialMatches, defaultFilters, appliedFilters: initialAppliedFilters }) {
    const [matches, setMatches] = useState(initialMatches || []);
    const [appliedFilters, setAppliedFilters] = useState(initialAppliedFilters || {});
    const [isLoading, setIsLoading] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [selectedMatch, setSelectedMatch] = useState(null);
    const [showCompatibilityModal, setShowCompatibilityModal] = useState(false);
    const [showProposeModal, setShowProposeModal] = useState(false);
    const [proposeMatch, setProposeMatch] = useState(null);
    const [proposeMessage, setProposeMessage] = useState('');
    const [sendToReference, setSendToReference] = useState(true);
    const [sendToCompatible, setSendToCompatible] = useState(true);
    const [isSendingProposition, setIsSendingProposition] = useState(false);
    const [propositionError, setPropositionError] = useState('');
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [requestMatch, setRequestMatch] = useState(null);
    const [requestMessage, setRequestMessage] = useState('');
    const [requestError, setRequestError] = useState('');
    const [isSendingRequest, setIsSendingRequest] = useState(false);
    const [pendingOpenProposeId, setPendingOpenProposeId] = useState(null);
    const [hasOpenedProposeFromQuery, setHasOpenedProposeFromQuery] = useState(false);
    
    // Countries and cities state
    const [countries, setCountries] = useState([]);
    const [countryCodeToCities, setCountryCodeToCities] = useState({});
    const [selectedCountryCodes, setSelectedCountryCodes] = useState([]);
    const [loadingCountries, setLoadingCountries] = useState(false);
    const [loadingCities, setLoadingCities] = useState(false);
    const [errorCountries, setErrorCountries] = useState('');

    // Filter state
    const [filters, setFilters] = useState({
        age_min: appliedFilters.age_min || '',
        age_max: appliedFilters.age_max || '',
        religion: appliedFilters.religion || '',
        revenu_minimum: appliedFilters.revenu_minimum || '',
        niveau_etudes: appliedFilters.niveau_etudes || '',
        situation_professionnelle: appliedFilters.situation_professionnelle || '',
        etat_matrimonial: Array.isArray(appliedFilters.etat_matrimonial) ? appliedFilters.etat_matrimonial : (appliedFilters.etat_matrimonial ? [appliedFilters.etat_matrimonial] : []),
        pays_recherche: Array.isArray(appliedFilters.pays_recherche) ? appliedFilters.pays_recherche : (appliedFilters.pays_recherche ? [appliedFilters.pays_recherche] : []),
        villes_recherche: Array.isArray(appliedFilters.villes_recherche) ? appliedFilters.villes_recherche : (appliedFilters.villes_recherche ? [appliedFilters.villes_recherche] : []),
        etat_sante: appliedFilters.etat_sante || '',
        fumeur: appliedFilters.fumeur || '',
        buveur: appliedFilters.buveur || '',
        has_children: appliedFilters.has_children || '',
        origine: appliedFilters.origine || '',
        logement: appliedFilters.logement || '',
        taille_min: appliedFilters.taille_min || '',
        taille_max: appliedFilters.taille_max || '',
        poids_min: appliedFilters.poids_min || '',
        poids_max: appliedFilters.poids_max || '',
        pays_residence: appliedFilters.pays_residence || '',
        pays_origine: appliedFilters.pays_origine || '',
        ville_residence: appliedFilters.ville_residence || '',
        ville_origine: appliedFilters.ville_origine || '',
        situation_sante: Array.isArray(appliedFilters.situation_sante) ? appliedFilters.situation_sante : (appliedFilters.situation_sante ? [appliedFilters.situation_sante] : []),
        motorise: appliedFilters.motorise || '',
        children_count: appliedFilters.children_count || '',
        hijab_choice: appliedFilters.hijab_choice || '',
        veil: appliedFilters.veil || '',
        niqab_acceptance: appliedFilters.niqab_acceptance || '',
        sport: appliedFilters.sport || '',
        secteur: appliedFilters.secteur || '',
        polygamy: appliedFilters.polygamy || '',
        foreign_marriage: appliedFilters.foreign_marriage || '',
        work_after_marriage: appliedFilters.work_after_marriage || '',
    });

    // Update filters when appliedFilters change
    useEffect(() => {
        setAppliedFilters(initialAppliedFilters || {});
        
        // Handle etat_matrimonial - keep as array for multi-select
        let etatMatrimonial = [];
        if (initialAppliedFilters?.etat_matrimonial) {
            if (Array.isArray(initialAppliedFilters.etat_matrimonial)) {
                etatMatrimonial = initialAppliedFilters.etat_matrimonial;
            } else {
                etatMatrimonial = [initialAppliedFilters.etat_matrimonial];
            }
        }
        
        // Handle pays_recherche - keep as array for multi-select
        let paysRecherche = [];
        if (initialAppliedFilters?.pays_recherche) {
            if (Array.isArray(initialAppliedFilters.pays_recherche)) {
                paysRecherche = initialAppliedFilters.pays_recherche;
            } else {
                paysRecherche = [initialAppliedFilters.pays_recherche];
            }
        }
        
        // Handle villes_recherche - keep as array for multi-select
        let villesRecherche = [];
        if (initialAppliedFilters?.villes_recherche) {
            if (Array.isArray(initialAppliedFilters.villes_recherche)) {
                villesRecherche = initialAppliedFilters.villes_recherche;
            } else {
                villesRecherche = [initialAppliedFilters.villes_recherche];
            }
        }
        
        // Handle situation_sante - keep as array for multi-select
        let situationSante = [];
        if (initialAppliedFilters?.situation_sante) {
            if (Array.isArray(initialAppliedFilters.situation_sante)) {
                situationSante = initialAppliedFilters.situation_sante;
            } else {
                situationSante = [initialAppliedFilters.situation_sante];
            }
        }
        
        // Handle has_children - convert boolean to 'yes'/'no' string
        let hasChildren = '';
        if (initialAppliedFilters?.has_children !== undefined && initialAppliedFilters?.has_children !== '') {
            if (typeof initialAppliedFilters.has_children === 'boolean') {
                hasChildren = initialAppliedFilters.has_children ? 'yes' : 'no';
            } else if (initialAppliedFilters.has_children === true || initialAppliedFilters.has_children === 'true' || initialAppliedFilters.has_children === 1) {
                hasChildren = 'yes';
            } else if (initialAppliedFilters.has_children === false || initialAppliedFilters.has_children === 'false' || initialAppliedFilters.has_children === 0) {
                hasChildren = 'no';
            } else {
                hasChildren = initialAppliedFilters.has_children;
            }
        }
        
        setFilters({
            age_min: initialAppliedFilters?.age_min || '',
            age_max: initialAppliedFilters?.age_max || '',
            religion: initialAppliedFilters?.religion || '',
            revenu_minimum: initialAppliedFilters?.revenu_minimum || '',
            niveau_etudes: initialAppliedFilters?.niveau_etudes || '',
            situation_professionnelle: initialAppliedFilters?.situation_professionnelle || '',
            etat_matrimonial: etatMatrimonial,
            pays_recherche: paysRecherche,
            villes_recherche: villesRecherche,
            etat_sante: initialAppliedFilters?.etat_sante || '',
            situation_sante: situationSante,
            fumeur: initialAppliedFilters?.fumeur || '',
            buveur: initialAppliedFilters?.buveur || '',
            has_children: hasChildren,
            origine: initialAppliedFilters?.origine || '',
            logement: initialAppliedFilters?.logement || '',
            taille_min: initialAppliedFilters?.taille_min || '',
            taille_max: initialAppliedFilters?.taille_max || '',
            poids_min: initialAppliedFilters?.poids_min || '',
            poids_max: initialAppliedFilters?.poids_max || '',
            pays_residence: Array.isArray(initialAppliedFilters?.pays_residence) 
                ? initialAppliedFilters.pays_residence[0] || '' 
                : initialAppliedFilters?.pays_residence || '',
            pays_origine: Array.isArray(initialAppliedFilters?.pays_origine) 
                ? initialAppliedFilters.pays_origine[0] || '' 
                : initialAppliedFilters?.pays_origine || '',
            ville_residence: Array.isArray(initialAppliedFilters?.ville_residence) 
                ? initialAppliedFilters.ville_residence[0] || '' 
                : initialAppliedFilters?.ville_residence || '',
            ville_origine: Array.isArray(initialAppliedFilters?.ville_origine) 
                ? initialAppliedFilters.ville_origine[0] || '' 
                : initialAppliedFilters?.ville_origine || '',
            motorise: initialAppliedFilters?.motorise || '',
            children_count: initialAppliedFilters?.children_count || '',
            hijab_choice: initialAppliedFilters?.hijab_choice || '',
            veil: initialAppliedFilters?.veil || '',
            niqab_acceptance: initialAppliedFilters?.niqab_acceptance || '',
            sport: initialAppliedFilters?.sport || '',
            secteur: initialAppliedFilters?.secteur || '',
            polygamy: initialAppliedFilters?.polygamy || '',
            foreign_marriage: initialAppliedFilters?.foreign_marriage || '',
            work_after_marriage: initialAppliedFilters?.work_after_marriage || '',
        });
    }, [initialAppliedFilters]);

    // Fetch countries and cities from API
    useEffect(() => {
        let isMounted = true;
        const fetchCountries = async () => {
            try {
                setLoadingCountries(true);
                setErrorCountries('');
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
                if (!isMounted) return;
                setErrorCountries('Impossible de charger la liste des pays.');
            } finally {
                if (isMounted) setLoadingCountries(false);
            }
        };
        fetchCountries();
        return () => {
            isMounted = false;
        };
    }, []);

    // Initialize selectedCountryCodes from pays_recherche
    useEffect(() => {
        if (countries.length > 0 && filters.pays_recherche && filters.pays_recherche.length > 0 && selectedCountryCodes.length === 0) {
            const paysArray = Array.isArray(filters.pays_recherche) ? filters.pays_recherche : [filters.pays_recherche];
            const codes = paysArray
                .map(pays => {
                    const country = countries.find(c => 
                        c.frenchName.toLowerCase() === pays.toLowerCase() || 
                        c.iso2.toLowerCase() === pays.toLowerCase() ||
                        c.iso3.toLowerCase() === pays.toLowerCase()
                    );
                    return country?.iso2;
                })
                .filter(Boolean);
            
            if (codes.length > 0) {
                setSelectedCountryCodes(codes);
            }
        }
    }, [countries, filters.pays_recherche, selectedCountryCodes.length]);

    // Prepare countries options for SearchableMultiSelect
    const countryOptions = useMemo(() => {
        return countries.map((country) => ({
            value: country.iso2,
            label: country.frenchName,
        }));
    }, [countries]);

    // Get available cities for selected countries
    const availableCities = useMemo(() => {
        if (selectedCountryCodes.length === 0) return [];
        
        const allCities = new Set();
        selectedCountryCodes.forEach((code) => {
            const cities = countryCodeToCities[code] || [];
            cities.forEach((city) => allCities.add(city));
        });
        
        return Array.from(allCities).sort().map((city) => ({
            value: city,
            label: city,
        }));
    }, [selectedCountryCodes, countryCodeToCities]);

    // Handle country selection
    const handleCountryChange = (selectedCodes) => {
        setSelectedCountryCodes(selectedCodes);
        
        // Update filters with country names (frenchName) for backend
        const selectedCountries = selectedCodes.map((code) => {
            const country = countries.find((c) => c.iso2 === code);
            return country ? country.frenchName : code;
        });
        
        setFilters((prev) => ({
            ...prev,
            pays_recherche: selectedCountries,
        }));

        // Clear cities if no countries selected
        if (selectedCodes.length === 0) {
            setFilters((prev) => ({
                ...prev,
                villes_recherche: [],
            }));
        } else {
            // Filter out cities that are not in the selected countries
            const currentVilles = Array.isArray(filters.villes_recherche) ? filters.villes_recherche : [];
            const validCities = availableCities.map((c) => c.value);
            const filteredVilles = currentVilles.filter((ville) => validCities.includes(ville));
            
            if (filteredVilles.length !== currentVilles.length) {
                setFilters((prev) => ({
                    ...prev,
                    villes_recherche: filteredVilles,
                }));
            }
        }
    };

    // Apply filters
    const handleApplyFilters = async () => {
        setIsLoading(true);
        try {
            const response = await axios.post(`/staff/match/filters/${userA.id}`, filters);
            setMatches(response.data.matches);
            setAppliedFilters(response.data.appliedFilters);
            setShowFilters(false);
        } catch (error) {
            console.error('Error applying filters:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Reset filters to default
    const handleResetFilters = async () => {
        setIsLoading(true);
        try {
            // Clear all filters
            const emptyFilters = {};
            const response = await axios.post(`/staff/match/filters/${userA.id}`, emptyFilters);
            setMatches(response.data.matches);
            setAppliedFilters(response.data.appliedFilters);
            setFilters({
                age_min: '',
                age_max: '',
                religion: '',
                revenu_minimum: '',
                niveau_etudes: '',
                situation_professionnelle: '',
                etat_matrimonial: [],
                pays_recherche: [],
                villes_recherche: [],
                situation_sante: [],
                etat_sante: '',
                fumeur: '',
                buveur: '',
                has_children: '',
                origine: '',
                logement: '',
                taille_min: '',
                taille_max: '',
                poids_min: '',
                poids_max: '',
            });
            setShowFilters(false);
        } catch (error) {
            console.error('Error resetting filters:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Helper functions
    const getProfilePicture = (user, profile = null) => {
        // Check if profile is passed directly (for matches) or via user.profile
        const profilePicturePath = profile?.profile_picture_path || user.profile?.profile_picture_path;
        if (profilePicturePath) {
            return `/storage/${profilePicturePath}`;
        }
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`;
    };

    const getLocation = (profile) => {
        // Check residence first, then origin
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
        if (score >= 70) return 'text-green-600';
        if (score >= 50) return 'text-yellow-600';
        return 'text-orange-600';
    };

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

    const openProposeModal = (match, event) => {
        if (event) {
            event.stopPropagation();
        }
        setProposeMatch(match);
        setProposeMessage('');
        setSendToReference(true);
        setSendToCompatible(true);
        setPropositionError('');
        setShowProposeModal(true);
    };

    const openRequestModal = (match, event) => {
        if (event) {
            event.stopPropagation();
        }
        setRequestMatch(match);
        setRequestMessage('');
        setRequestError('');
        setShowRequestModal(true);
    };

    const handleSendProposition = async (event) => {
        event.preventDefault();
        if (!proposeMatch) return;

        const trimmedMessage = proposeMessage.trim();
        if (!trimmedMessage) {
            setPropositionError('Veuillez saisir un message.');
            return;
        }
        if (!sendToReference && !sendToCompatible) {
            setPropositionError('Veuillez sélectionner au moins un destinataire.');
            return;
        }

        setIsSendingProposition(true);
        setPropositionError('');
        try {
            await axios.post('/staff/propositions', {
                reference_user_id: userA.id,
                compatible_user_id: proposeMatch.user.id,
                message: trimmedMessage,
                send_to_reference: sendToReference,
                send_to_compatible: sendToCompatible,
            });
            setShowProposeModal(false);
            setProposeMatch(null);
        } catch (error) {
            const message = error?.response?.data?.message || 'Une erreur est survenue.';
            setPropositionError(message);
        } finally {
            setIsSendingProposition(false);
        }
    };

    const handleSendRequest = async (event) => {
        event.preventDefault();
        if (!requestMatch) return;

        const trimmedMessage = requestMessage.trim();
        if (!trimmedMessage) {
            setRequestError('Veuillez saisir un message.');
            return;
        }

        setIsSendingRequest(true);
        setRequestError('');
        try {
            await axios.post('/staff/proposition-requests', {
                reference_user_id: userA.id,
                compatible_user_id: requestMatch.user.id,
                message: trimmedMessage,
            });
            setShowRequestModal(false);
            setRequestMatch(null);
        } catch (error) {
            const message = error?.response?.data?.message || 'Une erreur est survenue.';
            setRequestError(message);
        } finally {
            setIsSendingRequest(false);
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
            openProposeModal(match);
            setHasOpenedProposeFromQuery(true);
        }
    }, [pendingOpenProposeId, hasOpenedProposeFromQuery, matches]);

    const getRequestButtonLabel = (status) => {
        if (status === 'pending') {
            return 'Proposition envoyée (en attente de réponse)';
        }
        if (status === 'accepted') {
            return 'Proposer';
        }
        if (status === 'rejected') {
            return 'Proposition refusée';
        }
        return 'Demande de propositions';
    };

    return (
        <AppLayout>
            <Head title="Résultats de Matchmaking" />
            
            <div className="space-y-6 p-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => router.visit('/staff/match/search')}
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Résultats de Matchmaking</h1>
                            <p className="text-muted-foreground mt-1">
                                Profils compatibles pour {userA?.name}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant={showFilters ? 'default' : 'outline'}
                            onClick={() => setShowFilters(!showFilters)}
                        >
                            <Filter className="w-4 h-4 mr-2" />
                            Filtres
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleResetFilters}
                            disabled={isLoading}
                        >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Réinitialiser
                        </Button>
                    </div>
                </div>

                {/* User A Info Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>Profil de référence</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-4">
                            <img
                                src={getProfilePicture(userA)}
                                alt={userA.name}
                                className="w-16 h-16 rounded-full object-cover"
                            />
                            <div>
                                <h3 className="font-semibold">{userA.name}</h3>
                                <p className="text-sm text-muted-foreground">{userA.email}</p>
                                {userA.profile && (
                                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                        {getAge(userA.profile) && <span>{getAge(userA.profile)} ans</span>}
                                        <span>{getLocation(userA.profile)}</span>
                                        {userA.profile.religion && (
                                            <Badge variant="outline">{userA.profile.religion}</Badge>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Filters Panel */}
                {showFilters && (
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Filtres de recherche</CardTitle>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setShowFilters(false)}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {/* Age Range */}
                                <div className="space-y-2">
                                    <Label>Âge minimum</Label>
                                    <Input
                                        type="number"
                                        value={filters.age_min}
                                        onChange={(e) => setFilters({ ...filters, age_min: e.target.value })}
                                        placeholder="Ex: 25"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Âge maximum</Label>
                                    <Input
                                        type="number"
                                        value={filters.age_max}
                                        onChange={(e) => setFilters({ ...filters, age_max: e.target.value })}
                                        placeholder="Ex: 35"
                                    />
                                </div>

                                {/* Pays recherché - Searchable Multi-Select */}
                                <div className="space-y-2">
                                    <Label>Pays recherché</Label>
                                    {loadingCountries ? (
                                        <div className="rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-500">
                                            Chargement des pays...
                                        </div>
                                    ) : (
                                        <SearchableMultiSelect
                                            options={countryOptions}
                                            selectedValues={selectedCountryCodes}
                                            onSelectionChange={handleCountryChange}
                                            placeholder="Sélectionnez les pays"
                                            searchPlaceholder="Search for Location"
                                            emptyMessage="Aucun pays trouvé"
                                        />
                                    )}
                                    {errorCountries && <p className="mt-1 text-xs text-red-500">{errorCountries}</p>}
                                </div>

                                {/* Villes recherchées - Searchable Multi-Select */}
                                <div className="space-y-2">
                                    <Label>Villes recherchées</Label>
                                    {selectedCountryCodes.length === 0 ? (
                                        <div className="rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-400">
                                            Veuillez d'abord sélectionner au moins un pays
                                        </div>
                                    ) : loadingCities ? (
                                        <div className="rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-500">
                                            Chargement des villes...
                                        </div>
                                    ) : (
                                        <SearchableMultiSelect
                                            options={availableCities}
                                            selectedValues={Array.isArray(filters.villes_recherche) ? filters.villes_recherche : []}
                                            onSelectionChange={(values) => {
                                                setFilters((prev) => ({
                                                    ...prev,
                                                    villes_recherche: values,
                                                }));
                                            }}
                                            placeholder="Sélectionnez les villes"
                                            searchPlaceholder="Search for Location"
                                            emptyMessage="Aucune ville trouvée"
                                        />
                                    )}
                                </div>

                                {/* Religion */}
                                <div className="space-y-2">
                                    <Label>Religion</Label>
                                    <Select
                                        value={filters.religion || 'all'}
                                        onValueChange={(value) => setFilters({ ...filters, religion: value === 'all' ? '' : value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Toutes" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Toutes</SelectItem>
                                            <SelectItem value="pratiquant">Pratiquant(e)</SelectItem>
                                            <SelectItem value="non-pratiquant">Non pratiquant(e)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Education */}
                                <div className="space-y-2">
                                    <Label>Niveau d'études</Label>
                                    <Select
                                        value={filters.niveau_etudes || 'all'}
                                        onValueChange={(value) => setFilters({ ...filters, niveau_etudes: value === 'all' ? '' : value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Tous" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Tous</SelectItem>
                                            <SelectItem value="moins-bac">Moins Bac</SelectItem>
                                            <SelectItem value="bac">Bac</SelectItem>
                                            <SelectItem value="bac+2">Bac +2</SelectItem>
                                            <SelectItem value="bac+3-4">Bac +3/4</SelectItem>
                                            <SelectItem value="bac+5-master">Bac +5/Master</SelectItem>
                                            <SelectItem value="bac+8-doctorat">Bac +8/Doctorat</SelectItem>
                                            <SelectItem value="peu-importe">Peu importe</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Employment Status */}
                                <div className="space-y-2">
                                    <Label>Situation professionnelle</Label>
                                    <Select
                                        value={filters.situation_professionnelle || 'all'}
                                        onValueChange={(value) => setFilters({ ...filters, situation_professionnelle: value === 'all' ? '' : value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Toutes" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Toutes</SelectItem>
                                            <SelectItem value="etudiant">Étudiant</SelectItem>
                                            <SelectItem value="emploi-salarie">Emploi salarié</SelectItem>
                                            <SelectItem value="propre-patron">Propre patron</SelectItem>
                                            <SelectItem value="sans-emploi">Sans emploi</SelectItem>
                                            <SelectItem value="retraite">Retraité</SelectItem>
                                            <SelectItem value="recherche-emploi">À la recherche d'emploi</SelectItem>
                                            <SelectItem value="femme-au-foyer">Femme au foyer</SelectItem>
                                            <SelectItem value="autre">Autre</SelectItem>
                                            <SelectItem value="peu-importe">Peu importe</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Minimum Income */}
                                <div className="space-y-2">
                                    <Label>Revenu minimum</Label>
                                    <Select
                                        value={filters.revenu_minimum || 'all'}
                                        onValueChange={(value) => setFilters({ ...filters, revenu_minimum: value === 'all' ? '' : value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Tous" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Tous</SelectItem>
                                            <SelectItem value="0-2500">0-2500 MAD</SelectItem>
                                            <SelectItem value="2500-5000">2500-5000 MAD</SelectItem>
                                            <SelectItem value="5000-10000">5000-10000 MAD</SelectItem>
                                            <SelectItem value="10000-20000">10000-20000 MAD</SelectItem>
                                            <SelectItem value="20000-50000">20000-50000 MAD</SelectItem>
                                            <SelectItem value="50000+">+50000 MAD</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Marital Status - Multi-select */}
                                <div className="space-y-2">
                                    <Label>État matrimonial</Label>
                                    <div className="flex flex-wrap gap-4 rounded-lg border p-3">
                                        {['celibataire', 'marie', 'divorce', 'veuf'].map((option) => {
                                            const currentValue = Array.isArray(filters.etat_matrimonial) ? filters.etat_matrimonial : [];
                                            const isChecked = currentValue.includes(option);
                                            return (
                                                <label key={option} className="flex items-center space-x-2 cursor-pointer">
                                                    <Checkbox
                                                        checked={isChecked}
                                                        onCheckedChange={(checked) => {
                                                            const current = Array.isArray(filters.etat_matrimonial) ? filters.etat_matrimonial : [];
                                                            const newValue = checked
                                                                ? [...current, option]
                                                                : current.filter((v) => v !== option);
                                                            setFilters({ ...filters, etat_matrimonial: newValue });
                                                        }}
                                                    />
                                                    <span className="text-sm">
                                                        {option === 'celibataire' ? 'Célibataire' : 
                                                         option === 'marie' ? 'Marié(e)' : 
                                                         option === 'divorce' ? 'Divorcé(e)' : 
                                                         'Veuf(ve)'}
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Smoker */}
                                <div className="space-y-2">
                                    <Label>Fumeur</Label>
                                    <Select
                                        value={filters.fumeur || 'all'}
                                        onValueChange={(value) => setFilters({ ...filters, fumeur: value === 'all' ? '' : value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Tous" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Tous</SelectItem>
                                            <SelectItem value="oui">Oui</SelectItem>
                                            <SelectItem value="non">Non</SelectItem>
                                            <SelectItem value="parfois">Parfois</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Drinker */}
                                <div className="space-y-2">
                                    <Label>Buveur</Label>
                                    <Select
                                        value={filters.buveur || 'all'}
                                        onValueChange={(value) => setFilters({ ...filters, buveur: value === 'all' ? '' : value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Tous" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Tous</SelectItem>
                                            <SelectItem value="oui">Oui</SelectItem>
                                            <SelectItem value="non">Non</SelectItem>
                                            <SelectItem value="parfois">Parfois</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Has Children */}
                                <div className="space-y-2">
                                    <Label>Enfants</Label>
                                    <Select
                                        value={filters.has_children || 'all'}
                                        onValueChange={(value) => setFilters({ ...filters, has_children: value === 'all' ? '' : value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Tous" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Tous</SelectItem>
                                            <SelectItem value="yes">Avec enfants</SelectItem>
                                            <SelectItem value="no">Sans enfants</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Number of Children */}
                                <div className="space-y-2">
                                    <Label>Nombre d'enfants</Label>
                                    <Input
                                        type="number"
                                        value={filters.children_count}
                                        onChange={(e) => setFilters({ ...filters, children_count: e.target.value })}
                                        placeholder="Ex: 2"
                                        min="0"
                                        max="20"
                                    />
                                </div>

                                {/* Origin */}
                                <div className="space-y-2">
                                    <Label>Origine</Label>
                                    <Input
                                        type="text"
                                        value={filters.origine}
                                        onChange={(e) => setFilters({ ...filters, origine: e.target.value })}
                                        placeholder="Ex: sahraoui"
                                    />
                                </div>

                                {/* Country of Residence */}
                                <div className="space-y-2">
                                    <Label>Pays de résidence</Label>
                                    <Input
                                        type="text"
                                        value={filters.pays_residence}
                                        onChange={(e) => setFilters({ ...filters, pays_residence: e.target.value })}
                                        placeholder="Ex: Maroc"
                                    />
                                </div>

                                {/* Country of Origin */}
                                <div className="space-y-2">
                                    <Label>Pays d'origine</Label>
                                    <Input
                                        type="text"
                                        value={filters.pays_origine}
                                        onChange={(e) => setFilters({ ...filters, pays_origine: e.target.value })}
                                        placeholder="Ex: Maroc"
                                    />
                                </div>

                                {/* City of Residence */}
                                <div className="space-y-2">
                                    <Label>Ville de résidence</Label>
                                    <Input
                                        type="text"
                                        value={filters.ville_residence}
                                        onChange={(e) => setFilters({ ...filters, ville_residence: e.target.value })}
                                        placeholder="Ex: Casablanca"
                                    />
                                </div>

                                {/* City of Origin */}
                                <div className="space-y-2">
                                    <Label>Ville d'origine</Label>
                                    <Input
                                        type="text"
                                        value={filters.ville_origine}
                                        onChange={(e) => setFilters({ ...filters, ville_origine: e.target.value })}
                                        placeholder="Ex: Casablanca"
                                    />
                                </div>

                                {/* Housing */}
                                <div className="space-y-2">
                                    <Label>Logement</Label>
                                    <Input
                                        type="text"
                                        value={filters.logement}
                                        onChange={(e) => setFilters({ ...filters, logement: e.target.value })}
                                        placeholder="Ex: familial"
                                    />
                                </div>

                                {/* Health Situation - Multi-select */}
                                <div className="space-y-2">
                                    <Label>Situation de santé</Label>
                                    <div className="flex flex-wrap gap-4 rounded-lg border p-3">
                                        {[
                                            { value: 'sante_tres_bonne', label: 'Santé très bonne' },
                                            { value: 'maladie_chronique', label: 'Maladie chronique' },
                                            { value: 'personne_handicap', label: 'Personne en situation de handicap' },
                                            { value: 'non_voyant_malvoyant', label: 'Non voyant / Malvoyant' },
                                            { value: 'cecite_totale', label: 'مكفوف (Cécité totale)' },
                                            { value: 'troubles_psychiques', label: 'Troubles psychiques' },
                                            { value: 'autres', label: 'Autres' }
                                        ].map((option) => {
                                            const currentValue = Array.isArray(filters.situation_sante) ? filters.situation_sante : [];
                                            const isChecked = currentValue.includes(option.value);
                                            return (
                                                <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
                                                    <Checkbox
                                                        checked={isChecked}
                                                        onCheckedChange={(checked) => {
                                                            const current = Array.isArray(filters.situation_sante) ? filters.situation_sante : [];
                                                            const newValue = checked
                                                                ? [...current, option.value]
                                                                : current.filter((v) => v !== option.value);
                                                            setFilters({ ...filters, situation_sante: newValue });
                                                        }}
                                                    />
                                                    <span className="text-sm">{option.label}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Motorized */}
                                <div className="space-y-2">
                                    <Label>Motorisé</Label>
                                    <Select
                                        value={filters.motorise || 'all'}
                                        onValueChange={(value) => setFilters({ ...filters, motorise: value === 'all' ? '' : value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Tous" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Tous</SelectItem>
                                            <SelectItem value="oui">Oui</SelectItem>
                                            <SelectItem value="non">Non</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Sport */}
                                <div className="space-y-2">
                                    <Label>Sport</Label>
                                    <Select
                                        value={filters.sport || 'all'}
                                        onValueChange={(value) => setFilters({ ...filters, sport: value === 'all' ? '' : value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Tous" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Tous</SelectItem>
                                            <SelectItem value="oui">Oui</SelectItem>
                                            <SelectItem value="non">Non</SelectItem>
                                            <SelectItem value="parfois">Parfois</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Sector */}
                                <div className="space-y-2">
                                    <Label>Secteur d'activité</Label>
                                    <Input
                                        type="text"
                                        value={filters.secteur}
                                        onChange={(e) => setFilters({ ...filters, secteur: e.target.value })}
                                        placeholder="Ex: informatique-telecoms"
                                    />
                                </div>

                                {/* Female-specific filters - only show when looking for female profiles */}
                                {userA?.gender === 'male' && (
                                    <>
                                        {/* Hijab Choice (for women) */}
                                        <div className="space-y-2">
                                            <Label>Choix de hijab</Label>
                                            <Select
                                                value={filters.hijab_choice || 'all'}
                                                onValueChange={(value) => setFilters({ ...filters, hijab_choice: value === 'all' ? '' : value })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Tous" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">Tous</SelectItem>
                                                    <SelectItem value="voile">Voile</SelectItem>
                                                    <SelectItem value="non_voile">Non voilé</SelectItem>
                                                    <SelectItem value="niqab">Niqab</SelectItem>
                                                    <SelectItem value="idea_niqab">Idée niqab</SelectItem>
                                                    <SelectItem value="idea_hijab">Idée hijab</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Veil (for women) */}
                                        <div className="space-y-2">
                                            <Label>Voile</Label>
                                            <Select
                                                value={filters.veil || 'all'}
                                                onValueChange={(value) => setFilters({ ...filters, veil: value === 'all' ? '' : value })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Tous" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">Tous</SelectItem>
                                                    <SelectItem value="veiled">Voilée</SelectItem>
                                                    <SelectItem value="non_veiled">Non voilée</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Niqab Acceptance (for women) */}
                                        <div className="space-y-2">
                                            <Label>Acceptation du niqab</Label>
                                            <Select
                                                value={filters.niqab_acceptance || 'all'}
                                                onValueChange={(value) => setFilters({ ...filters, niqab_acceptance: value === 'all' ? '' : value })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Tous" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">Tous</SelectItem>
                                                    <SelectItem value="yes">Oui</SelectItem>
                                                    <SelectItem value="no">Non</SelectItem>
                                                    <SelectItem value="to_discuss">À discuter</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Polygamy (for women) */}
                                        <div className="space-y-2">
                                            <Label>Polygamie</Label>
                                            <Select
                                                value={filters.polygamy || 'all'}
                                                onValueChange={(value) => setFilters({ ...filters, polygamy: value === 'all' ? '' : value })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Tous" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">Tous</SelectItem>
                                                    <SelectItem value="accepted">Acceptée</SelectItem>
                                                    <SelectItem value="not_accepted">Non acceptée</SelectItem>
                                                    <SelectItem value="to_discuss">À discuter</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Foreign Marriage (for women) */}
                                        <div className="space-y-2">
                                            <Label>Mariage avec une personne étrangère</Label>
                                            <Select
                                                value={filters.foreign_marriage || 'all'}
                                                onValueChange={(value) => setFilters({ ...filters, foreign_marriage: value === 'all' ? '' : value })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Tous" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">Tous</SelectItem>
                                                    <SelectItem value="yes">Oui</SelectItem>
                                                    <SelectItem value="no">Non</SelectItem>
                                                    <SelectItem value="maybe_discuss">Peut-être / À discuter</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Work After Marriage (for women) */}
                                        <div className="space-y-2">
                                            <Label>Travail après le mariage</Label>
                                            <Select
                                                value={filters.work_after_marriage || 'all'}
                                                onValueChange={(value) => setFilters({ ...filters, work_after_marriage: value === 'all' ? '' : value })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Tous" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">Tous</SelectItem>
                                                    <SelectItem value="yes">Oui</SelectItem>
                                                    <SelectItem value="no">Non</SelectItem>
                                                    <SelectItem value="maybe">Peut-être</SelectItem>
                                                    <SelectItem value="depending_situation">Selon la situation</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="flex justify-end gap-2 mt-6">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowFilters(false)}
                                >
                                    Annuler
                                </Button>
                                <Button
                                    onClick={handleApplyFilters}
                                    disabled={isLoading}
                                >
                                    {isLoading ? 'Application...' : 'Appliquer les filtres'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Results */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold">
                            {matches.length} profil{matches.length > 1 ? 's' : ''} compatible{matches.length > 1 ? 's' : ''}
                        </h2>
                    </div>

                    {matches.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <p className="text-muted-foreground">
                                    Aucun profil compatible trouvé avec les filtres actuels.
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {matches.map((match) => (
                                <Card 
                                    key={match.user.id} 
                                    className="hover:shadow-md transition-shadow cursor-pointer"
                                    onClick={() => handleCardClick(match)}
                                >
                                    <CardHeader>
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-start gap-4 flex-1">
                                                <img
                                                    src={getProfilePicture(match.user, match.profile)}
                                                    alt={match.user.name}
                                                    className="w-16 h-16 rounded-full object-cover"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <CardTitle className="text-lg truncate">
                                                        {match.user.name}
                                                    </CardTitle>
                                                    <CardDescription className="mt-1 truncate">
                                                        {match.user.email}
                                                    </CardDescription>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <Badge 
                                                    variant="outline" 
                                                    className={`${getScoreColor(match.score)} font-semibold`}
                                                >
                                                    <TrendingUp className="w-3 h-3 mr-1" />
                                                    {match.score.toFixed(1)}%
                                                </Badge>
                                                <span className="text-xs text-muted-foreground">
                                                    {match.completeness.toFixed(0)}% complet
                                                </span>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="space-y-2 text-sm">
                                            {getAge(match.profile) && (
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <Calendar className="w-4 h-4" />
                                                    <span>{getAge(match.profile)} ans</span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <MapPin className="w-4 h-4" />
                                                <span className="truncate">{getLocation(match.profile)}</span>
                                            </div>
                                            {match.profile.niveau_etudes && (
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <GraduationCap className="w-4 h-4" />
                                                    <span>{match.profile.niveau_etudes}</span>
                                                </div>
                                            )}
                                            {match.profile.situation_professionnelle && (
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <Briefcase className="w-4 h-4" />
                                                    <span>{match.profile.situation_professionnelle}</span>
                                                </div>
                                            )}
                                            {match.profile.religion && (
                                                <Badge variant="outline" className="w-fit">
                                                    {match.profile.religion}
                                                </Badge>
                                            )}
                                        </div>
                                        {match.isAssignedToMe ? (
                                            <Badge variant="default" className="bg-green-600">
                                                Assigné à moi
                                            </Badge>
) : match.assigned_matchmaker ? (
    <Badge variant="outline" className="border-orange-500 text-orange-600">
        Assigné à: {match.assigned_matchmaker.name}
    </Badge>
) : (
    <Badge variant="outline" className="border-gray-300 text-gray-600">
        Non assigné
    </Badge>
)}


                                        <Separator />
                                        {!match.isAssignedToMe && match.assigned_matchmaker && (() => {
                                            const requestStatusForLabel = match.can_propose_from_request
                                                ? match.proposition_request_status
                                                : null;

                                            return (
                                            <Button
                                                variant="outline"
                                                className="w-full"
                                                onClick={(event) => {
                                                    if (match.can_propose_from_request) {
                                                        openProposeModal(match, event);
                                                        return;
                                                    }
                                                    openRequestModal(match, event);
                                                }}
                                                disabled={requestStatusForLabel === 'pending' || requestStatusForLabel === 'rejected'}
                                            >
                                                <Info className="w-4 h-4 mr-2" />
                                                {getRequestButtonLabel(requestStatusForLabel)}
                                            </Button>
                                            );
                                        })()}
                                        {match.isAssignedToMe && (
                                            <Button
                                                className="w-full bg-[#096725] hover:bg-[#07501d]"
                                                onClick={(event) => {
                                                    if (match.proposition_status === 'pending') {
                                                        return;
                                                    }
                                                    openProposeModal(match, event);
                                                }}
                                                disabled={match.proposition_status === 'pending'}
                                            >
                                                <Heart className="w-4 h-4 mr-2" />
                                                {match.proposition_status === 'pending'
                                                    ? 'Proposition envoyée (en attente de réponse)'
                                                    : 'Proposer'}
                                            </Button>
                                        )}

                                        <Button
                                            variant="outline"
                                            className="w-full"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                window.open(`/profile/${match.user.username || match.user.id}`, '_blank', 'noopener,noreferrer');
                                            }}
                                        >
                                            <User className="w-4 h-4 mr-2" />
                                            Voir le profil
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Compatibility Details Modal */}
            <Dialog open={showCompatibilityModal} onOpenChange={setShowCompatibilityModal}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5" />
                            Détails de compatibilité
                        </DialogTitle>
                        <DialogDescription>
                            Analyse détaillée de la compatibilité avec le profil de référence
                        </DialogDescription>
                    </DialogHeader>
                    
                    {selectedMatch && (
                        <div className="space-y-6">
                            {/* Profile Summary */}
                            <div className="flex items-start gap-4 p-4 bg-muted rounded-lg">
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
                                        <div key={index} className="border rounded-lg p-4">
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
                            <div className="border rounded-lg p-4 bg-muted/50">
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
                            <div className="flex gap-2 pt-4 border-t">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => setShowCompatibilityModal(false)}
                                >
                                    Fermer
                                </Button>
                                <Button
                                    className="flex-1"
                                    onClick={() => {
                                        setShowCompatibilityModal(false);
                                        window.open(`/profile/${selectedMatch.user.username || selectedMatch.user.id}`, '_blank', 'noopener,noreferrer');
                                    }}
                                >
                                    <User className="w-4 h-4 mr-2" />
                                    Voir le profil complet
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={showProposeModal} onOpenChange={setShowProposeModal}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Envoyer une proposition</DialogTitle>
                        <DialogDescription>
                            Cette proposition sera envoyée aux profils sélectionnés.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSendProposition} className="space-y-4">
                        <div>
                            <Label htmlFor="proposition-message">Message</Label>
                            <textarea
                                id="proposition-message"
                                className="mt-2 w-full rounded-md border border-gray-300 p-3 focus:border-[#096725] focus:outline-none focus:ring-1 focus:ring-[#096725]"
                                rows={4}
                                value={proposeMessage}
                                onChange={(event) => setProposeMessage(event.target.value)}
                                placeholder="Écrire un message pour la proposition..."
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="send-to-reference"
                                    checked={sendToReference}
                                    onCheckedChange={(value) => setSendToReference(Boolean(value))}
                                />
                                <Label htmlFor="send-to-reference">
                                    Envoyer au profil de référence ({userA?.name})
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="send-to-compatible"
                                    checked={sendToCompatible}
                                    onCheckedChange={(value) => setSendToCompatible(Boolean(value))}
                                />
                                <Label htmlFor="send-to-compatible">
                                    Envoyer au profil compatible ({proposeMatch?.user?.name})
                                </Label>
                            </div>
                        </div>
                        {propositionError && (
                            <div className="text-sm text-red-600">{propositionError}</div>
                        )}
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowProposeModal(false)}
                            >
                                Annuler
                            </Button>
                            <Button
                                type="submit"
                                className="bg-[#096725] hover:bg-[#07501d]"
                                disabled={isSendingProposition}
                            >
                                {isSendingProposition ? 'Envoi...' : 'Envoyer'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={showRequestModal} onOpenChange={setShowRequestModal}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Demande de propositions</DialogTitle>
                        <DialogDescription>
                            Envoyez un message au matchmaker assigné au profil compatible.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSendRequest} className="space-y-4">
                        <div className="text-sm text-muted-foreground">
                            Profil compatible : {requestMatch?.user?.name} • Matchmaker : {requestMatch?.assigned_matchmaker?.name || 'N/A'}
                        </div>
                        <div>
                            <Label htmlFor="request-message">Message</Label>
                            <textarea
                                id="request-message"
                                className="mt-2 w-full rounded-md border border-gray-300 p-3 focus:border-[#096725] focus:outline-none focus:ring-1 focus:ring-[#096725]"
                                rows={4}
                                value={requestMessage}
                                onChange={(event) => setRequestMessage(event.target.value)}
                                placeholder="Écrire un message pour la demande..."
                                required
                            />
                        </div>
                        {requestError && (
                            <div className="text-sm text-red-600">{requestError}</div>
                        )}
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowRequestModal(false)}
                            >
                                Annuler
                            </Button>
                            <Button type="submit" disabled={isSendingRequest}>
                                {isSendingRequest ? 'Envoi...' : 'Envoyer'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

