import { Head } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Phone, MapPin, Calendar, Edit } from 'lucide-react';
import { useEffect } from 'react';
import Navbar from '../../components/navbar';

export default function Profile({ auth }) {

    
    return (
        // <div className="min-h-screen bg-gray-50 py-8">
        //     <Head title="Profile" />
            
        //     <div className="max-w-4xl mx-auto px-4">
        //         <div className="mb-8">
        //             <h1 className="text-3xl font-bold text-gray-900">Mon Profil</h1>
        //             <p className="text-gray-600 mt-2">Gérez vos informations personnelles et vos préférences</p>
        //         </div>

        //         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        //             {/* Profile Card */}
        //             <div className="lg:col-span-1">
        //                 <Card>
        //                     <CardHeader className="text-center">
        //                         <div className="mx-auto w-24 h-24 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-4">
        //                             {auth.user.name ? auth.user.name.charAt(0).toUpperCase() : 'U'}
        //                         </div>
        //                         <CardTitle className="text-xl">{auth.user.name || 'Utilisateur'}</CardTitle>
        //                         <Badge variant="secondary" className="mt-2">
        //                             Membre Actif
        //                         </Badge>
        //                     </CardHeader>
        //                     <CardContent>
        //                         <Button className="w-full" variant="outline">
        //                             <Edit className="w-4 h-4 mr-2" />
        //                             Modifier le profil
        //                         </Button>
        //                     </CardContent>
        //                 </Card>
        //             </div>

        //             {/* Profile Details */}
        //             <div className="lg:col-span-2">
        //                 <Card>
        //                     <CardHeader>
        //                         <CardTitle>Informations Personnelles</CardTitle>
        //                     </CardHeader>
        //                     <CardContent className="space-y-6">
        //                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        //                             <div className="flex items-center space-x-3">
        //                                 <Mail className="w-5 h-5 text-gray-400" />
        //                                 <div>
        //                                     <p className="text-sm text-gray-500">Email</p>
        //                                     <p className="font-medium">{auth.user.email}</p>
        //                                 </div>
        //                             </div>
                                    
        //                             <div className="flex items-center space-x-3">
        //                                 <Phone className="w-5 h-5 text-gray-400" />
        //                                 <div>
        //                                     <p className="text-sm text-gray-500">Téléphone</p>
        //                                     <p className="font-medium">{auth.user.phone || 'Non renseigné'}</p>
        //                                 </div>
        //                             </div>
                                    
        //                             <div className="flex items-center space-x-3">
        //                                 <User className="w-5 h-5 text-gray-400" />
        //                                 <div>
        //                                     <p className="text-sm text-gray-500">Sexe</p>
        //                                     <p className="font-medium capitalize">{auth.user.gender || 'Non renseigné'}</p>
        //                                 </div>
        //                             </div>
                                    
        //                             <div className="flex items-center space-x-3">
        //                                 <MapPin className="w-5 h-5 text-gray-400" />
        //                                 <div>
        //                                     <p className="text-sm text-gray-500">Localisation</p>
        //                                     <p className="font-medium">
        //                                         {auth.user.city && auth.user.country 
        //                                             ? `${auth.user.city}, ${auth.user.country}` 
        //                                             : 'Non renseigné'
        //                                         }
        //                                     </p>
        //                                 </div>
        //                             </div>
                                    
        //                             <div className="flex items-center space-x-3">
        //                                 <Calendar className="w-5 h-5 text-gray-400" />
        //                                 <div>
        //                                     <p className="text-sm text-gray-500">Membre depuis</p>
        //                                     <p className="font-medium">
        //                                         {auth.user.created_at ? new Date(auth.user.created_at).toLocaleDateString('fr-FR') : 'Non renseigné'}
        //                                     </p>
        //                                 </div>
        //                             </div>
        //                         </div>
        //                     </CardContent>
        //                 </Card>
        //             </div>
        //         </div>

        //         {/* Additional Profile Sections */}
        //         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        //             <Card>
        //                 <CardHeader>
        //                     <CardTitle>Préférences de Matching</CardTitle>
        //                 </CardHeader>
        //                 <CardContent>
        //                     <p className="text-gray-600 text-sm">
        //                         Configurez vos préférences pour trouver des partenaires compatibles.
        //                     </p>
        //                     <Button variant="outline" className="mt-4">
        //                         Configurer les préférences
        //                     </Button>
        //                 </CardContent>
        //             </Card>

        //             <Card>
        //                 <CardHeader>
        //                     <CardTitle>Photos et Galerie</CardTitle>
        //                 </CardHeader>
        //                 <CardContent>
        //                     <p className="text-gray-600 text-sm">
        //                         Ajoutez des photos pour améliorer votre profil.
        //                     </p>
        //                     <Button variant="outline" className="mt-4">
        //                         Gérer les photos
        //                     </Button>
        //                 </CardContent>
        //             </Card>
        //         </div>
        //     </div>
        // </div>

//         <div>
//             <section class="py-10 my-auto dark:bg-gray-900">
//     <div class="lg:w-[80%] md:w-[90%] w-[96%] mx-auto flex gap-4">
//         <div
//             class="lg:w-[88%] sm:w-[88%] w-full mx-auto shadow-2xl p-4 rounded-xl h-fit self-center dark:bg-gray-800/40">

//             <div class="">
//                 <h1
//                     class="lg:text-3xl md:text-2xl text-xl font-serif font-extrabold mb-2 dark:text-white">
//                     Profile
//                 </h1>
//                 <h2 class="text-grey text-sm mb-4 dark:text-gray-400">Create Profile</h2>
//                 <form>

//                     <div
//                         class="w-full rounded-sm bg-[url('https://images.unsplash.com/photo-1449844908441-8829872d2607?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w0NzEyNjZ8MHwxfHNlYXJjaHw2fHxob21lfGVufDB8MHx8fDE3MTA0MDE1NDZ8MA&ixlib=rb-4.0.3&q=80&w=1080')] bg-cover bg-center bg-no-repeat items-center">

//                         <div
//                             class="mx-auto flex justify-center w-[141px] h-[141px] bg-blue-300/20 rounded-full bg-[url('https://images.unsplash.com/photo-1438761681033-6461ffad8d80?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w0NzEyNjZ8MHwxfHNlYXJjaHw4fHxwcm9maWxlfGVufDB8MHx8fDE3MTEwMDM0MjN8MA&ixlib=rb-4.0.3&q=80&w=1080')] bg-cover bg-center bg-no-repeat">

//                             <div class="bg-white/90 rounded-full w-6 h-6 text-center ml-28 mt-4">

//                                 <input type="file" name="profile" id="upload_profile" hidden required />

//                                 <label for="upload_profile">
//                                         <svg data-slot="icon" class="w-6 h-5 text-blue-700" fill="none"
//                                             stroke-width="1.5" stroke="currentColor" viewBox="0 0 24 24"
//                                             xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
//                                             <path stroke-linecap="round" stroke-linejoin="round"
//                                                 d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z">
//                                             </path>
//                                             <path stroke-linecap="round" stroke-linejoin="round"
//                                                 d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z">
//                                             </path>
//                                         </svg>
//                                     </label>
//                             </div>
//                         </div>
//                         <div class="flex justify-end">
//                             <input type="file" name="profile" id="upload_cover" hidden required />

//                             <div
//                                 class="bg-white flex items-center gap-1 rounded-tl-md px-2 text-center font-semibold">
//                                 <label for="upload_cover" class="inline-flex items-center gap-1 cursor-pointer">Cover
                                    
//                                 <svg data-slot="icon" class="w-6 h-5 text-blue-700" fill="none" stroke-width="1.5"
//                                     stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"
//                                     aria-hidden="true">
//                                     <path stroke-linecap="round" stroke-linejoin="round"
//                                         d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z">
//                                     </path>
//                                     <path stroke-linecap="round" stroke-linejoin="round"
//                                         d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z">
//                                     </path>
//                                 </svg>
//                                 </label>
//                             </div>

//                         </div>
//                     </div>
//                     <h2 class="text-center mt-1 font-semibold dark:text-gray-300">Upload Profile and Cover Image
//                     </h2>
//                     <div class="flex flex-col lg:flex-row gap-2 justify-center w-full">
//                         <div class="w-full  mb-4 mt-6">
//                             <label for="" class="mb-2 dark:text-gray-300">First Name</label>
//                             <input type="text"
//                                     class="mt-2 p-4 w-full border-2 rounded-lg dark:text-gray-200 dark:border-gray-600 dark:bg-gray-800"
//                                     placeholder="First Name" />
//                         </div>
//                         <div class="w-full  mb-4 lg:mt-6">
//                             <label for="" class=" dark:text-gray-300">Last Name</label>
//                             <input type="text"
//                                     class="mt-2 p-4 w-full border-2 rounded-lg dark:text-gray-200 dark:border-gray-600 dark:bg-gray-800"
//                                     placeholder="Last Name" />
//                         </div>
//                     </div>

//                     <div class="flex flex-col lg:flex-row  gap-2 justify-center w-full">
//                         <div class="w-full">
//                             <h3 class="dark:text-gray-300 mb-2">Sex</h3>
//                             <select
//                                     class="w-full text-grey border-2 rounded-lg p-4 pl-2 pr-2 dark:text-gray-200 dark:border-gray-600 dark:bg-gray-800">
//                                     <option disabled value="">Select Sex</option>
//                                     <option value="Male">Male</option>
//                                     <option value="Female">Female</option>
//                                 </select>
//                         </div>
//                         <div class="w-full">
//                             <h3 class="dark:text-gray-300 mb-2">Date Of Birth</h3>
//                             <input type="date"
//                                     class="text-grey p-4 w-full border-2 rounded-lg dark:text-gray-200 dark:border-gray-600 dark:bg-gray-800" />
//                         </div>
//                     </div>
//                     <div class="w-full rounded-lg bg-blue-500 mt-4 text-white text-lg font-semibold">
//                         <button type="submit" class="w-full p-4">Submit</button>
//                     </div>
//                 </form>
//             </div>
//         </div>
//     </div>
// </section>
//         </div>


       <Navbar />
        
    );
}
