import AppLayout from '@/layouts/app-layout';
import { Head, usePage, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import Details from './profile/details';
import PartnerInfo from './profile/partnerInfo';
import PersonalInfo from './profile/personalInfo';
import UploadPicture from './profile/uploadPicture';

export default function ProfileInfo() {
    const { auth, profile } = usePage().props;
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentStep, setCurrentStep] = useState(profile?.currentStep || 1);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        // Step 1
        nom: profile?.nom || '',
        prenom: profile?.prenom || '',
        dateNaissance: profile?.dateNaissance || '',
        niveauEtudes: profile?.niveauEtudes || '',
        situationProfessionnelle: profile?.situationProfessionnelle || '',
        secteur: profile?.secteur || '',
        revenu: profile?.revenu || '',
        religion: profile?.religion || '',
        origine: profile?.origine || '',
        paysResidence: profile?.paysResidence || '',
        villeResidence: profile?.villeResidence || '',
        paysOrigine: profile?.paysOrigine || '',
        villeOrigine: profile?.villeOrigine || '',
        heardAboutUs: profile?.heardAboutUs || '',
        heardAboutReference: profile?.heardAboutReference || '',

        // Step 2
        etatMatrimonial: profile?.etatMatrimonial || '',
        logement: profile?.logement || '',
        taille: profile?.taille || '',
        poids: profile?.poids || '',
        etatSante: profile?.etatSante || '',
        fumeur: profile?.fumeur || '',
        buveur: profile?.buveur || '',
        sport: profile?.sport || '',
        motorise: profile?.motorise || '',
        loisirs: profile?.loisirs || '',
        hasChildren: profile?.hasChildren ?? null,
        childrenCount: profile?.childrenCount ?? '',
        childrenGuardian: profile?.childrenGuardian || '',
        hijabChoice: profile?.hijabChoice || '',

        // Step 3
        ageMinimum: profile?.ageMinimum || '',
        situationMatrimonialeRecherche: profile?.situationMatrimonialeRecherche || [],
        paysRecherche: profile?.paysRecherche || [],
        villesRecherche: profile?.villesRecherche || [],
        niveauEtudesRecherche: profile?.niveauEtudesRecherche || '',
        statutEmploiRecherche: profile?.statutEmploiRecherche || '',
        revenuMinimum: profile?.revenuMinimum || '',
        religionRecherche: profile?.religionRecherche || '',
        profilRechercheDescription: profile?.profilRechercheDescription || '',

        // Step 4
        profilePicture: null,
        profilePicturePath: profile?.profilePicturePath || '',
        cin: profile?.cin || '',
        identityCardFront: null,
        identityCardFrontPath: profile?.identityCardFrontPath || '',
    });

    // Update current step when profile changes
    useEffect(() => {
        if (profile?.currentStep) {
            setCurrentStep(profile.currentStep);
        }
    }, [profile]);

    const steps = [
        { number: 1, label: 'Info De Base' },
        { number: 2, label: 'Mode de vie' },
        { number: 3, label: 'Profil recherche' },
        { number: 4, label: 'Telecharger photo de profile' },
    ];

    const validateStep = (step) => {
        switch (step) {
            case 1:
                return formData.nom && formData.prenom && formData.dateNaissance && formData.niveauEtudes && formData.situationProfessionnelle;
            case 2:
                if (!formData.etatMatrimonial || !formData.logement) return false;
                if (!formData.heardAboutUs) return false;
                if (formData.heardAboutUs === 'pub' && !formData.heardAboutReference) return false;
                if (formData.etatMatrimonial === 'divorce' && formData.hasChildren === true) {
                    if (!formData.childrenCount || !formData.childrenGuardian) return false;
                }
                return true;
            case 3:
                const situationMatrimonialeArray = Array.isArray(formData.situationMatrimonialeRecherche) 
                    ? formData.situationMatrimonialeRecherche 
                    : (formData.situationMatrimonialeRecherche ? [formData.situationMatrimonialeRecherche] : []);
                const paysRechercheArray = Array.isArray(formData.paysRecherche) 
                    ? formData.paysRecherche 
                    : (formData.paysRecherche ? [formData.paysRecherche] : []);
                return formData.ageMinimum && situationMatrimonialeArray.length > 0 && paysRechercheArray.length > 0;
            case 4:
                // CNI and front picture are optional for prospects (will be filled by matchmaker if needed)
                // Profile picture is also optional
                return true;
            default:
                return false;
        }
    };

    const saveStep = async (step) => {
        if (!validateStep(step)) {
            alert('Veuillez remplir tous les champs obligatoires');
            return false;
        }

        try {
            const formDataToSend = new FormData();

            // Add all form data
            Object.keys(formData).forEach((key) => {
                if (formData[key] !== null && formData[key] !== undefined && formData[key] !== '') {
                    if (key === 'profilePicture' && formData[key]?.file) {
                        formDataToSend.append('profilePicture', formData[key].file);
                    } else if (key === 'identityCardFront' && formData[key] instanceof File) {
                        formDataToSend.append('identityCardFront', formData[key]);
                    } else if (key === 'villesRecherche') {
                        if (Array.isArray(formData[key]) && formData[key].length > 0) {
                            formDataToSend.append(key, JSON.stringify(formData[key]));
                        }
                    } else if (key === 'situationMatrimonialeRecherche') {
                        // Handle array or string for situationMatrimonialeRecherche
                        if (Array.isArray(formData[key]) && formData[key].length > 0) {
                            formDataToSend.append(key, JSON.stringify(formData[key]));
                        } else if (typeof formData[key] === 'string' && formData[key]) {
                            formDataToSend.append(key, formData[key]);
                        }
                    } else if (key === 'paysRecherche') {
                        // Handle array or string for paysRecherche
                        if (Array.isArray(formData[key]) && formData[key].length > 0) {
                            formDataToSend.append(key, JSON.stringify(formData[key]));
                        } else if (typeof formData[key] === 'string' && formData[key]) {
                            formDataToSend.append(key, formData[key]);
                        }
                    } else if (key === 'hasChildren') {
                        // Normalize boolean to 1/0 for backend boolean validation
                        const boolVal = formData[key] === true ? '1' : formData[key] === false ? '0' : '';
                        if (boolVal !== '') {
                            formDataToSend.append(key, boolVal);
                        }
                    } else if (key !== 'identityCardFrontPath' && key !== 'profilePicturePath') {
                        // Skip path fields, they're just for display
                        formDataToSend.append(key, formData[key]);
                    }
                }
            });

            formDataToSend.append('currentStep', step);

            // Return the promise so we can await it properly
            return new Promise((resolve, reject) => {
                router.post('/profile', formDataToSend, {
                    forceFormData: true,
                    preserveScroll: true,
                    preserveState: true,
                    onSuccess: () => {
                        console.log('Step saved successfully');
                        resolve(true);
                    },
                    onError: (errors) => {
                        console.error('Error saving step:', errors);
                        alert('Erreur lors de la sauvegarde: ' + (errors.message || Object.values(errors).join(', ')));
                        resolve(false); // Use resolve instead of reject to continue flow
                    },
                });
            });
        } catch (error) {
            console.error('Error in saveStep:', error);
            alert('Erreur lors de la sauvegarde');
            return false;
        }
    };

    const handleNext = async () => {
        if (isSubmitting) return; // Prevent multiple clicks

        setIsSubmitting(true);

        try {
            if (currentStep < 4) {
                const isSaved = await saveStep(currentStep);
                if (isSaved) {
                    setCurrentStep(currentStep + 1);
                }
            } else if (currentStep === 4) {
                // For step 4: First save the picture, then complete
                const isSaved = await saveStep(4);

                if (isSaved) {
                    if (isEditing) {
                        // If editing, just save and exit edit mode
                        setIsEditing(false);
                        // Refresh the page to get updated profile data
                        window.location.reload();
                    } else {
                        // If creating new profile, complete it
                        await router.post(
                            '/profile/complete',
                            {},
                            {
                                preserveScroll: true,
                                onSuccess: () => {
                                    window.location.href = '/dashboard';
                                },
                                onError: (errors) => {
                                    console.error('Error completing profile:', errors);
                                    alert('Erreur lors de la finalisation du profil');
                                },
                            },
                        );
                    }
                }
            }
        } catch (error) {
            console.error('Error in handleNext:', error);
            alert('Une erreur est survenue');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePrevious = async () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleEditProfile = () => {
        setIsEditing(true);
        // Set current step to the first incomplete step or step 1
        setCurrentStep(profile?.currentStep || 1);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        // Reset form data to original profile data
        setFormData({
            // Step 1
            nom: profile?.nom || '',
            prenom: profile?.prenom || '',
            dateNaissance: profile?.dateNaissance || '',
            niveauEtudes: profile?.niveauEtudes || '',
            situationProfessionnelle: profile?.situationProfessionnelle || '',
            secteur: profile?.secteur || '',
            revenu: profile?.revenu || '',
            religion: profile?.religion || '',
            origine: profile?.origine || '',
            paysResidence: profile?.paysResidence || '',
            villeResidence: profile?.villeResidence || '',
            paysOrigine: profile?.paysOrigine || '',
            villeOrigine: profile?.villeOrigine || '',
            heardAboutUs: profile?.heardAboutUs || '',
            heardAboutReference: profile?.heardAboutReference || '',

            // Step 2
            etatMatrimonial: profile?.etatMatrimonial || '',
            logement: profile?.logement || '',
            taille: profile?.taille || '',
            poids: profile?.poids || '',
            etatSante: profile?.etatSante || '',
            fumeur: profile?.fumeur || '',
            buveur: profile?.buveur || '',
            sport: profile?.sport || '',
            motorise: profile?.motorise || '',
            loisirs: profile?.loisirs || '',
            hasChildren: profile?.hasChildren ?? null,
            childrenCount: profile?.childrenCount ?? '',
            childrenGuardian: profile?.childrenGuardian || '',
            hijabChoice: profile?.hijabChoice || '',

            // Step 3
            ageMinimum: profile?.ageMinimum || '',
            situationMatrimonialeRecherche: profile?.situationMatrimonialeRecherche || [],
            paysRecherche: profile?.paysRecherche || [],
            villesRecherche: profile?.villesRecherche || [],
            niveauEtudesRecherche: profile?.niveauEtudesRecherche || '',
            statutEmploiRecherche: profile?.statutEmploiRecherche || '',
            revenuMinimum: profile?.revenuMinimum || '',
            religionRecherche: profile?.religionRecherche || '',
            profilRechercheDescription: profile?.profilRechercheDescription || '',

            // Step 4
            profilePicture: null,
            profilePicturePath: profile?.profilePicturePath || '',
            cin: profile?.cin || '',
            identityCardFront: null,
            identityCardFrontPath: profile?.identityCardFrontPath || '',
        });
    };

    // Pass formData and setFormData to each component
    const stepProps = {
        formData,
        setFormData,
    };

    // If profile is not completed OR user is editing, show the multistep form
    if (!profile?.isCompleted || isEditing) {
        return (
            <AppLayout breadcrumbs={[{ title: 'Mon Profil', href: '/profile-info' }]}>
                <Head title="Mon Profil" />
                <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                    {/* Header */}
                    <div className="flex flex-col items-center justify-center rounded-md bg-card/10 px-2 shadow-2xs sm:flex-row">
                        <div className="mb-8 text-center">
                            <h1 className="mb-2 text-3xl font-bold text-foreground">
                                {isEditing ? 'Modifier votre profil' : 'Construisons ensemble votre profil unique'}
                            </h1>
                            <p className="text-lg text-muted-foreground">
                                {isEditing ? 'Modifiez les informations de votre profil' : 'Complétez votre demande en 4 étapes simples'}
                            </p>
                            {isEditing && (
                                <button
                                    onClick={handleCancelEdit}
                                    className="mt-2 text-sm text-blue-600 hover:underline"
                                >
                                    Annuler la modification
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div className="rounded-lg bg-card p-6 shadow-md">
                        <h2 className="mb-4 text-2xl font-bold text-foreground">Progression du profil</h2>
                        <div className="mb-4 flex items-center justify-between">
                            {steps.map((step, index) => (
                                <div key={step.number} className="flex flex-1 flex-col items-center">
                                    <div className="flex w-full items-center">
                                        {/* Connector line */}
                                        {index > 0 && (
                                            <div className={`h-1 flex-1 ${currentStep >= step.number ? 'bg-button-primary' : 'bg-border'}`} />
                                        )}

                                        {/* Step circle */}
                                        <div
                                            className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                                                currentStep >= step.number ? 'bg-button-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground'
                                            } text-sm font-semibold`}
                                        >
                                            {step.number}
                                        </div>

                                        {/* Connector line */}
                                        {index < steps.length - 1 && (
                                            <div className={`h-1 flex-1 ${currentStep > step.number ? 'bg-button-primary' : 'bg-gray-300'}`} />
                                        )}
                                    </div>

                                    {/* Step label */}
                                    <span
                                        className={`mt-2 text-xs font-medium ${currentStep >= step.number ? 'text-button-primary' : 'text-muted-foreground'} hidden sm:block`}
                                    >
                                        {step.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="text-center text-sm text-muted-foreground">
                            Étape {currentStep} sur 4 • {profile?.isCompleted ? '✓ Complété' : 'En cours'}
                        </div>
                    </div>

                    {/* Form steps */}
                    <div className="rounded-lg bg-card p-6 shadow-md">
                        {/* <h2 className="mb-4 text-2xl font-bold text-gray-900">
                            {currentStep === 1 && 'Informations Personnelles'}
                            {currentStep === 2 && 'Mode de Vie'}
                            {currentStep === 3 && 'Préférences de Partenaire'}
                            {currentStep === 4 && 'Photo de Profil'}
                        </h2> */}
                        <div className="max-h-[600px] overflow-y-auto">
                            {currentStep === 1 && <PersonalInfo {...stepProps} gender={auth?.user?.gender} />}
                            {currentStep === 2 && <Details {...stepProps} gender={auth?.user?.gender} />}
                            {currentStep === 3 && <PartnerInfo {...stepProps} />}
                            {currentStep === 4 && <UploadPicture {...stepProps} />}
                        </div>
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex justify-between border-t border-border pt-6">
                        <button
                            onClick={handlePrevious}
                            disabled={currentStep === 1}
                            className={`rounded-lg border border-gray-300 px-6 py-2 font-medium ${
                                currentStep === 1
                                    ? 'cursor-not-allowed text-gray-400'
                                    : 'text-button-primary hover:bg-button-primary transition-colors hover:text-primary-foreground'
                            }`}
                        >
                            Précédent
                        </button>

                        <button
                            onClick={handleNext}
                            disabled={isSubmitting}
                            className={`bg-button-primary hover:bg-button-secondary rounded-lg px-6 py-2 font-medium text-primary-foreground transition-colors ${
                                isSubmitting ? 'cursor-not-allowed opacity-50' : ''
                            }`}
                        >
                            {isSubmitting ? 'Enregistrement...' : currentStep === 4 ? (isEditing ? 'Sauvegarder' : 'Terminer') : 'Suivant'}
                        </button>
                    </div>
                </div>
            </AppLayout>
        );
    }

    // If profile is completed, show the profile information
    return (
        <AppLayout breadcrumbs={[{ title: 'Mon Profil', href: '/profile-info' }]}>
            <Head title="Mon Profil" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="flex flex-col items-center justify-between rounded-md bg-white/10 px-2 shadow-2xs sm:flex-row">
                    {/* Header */}
                    <div className="mb-8 text-center">
                        <h1 className="mb-2 text-3xl font-bold text-gray-900">Votre Profil</h1>
                        <p className="text-lg text-gray-600">Consultez les informations de votre profil</p>
                    </div>

                    {/* Profile Picture */}
                    {profile.profilePicturePath && (
                        <div className="mb-8 text-center">
                            <div className="mb-4 text-lg font-semibold">Photo de profil</div>
                            <img
                                src={`/storage/${profile.profilePicturePath}`}
                                alt="Photo de profil"
                                className="mx-auto h-32 w-32 rounded-full border-4 border-white object-cover shadow-lg"
                            />
                        </div>
                    )}

                    {/* Profile Status Banner */}
                    {profile?.isCompleted && (
                        <div className="mb-6 rounded-lg bg-green-50 p-4 text-center">
                            <p className="text-green-700">✓ Votre profil est complété</p>
                        </div>
                    )}
                </div>

                <div className="mx-auto w-full">
                    {/* Personal Information */}
                    <div className="mb-8">
                        <div className="mb-6 rounded-lg bg-white p-6 shadow-md">
                            <h2 className="mb-4 text-2xl font-bold text-foreground">Informations personnelles</h2>
                            <div className="grid gap-6 md:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-foreground">Nom</label>
                                    <input
                                        type="text"
                                        value={profile.nom || 'Non renseigné'}
                                        disabled
                                        className="w-full rounded-lg border border-border bg-muted px-4 py-3 text-foreground"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-foreground">Prénom</label>
                                    <input
                                        type="text"
                                        value={profile.prenom || 'Non renseigné'}
                                        disabled
                                        className="w-full rounded-lg border border-border bg-muted px-4 py-3 text-foreground"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-foreground">Date de naissance</label>
                                    <input
                                        type="text"
                                        value={profile.dateNaissance || 'Non renseigné'}
                                        disabled
                                        className="w-full rounded-lg border border-border bg-muted px-4 py-3 text-foreground"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-foreground">Niveau d'études</label>
                                    <input
                                        type="text"
                                        value={profile.niveauEtudes || 'Non renseigné'}
                                        disabled
                                        className="w-full rounded-lg border border-border bg-muted px-4 py-3 text-foreground"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-foreground">Situation professionnelle</label>
                                    <input
                                        type="text"
                                        value={profile.situationProfessionnelle || 'Non renseigné'}
                                        disabled
                                        className="w-full rounded-lg border border-border bg-muted px-4 py-3 text-foreground"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-foreground">Secteur</label>
                                    <input
                                        type="text"
                                        value={profile.secteur || 'Non renseigné'}
                                        disabled
                                        className="w-full rounded-lg border border-border bg-muted px-4 py-3 text-foreground"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-foreground">Revenu</label>
                                    <input
                                        type="text"
                                        value={profile.revenu || 'Non renseigné'}
                                        disabled
                                        className="w-full rounded-lg border border-border bg-muted px-4 py-3 text-foreground"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-foreground">Religion</label>
                                    <input
                                        type="text"
                                        value={profile.religion || 'Non renseigné'}
                                        disabled
                                        className="w-full rounded-lg border border-border bg-muted px-4 py-3 text-foreground"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-foreground">Comment nous avez-vous connu</label>
                                    <input
                                        type="text"
                                        value={profile.heardAboutUs || 'Non renseigné'}
                                        disabled
                                        className="w-full rounded-lg border border-border bg-muted px-4 py-3 text-foreground"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-foreground">Référence de l'inscription</label>
                                    <input
                                        type="text"
                                        value={profile.heardAboutReference || 'Non renseigné'}
                                        disabled
                                        className="w-full rounded-lg border border-border bg-muted px-4 py-3 text-foreground"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Lifestyle Information */}
                    <div className="mb-8">
                        <div className="mb-6 rounded-lg bg-white p-6 shadow-md">
                            <h2 className="mb-4 text-2xl font-bold text-foreground">Mode de vie</h2>
                            <div className="grid gap-6 md:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-foreground">État matrimonial</label>
                                    <input
                                        type="text"
                                        value={profile.etatMatrimonial || 'Non renseigné'}
                                        disabled
                                        className="w-full rounded-lg border border-border bg-muted px-4 py-3 text-foreground"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-foreground">Logement</label>
                                    <input
                                        type="text"
                                        value={profile.logement || 'Non renseigné'}
                                        disabled
                                        className="w-full rounded-lg border border-border bg-muted px-4 py-3 text-foreground"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-foreground">Taille</label>
                                    <input
                                        type="text"
                                        value={profile.taille ? `${profile.taille} cm` : 'Non renseigné'}
                                        disabled
                                        className="w-full rounded-lg border border-border bg-muted px-4 py-3 text-foreground"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-foreground">Poids</label>
                                    <input
                                        type="text"
                                        value={profile.poids ? `${profile.poids} kg` : 'Non renseigné'}
                                        disabled
                                        className="w-full rounded-lg border border-border bg-muted px-4 py-3 text-foreground"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-foreground">État de santé</label>
                                    <textarea
                                        value={profile.etatSante || 'Non renseigné'}
                                        disabled
                                        rows={3}
                                        className="w-full rounded-lg border border-border bg-muted px-4 py-3 text-foreground"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-foreground">Fumeur</label>
                                    <input
                                        type="text"
                                        value={profile.fumeur || 'Non renseigné'}
                                        disabled
                                        className="w-full rounded-lg border border-border bg-muted px-4 py-3 text-foreground"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-foreground">Buveur</label>
                                    <input
                                        type="text"
                                        value={profile.buveur || 'Non renseigné'}
                                        disabled
                                        className="w-full rounded-lg border border-border bg-muted px-4 py-3 text-foreground"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-foreground">Sport</label>
                                    <input
                                        type="text"
                                        value={profile.sport || 'Non renseigné'}
                                        disabled
                                        className="w-full rounded-lg border border-border bg-muted px-4 py-3 text-foreground"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-foreground">Motorisé</label>
                                    <input
                                        type="text"
                                        value={profile.motorise || 'Non renseigné'}
                                        disabled
                                        className="w-full rounded-lg border border-border bg-muted px-4 py-3 text-foreground"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-foreground">Enfants</label>
                                    <input
                                        type="text"
                                        value={profile.hasChildren === true ? `Oui${profile.childrenCount ? `, ${profile.childrenCount}` : ''}` : (profile.hasChildren === false ? 'Non' : 'Non renseigné')}
                                        disabled
                                        className="w-full rounded-lg border border-border bg-muted px-4 py-3 text-foreground"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-foreground">Tuteur des enfants</label>
                                    <input
                                        type="text"
                                        value={profile.childrenGuardian === 'mother' ? 'La mère' : profile.childrenGuardian === 'father' ? 'Le père' : 'Non renseigné'}
                                        disabled
                                        className="w-full rounded-lg border border-border bg-muted px-4 py-3 text-foreground"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-foreground">Voile / Niqab</label>
                                    <input
                                        type="text"
                                        value={{
                                            voile: 'Voile',
                                            non_voile: 'Non voile',
                                            niqab: 'Niqab',
                                            idea_niqab: 'Idée niqab',
                                            idea_hijab: 'Idée hijab',
                                        }[profile.hijabChoice] || 'Non renseigné'}
                                        disabled
                                        className="w-full rounded-lg border border-border bg-muted px-4 py-3 text-foreground"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="mb-1 block text-sm font-medium text-foreground">Loisirs</label>
                                    <input
                                        type="text"
                                        value={profile.loisirs || 'Non renseigné'}
                                        disabled
                                        className="w-full rounded-lg border border-border bg-muted px-4 py-3 text-foreground"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Partner Preferences */}
                    <div className="mb-8">
                        <div className="mb-6 rounded-lg bg-white p-6 shadow-md">
                            <h2 className="mb-4 text-2xl font-bold text-foreground">Préférences de partenaire</h2>
                            <div className="grid gap-6 md:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-foreground">Âge minimum</label>
                                    <input
                                        type="text"
                                        value={profile.ageMinimum ? `${profile.ageMinimum} ans` : 'Non renseigné'}
                                        disabled
                                        className="w-full rounded-lg border border-border bg-muted px-4 py-3 text-foreground"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-foreground">Situation matrimoniale recherchée</label>
                                    <input
                                        type="text"
                                        value={profile.situationMatrimonialeRecherche || 'Non renseigné'}
                                        disabled
                                        className="w-full rounded-lg border border-border bg-muted px-4 py-3 text-foreground"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-foreground">Pays recherché</label>
                                    <input
                                        type="text"
                                        value={profile.paysRecherche || 'Non renseigné'}
                                        disabled
                                        className="w-full rounded-lg border border-border bg-muted px-4 py-3 text-foreground"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-foreground">Villes recherchées</label>
                                    <input
                                        type="text"
                                        value={
                                            profile.villesRecherche && profile.villesRecherche.length > 0
                                                ? (() => {
                                                      const villes =
                                                          typeof profile.villesRecherche === 'string'
                                                              ? JSON.parse(profile.villesRecherche)
                                                              : profile.villesRecherche;
                                                      return Array.isArray(villes) && villes.length > 0 ? villes.join(', ') : 'Non renseigné';
                                                  })()
                                                : 'Non renseigné'
                                        }
                                        disabled
                                        className="w-full rounded-lg border border-border bg-muted px-4 py-3 text-foreground"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-foreground">Niveau d'études recherché</label>
                                    <input
                                        type="text"
                                        value={profile.niveauEtudesRecherche || 'Non renseigné'}
                                        disabled
                                        className="w-full rounded-lg border border-border bg-muted px-4 py-3 text-foreground"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-foreground">Statut d'emploi recherché</label>
                                    <input
                                        type="text"
                                        value={profile.statutEmploiRecherche || 'Non renseigné'}
                                        disabled
                                        className="w-full rounded-lg border border-border bg-muted px-4 py-3 text-foreground"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-foreground">Revenu minimum</label>
                                    <input
                                        type="text"
                                        value={profile.revenuMinimum || 'Non renseigné'}
                                        disabled
                                        className="w-full rounded-lg border border-border bg-muted px-4 py-3 text-foreground"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-foreground">Religion recherchée</label>
                                    <input
                                        type="text"
                                        value={profile.religionRecherche || 'Non renseigné'}
                                        disabled
                                        className="w-full rounded-lg border border-border bg-muted px-4 py-3 text-foreground"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Profile Status */}
                    <div className="mb-8">
                        <div className="rounded-lg bg-card p-6 shadow-md">
                            <h2 className="mb-4 text-2xl font-bold text-foreground">Statut du profil</h2>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-foreground">Étape actuelle</label>
                                    <input
                                        type="text"
                                        value={`${profile.currentStep || 1} sur 4`}
                                        disabled
                                        className="w-full rounded-lg border border-border bg-muted px-4 py-3 text-foreground"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-foreground">Profil complété</label>
                                    <input
                                        type="text"
                                        value={profile.isCompleted ? 'Oui' : 'Non'}
                                        disabled
                                        className={`w-full rounded-lg border px-4 py-3 font-medium ${
                                            profile.isCompleted
                                                ? 'border-success bg-success-bg text-success'
                                                : 'border-warning bg-warning-light text-warning-foreground'
                                        }`}
                                    />
                                </div>
                                {profile.isCompleted && profile.completedAt && (
                                    <div className="md:col-span-2">
                                        <label className="mb-1 block text-sm font-medium text-foreground">Complété le</label>
                                        <input
                                            type="text"
                                            value={profile.completedAt}
                                            disabled
                                            className="w-full rounded-lg border border-border bg-muted px-4 py-3 text-foreground"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4 pt-6">
                        <button 
                            onClick={handleEditProfile}
                            className="rounded-lg bg-info px-6 py-2 font-medium text-info-foreground transition-colors hover:opacity-90"
                        >
                            Modifier le profil
                        </button>
                        <a
                            href="/dashboard"
                            className="rounded-lg border border-gray-300 bg-white px-6 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50"
                        >
                            Retour au tableau de bord
                        </a>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}