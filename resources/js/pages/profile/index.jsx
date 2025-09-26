import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import Footer from '../../components/footer';
import Navbar from '../../components/navbar';
import Details from './details';
import PartnerInfo from './partnerInfo';
import PersonalInfo from './personalInfo';
import UploadPicture from './uploadPicture';

export default function Profile({ auth, profile }) {
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

        // Step 3
        ageMinimum: profile?.ageMinimum || '',
        situationMatrimonialeRecherche: profile?.situationMatrimonialeRecherche || '',
        paysRecherche: profile?.paysRecherche || 'maroc',
        villesRecherche: profile?.villesRecherche || [],
        niveauEtudesRecherche: profile?.niveauEtudesRecherche || '',
        statutEmploiRecherche: profile?.statutEmploiRecherche || '',
        revenuMinimum: profile?.revenuMinimum || '',
        religionRecherche: profile?.religionRecherche || '',

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
                return formData.etatMatrimonial && formData.logement;
            case 3:
                return formData.ageMinimum && formData.situationMatrimonialeRecherche;
            case 4:
                return true; // Photo is optional for validation
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
            Object.keys(formData).forEach(key => {
                if (formData[key] !== null && formData[key] !== undefined && formData[key] !== '') {
                    if (key === 'profilePicture' && formData[key]?.file) {
                        formDataToSend.append('profilePicture', formData[key].file);
                    } else if (key === 'villesRecherche') {
                        if (Array.isArray(formData[key]) && formData[key].length > 0) {
                            formDataToSend.append(key, JSON.stringify(formData[key]));
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
                        console.log('Step saved successfully');
                        resolve(true);
                    },
                    onError: (errors) => {
                        console.error('Error saving step:', errors);
                        alert('Erreur lors de la sauvegarde: ' + (errors.message || Object.values(errors).join(', ')));
                        resolve(false); // Use resolve instead of reject to continue flow
                    }
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

    // Pass formData and setFormData to each component
    const stepProps = {
        formData,
        setFormData,
    };

    return (
        <>
            <Navbar />
            <div className="mt-10 min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-3xl">
                    {/* Header */}
                    <div className="mb-8 text-center">
                        <h1 className="mb-2 text-3xl font-bold text-gray-900">Construisons ensemble votre profil unique</h1>
                        <p className="text-lg text-gray-600">Complétez votre demande en 4 étapes simples</p>
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
                                            <div className={`h-1 flex-1 ${currentStep >= step.number ? 'bg-button-primary' : 'bg-gray-300'}`} />
                                        )}

                                        {/* Step circle */}
                                        <div
                                            className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                                                currentStep >= step.number ? 'bg-button-primary text-white' : 'border-gray-300 bg-white text-gray-500'
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
                                        className={`mt-2 text-xs font-medium ${currentStep >= step.number ? 'text-button-primary' : 'text-gray-500'} hidden sm:block`}
                                    >
                                        {step.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* form steps */}
                    <div className="rounded-lg bg-white p-6 shadow-md sm:p-8">
                        {currentStep === 1 && <PersonalInfo {...stepProps} />}
                        {currentStep === 2 && <Details {...stepProps} />}
                        {currentStep === 3 && <PartnerInfo {...stepProps} />}
                        {currentStep === 4 && <UploadPicture {...stepProps} />}
                    </div>

                    {/* buttons */}
                    <div className="mt-8 flex justify-between border-t border-gray-200 pt-6">
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
                            className={`bg-button-primary hover:bg-button-secondary rounded-lg px-6 py-2 font-medium text-white transition-colors ${
                                isSubmitting ? 'cursor-not-allowed opacity-50' : ''
                            }`}
                        >
                            {isSubmitting ? 'Enregistrement...' : currentStep === 4 ? 'Terminer' : 'Suivant'}
                        </button>
                    </div>

                    {/* Progress info */}
                    <div className="mt-4 text-center text-sm text-gray-500">
                        Étape {currentStep} sur 4 •{profile?.isCompleted ? ' ✓ Complété' : ' En cours'}
                    </div>
                </div>
            </div>
            <Footer />
        </>
    );
}
