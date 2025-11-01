<?php

namespace App\Http\Controllers;

use App\Models\Profile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Crypt;
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
                        'origine' => $profile->origine,
                        'paysResidence' => $profile->pays_residence,
                        'villeResidence' => $profile->ville_residence,
                        'paysOrigine' => $profile->pays_origine,
                        'villeOrigine' => $profile->ville_origine,
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
                'situationMatrimonialeRecherche' => is_array($profile->situation_matrimoniale_recherche) 
                    ? $profile->situation_matrimoniale_recherche 
                    : ($profile->situation_matrimoniale_recherche ? [$profile->situation_matrimoniale_recherche] : []),
                'paysRecherche' => is_array($profile->pays_recherche) 
                    ? $profile->pays_recherche 
                    : ($profile->pays_recherche ? [$profile->pays_recherche] : []),
                'villesRecherche' => $profile->villes_recherche ?? [],
                'niveauEtudesRecherche' => $profile->niveau_etudes_recherche,
                'statutEmploiRecherche' => $profile->statut_emploi_recherche,
                'revenuMinimum' => $profile->revenu_minimum,
                'religionRecherche' => $profile->religion_recherche,
                'profilRechercheDescription' => $profile->profil_recherche_description,
                
                // Step 4
                'profilePicturePath' => $profile->profile_picture_path,
                // Don't send encrypted CNI to frontend - it's sensitive data
                // CNI will be shown only in matchmaker validation form when decrypted
                'cin' => null, // Never expose encrypted CNI to user
                'identityCardFrontPath' => $profile->identity_card_front_path,
                
                // Progress
                'currentStep' => $profile->current_step,
                'isCompleted' => $profile->is_completed,
                'completedAt' => $profile->completed_at,
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

        // Update fields based on current step
        switch ($request->currentStep) {
            case 1:
                $this->validateStep1($request);
                $this->updateStep1Data($profile, $request);
                $profile->current_step = 2;
                break;
                
            case 2:
                $this->validateStep2($request);
                $this->updateStep2Data($profile, $request);
                $profile->current_step = 3;
                break;
                
            case 3:
                $this->validateStep3($request);
                $this->updateStep3Data($profile, $request);
                $profile->current_step = 4;
                break;
                
            case 4:
                $this->validateStep4($request);
                $this->updateStep4Data($profile, $request);
                
                // Mark as completed when reaching step 4
                $profile->current_step = 4;
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
            'heardAboutUs' => 'nullable|string|in:recommande,passage,pub',
            'heardAboutReference' => 'nullable|string|max:255',
        ]);
    }

    private function validateStep2(Request $request)
    {
        $rules = [
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
            // accept true/false, 1/0, "true"/"false"
            'hasChildren' => 'nullable|in:true,false,1,0',
            'childrenCount' => 'nullable|integer|min:0|max:20',
            'childrenGuardian' => 'nullable|in:mother,father',
            'hijabChoice' => 'nullable|in:voile,non_voile,niqab,idea_niqab,idea_hijab',
            'heardAboutUs' => 'required|string|in:recommande,passage,pub',
            'heardAboutReference' => 'nullable|string|max:255',
        ];

        // If divorced, require children details if hasChildren = true
        if ($request->etatMatrimonial === 'divorce') {
            if ($request->boolean('hasChildren')) {
                $rules['childrenCount'] = 'required|integer|min:1|max:20';
                $rules['childrenGuardian'] = 'required|in:mother,father';
            }
        }

        // If pub is selected, require reference
        if ($request->string('heardAboutUs')->toString() === 'pub') {
            $rules['heardAboutReference'] = 'required|string|max:255';
        }
        $request->validate($rules);
    }

    private function validateStep3(Request $request)
    {
        $rules = [
            'ageMinimum' => 'required|integer|min:18|max:100',
            'situationMatrimonialeRecherche' => 'required',
            'paysRecherche' => 'required',
        ];
        $request->validate($rules);
        
        // Validate that at least one situation is selected
        $situationMatrimonialeRecherche = $request->situationMatrimonialeRecherche;
        $situationArray = is_string($situationMatrimonialeRecherche) ? json_decode($situationMatrimonialeRecherche, true) : $situationMatrimonialeRecherche;
        if (!is_array($situationArray) || count($situationArray) === 0) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'situationMatrimonialeRecherche' => ['Au moins une situation matrimoniale doit être sélectionnée.'],
            ]);
        }
        
        // Validate that at least one country is selected
        $paysRecherche = $request->paysRecherche;
        $paysArray = is_string($paysRecherche) ? json_decode($paysRecherche, true) : $paysRecherche;
        if (!is_array($paysArray) || count($paysArray) === 0) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'paysRecherche' => ['Au moins un pays doit être sélectionné.'],
            ]);
        }
    }

    private function validateStep4(Request $request)
    {
        // CNI and front picture are optional for prospects
        $rules = [];
        
        // Only validate CNI if provided
        if ($request->filled('cin')) {
            $rules['cin'] = [
                'string',
                'regex:/^[A-Za-z]{1,2}\d{4,6}$/',
                function ($attribute, $value, $fail) {
                    $cinUpper = strtoupper($value);
                    
                    // Check if this CNI is already used by another user
                    $existingProfile = Profile::where('cin', $cinUpper)
                        ->where('user_id', '!=', Auth::id())
                        ->first();
                    
                    if ($existingProfile) {
                        $fail('Ce numéro de CNI est déjà utilisé par un autre utilisateur.');
                    }
                },
            ];
        }
        
        // Only validate identity card front if provided
        if ($request->hasFile('identityCardFront')) {
            $rules['identityCardFront'] = 'file|mimes:jpeg,png,jpg,pdf|max:5120'; // 5MB max
        }
        
        if ($request->hasFile('profilePicture')) {
            $rules['profilePicture'] = 'image|mimes:jpeg,png,jpg|max:2048';
        }
        
        if (!empty($rules)) {
            $request->validate($rules);
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
        $profile->origine = $request->origine;
        $profile->pays_residence = $request->paysResidence;
        $profile->ville_residence = $request->villeResidence;
        $profile->pays_origine = $request->paysOrigine;
        $profile->ville_origine = $request->villeOrigine;
        $profile->heard_about_us = $request->heardAboutUs;
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
        $profile->has_children = $request->boolean('hasChildren');
        $profile->children_count = $request->childrenCount;
        $profile->children_guardian = $request->childrenGuardian;
        $profile->hijab_choice = $request->hijabChoice;
        $profile->heard_about_us = $request->heardAboutUs;
        $profile->heard_about_reference = $request->heardAboutReference;
    }

    private function updateStep3Data(Profile $profile, Request $request)
    {
        $profile->age_minimum = $request->ageMinimum;
        
        // Handle situationMatrimonialeRecherche as array or string
        $situationMatrimonialeRecherche = $request->situationMatrimonialeRecherche;
        if (is_string($situationMatrimonialeRecherche)) {
            // Try to decode JSON, if fails use as single value
            $decoded = json_decode($situationMatrimonialeRecherche, true);
            $profile->situation_matrimoniale_recherche = is_array($decoded) ? $decoded : [$situationMatrimonialeRecherche];
        } else {
            $profile->situation_matrimoniale_recherche = is_array($situationMatrimonialeRecherche) ? $situationMatrimonialeRecherche : [$situationMatrimonialeRecherche];
        }
        
        // Handle paysRecherche as array or string
        $paysRecherche = $request->paysRecherche;
        if (is_string($paysRecherche)) {
            $decoded = json_decode($paysRecherche, true);
            $profile->pays_recherche = is_array($decoded) ? $decoded : [$paysRecherche];
        } else {
            $profile->pays_recherche = is_array($paysRecherche) ? $paysRecherche : [$paysRecherche];
        }
        
        // Handle villes_recherche - can be JSON string or array
        $villesRecherche = $request->villesRecherche;
        if (is_string($villesRecherche)) {
            $decoded = json_decode($villesRecherche, true);
            $profile->villes_recherche = is_array($decoded) ? $decoded : [];
        } else {
            $profile->villes_recherche = is_array($villesRecherche) ? $villesRecherche : [];
        }
        
        $profile->niveau_etudes_recherche = $request->niveauEtudesRecherche;
        $profile->statut_emploi_recherche = $request->statutEmploiRecherche;
        $profile->revenu_minimum = $request->revenuMinimum;
        $profile->religion_recherche = $request->religionRecherche;
        $profile->profil_recherche_description = $request->profilRechercheDescription;
    }

    private function updateStep4Data(Profile $profile, Request $request)
    {
        if ($request->hasFile('profilePicture')) {
            // Delete old picture if exists
            if ($profile->profile_picture_path) {
                Storage::disk('public')->delete($profile->profile_picture_path);
            }
            
            $path = $request->file('profilePicture')->store('profile-pictures', 'public');
            $profile->profile_picture_path = $path;
        }
        
        // Handle CNI upload
        if ($request->hasFile('identityCardFront')) {
            // Delete old CNI front if exists
            if ($profile->identity_card_front_path) {
                Storage::disk('public')->delete($profile->identity_card_front_path);
            }
            
            $path = $request->file('identityCardFront')->store('identity-cards', 'public');
            $profile->identity_card_front_path = $path;
        }
        
        // Update CNI number and hash - only if provided
        if ($request->filled('cin')) {
            $cinUpper = strtoupper($request->cin);
            // Decrypt current CNI to compare
            $currentCin = null;
            try {
                if ($profile->cin) {
                    $currentCin = Crypt::decryptString($profile->cin);
                }
            } catch (\Exception $e) {
                // If decryption fails, treat as different
                $currentCin = null;
            }
            
            // Only update if it's different from current value
            if ($currentCin !== $cinUpper) {
                // Check if this CNI is already used by another user
                $existingProfiles = Profile::where('user_id', '!=', Auth::id())
                    ->whereNotNull('cin')
                    ->get();
                
                foreach ($existingProfiles as $existingProfile) {
                    try {
                        $decrypted = Crypt::decryptString($existingProfile->cin);
                        if ($decrypted === $cinUpper) {
                            throw \Illuminate\Validation\ValidationException::withMessages([
                                'cin' => ['Ce numéro de CNI est déjà utilisé par un autre utilisateur.'],
                            ]);
                        }
                    } catch (\Illuminate\Validation\ValidationException $e) {
                        throw $e;
                    } catch (\Exception $e) {
                        // If decryption fails, skip this profile
                        continue;
                    }
                }
                
                // Encrypt the CNI number for security
                $profile->cin = Crypt::encryptString($cinUpper);
                
                // Also store hash for verification/search purposes
                $appKey = (string) config('app.key');
                if (str_starts_with($appKey, 'base64:')) {
                    $decoded = base64_decode(substr($appKey, 7));
                    if ($decoded !== false) {
                        $appKey = $decoded;
                    }
                }
                $profile->cin_hash = hash_hmac('sha256', (string) $cinUpper, $appKey);
            }
        }
        
        // Handle CNI front upload and hash
        if ($request->hasFile('identityCardFront')) {
            // Delete old CNI front if exists
            if ($profile->identity_card_front_path) {
                Storage::disk('public')->delete($profile->identity_card_front_path);
            }
            
            $file = $request->file('identityCardFront');
            $path = $file->store('identity-cards', 'public');
            $profile->identity_card_front_path = $path;
            
            // Hash the file content
            $appKey = (string) config('app.key');
            if (str_starts_with($appKey, 'base64:')) {
                $decoded = base64_decode(substr($appKey, 7));
                if ($decoded !== false) {
                    $appKey = $decoded;
                }
            }
            $fileContent = file_get_contents($file->getRealPath());
            $profile->identity_card_front_hash = hash_hmac('sha256', $fileContent, $appKey);
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