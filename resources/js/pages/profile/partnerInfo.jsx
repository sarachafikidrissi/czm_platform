import { useState, useEffect, useMemo } from 'react';
import { SearchableMultiSelect } from '@/components/ui/searchable-multi-select';

function PartnerInfo({ formData, setFormData }) {
    const [countries, setCountries] = useState([]);
    const [countryCodeToCities, setCountryCodeToCities] = useState({});
    const [selectedCountryCodes, setSelectedCountryCodes] = useState([]);
    const [loadingCountries, setLoadingCountries] = useState(false);
    const [loadingCities, setLoadingCities] = useState(false);
    const [errorCountries, setErrorCountries] = useState('');

    // Initialize selected countries from formData
    useEffect(() => {
        if (countries.length > 0 && formData.paysRecherche && selectedCountryCodes.length === 0) {
            // If paysRecherche is a string (old format), convert to array
            const paysArray = Array.isArray(formData.paysRecherche) 
                ? formData.paysRecherche 
                : [formData.paysRecherche];
            
            // Map country names/codes to ISO codes
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
    }, [countries, formData.paysRecherche]);

    // Fetch countries and cities from API
    useEffect(() => {
        let isMounted = true;
        const fetchCountries = async () => {
            try {
                setLoadingCountries(true);
                setErrorCountries('');
                const response = await fetch('https://countriesnow.space/api/v0.1/countries');
                if (!response.ok) throw new Error('Failed to fetch countries');
                const json = await response.json();
                const list = Array.isArray(json?.data) ? json.data : [];
                if (!isMounted) return;
                
                // Map: keep iso2 and cities; localize country display to French via Intl.DisplayNames
                const regionNamesFr = new Intl.DisplayNames(['fr'], { type: 'region' });
                const normalized = list
                    .filter((item) => item?.iso2)
                    .map((item) => ({
                        iso2: item.iso2,
                        iso3: item.iso3,
                        englishName: item.country,
                        frenchName: regionNamesFr.of(item.iso2) || item.country,
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

    // Fetch cities for selected countries
    useEffect(() => {
        if (selectedCountryCodes.length === 0) return;
        
        const fetchCitiesForCountries = async () => {
            setLoadingCities(true);
            try {
                // Cities are already included in the initial API response
                // But we can fetch additional cities if needed using the cities endpoint
                // For now, we'll use the cities from the initial response
                setLoadingCities(false);
            } catch (err) {
                setLoadingCities(false);
            }
        };

        fetchCitiesForCountries();
    }, [selectedCountryCodes]);

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
        
        // Update formData with country names
        const selectedCountries = selectedCodes.map((code) => {
            const country = countries.find((c) => c.iso2 === code);
            return country ? country.frenchName : code;
        });
        
        setFormData((prev) => ({
            ...prev,
            paysRecherche: selectedCountries,
        }));

        // Clear cities if no countries selected or if selected countries changed significantly
        if (selectedCodes.length === 0) {
            setFormData((prev) => ({
                ...prev,
                villesRecherche: [],
            }));
        } else {
            // Filter out cities that are not in the selected countries
            const currentVilles = Array.isArray(formData.villesRecherche) ? formData.villesRecherche : [];
            const validCities = availableCities.map((c) => c.value);
            const filteredVilles = currentVilles.filter((ville) => validCities.includes(ville));
            
            if (filteredVilles.length !== currentVilles.length) {
                setFormData((prev) => ({
                    ...prev,
                    villesRecherche: filteredVilles,
                }));
            }
        }
    };
    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;

        if (type === 'checkbox') {
            // For checkbox arrays (like villes)
            if (Array.isArray(formData[name])) {
                setFormData((prev) => ({
                    ...prev,
                    [name]: checked ? [...prev[name], value] : prev[name].filter((v) => v !== value),
                }));
            } else {
                // For single checkboxes
                setFormData((prev) => ({
                    ...prev,
                    [name]: checked,
                }));
            }
        } else {
            setFormData((prev) => ({
                ...prev,
                [name]: value,
            }));
        }        
    };

    // Safe handling for villes array - ensure it's always an array
    const safeVilles = Array.isArray(formData.villesRecherche) ? formData.villesRecherche : [];

    const handleVilleChange = (e) => {
        const { value, checked } = e.target;
        setFormData((prev) => {
            const currentVilles = Array.isArray(prev.villesRecherche) ? prev.villesRecherche : [];
            return {
                ...prev,
                villesRecherche: checked 
                    ? [...currentVilles, value] 
                    : currentVilles.filter((v) => v !== value),
            };
        });
    };

    return (
        <div>
            {/* Form Content */}
            {/* Step Title */}
            <div className="mb-8">
                <h2 className="mb-2 text-2xl font-bold text-gray-900">Ce que vous recherchez chez l'autre</h2>
                <p className="text-gray-600">
                    Chacun·e a une vision unique du bonheur à deux. Aidez-nous à vous proposer des profils qui vous correspondent vraiment.
                </p>
            </div>

            {/* Form Fields */}
            <div className="space-y-6">
                {/* Header */}
                <div className="mb-6 text-center">
                    <h1 className="mb-2 text-3xl font-bold text-gray-900">Profil recherché</h1>
                    <p className="text-sm text-gray-600">« * » indique les champs nécessaires</p>
                </div>

                {/* Information Box */}
                <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <ul className="space-y-2 text-sm text-blue-800">
                        <li>• Les critères pour le profil recherché, sont à valider avec votre matchmaker.</li>
                        <li>• Une fois acceptés, ces critères ne peuvent être modifiés qu'avec l'accord de votre matchmaker.</li>
                    </ul>
                </div>

                {/* Question Section */}
                <div className="mb-6">
                    <h2 className="mb-2 text-lg font-semibold text-gray-900">
                        Quelles sont les caractéristiques personnels et professionnels que vous recherchez dans votre futur conjoint?
                    </h2>
                    <p className="mb-4 text-right text-lg font-semibold text-gray-900">
                        ما هي السمات الشخصية والمهنية التي تبحث عنها في زوجك المستقبلي؟
                    </p>
                </div>

                {/* Age Minimum */}
                <div>
                    <label htmlFor="ageMinimum" className="mb-1 block text-sm font-medium text-gray-700">
                        Son âge minimum *
                    </label>
                    <select
                        id="ageMinimum"
                        name="ageMinimum"
                        value={formData.ageMinimum || ''}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Select an Option</option>
                        {Array.from({ length: 50 - 18 + 1 }, (_, i) => 18 + i).map((age) => (
                            <option key={age} value={age}>
                                {age} ans
                            </option>
                        ))}
                    </select>
                </div>

                {/* Situation Matrimoniale - Multiple selection */}
                <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Sa situation matrimoniale *</label>
                    <div className="flex flex-wrap gap-6">
                        {['celibataire', 'marie', 'divorce', 'veuf'].map((option) => {
                            const currentValue = Array.isArray(formData.situationMatrimonialeRecherche) 
                                ? formData.situationMatrimonialeRecherche 
                                : (formData.situationMatrimonialeRecherche ? [formData.situationMatrimonialeRecherche] : []);
                            return (
                                <label key={option} className="inline-flex items-center">
                                    <input
                                        type="checkbox"
                                        name="situationMatrimonialeRecherche"
                                        value={option}
                                        checked={currentValue.includes(option)}
                                        onChange={(e) => {
                                            const current = Array.isArray(formData.situationMatrimonialeRecherche) 
                                                ? formData.situationMatrimonialeRecherche 
                                                : (formData.situationMatrimonialeRecherche ? [formData.situationMatrimonialeRecherche] : []);
                                            const newValue = e.target.checked
                                                ? [...current, option]
                                                : current.filter((v) => v !== option);
                                            setFormData((prev) => ({
                                                ...prev,
                                                situationMatrimonialeRecherche: newValue,
                                            }));
                                        }}
                                        className="text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="ml-2 text-sm text-gray-700">
                                        {option === 'celibataire' ? 'Célibataire' : option === 'marie' ? 'Marié(e)' : option === 'divorce' ? 'Divorcé(e)' : 'Veuf/Veuve'}
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                </div>

                {/* Pays - Searchable Multi-Select */}
                <div>
                    <label htmlFor="paysRecherche" className="mb-1 block text-sm font-medium text-gray-700">
                        Pays profil recherché *
                    </label>
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

                {/* Villes - Searchable Multi-Select */}
                <div>
                    <label htmlFor="villesRecherche" className="mb-1 block text-sm font-medium text-gray-700">
                        Villes Profil recherché
                    </label>
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
                            selectedValues={safeVilles}
                            onSelectionChange={(values) => {
                                setFormData((prev) => ({
                                    ...prev,
                                    villesRecherche: values,
                                }));
                            }}
                            placeholder="Sélectionnez les villes"
                            searchPlaceholder="Search for Location"
                            emptyMessage="Aucune ville trouvée"
                        />
                    )}
                </div>

                {/* Niveau d'études */}
                <div>
                    <label htmlFor="niveauEtudesRecherche" className="mb-1 block text-sm font-medium text-gray-700">
                        Son niveau d'études *
                    </label>
                    <select
                        id="niveauEtudesRecherche"
                        name="niveauEtudesRecherche"
                        value={formData.niveauEtudesRecherche || ''}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Select an Option</option>
                        <option value="moins-bac">Moins Bac</option>
                        <option value="bac">Bac</option>
                        <option value="bac+2">Bac +2</option>
                        <option value="bac+3-4">Bac +3/4</option>
                        <option value="bac+5-master">Bac +5/Master</option>
                        <option value="bac+8-doctorat">Bac +8/Doctorat</option>
                        <option value="peu-importe">Peu importe</option>
                    </select>
                </div>

                {/* Statut emploi */}
                <div>
                    <label htmlFor="statutEmploiRecherche" className="mb-1 block text-sm font-medium text-gray-700">
                        Son statut emploi *
                    </label>
                    <select
                        id="statutEmploiRecherche"
                        name="statutEmploiRecherche"
                        value={formData.statutEmploiRecherche || ''}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Select an Option</option>
                        <option value="etudiant">Étudiant</option>
                        <option value="emploi-salarie">Emploi salarié</option>
                        <option value="propre-patron">Propre patron</option>
                        <option value="sans-emploi">Sans emploi</option>
                        <option value="retraite">Retraité</option>
                        <option value="peu-importe">Peu importe</option>
                    </select>
                </div>

                {/* Additional Criteria */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {/* Revenu minimum */}
                    <div>
                        <label htmlFor="revenuMinimum" className="mb-1 block text-sm font-medium text-gray-700">
                            Revenu minimum souhaité
                        </label>
                        <select
                            id="revenuMinimum"
                            name="revenuMinimum"
                            value={formData.revenuMinimum || ''}
                            onChange={handleInputChange}
                            className="w-full rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Sélectionnez</option>
                            <option value="0-2500">0-2500 MAD</option>
                            <option value="2500-5000">2500-5000 MAD</option>
                            <option value="5000-10000">5000-10000 MAD</option>
                            <option value="10000-20000">10000-20000 MAD</option>
                            <option value="20000-50000">20000-50000 MAD</option>
                            <option value="50000+">+50000 MAD</option>
                            <option value="peu-importe">Peu importe</option>
                        </select>
                    </div>

                    {/* Religion */}
                    <div>
                        <label htmlFor="religionRecherche" className="mb-1 block text-sm font-medium text-gray-700">
                            Religion
                        </label>
                        <select
                            id="religionRecherche"
                            name="religionRecherche"
                            value={formData.religionRecherche || ''}
                            onChange={handleInputChange}
                            className="w-full rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Sélectionnez</option>
                            <option value="pratiquant">Pratiquant(e)</option>
                            <option value="non-pratiquant">Non pratiquant(e)</option>
                            <option value="peu-importe">Peu importe</option>
                        </select>
                    </div>
                </div>

                {/* Description field - Profil recherché (à propos de lui) */}
                <div>
                    <label htmlFor="profilRechercheDescription" className="mb-1 block text-sm font-medium text-gray-700">
                        Profil recherché (à propos de lui)
                    </label>
                    <textarea
                        id="profilRechercheDescription"
                        name="profilRechercheDescription"
                        value={formData.profilRechercheDescription || ''}
                        onChange={handleInputChange}
                        placeholder="Décrivez le profil que vous recherchez..."
                        rows={5}
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">Optionnel - Décrivez les caractéristiques et qualités que vous recherchez chez votre futur conjoint</p>
                </div>
            </div>
        </div>
    );
}

export default PartnerInfo;