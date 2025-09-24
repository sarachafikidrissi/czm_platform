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
});

Route::middleware(['auth', 'verified', 'isComplete'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');
});





require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';
