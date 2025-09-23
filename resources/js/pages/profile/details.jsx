import { useState } from 'react';

function Details() {
    const [formData, setFormData] = useState({
      etatMatrimonial: '',
      logement: '',
      taille: '',
      poids: '',
      etatSante: '',
      fumeur: '',
      buveur: '',
      sport: '',
      motorise: '',
      loisirs: ''
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
                <h2 className="mb-2 text-2xl font-bold text-gray-900">Mode de vie & personnalité</h2>
                <p className="text-gray-600">
                    Trouver la bonne personne, c’est aussi partager des modes de vie similaires. Ces détails font la différence.
                </p>
            </div>

            {/* Form Fields */}
            <div className="space-y-6">
                {/* État matrimonial */}
                <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">État matrimonial *</label>
                    <div className="flex flex-wrap gap-4">
                        <label className="inline-flex items-center">
                            <input
                                type="radio"
                                name="etatMatrimonial"
                                value="celibataire"
                                checked={formData.etatMatrimonial === 'celibataire'}
                                onChange={handleInputChange}
                                className="text-blue-600 focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm text-gray-700">Célibataire</span>
                        </label>
                        <label className="inline-flex items-center">
                            <input
                                type="radio"
                                name="etatMatrimonial"
                                value="marie"
                                checked={formData.etatMatrimonial === 'marie'}
                                onChange={handleInputChange}
                                className="text-blue-600 focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm text-gray-700">Marié(e)</span>
                        </label>
                        <label className="inline-flex items-center">
                            <input
                                type="radio"
                                name="etatMatrimonial"
                                value="divorce"
                                checked={formData.etatMatrimonial === 'divorce'}
                                onChange={handleInputChange}
                                className="text-blue-600 focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm text-gray-700">Divorcé(e)</span>
                        </label>
                        <label className="inline-flex items-center">
                            <input
                                type="radio"
                                name="etatMatrimonial"
                                value="veuf"
                                checked={formData.etatMatrimonial === 'veuf'}
                                onChange={handleInputChange}
                                className="text-blue-600 focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm text-gray-700">Veuf/Veuve</span>
                        </label>
                    </div>
                </div>

                {/* Logement */}
                <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Logement *</label>
                    <div className="flex flex-wrap gap-4">
                        <label className="inline-flex items-center">
                            <input
                                type="radio"
                                name="logement"
                                value="proprietaire"
                                checked={formData.logement === 'proprietaire'}
                                onChange={handleInputChange}
                                className="text-blue-600 focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm text-gray-700">Propriétaire</span>
                        </label>
                        <label className="inline-flex items-center">
                            <input
                                type="radio"
                                name="logement"
                                value="locataire"
                                checked={formData.logement === 'locataire'}
                                onChange={handleInputChange}
                                className="text-blue-600 focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm text-gray-700">Locataire</span>
                        </label>
                        <label className="inline-flex items-center">
                            <input
                                type="radio"
                                name="logement"
                                value="familial"
                                checked={formData.logement === 'familial'}
                                onChange={handleInputChange}
                                className="text-blue-600 focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm text-gray-700">Familial</span>
                        </label>
                    </div>
                </div>

                {/* Habitudes */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                    {/* Fumeur */}
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">Fumeur(se)</label>
                        <div className="space-y-2">
                            <label className="flex items-center">
                                <input
                                    type="radio"
                                    name="fumeur"
                                    value="oui"
                                    checked={formData.fumeur === 'oui'}
                                    onChange={handleInputChange}
                                    className="text-blue-600 focus:ring-blue-500"
                                />
                                <span className="ml-2 text-sm text-gray-700">Oui</span>
                            </label>
                            <label className="flex items-center">
                                <input
                                    type="radio"
                                    name="fumeur"
                                    value="non"
                                    checked={formData.fumeur === 'non'}
                                    onChange={handleInputChange}
                                    className="text-blue-600 focus:ring-blue-500"
                                />
                                <span className="ml-2 text-sm text-gray-700">Non</span>
                            </label>
                            <label className="flex items-center">
                                <input
                                    type="radio"
                                    name="fumeur"
                                    value="parfois"
                                    checked={formData.fumeur === 'parfois'}
                                    onChange={handleInputChange}
                                    className="text-blue-600 focus:ring-blue-500"
                                />
                                <span className="ml-2 text-sm text-gray-700">Parfois</span>
                            </label>
                        </div>
                    </div>

                    {/* Buveur */}
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">Buveur(se)</label>
                        <div className="space-y-2">
                            <label className="flex items-center">
                                <input
                                    type="radio"
                                    name="buveur"
                                    value="oui"
                                    checked={formData.buveur === 'oui'}
                                    onChange={handleInputChange}
                                    className="text-blue-600 focus:ring-blue-500"
                                />
                                <span className="ml-2 text-sm text-gray-700">Oui</span>
                            </label>
                            <label className="flex items-center">
                                <input
                                    type="radio"
                                    name="buveur"
                                    value="non"
                                    checked={formData.buveur === 'non'}
                                    onChange={handleInputChange}
                                    className="text-blue-600 focus:ring-blue-500"
                                />
                                <span className="ml-2 text-sm text-gray-700">Non</span>
                            </label>
                            <label className="flex items-center">
                                <input
                                    type="radio"
                                    name="buveur"
                                    value="parfois"
                                    checked={formData.buveur === 'parfois'}
                                    onChange={handleInputChange}
                                    className="text-blue-600 focus:ring-blue-500"
                                />
                                <span className="ml-2 text-sm text-gray-700">Parfois</span>
                            </label>
                        </div>
                    </div>

                    {/* Sport */}
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">Sport</label>
                        <div className="space-y-2">
                            <label className="flex items-center">
                                <input
                                    type="radio"
                                    name="sport"
                                    value="oui"
                                    checked={formData.sport === 'oui'}
                                    onChange={handleInputChange}
                                    className="text-blue-600 focus:ring-blue-500"
                                />
                                <span className="ml-2 text-sm text-gray-700">Oui</span>
                            </label>
                            <label className="flex items-center">
                                <input
                                    type="radio"
                                    name="sport"
                                    value="non"
                                    checked={formData.sport === 'non'}
                                    onChange={handleInputChange}
                                    className="text-blue-600 focus:ring-blue-500"
                                />
                                <span className="ml-2 text-sm text-gray-700">Non</span>
                            </label>
                            <label className="flex items-center">
                                <input
                                    type="radio"
                                    name="sport"
                                    value="parfois"
                                    checked={formData.sport === 'parfois'}
                                    onChange={handleInputChange}
                                    className="text-blue-600 focus:ring-blue-500"
                                />
                                <span className="ml-2 text-sm text-gray-700">Parfois</span>
                            </label>
                        </div>
                    </div>

                    {/* Motorisé */}
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">Motorisé(e)</label>
                        <div className="space-y-2">
                            <label className="flex items-center">
                                <input
                                    type="radio"
                                    name="motorise"
                                    value="oui"
                                    checked={formData.motorise === 'oui'}
                                    onChange={handleInputChange}
                                    className="text-blue-600 focus:ring-blue-500"
                                />
                                <span className="ml-2 text-sm text-gray-700">Oui</span>
                            </label>
                            <label className="flex items-center">
                                <input
                                    type="radio"
                                    name="motorise"
                                    value="non"
                                    checked={formData.motorise === 'non'}
                                    onChange={handleInputChange}
                                    className="text-blue-600 focus:ring-blue-500"
                                />
                                <span className="ml-2 text-sm text-gray-700">Non</span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Details;
