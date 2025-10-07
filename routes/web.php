<?php

use App\Http\Controllers\ProfileController as MainProfileController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ProfileInfoController;
use App\Http\Controllers\PhotosController;
use App\Http\Controllers\ProspectsPageController;
use App\Http\Controllers\MatchmakerPageController;
use App\Http\Controllers\PropositionsController;
use App\Http\Controllers\AppointmentsController;

Route::get('/', [HomeController::class, 'index'])->name('home');

Route::middleware(['auth'])->group(function () {
    Route::get('/profile', [MainProfileController::class, 'index'])->name('profile.index');
    Route::post('/profile', [MainProfileController::class, 'store'])->name('profile.store');
    Route::post('/profile/complete', [MainProfileController::class, 'complete'])->name('profile.complete');
    
    // Profile information display page
    Route::get('/profile-info', [ProfileInfoController::class, 'index'])->name('profile.info');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // Admin routes
    Route::middleware(['role:admin'])->prefix('admin')->name('admin.')->group(function () {
        Route::get('/dashboard', [\App\Http\Controllers\AdminController::class, 'index'])->name('dashboard');
        Route::get('/create-staff', [\App\Http\Controllers\AdminController::class, 'createStaffForm'])->name('create-staff');
        Route::post('/create-staff', [\App\Http\Controllers\AdminController::class, 'createStaff']);
        Route::post('/agencies', [\App\Http\Controllers\AdminController::class, 'createAgency'])->name('agencies.create');
        Route::post('/services', [\App\Http\Controllers\AdminController::class, 'createService'])->name('services.create');
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
    Route::get('/photos', [PhotosController::class, 'index'])->name('photos');
    
    Route::get('/prospects', [ProspectsPageController::class, 'index'])->name('prospects');

  

    Route::get('/matchmaker', [MatchmakerPageController::class, 'index'])->name('matchmaker');

    Route::get('/propositions', [PropositionsController::class, 'index'])->name('propositions');

    Route::get('/appointments', [AppointmentsController::class, 'index'])->name('appointments');
});





require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';
