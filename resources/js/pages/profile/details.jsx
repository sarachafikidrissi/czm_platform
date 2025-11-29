import { useTranslation } from 'react-i18next';

function Details({ formData, setFormData, gender }) {
    const { t } = useTranslation();
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
                    <label className="mb-2 block text-sm font-medium text-gray-700">{t('profile.maritalStatus')} *</label>
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
                            <span className="ml-2 text-sm text-gray-700">{t('profile.matrimonialSituationSingle')}</span>
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
                            <span className="ml-2 text-sm text-gray-700">{t('profile.matrimonialSituationMarried')}</span>
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
                            <span className="ml-2 text-sm text-gray-700">{t('profile.matrimonialSituationDivorced')}</span>
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
                            <span className="ml-2 text-sm text-gray-700">{t('profile.matrimonialSituationWidowed')}</span>
                        </label>
                    </div>
                </div>

                {/* Logement */}
                <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">{t('profile.housing')} *</label>
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
                            <span className="ml-2 text-sm text-gray-700">{t('profile.housingOwner')}</span>
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
                            <span className="ml-2 text-sm text-gray-700">{t('profile.housingTenant')}</span>
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
                            <span className="ml-2 text-sm text-gray-700">{t('profile.housingFamily')}</span>
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

                {/* Female-only hijab/niqab and lifestyle choices */}
                {gender === 'female' && (
                    <div className="space-y-6">
                        {/* 1. Voile */}
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700">{t('profile.veil')}</label>
                            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                <label className="inline-flex items-center">
                                    <input type="radio" name="veil" value="veiled" checked={formData.veil === 'veiled'} onChange={handleInputChange} className="text-blue-600 focus:ring-blue-500" />
                                    <span className="ml-2 text-sm text-gray-700">{t('profile.veiled')}</span>
                                </label>
                                <label className="inline-flex items-center">
                                    <input type="radio" name="veil" value="non_veiled" checked={formData.veil === 'non_veiled'} onChange={handleInputChange} className="text-blue-600 focus:ring-blue-500" />
                                    <span className="ml-2 text-sm text-gray-700">{t('profile.nonVeiled')}</span>
                                </label>
                            </div>
                        </div>

                        {/* 2. Souhait de porter un voile particulier */}
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700">{t('profile.specificVeilWish')}</label>
                            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                                <label className="inline-flex items-center">
                                    <input type="radio" name="specificVeilWish" value="hijab" checked={formData.specificVeilWish === 'hijab'} onChange={handleInputChange} className="text-blue-600 focus:ring-blue-500" />
                                    <span className="ml-2 text-sm text-gray-700">{t('profile.veilHijab')}</span>
                                </label>
                                <label className="inline-flex items-center">
                                    <input type="radio" name="specificVeilWish" value="niqab" checked={formData.specificVeilWish === 'niqab'} onChange={handleInputChange} className="text-blue-600 focus:ring-blue-500" />
                                    <span className="ml-2 text-sm text-gray-700">{t('profile.veilNiqab')}</span>
                                </label>
                                <label className="inline-flex items-center">
                                    <input type="radio" name="specificVeilWish" value="neither" checked={formData.specificVeilWish === 'neither'} onChange={handleInputChange} className="text-blue-600 focus:ring-blue-500" />
                                    <span className="ml-2 text-sm text-gray-700">{t('profile.veilNeither')}</span>
                                </label>
                            </div>
                        </div>

                        {/* 3. Acceptation du niqab */}
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700">{t('profile.niqabAcceptance')}</label>
                            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                                <label className="inline-flex items-center">
                                    <input type="radio" name="niqabAcceptance" value="yes" checked={formData.niqabAcceptance === 'yes'} onChange={handleInputChange} className="text-blue-600 focus:ring-blue-500" />
                                    <span className="ml-2 text-sm text-gray-700">{t('profile.yes')}</span>
                                </label>
                                <label className="inline-flex items-center">
                                    <input type="radio" name="niqabAcceptance" value="no" checked={formData.niqabAcceptance === 'no'} onChange={handleInputChange} className="text-blue-600 focus:ring-blue-500" />
                                    <span className="ml-2 text-sm text-gray-700">{t('profile.no')}</span>
                                </label>
                                <label className="inline-flex items-center">
                                    <input type="radio" name="niqabAcceptance" value="to_discuss" checked={formData.niqabAcceptance === 'to_discuss'} onChange={handleInputChange} className="text-blue-600 focus:ring-blue-500" />
                                    <span className="ml-2 text-sm text-gray-700">{t('profile.toDiscuss')}</span>
                                </label>
                            </div>
                        </div>

                        {/* 4. Polygamie */}
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700">{t('profile.polygamy')}</label>
                            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                                <label className="inline-flex items-center">
                                    <input type="radio" name="polygamy" value="accepted" checked={formData.polygamy === 'accepted'} onChange={handleInputChange} className="text-blue-600 focus:ring-blue-500" />
                                    <span className="ml-2 text-sm text-gray-700">{t('profile.accepted')}</span>
                                </label>
                                <label className="inline-flex items-center">
                                    <input type="radio" name="polygamy" value="not_accepted" checked={formData.polygamy === 'not_accepted'} onChange={handleInputChange} className="text-blue-600 focus:ring-blue-500" />
                                    <span className="ml-2 text-sm text-gray-700">{t('profile.notAccepted')}</span>
                                </label>
                                <label className="inline-flex items-center">
                                    <input type="radio" name="polygamy" value="to_discuss" checked={formData.polygamy === 'to_discuss'} onChange={handleInputChange} className="text-blue-600 focus:ring-blue-500" />
                                    <span className="ml-2 text-sm text-gray-700">{t('profile.toDiscuss')}</span>
                                </label>
                            </div>
                        </div>

                        {/* 5. Mariage avec une personne étrangère */}
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700">{t('profile.foreignMarriage')}</label>
                            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                                <label className="inline-flex items-center">
                                    <input type="radio" name="foreignMarriage" value="yes" checked={formData.foreignMarriage === 'yes'} onChange={handleInputChange} className="text-blue-600 focus:ring-blue-500" />
                                    <span className="ml-2 text-sm text-gray-700">{t('profile.yes')}</span>
                                </label>
                                <label className="inline-flex items-center">
                                    <input type="radio" name="foreignMarriage" value="no" checked={formData.foreignMarriage === 'no'} onChange={handleInputChange} className="text-blue-600 focus:ring-blue-500" />
                                    <span className="ml-2 text-sm text-gray-700">{t('profile.no')}</span>
                                </label>
                                <label className="inline-flex items-center">
                                    <input type="radio" name="foreignMarriage" value="maybe_discuss" checked={formData.foreignMarriage === 'maybe_discuss'} onChange={handleInputChange} className="text-blue-600 focus:ring-blue-500" />
                                    <span className="ml-2 text-sm text-gray-700">{t('profile.maybeDiscuss')}</span>
                                </label>
                            </div>
                        </div>

                        {/* 6. Travail après le mariage */}
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700">{t('profile.workAfterMarriage')}</label>
                            <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
                                <label className="inline-flex items-center">
                                    <input type="radio" name="workAfterMarriage" value="yes" checked={formData.workAfterMarriage === 'yes'} onChange={handleInputChange} className="text-blue-600 focus:ring-blue-500" />
                                    <span className="ml-2 text-sm text-gray-700">{t('profile.yes')}</span>
                                </label>
                                <label className="inline-flex items-center">
                                    <input type="radio" name="workAfterMarriage" value="no" checked={formData.workAfterMarriage === 'no'} onChange={handleInputChange} className="text-blue-600 focus:ring-blue-500" />
                                    <span className="ml-2 text-sm text-gray-700">{t('profile.no')}</span>
                                </label>
                                <label className="inline-flex items-center">
                                    <input type="radio" name="workAfterMarriage" value="maybe" checked={formData.workAfterMarriage === 'maybe'} onChange={handleInputChange} className="text-blue-600 focus:ring-blue-500" />
                                    <span className="ml-2 text-sm text-gray-700">{t('profile.maybe')}</span>
                                </label>
                                <label className="inline-flex items-center">
                                    <input type="radio" name="workAfterMarriage" value="depending_situation" checked={formData.workAfterMarriage === 'depending_situation'} onChange={handleInputChange} className="text-blue-600 focus:ring-blue-500" />
                                    <span className="ml-2 text-sm text-gray-700">{t('profile.dependingOnSituation')}</span>
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {/* Heard about us (moved to step 2) */}
                <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">{t('profile.heardAboutUs')} *</label>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                        <label className="inline-flex items-center">
                            <input type="radio" name="heardAboutUs" value="recommande" checked={formData.heardAboutUs === 'recommande'} onChange={handleInputChange} className="text-blue-600 focus:ring-blue-500" />
                            <span className="ml-2 text-sm text-gray-700">{t('profile.heardAboutUsRecommended')}</span>
                        </label>
                        <label className="inline-flex items-center">
                            <input type="radio" name="heardAboutUs" value="passage" checked={formData.heardAboutUs === 'passage'} onChange={handleInputChange} className="text-blue-600 focus:ring-blue-500" />
                            <span className="ml-2 text-sm text-gray-700">{t('profile.heardAboutUsPassage')}</span>
                        </label>
                        <label className="inline-flex items-center">
                            <input type="radio" name="heardAboutUs" value="online_ads" checked={formData.heardAboutUs === 'online_ads'} onChange={handleInputChange} className="text-blue-600 focus:ring-blue-500" />
                            <span className="ml-2 text-sm text-gray-700">{t('profile.heardAboutUsOnlineAds')}</span>
                        </label>
                        <label className="inline-flex items-center">
                            <input type="radio" name="heardAboutUs" value="google_search" checked={formData.heardAboutUs === 'google_search'} onChange={handleInputChange} className="text-blue-600 focus:ring-blue-500" />
                            <span className="ml-2 text-sm text-gray-700">{t('profile.heardAboutUsGoogleSearch')}</span>
                        </label>
                        <label className="inline-flex items-center">
                            <input type="radio" name="heardAboutUs" value="youtube_video" checked={formData.heardAboutUs === 'youtube_video'} onChange={handleInputChange} className="text-blue-600 focus:ring-blue-500" />
                            <span className="ml-2 text-sm text-gray-700">{t('profile.heardAboutUsYouTubeVideo')}</span>
                        </label>
                        <label className="inline-flex items-center">
                            <input type="radio" name="heardAboutUs" value="facebook_post" checked={formData.heardAboutUs === 'facebook_post'} onChange={handleInputChange} className="text-blue-600 focus:ring-blue-500" />
                            <span className="ml-2 text-sm text-gray-700">{t('profile.heardAboutUsFacebookPost')}</span>
                        </label>
                        <label className="inline-flex items-center">
                            <input type="radio" name="heardAboutUs" value="instagram_post" checked={formData.heardAboutUs === 'instagram_post'} onChange={handleInputChange} className="text-blue-600 focus:ring-blue-500" />
                            <span className="ml-2 text-sm text-gray-700">{t('profile.heardAboutUsInstagramPost')}</span>
                        </label>
                        <label className="inline-flex items-center">
                            <input type="radio" name="heardAboutUs" value="tiktok_video" checked={formData.heardAboutUs === 'tiktok_video'} onChange={handleInputChange} className="text-blue-600 focus:ring-blue-500" />
                            <span className="ml-2 text-sm text-gray-700">{t('profile.heardAboutUsTikTokVideo')}</span>
                        </label>
                        <label className="inline-flex items-center">
                            <input type="radio" name="heardAboutUs" value="collaboration" checked={formData.heardAboutUs === 'collaboration'} onChange={handleInputChange} className="text-blue-600 focus:ring-blue-500" />
                            <span className="ml-2 text-sm text-gray-700">{t('profile.heardAboutUsCollaboration')}</span>
                        </label>
                        <label className="inline-flex items-center">
                            <input type="radio" name="heardAboutUs" value="phone_call" checked={formData.heardAboutUs === 'phone_call'} onChange={handleInputChange} className="text-blue-600 focus:ring-blue-500" />
                            <span className="ml-2 text-sm text-gray-700">{t('profile.heardAboutUsPhoneCall')}</span>
                        </label>
                        <label className="inline-flex items-center">
                            <input type="radio" name="heardAboutUs" value="pub" checked={formData.heardAboutUs === 'pub'} onChange={handleInputChange} className="text-blue-600 focus:ring-blue-500" />
                            <span className="ml-2 text-sm text-gray-700">{t('profile.heardAboutUsPub')}</span>
                        </label>
                    </div>
                    {/* Text input fields for each option */}
                    {formData.heardAboutUs === 'recommande' && (
                        <div className="mt-3">
                            <label htmlFor="heardAboutReference" className="mb-1 block text-sm font-medium text-gray-700">D'où avez-vous été recommandé ?</label>
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
                    {formData.heardAboutUs === 'passage' && (
                        <div className="mt-3">
                            <label htmlFor="heardAboutReference" className="mb-1 block text-sm font-medium text-gray-700">Précisions sur le passage</label>
                            <p className="text-sm font-medium text-gray-700 mb-1" dir="rtl">تفاصيل حول المرور</p>
                            <input
                                type="text"
                                id="heardAboutReference"
                                name="heardAboutReference"
                                value={formData.heardAboutReference || ''}
                                onChange={handleInputChange}
                                placeholder="Précisez les détails de votre passage (lieu, circonstances, etc.)"
                                className="w-full rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    )}
                    {formData.heardAboutUs === 'online_ads' && (
                        <div className="mt-3">
                            <label htmlFor="heardAboutReference" className="mb-1 block text-sm font-medium text-gray-700">Détails sur les publicités en ligne</label>
                            <p className="text-sm font-medium text-gray-700 mb-1" dir="rtl">تفاصيل حول الإعلانات عبر الإنترنت</p>
                            <input
                                type="text"
                                id="heardAboutReference"
                                name="heardAboutReference"
                                value={formData.heardAboutReference || ''}
                                onChange={handleInputChange}
                                placeholder="Précisez où vous avez vu les publicités en ligne (site web, plateforme, etc.)"
                                className="w-full rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    )}
                    {formData.heardAboutUs === 'google_search' && (
                        <div className="mt-3">
                            <label htmlFor="heardAboutReference" className="mb-1 block text-sm font-medium text-gray-700">Détails sur la recherche Google</label>
                            <p className="text-sm font-medium text-gray-700 mb-1" dir="rtl">تفاصيل حول البحث في جوجل</p>
                            <input
                                type="text"
                                id="heardAboutReference"
                                name="heardAboutReference"
                                value={formData.heardAboutReference || ''}
                                onChange={handleInputChange}
                                placeholder="Précisez les mots-clés ou la recherche effectuée"
                                className="w-full rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    )}
                    {formData.heardAboutUs === 'youtube_video' && (
                        <div className="mt-3">
                            <label htmlFor="heardAboutReference" className="mb-1 block text-sm font-medium text-gray-700">Détails sur la vidéo YouTube</label>
                            <p className="text-sm font-medium text-gray-700 mb-1" dir="rtl">تفاصيل حول فيديو يوتيوب</p>
                            <input
                                type="text"
                                id="heardAboutReference"
                                name="heardAboutReference"
                                value={formData.heardAboutReference || ''}
                                onChange={handleInputChange}
                                placeholder="Précisez le lien ou le titre de la vidéo YouTube"
                                className="w-full rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    )}
                    {formData.heardAboutUs === 'facebook_post' && (
                        <div className="mt-3">
                            <label htmlFor="heardAboutReference" className="mb-1 block text-sm font-medium text-gray-700">Détails sur le post/annonce Facebook</label>
                            <p className="text-sm font-medium text-gray-700 mb-1" dir="rtl">تفاصيل حول منشور/إعلان فيسبوك</p>
                            <input
                                type="text"
                                id="heardAboutReference"
                                name="heardAboutReference"
                                value={formData.heardAboutReference || ''}
                                onChange={handleInputChange}
                                placeholder="Précisez le lien ou les détails du post/annonce Facebook"
                                className="w-full rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    )}
                    {formData.heardAboutUs === 'instagram_post' && (
                        <div className="mt-3">
                            <label htmlFor="heardAboutReference" className="mb-1 block text-sm font-medium text-gray-700">Détails sur le post/annonce Instagram</label>
                            <p className="text-sm font-medium text-gray-700 mb-1" dir="rtl">تفاصيل حول منشور/إعلان إنستغرام</p>
                            <input
                                type="text"
                                id="heardAboutReference"
                                name="heardAboutReference"
                                value={formData.heardAboutReference || ''}
                                onChange={handleInputChange}
                                placeholder="Précisez le lien ou les détails du post/annonce Instagram"
                                className="w-full rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    )}
                    {formData.heardAboutUs === 'tiktok_video' && (
                        <div className="mt-3">
                            <label htmlFor="heardAboutReference" className="mb-1 block text-sm font-medium text-gray-700">Détails sur la vidéo TikTok</label>
                            <p className="text-sm font-medium text-gray-700 mb-1" dir="rtl">تفاصيل حول فيديو تيك توك</p>
                            <input
                                type="text"
                                id="heardAboutReference"
                                name="heardAboutReference"
                                value={formData.heardAboutReference || ''}
                                onChange={handleInputChange}
                                placeholder="Précisez le lien ou le titre de la vidéo TikTok"
                                className="w-full rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    )}
                    {formData.heardAboutUs === 'collaboration' && (
                        <div className="mt-3">
                            <label htmlFor="heardAboutReference" className="mb-1 block text-sm font-medium text-gray-700">Détails sur la collaboration/partenariat</label>
                            <p className="text-sm font-medium text-gray-700 mb-1" dir="rtl">تفاصيل حول التعاون/الشراكة</p>
                            <input
                                type="text"
                                id="heardAboutReference"
                                name="heardAboutReference"
                                value={formData.heardAboutReference || ''}
                                onChange={handleInputChange}
                                placeholder="Précisez les détails de la collaboration ou du partenariat"
                                className="w-full rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    )}
                    {formData.heardAboutUs === 'phone_call' && (
                        <div className="mt-3">
                            <label htmlFor="heardAboutReference" className="mb-1 block text-sm font-medium text-gray-700">Détails sur l'appel téléphonique</label>
                            <p className="text-sm font-medium text-gray-700 mb-1" dir="rtl">تفاصيل حول المكالمة الهاتفية</p>
                            <input
                                type="text"
                                id="heardAboutReference"
                                name="heardAboutReference"
                                value={formData.heardAboutReference || ''}
                                onChange={handleInputChange}
                                placeholder="Précisez les détails de l'appel téléphonique (qui vous a appelé, quand, etc.)"
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

                {/* Situation de santé */}
                <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">{t('profile.healthSituation', { defaultValue: 'Situation de santé' })}</label>
                    <p className="text-sm font-medium text-gray-700 mb-1" dir="rtl">حالة الصحة</p>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                        <label className="inline-flex items-center">
                            <input 
                                type="checkbox" 
                                name="situationSante" 
                                value="sante_tres_bonne" 
                                checked={Array.isArray(formData.situationSante) ? formData.situationSante.includes('sante_tres_bonne') : (formData.situationSante === 'sante_tres_bonne')} 
                                onChange={(e) => {
                                    const currentValue = Array.isArray(formData.situationSante) ? formData.situationSante : (formData.situationSante ? [formData.situationSante] : []);
                                    if (e.target.checked) {
                                        setFormData((prev) => ({
                                            ...prev,
                                            situationSante: [...currentValue, 'sante_tres_bonne'],
                                        }));
                                    } else {
                                        setFormData((prev) => ({
                                            ...prev,
                                            situationSante: currentValue.filter(v => v !== 'sante_tres_bonne'),
                                        }));
                                    }
                                }} 
                                className="text-blue-600 focus:ring-blue-500" 
                            />
                            <span className="ml-2 text-sm text-gray-700">{t('profile.healthSituationVeryGood', { defaultValue: 'Santé très bonne' })}</span>
                        </label>
                        <label className="inline-flex items-center">
                            <input 
                                type="checkbox" 
                                name="situationSante" 
                                value="maladie_chronique" 
                                checked={Array.isArray(formData.situationSante) ? formData.situationSante.includes('maladie_chronique') : (formData.situationSante === 'maladie_chronique')} 
                                onChange={(e) => {
                                    const currentValue = Array.isArray(formData.situationSante) ? formData.situationSante : (formData.situationSante ? [formData.situationSante] : []);
                                    if (e.target.checked) {
                                        setFormData((prev) => ({
                                            ...prev,
                                            situationSante: [...currentValue, 'maladie_chronique'],
                                        }));
                                    } else {
                                        setFormData((prev) => ({
                                            ...prev,
                                            situationSante: currentValue.filter(v => v !== 'maladie_chronique'),
                                        }));
                                    }
                                }} 
                                className="text-blue-600 focus:ring-blue-500" 
                            />
                            <span className="ml-2 text-sm text-gray-700">{t('profile.healthSituationChronicDisease', { defaultValue: 'Maladie chronique' })}</span>
                        </label>
                        <label className="inline-flex items-center">
                            <input 
                                type="checkbox" 
                                name="situationSante" 
                                value="personne_handicap" 
                                checked={Array.isArray(formData.situationSante) ? formData.situationSante.includes('personne_handicap') : (formData.situationSante === 'personne_handicap')} 
                                onChange={(e) => {
                                    const currentValue = Array.isArray(formData.situationSante) ? formData.situationSante : (formData.situationSante ? [formData.situationSante] : []);
                                    if (e.target.checked) {
                                        setFormData((prev) => ({
                                            ...prev,
                                            situationSante: [...currentValue, 'personne_handicap'],
                                        }));
                                    } else {
                                        setFormData((prev) => ({
                                            ...prev,
                                            situationSante: currentValue.filter(v => v !== 'personne_handicap'),
                                        }));
                                    }
                                }} 
                                className="text-blue-600 focus:ring-blue-500" 
                            />
                            <span className="ml-2 text-sm text-gray-700">{t('profile.healthSituationDisabled', { defaultValue: 'Personne en situation de handicap' })}</span>
                        </label>
                        <label className="inline-flex items-center">
                            <input 
                                type="checkbox" 
                                name="situationSante" 
                                value="non_voyant_malvoyant" 
                                checked={Array.isArray(formData.situationSante) ? formData.situationSante.includes('non_voyant_malvoyant') : (formData.situationSante === 'non_voyant_malvoyant')} 
                                onChange={(e) => {
                                    const currentValue = Array.isArray(formData.situationSante) ? formData.situationSante : (formData.situationSante ? [formData.situationSante] : []);
                                    if (e.target.checked) {
                                        setFormData((prev) => ({
                                            ...prev,
                                            situationSante: [...currentValue, 'non_voyant_malvoyant'],
                                        }));
                                    } else {
                                        setFormData((prev) => ({
                                            ...prev,
                                            situationSante: currentValue.filter(v => v !== 'non_voyant_malvoyant'),
                                        }));
                                    }
                                }} 
                                className="text-blue-600 focus:ring-blue-500" 
                            />
                            <span className="ml-2 text-sm text-gray-700">{t('profile.healthSituationBlindLowVision', { defaultValue: 'Non voyant / Malvoyant' })}</span>
                        </label>
                        <label className="inline-flex items-center">
                            <input 
                                type="checkbox" 
                                name="situationSante" 
                                value="cecite_totale" 
                                checked={Array.isArray(formData.situationSante) ? formData.situationSante.includes('cecite_totale') : (formData.situationSante === 'cecite_totale')} 
                                onChange={(e) => {
                                    const currentValue = Array.isArray(formData.situationSante) ? formData.situationSante : (formData.situationSante ? [formData.situationSante] : []);
                                    if (e.target.checked) {
                                        setFormData((prev) => ({
                                            ...prev,
                                            situationSante: [...currentValue, 'cecite_totale'],
                                        }));
                                    } else {
                                        setFormData((prev) => ({
                                            ...prev,
                                            situationSante: currentValue.filter(v => v !== 'cecite_totale'),
                                        }));
                                    }
                                }} 
                                className="text-blue-600 focus:ring-blue-500" 
                            />
                            <span className="ml-2 text-sm text-gray-700">{t('profile.healthSituationTotalBlindness', { defaultValue: 'مكفوف (Cécité totale)' })}</span>
                        </label>
                        <label className="inline-flex items-center">
                            <input 
                                type="checkbox" 
                                name="situationSante" 
                                value="troubles_psychiques" 
                                checked={Array.isArray(formData.situationSante) ? formData.situationSante.includes('troubles_psychiques') : false} 
                                onChange={(e) => {
                                    const currentValue = Array.isArray(formData.situationSante) ? formData.situationSante : (formData.situationSante ? [formData.situationSante] : []);
                                    if (e.target.checked) {
                                        setFormData((prev) => ({
                                            ...prev,
                                            situationSante: [...currentValue, 'troubles_psychiques'],
                                        }));
                                    } else {
                                        setFormData((prev) => ({
                                            ...prev,
                                            situationSante: currentValue.filter(v => v !== 'troubles_psychiques'),
                                        }));
                                    }
                                }} 
                                className="text-blue-600 focus:ring-blue-500" 
                            />
                            <span className="ml-2 text-sm text-gray-700">{t('profile.healthSituationMentalDisorder', { defaultValue: 'Troubles psychiques' })}</span>
                        </label>
                        <label className="inline-flex items-center">
                            <input 
                                type="checkbox" 
                                name="situationSante" 
                                value="autres" 
                                checked={Array.isArray(formData.situationSante) ? formData.situationSante.includes('autres') : (formData.situationSante === 'autres')} 
                                onChange={(e) => {
                                    const currentValue = Array.isArray(formData.situationSante) ? formData.situationSante : (formData.situationSante ? [formData.situationSante] : []);
                                    if (e.target.checked) {
                                        setFormData((prev) => ({
                                            ...prev,
                                            situationSante: [...currentValue, 'autres'],
                                        }));
                                    } else {
                                        setFormData((prev) => ({
                                            ...prev,
                                            situationSante: currentValue.filter(v => v !== 'autres'),
                                        }));
                                    }
                                }} 
                                className="text-blue-600 focus:ring-blue-500" 
                            />
                            <span className="ml-2 text-sm text-gray-700">{t('profile.healthSituationOther', { defaultValue: 'Autres' })}</span>
                        </label>
                    </div>
                </div>

                {/* État de santé */}
                    <div>
                        <label htmlFor="etatSante" className="mb-1 block text-sm font-medium text-gray-700">
                        {t('profile.generalHealthStatus')}
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
                    <p className="mt-1 text-xs text-gray-500">{t('profile.optionalConfidential')}</p>
                </div>

                {/* Habitudes */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                    {/* Fumeur */}
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">{t('profile.smoker')}</label>
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
                                <span className="ml-2 text-sm text-gray-700">{t('profile.yes')}</span>
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
                                <span className="ml-2 text-sm text-gray-700">{t('profile.no')}</span>
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
                                <span className="ml-2 text-sm text-gray-700">{t('profile.sometimes')}</span>
                            </label>
                        </div>
                    </div>

                    {/* Buveur */}
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">{t('profile.drinker')}</label>
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
                                <span className="ml-2 text-sm text-gray-700">{t('profile.yes')}</span>
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
                                <span className="ml-2 text-sm text-gray-700">{t('profile.no')}</span>
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
                                <span className="ml-2 text-sm text-gray-700">{t('profile.sometimes')}</span>
                            </label>
                        </div>
                    </div>

                    {/* Sport */}
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">{t('profile.sport')}</label>
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
                                <span className="ml-2 text-sm text-gray-700">{t('profile.yes')}</span>
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
                                <span className="ml-2 text-sm text-gray-700">{t('profile.no')}</span>
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
                                <span className="ml-2 text-sm text-gray-700">{t('profile.sometimes')}</span>
                            </label>
                        </div>
                    </div>

                    {/* Motorisé */}
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">{t('profile.motorized')}</label>
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
                                <span className="ml-2 text-sm text-gray-700">{t('profile.yes')}</span>
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
                                <span className="ml-2 text-sm text-gray-700">{t('profile.no')}</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Loisirs - Text Input */}
                <div>
                    <label htmlFor="loisirs" className="mb-1 block text-sm font-medium text-gray-700">
                        {t('profile.hobbiesAndInterests')}
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
                    <p className="mt-1 text-xs text-gray-500">{t('profile.hobbiesPlaceholder')}</p>
                </div>
            </div>
        </div>
    );
}

export default Details;
