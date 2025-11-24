function Details({ formData, setFormData, gender }) {
    // const [formData, setFormData] = useState({
    //   etatMatrimonial: '',
    //   logement: '',
    //   taille: '',
    //   poids: '',
    //   etatSante: '',
    //   fumeur: '',
    //   buveur: '',
    //   sport: '',
    //   motorise: '',
    //   loisirs: ''
    // });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };
    const handleTextareaChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const setValue = (name, value) => {
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
                <p className="text-2xl font-bold text-gray-900 mb-1" dir="rtl">نمط الحياة والشخصية</p>
                <p className="text-gray-600">
                    Trouver la bonne personne, c'est aussi partager des modes de vie similaires. Ces détails font la différence.
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
                                className="text-info focus:ring-info"
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
                                className="text-info focus:ring-info"
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
                                className="text-info focus:ring-info"
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
                                className="text-info focus:ring-info"
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
                                className="text-info focus:ring-info"
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
                                className="text-info focus:ring-info"
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
                                className="text-info focus:ring-info"
                            />
                            <span className="ml-2 text-sm text-gray-700">Familial</span>
                        </label>
                    </div>
                </div>

                {/* Divorce: children details */}
                {formData.etatMatrimonial === 'divorce' && (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700">Avez-vous des enfants ?</label>
                            <div className="flex gap-6">
                                <label className="inline-flex items-center">
                                    <input
                                        type="radio"
                                        name="hasChildren"
                                        value="yes"
                                        checked={formData.hasChildren === true}
                                        onChange={() => setValue('hasChildren', true)}
                                        className="text-info focus:ring-info"
                                    />
                                    <span className="ml-2 text-sm text-gray-700">Oui</span>
                                </label>
                                <label className="inline-flex items-center">
                                    <input
                                        type="radio"
                                        name="hasChildren"
                                        value="no"
                                        checked={formData.hasChildren === false}
                                        onChange={() => setValue('hasChildren', false)}
                                        className="text-info focus:ring-info"
                                    />
                                    <span className="ml-2 text-sm text-gray-700">Non</span>
                                </label>
                            </div>
                        </div>

                        {formData.hasChildren === true && (
                            <>
                                <div>
                                    <label htmlFor="childrenCount" className="mb-1 block text-sm font-medium text-gray-700">Combien ?</label>
                                    <p className="text-sm font-medium text-gray-700 mb-1" dir="rtl">كم عددهم؟</p>
                                    <input
                                        type="number"
                                        id="childrenCount"
                                        name="childrenCount"
                                        min="1"
                                        max="20"
                                        value={formData.childrenCount || ''}
                                        onChange={handleInputChange}
                                        className="w-full rounded-lg border border-border px-4 py-3 transition-colors focus:border-info focus:ring-2 focus:ring-info"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700">Tuteur des enfants</label>
                                    <p className="text-sm font-medium text-gray-700 mb-1" dir="rtl">وصي الأطفال</p>
                                    <select
                                        name="childrenGuardian"
                                        value={formData.childrenGuardian || ''}
                                        onChange={handleInputChange}
                                        className="w-full rounded-lg border border-border px-4 py-3 transition-colors focus:border-info focus:ring-2 focus:ring-info"
                                    >
                                        <option value="">Sélectionnez</option>
                                        <option value="mother">La mère</option>
                                        <option value="father">Le père</option>
                                    </select>
                                    {/* Auto-suggestion note based on gender */}
                                    {gender === 'male' && formData.childrenGuardian !== 'mother' && (
                                        <p className="mt-1 text-xs text-gray-500">Suggestion: pour un homme, tuteur souvent la mère.</p>
                                    )}
                                    {gender === 'female' && formData.childrenGuardian !== 'father' && (
                                        <p className="mt-1 text-xs text-gray-500">Suggestion: pour une femme, tuteur souvent le père.</p>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                        <label htmlFor="taille" className="mb-1 block text-sm font-medium text-gray-700">
                            Taille (cm) *
                        </label>
                        <p className="text-sm font-medium text-gray-700 mb-1" dir="rtl">الطول (سم)</p>
                        <input
                            type="number"
                            id="taille"
                            name="taille"
                            min="100"
                            max="250"
                            value={formData.taille || ''}
                            onChange={handleInputChange}
                            placeholder="Ex: 175"
                            className="w-full rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label htmlFor="poids" className="mb-1 block text-sm font-medium text-gray-700">
                            Poids (kg) *
                        </label>
                        <p className="text-sm font-medium text-gray-700 mb-1" dir="rtl">الوزن (كجم)</p>
                        <input
                            type="number"
                            id="poids"
                            name="poids"
                            min="30"
                            max="200"
                            value={formData.poids || ''}
                            onChange={handleInputChange}
                            placeholder="Ex: 70"
                            className="w-full rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                {/* Female-only hijab/niqab choice */}
                {gender === 'female' && (
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">Voile / Niqab</label>
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                            <label className="inline-flex items-center">
                                <input type="radio" name="hijabChoice" value="voile" checked={formData.hijabChoice === 'voile'} onChange={handleInputChange} className="text-blue-600 focus:ring-blue-500" />
                                <span className="ml-2 text-sm text-gray-700">Voile</span>
                            </label>
                            <label className="inline-flex items-center">
                                <input type="radio" name="hijabChoice" value="non_voile" checked={formData.hijabChoice === 'non_voile'} onChange={handleInputChange} className="text-blue-600 focus:ring-blue-500" />
                                <span className="ml-2 text-sm text-gray-700">Non voile</span>
                            </label>
                            <label className="inline-flex items-center">
                                <input type="radio" name="hijabChoice" value="niqab" checked={formData.hijabChoice === 'niqab'} onChange={handleInputChange} className="text-blue-600 focus:ring-blue-500" />
                                <span className="ml-2 text-sm text-gray-700">Niqab</span>
                            </label>
                            <label className="inline-flex items-center">
                                <input type="radio" name="hijabChoice" value="idea_niqab" checked={formData.hijabChoice === 'idea_niqab'} onChange={handleInputChange} className="text-blue-600 focus:ring-blue-500" />
                                <span className="ml-2 text-sm text-gray-700">Idée de porter niqab</span>
                            </label>
                            <label className="inline-flex items-center">
                                <input type="radio" name="hijabChoice" value="idea_hijab" checked={formData.hijabChoice === 'idea_hijab'} onChange={handleInputChange} className="text-blue-600 focus:ring-blue-500" />
                                <span className="ml-2 text-sm text-gray-700">Idée de porter hijab</span>
                            </label>
                        </div>
                    </div>
                )}

                {/* Heard about us (moved to step 2) */}
                <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Comment nous avez-vous connu ? *</label>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                        <label className="inline-flex items-center">
                            <input type="radio" name="heardAboutUs" value="recommande" checked={formData.heardAboutUs === 'recommande'} onChange={handleInputChange} className="text-blue-600 focus:ring-blue-500" />
                            <span className="ml-2 text-sm text-gray-700">Recommandé</span>
                        </label>
                        <label className="inline-flex items-center">
                            <input type="radio" name="heardAboutUs" value="passage" checked={formData.heardAboutUs === 'passage'} onChange={handleInputChange} className="text-blue-600 focus:ring-blue-500" />
                            <span className="ml-2 text-sm text-gray-700">Passage</span>
                        </label>
                        <label className="inline-flex items-center">
                            <input type="radio" name="heardAboutUs" value="pub" checked={formData.heardAboutUs === 'pub'} onChange={handleInputChange} className="text-blue-600 focus:ring-blue-500" />
                            <span className="ml-2 text-sm text-gray-700">Pub</span>
                        </label>
                    </div>
                    {formData.heardAboutUs === 'recommande' && (
                        <div className="mt-3">
                            <label htmlFor="heardAboutReference" className="mb-1 block text-sm font-medium text-gray-700">D'où avez-vous été recommandé ? *</label>
                            <p className="text-sm font-medium text-gray-700 mb-1" dir="rtl">من أين تم التوصية بك؟</p>
                            <input
                                type="text"
                                id="heardAboutReference"
                                name="heardAboutReference"
                                value={formData.heardAboutReference || ''}
                                onChange={handleInputChange}
                                placeholder="Indiquez d'où vous avez été recommandé (nom de la personne, organisation, etc.)"
                                className="w-full rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    )}
                    {formData.heardAboutUs === 'pub' && (
                        <div className="mt-3">
                            <label htmlFor="heardAboutReference" className="mb-1 block text-sm font-medium text-gray-700">Référence de l'inscription</label>
                            <p className="text-sm font-medium text-gray-700 mb-1" dir="rtl">مرجع التسجيل</p>
                            <input
                                type="text"
                                id="heardAboutReference"
                                name="heardAboutReference"
                                value={formData.heardAboutReference || ''}
                                onChange={handleInputChange}
                                placeholder="Code indiqué dans la publicité"
                                className="w-full rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    )}
                </div>

                {/* État de santé */}
                <div>
                    <label htmlFor="etatSante" className="mb-1 block text-sm font-medium text-gray-700">
                        État de santé général
                    </label>
                    <p className="text-sm font-medium text-gray-700 mb-1" dir="rtl">الحالة الصحية العامة</p>
                    <textarea
                        id="etatSante"
                        name="etatSante"
                        value={formData.etatSante || ''}
                        onChange={handleTextareaChange}
                        placeholder="Décrivez votre état de santé général, allergies, conditions médicales, etc."
                        rows={4}
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">Optionnel - Ces informations resteront confidentielles</p>
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
                                    className="text-info focus:ring-info"
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
                                    className="text-info focus:ring-info"
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
                                    className="text-info focus:ring-info"
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
                                    className="text-info focus:ring-info"
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
                                    className="text-info focus:ring-info"
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
                                    className="text-info focus:ring-info"
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
                                    className="text-info focus:ring-info"
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
                                    className="text-info focus:ring-info"
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
                                    className="text-info focus:ring-info"
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
                                    className="text-info focus:ring-info"
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
                                    className="text-info focus:ring-info"
                                />
                                <span className="ml-2 text-sm text-gray-700">Non</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Loisirs - Text Input */}
                <div>
                    <label htmlFor="loisirs" className="mb-1 block text-sm font-medium text-gray-700">
                        Loisirs et centres d'intérêt
                    </label>
                    <p className="text-sm font-medium text-gray-700 mb-1" dir="rtl">الهوايات ومراكز الاهتمام</p>
                    <input
                        type="text"
                        id="loisirs"
                        name="loisirs"
                        value={formData.loisirs || ''}
                        onChange={handleInputChange}
                        placeholder="Ex: Lecture, sport, musique, voyage, cuisine..."
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">Listez vos loisirs et passions séparés par des virgules</p>
                </div>
            </div>
        </div>
    );
}

export default Details;
