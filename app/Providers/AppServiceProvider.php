<?php

namespace App\Providers;

use App\Models\Bill;
use App\Models\Proposition;
use App\Models\Rdv;
use App\Models\RdvFeedback;
use App\Models\User;
use App\Models\UserSubscription;
use App\Observers\StatsObserver;
use App\Policies\BillPolicy;
use App\Policies\PropositionPolicy;
use App\Policies\RdvPolicy;
use App\Policies\SubscriptionPolicy;
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
        Gate::policy(Bill::class, BillPolicy::class);
        Gate::policy(Proposition::class, PropositionPolicy::class);
        Gate::policy(Rdv::class, RdvPolicy::class);
        Gate::policy(RdvFeedback::class, RdvPolicy::class);
        Gate::policy(UserSubscription::class, SubscriptionPolicy::class);

        User::observe(StatsObserver::class);
        Proposition::observe(StatsObserver::class);
        Rdv::observe(StatsObserver::class);

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
