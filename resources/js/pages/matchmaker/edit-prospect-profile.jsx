import AppLayout from '@/layouts/app-layout';
import { Head, usePage, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Details from '../profile/details';
import PartnerInfo from '../profile/partnerInfo';
import PersonalInfo from '../profile/personalInfo';
import UploadPicture from '../profile/uploadPicture';

export default function EditProspectProfile() {
    const { prospect, profile } = usePage().props;
    const { auth } = usePage().props;
    
    const { t } = useTranslation();
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
        { number: 1, label: t('profile.step1Label') },
        { number: 2, label: t('profile.step2Label') },
        { number: 3, label: t('profile.step3Label') },
        { number: 4, label: t('profile.step4Label') },
    ];

    const validateStep = (step) => {
        switch (step) {
            case 1:
                return formData.nom && formData.prenom && formData.dateNaissance && formData.niveauEtudes && formData.situationProfessionnelle;
            case 2:
                if (!formData.etatMatrimonial || !formData.logement) return false;
                if (!formData.heardAboutUs) return false;
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
                const ageValid = formData.ageMinimum && formData.ageMaximum && 
                    parseInt(formData.ageMaximum) > parseInt(formData.ageMinimum);
                return ageValid && situationMatrimonialeArray.length > 0 && paysRechercheArray.length > 0;
            case 4:
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
                        if (Array.isArray(formData[key]) && formData[key].length > 0) {
                            formDataToSend.append(key, JSON.stringify(formData[key]));
                        } else if (typeof formData[key] === 'string' && formData[key]) {
                            formDataToSend.append(key, formData[key]);
                        }
                    } else if (key === 'paysRecherche') {
                        if (Array.isArray(formData[key]) && formData[key].length > 0) {
                            formDataToSend.append(key, JSON.stringify(formData[key]));
                        } else if (typeof formData[key] === 'string' && formData[key]) {
                            formDataToSend.append(key, formData[key]);
                        }
                    } else if (key === 'situationSante') {
                        if (Array.isArray(formData[key]) && formData[key].length > 0) {
                            formDataToSend.append(key, JSON.stringify(formData[key]));
                        } else if (typeof formData[key] === 'string' && formData[key]) {
                            formDataToSend.append(key, JSON.stringify([formData[key]]));
                        }
                    } else if (key === 'hasChildren') {
                        const boolVal = formData[key] === true ? '1' : formData[key] === false ? '0' : '';
                        if (boolVal !== '') {
                            formDataToSend.append(key, boolVal);
                        }
                    } else if (key !== 'identityCardFrontPath' && key !== 'profilePicturePath') {
                        formDataToSend.append(key, formData[key]);
                    }
                }
            });

            formDataToSend.append('currentStep', step);

            return new Promise((resolve, reject) => {
                router.post(`/staff/prospects/${prospect.id}/profile`, formDataToSend, {
                    forceFormData: true,
                    preserveScroll: true,
                    preserveState: true,
                    onSuccess: () => {
                        resolve(true);
                    },
                    onError: (errors) => {
                        console.error('Error saving step:', errors);
                        alert('Erreur lors de la sauvegarde: ' + (errors.message || Object.values(errors).join(', ')));
                        resolve(false);
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
        if (isSubmitting) return;

        setIsSubmitting(true);

        try {
            if (currentStep < 4) {
                const isSaved = await saveStep(currentStep);
                if (isSaved) {
                    setCurrentStep(currentStep + 1);
                }
            } else if (currentStep === 4) {
                const isSaved = await saveStep(4);
                if (isSaved) {
                    router.visit('/staff/agency-prospects', {
                        preserveScroll: true,
                        onSuccess: () => {
                            // Show success message
                        },
                    });
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

    const stepProps = {
        formData,
        setFormData,
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Éditer le profil', href: `/staff/prospects/${prospect?.id}/profile/edit` }]}>
            <Head title={`Éditer le profil - ${prospect?.name}`} />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="flex flex-col items-center justify-center rounded-md bg-card/10 px-2 shadow-2xs sm:flex-row">
                    <div className="mb-8 text-center">
                        <h1 className="mb-2 text-3xl font-bold text-foreground">
                            Éditer le profil de {prospect?.name}
                        </h1>
                        <p className="text-lg text-muted-foreground">
                            Remplissez ou modifiez le profil du prospect
                        </p>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="rounded-lg bg-card p-6 shadow-md">
                    <h2 className="mb-4 text-2xl font-bold text-foreground">Progression du profil</h2>
                    <div className="mb-4 flex items-center justify-between">
                        {steps.map((step, index) => (
                            <div key={step.number} className="flex flex-1 flex-col items-center">
                                <div className="flex w-full items-center">
                                    {index > 0 && (
                                        <div className={`h-1 flex-1 ${currentStep >= step.number ? 'bg-button-primary' : 'bg-border'}`} />
                                    )}
                                    <div
                                        className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                                            currentStep >= step.number ? 'bg-button-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground'
                                        } text-sm font-semibold`}
                                    >
                                        {step.number}
                                    </div>
                                    {index < steps.length - 1 && (
                                        <div className={`h-1 flex-1 ${currentStep > step.number ? 'bg-button-primary' : 'bg-gray-300'}`} />
                                    )}
                                </div>
                                <span
                                    className={`mt-2 text-xs font-medium ${currentStep >= step.number ? 'text-button-primary' : 'text-muted-foreground'} hidden sm:block`}
                                >
                                    {step.label}
                                </span>
                            </div>
                        ))}
                    </div>
                    <div className="text-center text-sm text-muted-foreground">
                        Étape {currentStep} sur 4 • {profile?.isCompleted ? `✓ Complété` : 'En cours'}
                    </div>
                </div>

                {/* Form steps */}
                <div className="rounded-lg bg-card p-6 shadow-md">
                    <div className="max-h-[600px] overflow-y-auto">
                        {currentStep === 1 && <PersonalInfo {...stepProps} gender={prospect?.gender} />}
                        {currentStep === 2 && <Details {...stepProps} gender={prospect?.gender} />}
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
                        {isSubmitting ? 'Enregistrement...' : currentStep === 4 ? 'Terminer' : 'Suivant'}
                    </button>
                </div>
            </div>
        </AppLayout>
    );
}

