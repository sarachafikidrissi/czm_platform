import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import Details from './details';
import PartnerInfo from './partnerInfo';
import PersonalInfo from './personalInfo';
import UploadPicture from './uploadPicture';

export default function Profile({ auth, profile, isValidated = false }) {
    const { showToast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentStep, setCurrentStep] = useState(profile?.currentStep || 1);
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
        aproposDescription: profile?.aproposDescription || '',
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
        situationSante: profile?.situationSante ? (Array.isArray(profile.situationSante) ? profile.situationSante : [profile.situationSante]) : [],

        // Step 3
        ageMinimum: profile?.ageMinimum || '',
        ageMaximum: profile?.ageMaximum || '',
        situationMatrimonialeRecherche: profile?.situationMatrimonialeRecherche || '',
        paysRecherche: profile?.paysRecherche || 'maroc',
        villesRecherche: profile?.villesRecherche || [],
        niveauEtudesRecherche: profile?.niveauEtudesRecherche || '',
        statutEmploiRecherche: profile?.statutEmploiRecherche || '',
        revenuMinimum: profile?.revenuMinimum || '',
        religionRecherche: profile?.religionRecherche || '',
        profilRechercheDescription: profile?.profilRechercheDescription || '',

        // Step 4
        profilePicture: null,
        profilePicturePath: profile?.profilePicturePath || '',
    });

    // Update current step when profile changes
    useEffect(() => {
        if (profile?.currentStep) {
            setCurrentStep(profile.currentStep);
        }
    }, [profile]);

    const steps = [
        { number: 1, label: 'Info De Base', labelAr: 'المعلومات الأساسية' },
        { number: 2, label: 'Mode de vie', labelAr: 'نمط الحياة' },
        { number: 3, label: 'Profil recherche', labelAr: 'الملف الشخصي المطلوب' },
        { number: 4, label: 'Telecharger photo de profile', labelAr: 'تحميل صورة الملف الشخصي' },
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
                const ageValid = formData.ageMinimum && formData.ageMaximum && 
                    parseInt(formData.ageMaximum) > parseInt(formData.ageMinimum);
                return ageValid && formData.situationMatrimonialeRecherche;
            case 4:
                return true; // Photo is optional for validation
            default:
                return false;
        }
    };

    const saveStep = async (step) => {
        if (!validateStep(step)) {
            showToast('Champs obligatoires', 'Veuillez remplir tous les champs obligatoires', 'warning');
            return false;
        }

        try {
            const formDataToSend = new FormData();

            // Add all form data
            Object.keys(formData).forEach((key) => {
                if (formData[key] !== null && formData[key] !== undefined && formData[key] !== '') {
                    if (key === 'profilePicture' && formData[key]?.file) {
                        formDataToSend.append('profilePicture', formData[key].file);
                    } else if (key === 'villesRecherche') {
                        if (Array.isArray(formData[key]) && formData[key].length > 0) {
                            formDataToSend.append(key, JSON.stringify(formData[key]));
                        }
                    } else if (key === 'situationSante') {
                        // Handle array for situationSante (multiple selections)
                        if (Array.isArray(formData[key]) && formData[key].length > 0) {
                            formDataToSend.append(key, JSON.stringify(formData[key]));
                        } else if (typeof formData[key] === 'string' && formData[key]) {
                            // Legacy: single value, convert to array
                            formDataToSend.append(key, JSON.stringify([formData[key]]));
                        }
                    } else if (key === 'hasChildren') {
                        // Normalize boolean to 1/0 for backend boolean validation
                        const boolVal = formData[key] === true ? '1' : formData[key] === false ? '0' : '';
                        if (boolVal !== '') {
                            formDataToSend.append(key, boolVal);
                        }
                    } else {
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
                        resolve(true);
                    },
                    onError: (errors) => {
                        console.error('Error saving step:', errors);
                        const errorMessage = errors.validation || errors.message || Object.values(errors).join(', ');
                        showToast('Erreur de sauvegarde', 'Erreur lors de la sauvegarde: ' + errorMessage, 'error');
                        resolve(false); // Use resolve instead of reject to continue flow
                    },
                });
            });
        } catch (error) {
            console.error('Error in saveStep:', error);
            showToast('Erreur de sauvegarde', 'Erreur lors de la sauvegarde', 'error');
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
                                showToast('Erreur', 'Erreur lors de la finalisation du profil', 'error');
                            },
                        },
                    );
                }
            }
        } catch (error) {
            console.error('Error in handleNext:', error);
            showToast('Erreur', 'Une erreur est survenue', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePrevious = async () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    // Pass formData and setFormData to each component
    const stepProps = {
        formData,
        setFormData,
    };

    return (
        <div className="flex w-[100svw] h-[100svh] p-4">
            {/* <Navbar /> */}

            <div className="md:block hidden h-full w-[40%] ">
                <img loading="lazy" src="./images/couple-love.jpg" alt="" className="h-full w-full  object-cover rounded-s-2xl" />
            </div>
            <div className="sm:h-full bg-[rgb(250,244,244)] px-4 py-8 sm:px-6 lg:px-8  overflow-y-auto scrollbar-thumb-gray-300 rounded-e-2xl">
                <div className="mx-auto max-w-3xl">
                    {/* Header */}
                    <div className="mb-8 text-center">
                        <h1 className="mb-2 text-3xl font-bold text-foreground">Construisons ensemble votre profil unique</h1>
                        <p className="text-lg text-muted-foreground">Complétez votre demande en 4 étapes simples</p>
                        <a href="/dashboard" className="ml-1 text-info hover:underline">
                               visiter votre dashboard
                            </a>
                    </div>

                    {/* Progress Indicator */}
                    {profile?.isCompleted && (
                        <div className="mb-4 rounded-lg bg-green-50 p-4 text-center">
                            <p className="text-green-700">✓ Votre profil est complété</p>
                        </div>
                    )}

                    {/* progress bar */}
                    <div className="mb-12">
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
                                            <div className={`h-1 flex-1 ${currentStep > step.number ? 'bg-button-primary' : 'bg-border'}`} />
                                        )}
                                    </div>

                                    {/* Step label */}
                                    <div className="mt-2 hidden sm:block">
                                        <div className={`text-xs font-medium ${currentStep >= step.number ? 'text-button-primary' : 'text-muted-foreground'}`}>
                                            {step.label}
                                        </div>
                                        <div className={`text-xs font-medium ${currentStep >= step.number ? 'text-button-primary' : 'text-muted-foreground'}`} dir="rtl">
                                            {step.labelAr}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* form steps */}
                    <div className="rounded-lg bg-card p-6 shadow-md sm:p-8 max-h-[600px] overflow-y-auto ">
                        {currentStep === 1 && <PersonalInfo {...stepProps} />}
                        {currentStep === 2 && <Details {...stepProps} gender={auth?.user?.gender} />}
                        {currentStep === 3 && <PartnerInfo {...stepProps} />}
                        {currentStep === 4 && <UploadPicture {...stepProps} />}
                    </div>

                    {/* buttons */}
                    <div className="mt-8 flex justify-between border-t border-border pt-6">
                        <button
                            onClick={handlePrevious}
                            disabled={currentStep === 1}
                            className={`rounded-lg border border-gray-300 px-6 py-2 font-medium ${
                                currentStep === 1
                                    ? 'cursor-not-allowed text-gray-400'
                                    : 'text-button-primary hover:bg-button-primary transition-colors hover:text-white'
                            } `}
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
                            {isSubmitting ? 'Enregistrement...' : currentStep === 4 ? 'Terminer' : 'Suivant'}
                        </button>
                    </div>

                    {/* Progress info */}
                    <div className="mt-4 text-center text-sm text-muted-foreground">
                        Étape {currentStep} sur 4 •{profile?.isCompleted ? ' ✓ Complété' : ' En cours'}
                    </div>
                </div>
            </div>
            {/* <Footer /> */}
        </div>
    );
}
