<?php

namespace App\Providers;

use App\Models\Proposition;
use App\Policies\PropositionPolicy;
use App\Policies\UserActivityPolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\ServiceProvider;
use Inertia\Inertia;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::policy(Proposition::class, PropositionPolicy::class);

        Gate::define('viewUserActivities', [UserActivityPolicy::class, 'viewAny']);

        Inertia::share([
            'flash' => function () {
                return [
                    'success' => Session::get('success'),
                    'error' => Session::get('error'),
                    'status' => Session::get('status'),
                ];
            },
        ]);
    }
}
