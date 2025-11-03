import { useEffect, useState } from 'react';

function UploadPicture({ formData, setFormData }) {
    // const [formData, setFormData] = useState({
    //     profilePicture: null,
    //     profilePictureError: '',
    // });

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        

        if (!file) {
            setFormData((prev) => ({ ...prev, profilePictureError: '' }));
            return;
        }

        // Validate file type
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            setFormData((prev) => ({
                ...prev,
                profilePicture: null,
                profilePictureError: 'Format de fichier non supporté. Utilisez PNG, JPG ou JPEG.',
            }));
            return;
        }

        // Validate file size (2MB max)
        const maxSize = 2 * 1024 * 1024; // 2MB in bytes
        if (file.size > maxSize) {
            setFormData((prev) => ({
                ...prev,
                profilePicture: null,
                profilePictureError: 'Fichier trop volumineux. Taille maximale: 2MB.',
            }));
            return;
        }

        // Validate dimensions (optional but recommended)
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);

        img.onload = function () {
            const minDimension = 500;
            if (this.width < minDimension || this.height < minDimension) {
                setFormData((prev) => ({
                    ...prev,
                    profilePicture: null,
                    profilePictureError: `Résolution trop faible. Minimum recommandé: ${minDimension}x${minDimension} pixels.`,
                }));
                URL.revokeObjectURL(objectUrl);
                return;
            }

            // Create preview and store file data
            setFormData((prev) => ({
                ...prev,
                profilePicture: {
                    file: file,
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    preview: objectUrl,
                    width: this.width,
                    height: this.height,
                },
                profilePictureError: '',
            }));
            
        };
        

        img.onerror = function () {
            setFormData((prev) => ({
                ...prev,
                profilePicture: null,
                profilePictureError: "Erreur lors du chargement de l'image.",
            }));
            URL.revokeObjectURL(objectUrl);
        };

        img.src = objectUrl;
        console.log(formData);
        
    };

   
    // Add this useEffect to clean up object URLs
    useEffect(() => {
        return () => {
            if (formData.profilePicture && formData.profilePicture.preview) {
                URL.revokeObjectURL(formData.profilePicture.preview);
            }
        };
    }, [formData.profilePicture]);

    return (
        <div>
            {/* Form Content */}
            {/* Step Title */}
            <div className="mb-8">
                <h2 className="mb-2 text-2xl font-bold text-foreground">Ajoutez votre photo</h2>
                <p className="text-muted-foreground">Les photos renforcent les connexions. Choisissez une image claire et naturelle.</p>
            </div>

            {/* Form Fields */}
            {/* Profile Picture Upload */}
            <div className="space-y-4">
                <label className="mb-2 block text-sm font-medium text-foreground">Photo de profil *</label>

                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-6 transition-colors hover:border-blue-400">
                    {/* Preview Area */}
                    {formData.profilePicture ? (
                        <div className="text-center">
                            <div className="relative inline-block">
                                <img
                                    src={formData.profilePicture.preview}
                                    alt="Aperçu de la photo de profil"
                                    className="h-32 w-32 rounded-full border-4 border-white object-cover shadow-lg"
                                />
                                <button
                                    type="button"
                                    onClick={() => setFormData((prev) => ({ ...prev, profilePicture: null }))}
                                    className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-error text-xs text-error-foreground transition-colors hover:opacity-90"
                                >
                                    ×
                                </button>
                            </div>
                            <p className="mt-2 text-sm text-success">✓ Photo sélectionnée: {formData.profilePicture.name}</p>
                            <p className="mt-1 text-xs text-muted-foreground">Taille: {(formData.profilePicture.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                    ) : (
                        /* Upload Area */
                        <div className="text-center">
                            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                                <svg className="h-8 w-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                    />
                                </svg>
                            </div>
                            <div className="flex flex-col items-center">
                                <p className="mb-2 text-sm text-muted-foreground">Cliquez pour télécharger ou glissez-déposez</p>
                                <p className="text-xs text-muted-foreground">PNG, JPG, JPEG (Max. 2MB)</p>
                            </div>
                        </div>
                    )}

                    {/* Hidden File Input */}
                    <input
                        type="file"
                        id="profilePicture"
                        name="profilePicture"
                        accept=".png,.jpg,.jpeg,.webp"
                        onChange={handleFileChange}
                        className="hidden"
                    />

                    {/* Upload Button */}
                    <label
                        htmlFor="profilePicture"
                        className="mt-4 cursor-pointer rounded-lg bg-info px-4 py-2 font-medium text-info-foreground transition-colors hover:opacity-90"
                    >
                        {formData.profilePicture ? 'Changer la photo' : 'Choisir une photo'}
                    </label>
                </div>

                {/* Validation Messages */}
                {formData.profilePictureError && (
                    <div className="rounded-lg border border-error bg-error-light p-3 text-sm text-error">
                        <div className="flex items-center">
                            <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                    clipRule="evenodd"
                                />
                            </svg>
                            {formData.profilePictureError}
                        </div>
                    </div>
                )}

                {/* Requirements */}
                <div className="rounded-lg bg-muted p-4">
                    <h4 className="mb-2 text-sm font-medium text-foreground">Recommandations pour la photo :</h4>
                    <ul className="space-y-1 text-xs text-muted-foreground">
                        <li>• Format : PNG, JPG, JPEG</li>
                        <li>• Taille maximale : 2 MB</li>
                        <li>• Résolution recommandée : 500x500 pixels minimum</li>
                        <li>• Photo récente et claire</li>
                        <li>• Visage bien visible</li>
                        <li>• Fond neutre de préférence</li>
                    </ul>
                </div>
            </div>

            {/* CNI Upload Section */}
            <div className="mt-8 space-y-4">
                <div className="border-t border-border pt-6">
                    <label className="mb-2 block text-sm font-medium text-foreground">Carte d'Identité Nationale (CNI)</label>
                    <p className="mb-4 text-xs text-muted-foreground">Veuillez télécharger la face avant de votre CNI (optionnel - peut être rempli par votre matchmaker)</p>

                    {/* CIN Number */}
                    <div className="mb-4">
                        <label htmlFor="cin" className="mb-1 block text-sm font-medium text-foreground">
                            Numéro de CNI
                        </label>
                        <input
                            type="text"
                            id="cin"
                            name="cin"
                            value={formData.cin || ''}
                            onChange={(e) => setFormData((prev) => ({ ...prev, cin: e.target.value }))}
                            placeholder="Ex: A123456 ou AB1234"
                            className="w-full rounded-lg border border-border px-4 py-3 transition-colors focus:border-info focus:ring-2 focus:ring-info"
                        />
                        <p className="mt-1 text-xs text-muted-foreground">Format: 1-2 lettres suivies de 4-6 chiffres</p>
                    </div>

                    {/* CNI Front Upload */}
                    <div className="rounded-lg border-2 border-dashed border-border p-6">
                        {formData.identityCardFrontPath && !formData.identityCardFront ? (
                            <div className="text-center">
                                <p className="mb-2 text-sm text-foreground">CNI déjà téléchargée</p>
                                <div className="flex items-center justify-center gap-4">
                                    <a
                                        href={`/storage/${formData.identityCardFrontPath}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="rounded-lg bg-info px-4 py-2 text-sm font-medium text-info-foreground transition-colors hover:opacity-90"
                                    >
                                        Télécharger la CNI
                                    </a>
                                    <button
                                        type="button"
                                        onClick={() => setFormData((prev) => ({ ...prev, identityCardFront: null }))}
                                        className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:opacity-80"
                                    >
                                        Remplacer
                                    </button>
                                </div>
                            </div>
                        ) : formData.identityCardFront ? (
                            <div className="text-center">
                                <div className="relative inline-block">
                                    <img
                                        src={URL.createObjectURL(formData.identityCardFront)}
                                        alt="Aperçu CNI"
                                        className="h-32 w-auto rounded-lg border-4 border-white object-cover shadow-lg"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setFormData((prev) => ({ ...prev, identityCardFront: null }))}
                                        className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-error text-xs text-error-foreground transition-colors hover:opacity-90"
                                    >
                                        ×
                                    </button>
                                </div>
                                <p className="mt-2 text-sm text-success">✓ CNI sélectionnée: {formData.identityCardFront.name}</p>
                            </div>
                        ) : (
                            <div className="text-center">
                                <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                                    <svg className="h-8 w-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                        />
                                    </svg>
                                </div>
                                <div className="flex flex-col items-center">
                                    <p className="mb-2 text-sm text-muted-foreground">Cliquez pour télécharger la face avant de votre CNI</p>
                                    <p className="text-xs text-muted-foreground">PNG, JPG, JPEG (Max. 5MB)</p>
                                </div>
                            </div>
                        )}

                        {/* Hidden File Input */}
                        <input
                            type="file"
                            id="identityCardFront"
                            name="identityCardFront"
                            accept=".png,.jpg,.jpeg,.pdf"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
                                    const maxSize = 5 * 1024 * 1024; // 5MB
                                    
                                    if (!allowedTypes.includes(file.type)) {
                                        alert('Format de fichier non supporté. Utilisez PNG, JPG, JPEG ou PDF.');
                                        return;
                                    }
                                    if (file.size > maxSize) {
                                        alert('Fichier trop volumineux. Taille maximale: 5MB.');
                                        return;
                                    }
                                    setFormData((prev) => ({ ...prev, identityCardFront: file }));
                                }
                            }}
                            className="hidden"
                        />

                        {/* Upload Button */}
                        <label
                            htmlFor="identityCardFront"
                            className="mt-4 inline-block cursor-pointer rounded-lg bg-info px-4 py-2 font-medium text-info-foreground transition-colors hover:opacity-90"
                        >
                            {formData.identityCardFront || formData.identityCardFrontPath ? 'Changer la CNI' : 'Télécharger la CNI (Face avant)'}
                        </label>
                    </div>

                    <div className="mt-2 rounded-lg bg-info-light p-3">
                        <p className="text-xs text-info">• Seule la face avant de la CNI est requise</p>
                        <p className="text-xs text-info">• Assurez-vous que l'image est claire et lisible</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default UploadPicture;
