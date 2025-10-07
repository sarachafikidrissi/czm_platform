<?php

namespace App\Http\Controllers;

use App\Models\Profile;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class ProfileInfoController extends Controller
{
    /**
     * Display the profile info page with full profile props.
     */
    public function index(): Response
    {
        $user = Auth::user();
        $profile = $user ? Profile::where('user_id', $user->id)->first() : null;

        return Inertia::render('profile-info', [
            'auth' => [
                'user' => $user,
            ],
            'profile' => $profile ? [
                // Step 1
                'nom' => $profile->nom,
                'prenom' => $profile->prenom,
                'dateNaissance' => $profile->date_naissance,
                'niveauEtudes' => $profile->niveau_etudes,
                'situationProfessionnelle' => $profile->situation_professionnelle,
                'secteur' => $profile->secteur,
                'revenu' => $profile->revenu,
                'religion' => $profile->religion,
                'heardAboutUs' => $profile->heard_about_us,
                'heardAboutReference' => $profile->heard_about_reference,

                // Step 2
                'etatMatrimonial' => $profile->etat_matrimonial,
                'logement' => $profile->logement,
                'taille' => $profile->taille,
                'poids' => $profile->poids,
                'etatSante' => $profile->etat_sante,
                'fumeur' => $profile->fumeur,
                'buveur' => $profile->buveur,
                'sport' => $profile->sport,
                'motorise' => $profile->motorise,
                'loisirs' => $profile->loisirs,
                'hasChildren' => $profile->has_children,
                'childrenCount' => $profile->children_count,
                'childrenGuardian' => $profile->children_guardian,
                'hijabChoice' => $profile->hijab_choice,

                // Step 3
                'ageMinimum' => $profile->age_minimum,
                'situationMatrimonialeRecherche' => $profile->situation_matrimoniale_recherche,
                'paysRecherche' => $profile->pays_recherche,
                'villesRecherche' => $profile->villes_recherche ?? [],
                'niveauEtudesRecherche' => $profile->niveau_etudes_recherche,
                'statutEmploiRecherche' => $profile->statut_emploi_recherche,
                'revenuMinimum' => $profile->revenu_minimum,
                'religionRecherche' => $profile->religion_recherche,

                // Step 4
                'profilePicturePath' => $profile->profile_picture_path,

                // Progress
                'currentStep' => $profile->current_step,
                'isCompleted' => $profile->is_completed,
                'completedAt' => $profile->completed_at,
            ] : null
        ]);
    }
}


