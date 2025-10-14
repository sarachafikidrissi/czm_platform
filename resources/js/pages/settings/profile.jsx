import { Transition } from '@headlessui/react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { useState, useRef, useEffect } from 'react';

import DeleteUser from '@/components/delete-user';
import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Facebook, Instagram, Linkedin, Youtube, Upload, X, User } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';

const breadcrumbs = [
    {
        title: 'Profile settings',
        href: '/settings/profile',
    },
];

export default function Profile({ mustVerifyEmail, status }) {
    const { auth, user } = usePage().props;
    const fileInputRef = useRef(null);
    const [profilePicture, setProfilePicture] = useState(null);
    const [profilePicturePreview, setProfilePicturePreview] = useState(null);

    const { data, setData, patch, errors, processing, recentlySuccessful } = useForm({
        name: auth.user.name,
        email: auth.user.email,
        phone: auth.user.phone || '',
        facebook_url: auth.user.facebook_url || '',
        instagram_url: auth.user.instagram_url || '',
        linkedin_url: auth.user.linkedin_url || '',
        youtube_url: auth.user.youtube_url || '',
        profile_picture: user?.profile?.profile_picture || auth.user.profile_picture || '',
    });

    

    // Initialize profile picture preview with current user's picture
    useEffect(() => {
        const userRole = auth.user.roles?.[0]?.name || 'user';
        let currentProfilePicture = null;
        
        if (userRole === 'user' && user.profile.profile_picture_path) {
            // For regular users, use profile->profile_picture_path
            currentProfilePicture = `/storage/${user.profile.profile_picture_path}`;
        } else if (userRole !== 'user' && auth.user.profile_picture) {
            // For staff (admin, manager, matchmaker), use user->profile_picture
            currentProfilePicture = `/storage/${auth.user.profile_picture}`;
        }
        
        if (currentProfilePicture && !profilePicturePreview) {
            setProfilePicturePreview(currentProfilePicture);
        }
    }, [auth.user, profilePicturePreview]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
            if (!allowedTypes.includes(file.type)) {
                alert('Format de fichier non supporté. Utilisez PNG, JPG ou JPEG.');
                return;
            }

            // Validate file size (2MB max)
            const maxSize = 2 * 1024 * 1024; // 2MB in bytes
            if (file.size > maxSize) {
                alert('Fichier trop volumineux. Taille maximale: 2MB.');
                return;
            }

            setProfilePicture(file);
            setData('profile_picture', file);
            
            // Create preview
            const reader = new FileReader();
            reader.onload = (e) => {
                setProfilePicturePreview(e.target.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeProfilePicture = () => {
        setProfilePicture(null);
        setProfilePicturePreview(null);
        setData('profile_picture', null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const submit = (e) => {
        e.preventDefault();
        console.log(data);
        
        // Create FormData manually when there's a file to ensure all data is included
        if (data.profile_picture) {
            const formData = new FormData();
            
            // Add all form fields to FormData
            formData.append('name', data.name);
            formData.append('email', data.email);
            formData.append('phone', data.phone || '');
            formData.append('facebook_url', data.facebook_url || '');
            formData.append('instagram_url', data.instagram_url || '');
            formData.append('linkedin_url', data.linkedin_url || '');
            formData.append('youtube_url', data.youtube_url || '');
            formData.append('profile_picture', data.profile_picture || '');
            
            patch(route('profile.update'), {
                data: formData,
                preserveScroll: true,
                forceFormData: true,
            });
        } else {
        //     // No file, use regular form submission
            patch(route('profile.update'), {
                preserveScroll: true,
            });
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Profile settings" />

            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall title="Profile information" description="Update your profile information and social networks" />

                    <form onSubmit={submit} className="space-y-6">
                        {/* Profile Picture Section */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <User className="w-5 h-5" />
                                    Photo de profil
                                </CardTitle>
                                <CardDescription>
                                    Ajoutez une photo de profil pour personnaliser votre compte
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-6">
                                    {/* Current Profile Picture */}
                                    <div className="relative">
                                        <div className="w-24 h-24 rounded-full border-4 border-gray-200 bg-gray-100 flex items-center justify-center overflow-hidden">
                                            {profilePicturePreview ? (
                                                <img 
                                                    src={profilePicturePreview} 
                                                    alt="Profile preview" 
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (() => {
                                                const userRole = auth.user.roles?.[0]?.name || 'user';
                                                let currentProfilePicture = null;
                                                
                                                if (userRole === 'user' && auth.user.profile?.profile_picture_path) {
                                                    currentProfilePicture = `/storage/${auth.user.profile.profile_picture_path}`;
                                                } else if (userRole !== 'user' && auth.user.profile_picture) {
                                                    currentProfilePicture = `/storage/${auth.user.profile_picture}`;
                                                }
                                                
                                                return currentProfilePicture ? (
                                                    <img 
                                                        src={currentProfilePicture} 
                                                        alt="Current profile" 
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <User className="w-8 h-8 text-gray-400" />
                                                );
                                            })()}
                                        </div>
                                        {profilePicture && (
                                            <button
                                                type="button"
                                                onClick={removeProfilePicture}
                                                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Upload Section */}
                                    <div className="flex-1">
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/png,image/jpeg,image/jpg,image/webp"
                                            onChange={handleFileChange}
                                            className="hidden"
                                            id="profile-picture"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="flex items-center gap-2"
                                        >
                                            <Upload className="w-4 h-4" />
                                            {profilePicture ? 'Changer la photo' : 'Ajouter une photo'}
                                        </Button>
                                        <p className="text-sm text-gray-500 mt-2">
                                            PNG, JPG, JPEG jusqu'à 2MB
                                        </p>
                                        <InputError className="mt-2" message={errors.profile_picture} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Basic Information */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Informations de base</CardTitle>
                                <CardDescription>
                                    Mettez à jour vos informations personnelles
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Nom complet (optionnel)</Label>
                                    <Input
                                        id="name"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        autoComplete="name"
                                        placeholder="Nom complet"
                                    />
                                    <InputError className="mt-2" message={errors.name} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="email">Adresse email (optionnel)</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
                                        autoComplete="username"
                                        placeholder="Adresse email"
                                    />
                                    <InputError className="mt-2" message={errors.email} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="phone">Numéro de téléphone (optionnel)</Label>
                                    <Input
                                        id="phone"
                                        type="tel"
                                        value={data.phone}
                                        onChange={(e) => setData('phone', e.target.value)}
                                        placeholder="Numéro de téléphone"
                                    />
                                    <InputError className="mt-2" message={errors.phone} />
                                </div>

                                {mustVerifyEmail && auth.user.email_verified_at === null && (
                                    <div>
                                        <p className="text-muted-foreground text-sm">
                                            Votre adresse email n'est pas vérifiée.{' '}
                                            <Link
                                                href={route('verification.send')}
                                                method="post"
                                                as="button"
                                                className="text-foreground underline decoration-neutral-300 underline-offset-4 transition-colors duration-300 ease-out hover:decoration-current! dark:decoration-neutral-500"
                                            >
                                                Cliquez ici pour renvoyer l'email de vérification.
                                            </Link>
                                        </p>

                                        {status === 'verification-link-sent' && (
                                            <div className="mt-2 text-sm font-medium text-green-600">
                                                Un nouveau lien de vérification a été envoyé à votre adresse email.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Social Networks */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Réseaux sociaux</CardTitle>
                                <CardDescription>
                                    Ajoutez vos liens de réseaux sociaux pour améliorer votre profil (tous les champs sont optionnels)
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="facebook_url" className="flex items-center gap-2">
                                        <Facebook className="w-4 h-4 text-blue-600" />
                                        Facebook (optionnel)
                                    </Label>
                                    <Input
                                        id="facebook_url"
                                        type="url"
                                        value={data.facebook_url}
                                        onChange={(e) => setData('facebook_url', e.target.value)}
                                        placeholder="https://facebook.com/votre-profil"
                                    />
                                    <InputError className="mt-2" message={errors.facebook_url} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="instagram_url" className="flex items-center gap-2">
                                        <Instagram className="w-4 h-4 text-pink-600" />
                                        Instagram (optionnel)
                                    </Label>
                                    <Input
                                        id="instagram_url"
                                        type="url"
                                        value={data.instagram_url}
                                        onChange={(e) => setData('instagram_url', e.target.value)}
                                        placeholder="https://instagram.com/votre-profil"
                                    />
                                    <InputError className="mt-2" message={errors.instagram_url} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="linkedin_url" className="flex items-center gap-2">
                                        <Linkedin className="w-4 h-4 text-blue-700" />
                                        LinkedIn (optionnel)
                                    </Label>
                                    <Input
                                        id="linkedin_url"
                                        type="url"
                                        value={data.linkedin_url}
                                        onChange={(e) => setData('linkedin_url', e.target.value)}
                                        placeholder="https://linkedin.com/in/votre-profil"
                                    />
                                    <InputError className="mt-2" message={errors.linkedin_url} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="youtube_url" className="flex items-center gap-2">
                                        <Youtube className="w-4 h-4 text-red-600" />
                                        YouTube (optionnel)
                                    </Label>
                                    <Input
                                        id="youtube_url"
                                        type="url"
                                        value={data.youtube_url}
                                        onChange={(e) => setData('youtube_url', e.target.value)}
                                        placeholder="https://youtube.com/@votre-chaine"
                                    />
                                    <InputError className="mt-2" message={errors.youtube_url} />
                                </div>
                            </CardContent>
                        </Card>

                        <div className="flex items-center gap-4">
                            <Button type="submit" disabled={processing}>
                                {processing ? 'Enregistrement...' : 'Enregistrer les modifications'}
                            </Button>

                            <Transition
                                show={recentlySuccessful}
                                enter="transition ease-in-out"
                                enterFrom="opacity-0"
                                leave="transition ease-in-out"
                                leaveTo="opacity-0"
                            >
                                <p className="text-sm text-green-600">Modifications enregistrées</p>
                            </Transition>
                        </div>
                    </form>
                </div>

                <DeleteUser />
            </SettingsLayout>
        </AppLayout>
    );
}
