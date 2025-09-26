<?php

use App\Http\Controllers\ProfileController as MainProfileController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::middleware(['auth'])->group(function () {
    Route::get('/profile', [MainProfileController::class, 'index'])->name('profile.index');
    Route::post('/profile', [MainProfileController::class, 'store'])->name('profile.store');
    Route::post('/profile/complete', [MainProfileController::class, 'complete'])->name('profile.complete');
    
    // Profile information display page
    Route::get('/profile-info', function () {
        $profile = \App\Models\Profile::where('user_id', auth()->id())->first();
        return \Inertia\Inertia::render('profile-info', [
            'auth' => [
                'user' => auth()->user(),
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
                'completedAt' => $profile->completed_at,
            ] : null
        ]);
    })->name('profile.info');
});

Route::middleware(['auth', 'verified', 'isComplete'])->group(function () {
    Route::get('dashboard', function () {
        $user = auth()->user();
        $role = method_exists($user, 'getRoleNames') ? $user->getRoleNames()->first() : null;
        return Inertia::render('dashboard', [
            'role' => $role,
        ]);
    })->name('dashboard');

    // Sidebar pages
    Route::get('/photos', function () {
        return Inertia::render('photos');
    })->name('photos');

    Route::get('/matchmaker', function () {
        return Inertia::render('matchmaker');
    })->name('matchmaker');

    Route::get('/propositions', function () {
        return Inertia::render('propositions');
    })->name('propositions');

    Route::get('/appointments', function () {
        return Inertia::render('appointments');
    })->name('appointments');
});





require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';
