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
    TrendingUp
} from 'lucide-react';
import axios from 'axios';

export default function MatchmakingResults({ userA, matches: initialMatches, defaultFilters, appliedFilters: initialAppliedFilters }) {
    const [matches, setMatches] = useState(initialMatches || []);
    const [appliedFilters, setAppliedFilters] = useState(initialAppliedFilters || {});
    const [isLoading, setIsLoading] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    
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
                                <Card key={match.user.id} className="hover:shadow-md transition-shadow">
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

                                        <Separator />

                                        <Button
                                            variant="outline"
                                            className="w-full"
                                            onClick={() => router.visit(`/profile/${match.user.username || match.user.id}`)}
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
        </AppLayout>
    );
}

