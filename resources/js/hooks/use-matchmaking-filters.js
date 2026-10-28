import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';

/**
 * Advanced matchmaking filters ("Filtres de recherche"), shared by the results page and the profile tab.
 * Applying or resetting posts to /staff/match/filters/{userId} and hands the new matches to onResults.
 */
export function useMatchmakingFilters({ userId, initialAppliedFilters, onResults }) {
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

    // Fetch countries and cities from API (once, the first time the drawer opens).
    useEffect(() => {
        if (!showFilters || countries.length > 0) return undefined;
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
        // eslint-disable-next-line react-hooks/exhaustive-deps -- only (re)try when the drawer opens
    }, [showFilters]);

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
            const response = await axios.post(`/staff/match/filters/${userId}`, filters);
            onResults?.(response.data.matches);
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
            const response = await axios.post(`/staff/match/filters/${userId}`, emptyFilters);
            onResults?.(response.data.matches);
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

    const activeFilterCount = useMemo(() => {
        const scalarCount = [
            filters.age_min,
            filters.age_max,
            filters.religion,
            filters.revenu_minimum,
            filters.niveau_etudes,
            filters.situation_professionnelle,
            filters.etat_sante,
            filters.fumeur,
            filters.buveur,
            filters.has_children,
            filters.origine,
            filters.logement,
            filters.motorise,
            filters.hijab_choice,
            filters.veil,
            filters.niqab_acceptance,
            filters.sport,
            filters.secteur,
            filters.polygamy,
            filters.foreign_marriage,
            filters.work_after_marriage,
            filters.pays_residence,
            filters.pays_origine,
            filters.ville_residence,
            filters.ville_origine,
            filters.children_count,
            filters.taille_min,
            filters.taille_max,
            filters.poids_min,
            filters.poids_max,
        ].filter((v) => v !== '' && v !== null && v !== undefined).length;

        const arrayCount =
            (filters.etat_matrimonial?.length > 0 ? 1 : 0) +
            (filters.pays_recherche?.length > 0 ? 1 : 0) +
            (filters.villes_recherche?.length > 0 ? 1 : 0) +
            (filters.situation_sante?.length > 0 ? 1 : 0);

        return scalarCount + arrayCount;
    }, [filters]);

    return {
        filters,
        setFilters,
        appliedFilters,
        isLoading,
        showFilters,
        setShowFilters,
        countryOptions,
        availableCities,
        selectedCountryCodes,
        loadingCountries,
        loadingCities,
        errorCountries,
        handleCountryChange,
        handleApplyFilters,
        handleResetFilters,
        activeFilterCount,
    };
}
