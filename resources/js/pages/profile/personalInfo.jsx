import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { SearchableSelect } from '@/components/ui/searchable-select';

const PersonalInfo = ({ formData, setFormData, gender }) => {
    const { t } = useTranslation();
    const [countries, setCountries] = useState([]);
    const [countryCodeToCities, setCountryCodeToCities] = useState({});
    const [selectedResidenceCountry, setSelectedResidenceCountry] = useState('');
    const [selectedOriginCountry, setSelectedOriginCountry] = useState('');
    const [loadingCountries, setLoadingCountries] = useState(false);
    const [errorCountries, setErrorCountries] = useState('');

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

    // Initialize selected countries from formData
    useEffect(() => {
        if (countries.length > 0) {
            // Initialize residence country
            if (formData.paysResidence && !selectedResidenceCountry) {
                const country = countries.find(c => 
                    c.frenchName.toLowerCase() === formData.paysResidence.toLowerCase() ||
                    c.iso2.toLowerCase() === formData.paysResidence.toLowerCase() ||
                    c.iso3.toLowerCase() === formData.paysResidence.toLowerCase()
                );
                if (country) {
                    setSelectedResidenceCountry(country.iso2);
                }
            }

            // Initialize origin country
            if (formData.paysOrigine && !selectedOriginCountry) {
                const country = countries.find(c => 
                    c.frenchName.toLowerCase() === formData.paysOrigine.toLowerCase() ||
                    c.iso2.toLowerCase() === formData.paysOrigine.toLowerCase() ||
                    c.iso3.toLowerCase() === formData.paysOrigine.toLowerCase()
                );
                if (country) {
                    setSelectedOriginCountry(country.iso2);
                }
            }
        }
    }, [countries, formData.paysResidence, formData.paysOrigine]);

    const countryOptions = useMemo(() => {
        return countries.map((country) => ({
            value: country.iso2,
            label: country.frenchName,
        }));
    }, [countries]);

    const residenceCities = useMemo(() => {
        if (!selectedResidenceCountry) return [];
        const cities = countryCodeToCities[selectedResidenceCountry] || [];
        return cities.sort().map((city) => ({
            value: city,
            label: city,
        }));
    }, [selectedResidenceCountry, countryCodeToCities]);

    const originCities = useMemo(() => {
        if (!selectedOriginCountry) return [];
        const cities = countryCodeToCities[selectedOriginCountry] || [];
        return cities.sort().map((city) => ({
            value: city,
            label: city,
        }));
    }, [selectedOriginCountry, countryCodeToCities]);

    const handleResidenceCountryChange = (countryCode) => {
        setSelectedResidenceCountry(countryCode);
        const country = countries.find((c) => c.iso2 === countryCode);
        const countryName = country ? country.frenchName : '';
        
        setFormData((prev) => ({
            ...prev,
            paysResidence: countryName,
            villeResidence: '', // Clear city when country changes
        }));
    };

    const handleOriginCountryChange = (countryCode) => {
        setSelectedOriginCountry(countryCode);
        const country = countries.find((c) => c.iso2 === countryCode);
        const countryName = country ? country.frenchName : '';
        
        setFormData((prev) => ({
            ...prev,
            paysOrigine: countryName,
            villeOrigine: '', // Clear city when country changes
        }));
    };

    const handleResidenceCityChange = (city) => {
        setFormData((prev) => ({
            ...prev,
            villeResidence: city,
        }));
    };

    const handleOriginCityChange = (city) => {
        setFormData((prev) => ({
            ...prev,
            villeOrigine: city,
        }));
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
        
    };
    
    return (
        <div>
            {/* Form Content */}
            {/* Step Title */}
            <div className="mb-8">
                <h2 className="mb-2 text-2xl font-bold text-gray-900">Informations Personnelles</h2>
                <p className="text-2xl font-bold text-gray-900 mb-1" dir="rtl">المعلومات الشخصية</p>
                <p className="text-gray-600">Parlez-nous un peu de vous</p>
            </div>

            {/* Form Fields */}
            <div className="space-y-6">
                {/* Nom */}
                <div>
                    <label htmlFor="nom" className="mb-1 block text-sm font-medium text-foreground">
                        Nom *
                    </label>
                    <p className="text-sm font-medium text-foreground mb-1" dir="rtl">الاسم</p>
                    <input
                        type="text"
                        id="nom"
                        name="nom"
                        value={formData.nom}
                        onChange={handleInputChange}
                        placeholder="Nom"
                        className="w-full rounded-lg border border-border px-4 py-3 transition-colors focus:border-info focus:ring-2 focus:ring-info"
                    />
                </div>

                {/* Prénom */}
                <div>
                    <label htmlFor="prenom" className="mb-1 block text-sm font-medium text-gray-700">
                        Prénom *
                    </label>
                    <p className="text-sm font-medium text-gray-700 mb-1" dir="rtl">الاسم الأول</p>
                    <input
                        type="text"
                        id="prenom"
                        name="prenom"
                        value={formData.prenom}
                        onChange={handleInputChange}
                        placeholder="Prénom"
                        className="w-full rounded-lg border border-border px-4 py-3 transition-colors focus:border-info focus:ring-2 focus:ring-info"
                    />
                </div>

                {/* Date de naissance */}
                <div>
                    <label htmlFor="dateNaissance" className="mb-1 block text-sm font-medium text-gray-700">
                        Date de naissance *
                    </label>
                    <p className="text-sm font-medium text-gray-700 mb-1" dir="rtl">تاريخ الميلاد</p>
                    <input
                        type="date"
                        id="dateNaissance"
                        name="dateNaissance"
                        max={new Date(new Date().setFullYear(new Date().getFullYear() - 16)).toISOString().split('T')[0]}
                        min={new Date(new Date().setFullYear(new Date().getFullYear() - 70)).toISOString().split('T')[0]}
                        value={formData.dateNaissance}
                        onChange={handleInputChange}
                        placeholder="dd / mm / yyyy"
                        className="w-full rounded-lg border border-border px-4 py-3 transition-colors focus:border-info focus:ring-2 focus:ring-info"
                    />
                </div>

                {/* Niveau d'études */}
                <div>
                    <label htmlFor="niveauEtudes" className="mb-1 block text-sm font-medium text-gray-700">
                        Niveau d'études *
                    </label>
                    <p className="text-sm font-medium text-gray-700 mb-1" dir="rtl">المستوى التعليمي</p>
                    <select
                        id="niveauEtudes"
                        name="niveauEtudes"
                        value={formData.niveauEtudes}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border border-border px-4 py-3 transition-colors focus:border-info focus:ring-2 focus:ring-info"
                    >
                        <option value="">Please fill out this field</option>
                        <option value="moins-bac">Moins Bac</option>
                        <option value="bac">Bac</option>
                        <option value="bac+2">Bac +2</option>
                        <option value="bac+3-4">Bac +3/4</option>
                        <option value="bac+5-master">Bac +5/Master</option>
                        <option value="bac+8-doctorat">Bac +8/Doctorat</option>
                    </select>
                </div>

                {/* Emploi - Situation professionnelle */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                        <label htmlFor="situationProfessionnelle" className="mb-1 block text-sm font-medium text-gray-700">
                            Situation professionnelle *
                        </label>
                        <p className="text-sm font-medium text-gray-700 mb-1" dir="rtl">الوضع المهني</p>
                        <select
                            id="situationProfessionnelle"
                            name="situationProfessionnelle"
                            value={formData.situationProfessionnelle}
                            onChange={handleInputChange}
                            className="w-full rounded-lg border border-border px-4 py-3 transition-colors focus:border-info focus:ring-2 focus:ring-info"
                        >
                            <option value="">Sélectionnez</option>
                            <option value="etudiant">Étudiant</option>
                            <option value="propre-patron">Propre patron</option>
                            <option value="emploi-salarie">Emploi salarié</option>
                            <option value="retraite">Retraité</option>
                            {gender === 'female' && <option value="femme-au-foyer">Femme au foyer</option>}
                            <option value="recherche-emploi">À la recherche d'emploi</option>
                            <option value="autre">Autre</option>
                        </select>
                    </div>

                    <div>
                        <label htmlFor="secteur" className="mb-1 block text-sm font-medium text-gray-700">
                            Secteur d'activité
                        </label>
                        <p className="text-sm font-medium text-gray-700 mb-1" dir="rtl">قطاع النشاط</p>
                        <select
                            id="secteur"
                            name="secteur"
                            value={formData.secteur}
                            onChange={handleInputChange}
                            className="w-full rounded-lg border border-border px-4 py-3 transition-colors focus:border-info focus:ring-2 focus:ring-info"
                        >
                            <option value="">Sélectionnez un secteur</option>
                            <option value="agriculture">Agriculture</option>
                            <option value="artisanat">Artisanat</option>
                            <option value="assurance">Assurance</option>
                            <option value="automobile">Automobile</option>
                            <option value="banque">Banque</option>
                            <option value="batiment-tp">Bâtiment / Travaux Publics</option>
                            <option value="commerce-distribution">Commerce / Distribution</option>
                            <option value="communication-publicite">Communication / Publicité</option>
                            <option value="culture-loisirs-sport">Culture / Loisirs / Sport</option>
                            <option value="defense-securite">Défense / Sécurité</option>
                            <option value="education-enseignement">Éducation / Enseignement</option>
                            <option value="energie-environnement">Énergie / Environnement</option>
                            <option value="finance-audit-comptabilite">Finance / Audit / Comptabilité</option>
                            <option value="immobilier">Immobilier</option>
                            <option value="industrie">Industrie</option>
                            <option value="informatique-telecoms">Informatique / Télécoms</option>
                            <option value="juridique">Juridique</option>
                            <option value="logistique-transport">Logistique / Transport</option>
                            <option value="medias-journalisme">Médias / Journalisme</option>
                            <option value="mode-luxe-beaute">Mode / Luxe / Beauté</option>
                            <option value="recherche-sciences">Recherche / Sciences</option>
                            <option value="restauration-hotellerie-tourisme">Restauration / Hôtellerie / Tourisme</option>
                            <option value="sante-social">Santé / Social</option>
                            <option value="services-entreprises">Services aux entreprises</option>
                            <option value="textile-habillement-cuir">Textile / Habillement / Cuir</option>
                        </select>
                    </div>
                </div>

                {/* Revenu */}
                <div>
                    <label htmlFor="revenu" className="mb-1 block text-sm font-medium text-gray-700">
                        Revenu mensuel (MAD) *
                    </label>
                    <p className="text-sm font-medium text-gray-700 mb-1" dir="rtl">الدخل الشهري</p>
                    <select
                        id="revenu"
                        name="revenu"
                        value={formData.revenu}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border border-border px-4 py-3 transition-colors focus:border-info focus:ring-2 focus:ring-info"
                    >
                        <option value="">Sélectionnez une tranche de revenu</option>
                        <option value="0-2500">0-2500 MAD</option>
                        <option value="2500-5000">2500-5000 MAD</option>
                        <option value="5000-10000">5000-10000 MAD</option>
                        <option value="10000-20000">10000-20000 MAD</option>
                        <option value="20000-50000">20000-50000 MAD</option>
                        <option value="50000+">+50000 MAD</option>
                    </select>
                </div>

                {/* Heard about us moved to Step 2 */}

                {/* Religion */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                        <label htmlFor="religion" className="mb-1 block text-sm font-medium text-gray-700">
                            Religion
                        </label>
                        <p className="text-sm font-medium text-gray-700 mb-1" dir="rtl">الدين</p>
                        <select
                            id="religion"
                            name="religion"
                            value={formData.religion}
                            onChange={handleInputChange}
                            className="w-full rounded-lg border border-border px-4 py-3 transition-colors focus:border-info focus:ring-2 focus:ring-info"
                        >
                            <option value="">Sélectionnez</option>
                            <option value="pratiquant">Pratiquant(e)</option>
                            <option value="non-pratiquant">Non pratiquant(e)</option>
                        </select>
                    </div>

                    <div>
                        <label htmlFor="origine" className="mb-1 block text-sm font-medium text-gray-700">
                            Origine
                        </label>
                        <p className="text-sm font-medium text-gray-700 mb-1" dir="rtl">الأصل</p>
                        <select
                            id="origine"
                            name="origine"
                            value={formData.origine}
                            onChange={handleInputChange}
                            className="w-full rounded-lg border border-border px-4 py-3 transition-colors focus:border-info focus:ring-2 focus:ring-info"
                        >
                            <option value="">Sélectionnez</option>
                            <option value="amazigh">Amazigh</option>
                            <option value="arabe">Arabe</option>
                            <option value="chamali">Chamali</option>
                            <option value="sahraoui">Sahraoui(e)</option>
                            <option value="autre">Autre</option>
                        </select>
                    </div>
                </div>

                {/* Pays de résidence, Ville de résidence */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                        <label htmlFor="paysResidence" className="mb-1 block text-sm font-medium text-gray-700">
                            Pays de résidence
                        </label>
                        <p className="text-sm font-medium text-gray-700 mb-1" dir="rtl">بلد الإقامة</p>
                        {loadingCountries ? (
                            <div className="rounded-lg border border-border px-4 py-3 text-sm text-muted-foreground">
                                Chargement des pays...
                            </div>
                        ) : (
                            <SearchableSelect
                                options={countryOptions}
                                value={selectedResidenceCountry}
                                onValueChange={handleResidenceCountryChange}
                                placeholder="Sélectionnez le pays de résidence"
                                searchPlaceholder="Rechercher un pays..."
                                emptyMessage="Aucun pays trouvé"
                            />
                        )}
                        {errorCountries && <p className="mt-1 text-xs text-red-500">{errorCountries}</p>}
                    </div>

                    <div>
                        <label htmlFor="villeResidence" className="mb-1 block text-sm font-medium text-gray-700">
                            Ville de résidence
                        </label>
                        <p className="text-sm font-medium text-gray-700 mb-1" dir="rtl">مدينة الإقامة</p>
                        {!selectedResidenceCountry ? (
                            <div className="rounded-lg border border-border px-4 py-3 text-sm text-muted-foreground">
                                Veuillez d'abord sélectionner un pays de résidence
                            </div>
                        ) : residenceCities.length === 0 ? (
                            <div className="rounded-lg border border-border px-4 py-3 text-sm text-muted-foreground">
                                Aucune ville disponible pour ce pays
                            </div>
                        ) : (
                            <SearchableSelect
                                options={residenceCities}
                                value={formData.villeResidence || ''}
                                onValueChange={handleResidenceCityChange}
                                placeholder="Sélectionnez la ville"
                                searchPlaceholder="Rechercher une ville..."
                                emptyMessage="Aucune ville trouvée"
                            />
                        )}
                    </div>
                </div>

                {/* Pays d'origine, Ville d'origine */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                        <label htmlFor="paysOrigine" className="mb-1 block text-sm font-medium text-gray-700">
                            Pays d'origine
                        </label>
                        <p className="text-sm font-medium text-gray-700 mb-1" dir="rtl">بلد المنشأ</p>
                        {loadingCountries ? (
                            <div className="rounded-lg border border-border px-4 py-3 text-sm text-muted-foreground">
                                Chargement des pays...
                            </div>
                        ) : (
                            <SearchableSelect
                                options={countryOptions}
                                value={selectedOriginCountry}
                                onValueChange={handleOriginCountryChange}
                                placeholder="Sélectionnez le pays d'origine"
                                searchPlaceholder="Rechercher un pays..."
                                emptyMessage="Aucun pays trouvé"
                            />
                        )}
                        {errorCountries && <p className="mt-1 text-xs text-red-500">{errorCountries}</p>}
                    </div>

                    <div>
                        <label htmlFor="villeOrigine" className="mb-1 block text-sm font-medium text-gray-700">
                            Ville d'origine
                        </label>
                        <p className="text-sm font-medium text-gray-700 mb-1" dir="rtl">مدينة المنشأ</p>
                        {!selectedOriginCountry ? (
                            <div className="rounded-lg border border-border px-4 py-3 text-sm text-muted-foreground">
                                Veuillez d'abord sélectionner un pays d'origine
                            </div>
                        ) : originCities.length === 0 ? (
                            <div className="rounded-lg border border-border px-4 py-3 text-sm text-muted-foreground">
                                Aucune ville disponible pour ce pays
                            </div>
                        ) : (
                            <SearchableSelect
                                options={originCities}
                                value={formData.villeOrigine || ''}
                                onValueChange={handleOriginCityChange}
                                placeholder="Sélectionnez la ville"
                                searchPlaceholder="Rechercher une ville..."
                                emptyMessage="Aucune ville trouvée"
                            />
                        )}
                    </div>
                </div>

                {/* À propos de moi */}
                <div>
                    <label htmlFor="aproposDescription" className="mb-1 block text-sm font-medium text-gray-700">
                        {t('profile.aboutMeDescription', { defaultValue: 'À propos de moi' })}
                    </label>
                    <p className="text-sm font-medium text-gray-700 mb-1" dir="rtl">عني</p>
                    <textarea
                        id="aproposDescription"
                        name="aproposDescription"
                        value={formData.aproposDescription || ''}
                        onChange={handleInputChange}
                        placeholder={t('profile.aboutMeDescriptionPlaceholder', { defaultValue: 'Parlez-nous de vous, vos loisirs, votre personnalité...' })}
                        rows={5}
                        className="w-full rounded-lg border border-border px-4 py-3 transition-colors focus:border-info focus:ring-2 focus:ring-info"
                    />
                    <p className="mt-1 text-xs text-gray-500">{t('profile.aboutMeDescriptionHelp', { defaultValue: 'Optionnel - Décrivez-vous, vos centres d\'intérêt, votre personnalité' })}</p>
                </div>
            </div>
        </div>
    );
};

export default PersonalInfo;
