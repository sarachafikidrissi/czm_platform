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
        $user = \Illuminate\Support\Facades\Auth::user();
        $profile = $user ? \App\Models\Profile::where('user_id', $user->id)->first() : null;
        return \Inertia\Inertia::render('profile-info', [
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

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        $user = \Illuminate\Support\Facades\Auth::user();
        $role = null;
        if ($user) {
            $role = \Illuminate\Support\Facades\DB::table('model_has_roles')
                ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
                ->where('model_has_roles.model_id', $user->id)
                ->value('roles.name');
        }
        $agencies = $role === 'admin' ? \App\Models\Agency::all() : [];
        $stats = null;
        if ($role === 'admin') {
            $totalUsers = \App\Models\User::count();
            $pendingCount = \App\Models\User::where('approval_status', 'pending')->count();
            $approvedManagers = \App\Models\User::role('manager')->where('approval_status', 'approved')->count();
            $approvedMatchmakers = \App\Models\User::role('matchmaker')->where('approval_status', 'approved')->count();
            $stats = [
                'totalUsers' => $totalUsers,
                'pending' => $pendingCount,
                'approvedManagers' => $approvedManagers,
                'approvedMatchmakers' => $approvedMatchmakers,
            ];
        }
        return Inertia::render('dashboard', [
            'role' => $role,
            'agencies' => $agencies,
            'stats' => $stats,
        ]);
    })->name('dashboard');

    // Admin routes
    Route::middleware(['role:admin'])->prefix('admin')->name('admin.')->group(function () {
        Route::get('/dashboard', [\App\Http\Controllers\AdminController::class, 'index'])->name('dashboard');
        Route::get('/create-staff', [\App\Http\Controllers\AdminController::class, 'createStaffForm'])->name('create-staff');
        Route::post('/create-staff', [\App\Http\Controllers\AdminController::class, 'createStaff']);
        Route::post('/agencies', [\App\Http\Controllers\AdminController::class, 'createAgency'])->name('agencies.create');
        Route::post('/users/{user}/update-agency', [\App\Http\Controllers\AdminController::class, 'updateUserAgency'])->name('users.update-agency');
        Route::post('/users/{user}/approve', [\App\Http\Controllers\AdminController::class, 'approveUser'])->name('users.approve');
        Route::post('/users/{user}/reject', [\App\Http\Controllers\AdminController::class, 'rejectUser'])->name('users.reject');
    });

    // Staff routes (admin, manager, matchmaker) for prospects access
    Route::middleware(['role:admin|manager|matchmaker'])->prefix('staff')->name('staff.')->group(function () {
        Route::get('/prospects', [\App\Http\Controllers\MatchmakerController::class, 'prospects'])->name('prospects');
        Route::post('/prospects/{user}/validate', [\App\Http\Controllers\MatchmakerController::class, 'validateProspect'])->name('prospects.validate');
        Route::get('/validated-prospects', [\App\Http\Controllers\MatchmakerController::class, 'validatedProspects'])->name('prospects.validated');
    });

    // User routes
    Route::middleware(['role:user'])->prefix('user')->name('user.')->group(function () {
        Route::get('/matchmakers', [\App\Http\Controllers\UserController::class, 'matchmakers'])->name('matchmakers');
        Route::post('/matchmakers/{matchmaker}/select', [\App\Http\Controllers\UserController::class, 'selectMatchmaker'])->name('matchmakers.select');
    });

    // Sidebar pages
    Route::get('/photos', function () {
        return Inertia::render('photos');
    })->name('photos');
    
    Route::get('/prospects', function () {
        return Inertia::render('prospects');
    })->name('prospects');

  

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
