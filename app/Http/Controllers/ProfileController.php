<?php

namespace App\Http\Controllers;

use App\Models\Profile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\Storage;

class ProfileController extends Controller
{
    /**
     * Display the profile form with current data
     */
    public function index()
    {
        $profile = Profile::where('user_id', Auth::id())->first();

        return Inertia::render('profile/index', [
            'auth' => [
                'user' => Auth::user(),
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
            ] : null
        ]);
    }

    /**
     * Save profile data for each step
     */
    public function store(Request $request)
    {
        $request->validate([
            'currentStep' => 'required|integer|between:1,4',
        ]);

        // dd($request->currentStep);

        $profile = Profile::where('user_id', Auth::id())->first();

        if (!$profile) {
            $profile = new Profile();
            $profile->user_id = Auth::id();
        }

        // Update current step
        $profile->current_step = $request->currentStep + 1;

        // Update fields based on current step
        switch ($request->currentStep) {
            case 1:
                $this->validateStep1($request);
                $this->updateStep1Data($profile, $request);
                break;
                
            case 2:
                $this->validateStep2($request);
                $this->updateStep2Data($profile, $request);
                break;
                
            case 3:
                $this->validateStep3($request);
                $this->updateStep3Data($profile, $request);
                break;
                
            case 4:
                $this->validateStep4($request);
                $this->updateStep4Data($profile, $request);
                
                // Mark as completed when reaching step 4
                $profile->is_completed = true;
                $profile->completed_at = now();
                break;
        }

        $profile->save();

        return redirect()->back()->with('success', 'Progression sauvegardée');
    }

    /**
     * Complete the profile
     */
    public function complete(Request $request)
    {
        $profile = Profile::where('user_id', Auth::id())->firstOrFail();
        
        $profile->is_completed = true;
        $profile->completed_at = now();
        $profile->current_step = 4;
        $profile->save();

        return redirect()->route('dashboard')->with('success', 'Profil complété avec succès!');
    }

    // Validation methods for each step
    private function validateStep1(Request $request)
    {
        $request->validate([
            'nom' => 'required|string|max:255',
            'prenom' => 'required|string|max:255',
            'dateNaissance' => 'required|date',
            'niveauEtudes' => 'required|string',
            'situationProfessionnelle' => 'required|string',
        ]);
    }

    private function validateStep2(Request $request)
    {
        $request->validate([
            'etatMatrimonial' => 'required|string',
            'logement' => 'required|string',
            'taille' => 'nullable|integer|min:100|max:250',
            'poids' => 'nullable|integer|min:30|max:200',
            'etatSante' => 'nullable|string|max:1000',
            'fumeur' => 'nullable|string',
            'buveur' => 'nullable|string',
            'sport' => 'nullable|string',
            'motorise' => 'nullable|string',
            'loisirs' => 'nullable|string|max:1000',
        ]);
    }

    private function validateStep3(Request $request)
    {
        $request->validate([
            'ageMinimum' => 'required|integer|min:18|max:100',
            'situationMatrimonialeRecherche' => 'required|string',
        ]);
    }

    private function validateStep4(Request $request)
    {
        if ($request->hasFile('profilePicture')) {
            $request->validate([
                'profilePicture' => 'image|mimes:jpeg,png,jpg|max:2048',
            ]);
        }
    }

    // Data update methods for each step
    private function updateStep1Data(Profile $profile, Request $request)
    {
        $profile->nom = $request->nom;
        $profile->prenom = $request->prenom;
        $profile->date_naissance = $request->dateNaissance;
        $profile->niveau_etudes = $request->niveauEtudes;
        $profile->situation_professionnelle = $request->situationProfessionnelle;
        $profile->secteur = $request->secteur;
        $profile->revenu = $request->revenu;
        $profile->religion = $request->religion;
    }

    private function updateStep2Data(Profile $profile, Request $request)
    {
        $profile->etat_matrimonial = $request->etatMatrimonial;
        $profile->logement = $request->logement;
        $profile->taille = $request->taille;
        $profile->poids = $request->poids;
        $profile->etat_sante = $request->etatSante;
        $profile->fumeur = $request->fumeur;
        $profile->buveur = $request->buveur;
        $profile->sport = $request->sport;
        $profile->motorise = $request->motorise;
        $profile->loisirs = $request->loisirs;
    }

    private function updateStep3Data(Profile $profile, Request $request)
    {
        $profile->age_minimum = $request->ageMinimum;
        $profile->situation_matrimoniale_recherche = $request->situationMatrimonialeRecherche;
        $profile->pays_recherche = $request->paysRecherche;
        $profile->villes_recherche = $request->villesRecherche;
        $profile->niveau_etudes_recherche = $request->niveauEtudesRecherche;
        $profile->statut_emploi_recherche = $request->statutEmploiRecherche;
        $profile->revenu_minimum = $request->revenuMinimum;
        $profile->religion_recherche = $request->religionRecherche;
    }

    private function updateStep4Data(Profile $profile, Request $request)
    {
        if ($request->hasFile('profilePicture')) {
            // Delete old picture if exists
            if ($profile->profile_picture_path) {
                Storage::disk($profile->profile_picture_disk)->delete($profile->profile_picture_path);
            }
            
            $path = $request->file('profilePicture')->store('profile-pictures', 'public');
            $profile->profile_picture_path = $path;
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Profile $profile)
    {
        //
    }
}