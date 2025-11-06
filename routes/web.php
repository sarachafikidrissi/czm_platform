<?php

use App\Http\Controllers\ProfileController as MainProfileController;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');
// Route::get('/run-migrations', function () {
//     // Run migrations
//     Artisan::call('migrate', ['--force' => true]);

//     // Run DatabaseSeeder
//     Artisan::call('db:seed', ['--force' => true]);

//     // Return output for debugging
//     return Artisan::output();

// });
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

        // For user role, load profile data and subscription reminders
        $profile = null;
        $subscription = null;
        $subscriptionReminder = null;
        $accountStatus = null;
        $rejectedBy = null;
        
        if ($role === 'user' && $user) {
            $profile = $user->profile;
            $accountStatus = $profile ? $profile->account_status : 'active';
            // Load assigned matchmaker for desactivated accounts
            $user->load('assignedMatchmaker');
            
            // Load rejection information if user is rejected
            if ($user->rejected_by) {
                $rejectedBy = \App\Models\User::find($user->rejected_by);
            }

            // Load active subscription for reminders
            $subscription = $user->subscriptions()
                ->where('status', 'active')
                ->with(['matrimonialPack', 'assignedMatchmaker'])
                ->orderBy('created_at', 'desc')
                ->first();
            
            if ($subscription) {
                $today = \Carbon\Carbon::today();
                $expirationDate = \Carbon\Carbon::parse($subscription->subscription_end);
                $daysRemaining = $today->diffInDays($expirationDate, false);
                
                // Show reminder if subscription expires within 30 days or has expired
                if ($daysRemaining <= 30) {
                    $subscriptionReminder = [
                        'daysRemaining' => $daysRemaining,
                        'expirationDate' => $expirationDate->format('d/m/Y'),
                        'isExpired' => $daysRemaining < 0,
                        'packName' => $subscription->matrimonialPack->name ?? 'Pack',
                    ];
                }
            }

            // Debug: Log the profile data
            Log::info('Dashboard Profile Data:', [
                'user_id' => $user->id,
                'profile_exists' => $profile ? true : false,
                'current_step' => $profile ? $profile->current_step : 'no profile',
                'is_completed' => $profile ? $profile->is_completed : 'no profile',
                'profile_data' => $profile ? $profile->toArray() : 'no profile'
            ]);
        }

        return Inertia::render('dashboard', [
            'role' => $role,
            'agencies' => $agencies,
            'stats' => $stats,
            'profile' => $profile,
            'subscriptionReminder' => $subscriptionReminder,
            'accountStatus' => $accountStatus,
            'rejectedBy' => $rejectedBy ? [
                'id' => $rejectedBy->id,
                'name' => $rejectedBy->name,
                'phone' => $rejectedBy->phone,
            ] : null,
        ]);
    })->name('dashboard');

    // Admin routes
    Route::middleware(['role:admin'])->prefix('admin')->name('admin.')->group(function () {
        Route::get('/dashboard', [\App\Http\Controllers\AdminController::class, 'index'])->name('dashboard');
        Route::get('/create-staff', [\App\Http\Controllers\AdminController::class, 'createStaffForm'])->name('create-staff');
        Route::post('/create-staff', [\App\Http\Controllers\AdminController::class, 'createStaff']);
        Route::get('/agencies', [\App\Http\Controllers\AdminController::class, 'agencies'])->name('agencies');
        Route::post('/agencies', [\App\Http\Controllers\AdminController::class, 'createAgency'])->name('agencies.create');
        Route::post('/agencies/{agency}', [\App\Http\Controllers\AdminController::class, 'updateAgency'])->name('agencies.update');
        Route::put('/agencies/{agency}', [\App\Http\Controllers\AdminController::class, 'updateAgency'])->name('agencies.update.put');
        Route::delete('/agencies/{agency}', [\App\Http\Controllers\AdminController::class, 'deleteAgency'])->name('agencies.delete');
        Route::post('/services', [\App\Http\Controllers\AdminController::class, 'createService'])->name('services.create');
        Route::post('/matrimonial-packs', [\App\Http\Controllers\AdminController::class, 'createMatrimonialPack'])->name('matrimonial-packs.create');
        Route::post('/users/{user}/update-agency', [\App\Http\Controllers\AdminController::class, 'updateUserAgency'])->name('users.update-agency');
        Route::post('/users/{user}/update-role', [\App\Http\Controllers\AdminController::class, 'updateUserRole'])->name('users.update-role');
        Route::post('/users/{user}/approve', [\App\Http\Controllers\AdminController::class, 'approveUser'])->name('users.approve');
        Route::post('/users/{user}/reject', [\App\Http\Controllers\AdminController::class, 'rejectUser'])->name('users.reject');
    });

    // Admin-only: manage newly registered prospects and dispatch
    Route::middleware(['role:admin'])->prefix('admin')->name('admin.')->group(function () {
        Route::get('/prospects', [\App\Http\Controllers\AdminController::class, 'prospects'])->name('prospects');
        Route::post('/prospects/dispatch', [\App\Http\Controllers\AdminController::class, 'dispatchProspects'])->name('prospects.dispatch');
        Route::post('/prospects/reassign', [\App\Http\Controllers\AdminController::class, 'reassignProspects'])->name('prospects.reassign');
        Route::post('/prospects/{user}/reject', [\App\Http\Controllers\MatchmakerController::class, 'rejectProspect'])->name('prospects.reject');
        Route::post('/prospects/{user}/accept', [\App\Http\Controllers\MatchmakerController::class, 'acceptRejectedProspect'])->name('prospects.accept');
        Route::post('/users/{user}/activate', [\App\Http\Controllers\AccountStatusController::class, 'activateAccount'])->name('users.activate');
        Route::post('/users/{user}/deactivate', [\App\Http\Controllers\AccountStatusController::class, 'deactivateAccount'])->name('users.deactivate');
        Route::get('/reactivation-requests', [\App\Http\Controllers\ReactivationRequestController::class, 'index'])->name('reactivation-requests');
        Route::post('/reactivation-requests/{request}/approve', [\App\Http\Controllers\ReactivationRequestController::class, 'approve'])->name('reactivation-requests.approve');
        Route::post('/reactivation-requests/{request}/reject', [\App\Http\Controllers\ReactivationRequestController::class, 'reject'])->name('reactivation-requests.reject');
    });

    // Manager-only: track assignments
    Route::middleware(['role:manager'])->prefix('manager')->name('manager.')->group(function () {
        Route::get('/tracking', [\App\Http\Controllers\AdminController::class, 'managerTracking'])->name('tracking');
    });

    // Staff routes (manager, matchmaker) for viewing dispatched prospects and validated lists
    Route::middleware(['role:admin|manager|matchmaker'])->prefix('staff')->name('staff.')->group(function () {
        Route::get('/prospects', [\App\Http\Controllers\MatchmakerController::class, 'prospects'])->name('prospects');
        Route::post('/prospects/{user}/validate', [\App\Http\Controllers\MatchmakerController::class, 'validateProspect'])->name('prospects.validate');
        Route::post('/prospects/{user}/reject', [\App\Http\Controllers\MatchmakerController::class, 'rejectProspect'])->name('prospects.reject');
        Route::post('/prospects/{user}/accept', [\App\Http\Controllers\MatchmakerController::class, 'acceptRejectedProspect'])->name('prospects.accept');
        Route::get('/validated-prospects', [\App\Http\Controllers\MatchmakerController::class, 'validatedProspects'])->name('prospects.validated');
        Route::post('/mark-as-client', [\App\Http\Controllers\MatchmakerController::class, 'markAsClient'])->name('mark-as-client');
        Route::get('/agency-prospects', [\App\Http\Controllers\MatchmakerController::class, 'agencyProspects'])->name('agency-prospects');
        Route::post('/create-bill', [\App\Http\Controllers\MatchmakerController::class, 'createBill'])->name('create-bill');
        Route::get('/subscription-form-data/{userId}', [\App\Http\Controllers\MatchmakerController::class, 'getSubscriptionFormData'])->name('subscription-form-data');
        Route::post('/test-subscription-expiration', [\App\Http\Controllers\MatchmakerController::class, 'testSubscriptionExpiration'])->name('test-subscription-expiration');
        // Matchmaker: activate/deactivate member/client accounts
        Route::post('/users/{user}/activate', [\App\Http\Controllers\AccountStatusController::class, 'activateMemberClient'])->name('users.activate');
        Route::post('/users/{user}/deactivate', [\App\Http\Controllers\AccountStatusController::class, 'deactivateMemberClient'])->name('users.deactivate');
        // Reactivation requests
        Route::get('/reactivation-requests', [\App\Http\Controllers\ReactivationRequestController::class, 'index'])->name('reactivation-requests');
        Route::post('/reactivation-requests/{request}/approve', [\App\Http\Controllers\ReactivationRequestController::class, 'approve'])->name('reactivation-requests.approve');
        Route::post('/reactivation-requests/{request}/reject', [\App\Http\Controllers\ReactivationRequestController::class, 'reject'])->name('reactivation-requests.reject');
    });

    // User routes
    Route::middleware(['role:user'])->prefix('user')->name('user.')->group(function () {
        Route::get('/matchmakers', [\App\Http\Controllers\UserController::class, 'matchmakers'])->name('matchmakers');
        Route::post('/matchmakers/{matchmaker}/select', [\App\Http\Controllers\UserController::class, 'selectMatchmaker'])->name('matchmakers.select');

        // Bill routes
        Route::get('/bills', [\App\Http\Controllers\BillController::class, 'index'])->name('bills');
        Route::get('/bills/{bill}', [\App\Http\Controllers\BillController::class, 'show'])->name('bills.show');
        Route::get('/bills/{bill}/download', [\App\Http\Controllers\BillController::class, 'downloadPdf'])->name('bills.download');
        Route::post('/bills/{bill}/send-email', [\App\Http\Controllers\BillController::class, 'sendEmail'])->name('bills.send-email');
        
        // Subscription routes
        Route::get('/subscription', [\App\Http\Controllers\UserController::class, 'subscription'])->name('subscription');
        // Reactivation request
        Route::post('/reactivation-request', [\App\Http\Controllers\AccountStatusController::class, 'submitReactivationRequest'])->name('reactivation-request');
    });

    // Public user profile routes (accessible by all authenticated users)
    Route::get('/profile/{username}', [\App\Http\Controllers\UserController::class, 'profile'])->name('profile.show');

    // Notes and Evaluation actions for staff (admin/manager/matchmaker) on a user profile
    Route::post('/users/{user}/notes', [\App\Http\Controllers\ProfileInsightsController::class, 'addNote'])->name('users.notes.add');
    Route::post('/users/{user}/evaluation', [\App\Http\Controllers\ProfileInsightsController::class, 'saveEvaluation'])->name('users.evaluation.save');

    // Post routes (accessible by all authenticated users)
    Route::middleware(['auth'])->group(function () {
        Route::get('/posts', [\App\Http\Controllers\PostController::class, 'index'])->name('posts.index');
        Route::post('/posts', [\App\Http\Controllers\PostController::class, 'store'])->name('posts.store');
        Route::post('/posts/like', [\App\Http\Controllers\PostController::class, 'like'])->name('posts.like');
        Route::post('/posts/comment', [\App\Http\Controllers\PostController::class, 'comment'])->name('posts.comment');
        Route::delete('/posts/{post}', [\App\Http\Controllers\PostController::class, 'destroy'])->name('posts.destroy');
    });

    // Agency routes (accessible by all authenticated users)
    Route::middleware(['auth'])->group(function () {
        Route::get('/agencies', [\App\Http\Controllers\AgencyController::class, 'index'])->name('agencies.index');
        Route::get('/agencies/{id}', [\App\Http\Controllers\AgencyController::class, 'show'])->name('agencies.show');
    });

    // Sidebar pages
    Route::get('/photos', function () {
        return Inertia::render('photos');
    })->name('photos');

    Route::get('/prospects', function () {
        $user = \Illuminate\Support\Facades\Auth::user();
        $role = null;
        if ($user) {
            $role = \Illuminate\Support\Facades\DB::table('model_has_roles')
                ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
                ->where('model_has_roles.model_id', $user->id)
                ->value('roles.name');
        }

        // Redirect based on role
        if ($role === 'admin') {
            return redirect()->route('admin.prospects');
        } elseif (in_array($role, ['manager', 'matchmaker'])) {
            return redirect()->route('staff.agency-prospects');
        } else {
            // For regular users, redirect to dashboard
            return redirect()->route('dashboard');
        }
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

    Route::get('/mes-commandes', [\App\Http\Controllers\BillController::class, 'index'])->name('mes-commandes');
});





require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';
