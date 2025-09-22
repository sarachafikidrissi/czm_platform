import { useState } from 'react';
import Navbar from '../../components/navbar';
import Details from './details';
import PartnerInfo from './partnerInfo';
import PersonalInfo from './personalInfo';
import UploadPicture from './uploadPicture';
import Footer from '../../components/footer';

export default function Profile({ auth }) {
    const [currentStep, setCurrentStep] = useState(1);

    const steps = [
        { number: 1, label: 'Info De Base' },
        { number: 2, label: 'Profil recherche' },
        { number: 3, label: 'Mode de vie' },
        { number: 4, label: 'Telecharger photo de profile' },
    ];
    const handleNext = () => {
        if (currentStep < 4) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handlePrevious = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
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
                        {currentStep === 1 && <PersonalInfo />}
                        {currentStep === 2 && <PartnerInfo />}
                        {currentStep === 3 && <Details />}
                        {currentStep === 4 && <UploadPicture />}
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
                            Previous
                        </button>

                        <button
                            onClick={handleNext}
                            className="bg-button-primary hover:bg-button-secondary rounded-lg px-6 py-2 font-medium text-white transition-colors"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
            <Footer />
        </>
    );
}
