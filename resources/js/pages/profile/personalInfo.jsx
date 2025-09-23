import { useState } from 'react';

const PersonalInfo = () => {
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    dateNaissance: '',
    niveauEtudes: '',
    situationProfessionnelle: '',
    secteur: '',
    revenu: '',
    religion: '',
  });

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
                <p className="text-gray-600">Parlez-nous un peu de vous</p>
            </div>

            {/* Form Fields */}
            <div className="space-y-6">
                {/* Nom */}
                <div>
                    <label htmlFor="nom" className="mb-1 block text-sm font-medium text-gray-700">
                        Nom *
                    </label>
                    <input
                        type="text"
                        id="nom"
                        name="nom"
                        value={formData.nom}
                        onChange={handleInputChange}
                        placeholder="Nom"
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* Prénom */}
                <div>
                    <label htmlFor="prenom" className="mb-1 block text-sm font-medium text-gray-700">
                        Prénom *
                    </label>
                    <input
                        type="text"
                        id="prenom"
                        name="prenom"
                        value={formData.prenom}
                        onChange={handleInputChange}
                        placeholder="Prénom"
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* Date de naissance */}
                <div>
                    <label htmlFor="dateNaissance" className="mb-1 block text-sm font-medium text-gray-700">
                        Date de naissance *
                    </label>
                    <input
                        type="text"
                        id="dateNaissance"
                        name="dateNaissance"
                        value={formData.dateNaissance}
                        onChange={handleInputChange}
                        placeholder="dd / mm / yyyy"
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* Niveau d'études */}
                <div>
                    <label htmlFor="niveauEtudes" className="mb-1 block text-sm font-medium text-gray-700">
                        Niveau d'études *
                    </label>
                    <select
                        id="niveauEtudes"
                        name="niveauEtudes"
                        value={formData.niveauEtudes}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
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
                        <select
                            id="situationProfessionnelle"
                            name="situationProfessionnelle"
                            value={formData.situationProfessionnelle}
                            onChange={handleInputChange}
                            className="w-full rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Sélectionnez</option>
                            <option value="etudiant">Étudiant</option>
                            <option value="propre-patron">Propre patron</option>
                            <option value="emploi-salarie">Emploi salarié</option>
                            <option value="retraite">Retraité</option>
                            <option value="autre">Autre</option>
                        </select>
                    </div>

                    <div>
                        <label htmlFor="secteur" className="mb-1 block text-sm font-medium text-gray-700">
                            Secteur d'activité
                        </label>
                        <select
                            id="secteur"
                            name="secteur"
                            value={formData.secteur}
                            onChange={handleInputChange}
                            className="w-full rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
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
                    <select
                        id="revenu"
                        name="revenu"
                        value={formData.revenu}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
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

                {/* Religion */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                        <label htmlFor="religion" className="mb-1 block text-sm font-medium text-gray-700">
                            Religion
                        </label>
                        <select
                            id="religion"
                            name="religion"
                            value={formData.religion}
                            onChange={handleInputChange}
                            className="w-full rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
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
                        <select
                            id="origine"
                            name="origine"
                            value={formData.origine}
                            onChange={handleInputChange}
                            className="w-full rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Sélectionnez</option>
                            <option value="amazigh">Amazigh</option>
                            <option value="arabe">Arabe</option>
                            <option value="chamali">Chamali</option>
                            <option value="sahraoui">Sahraoui(e)</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PersonalInfo;
