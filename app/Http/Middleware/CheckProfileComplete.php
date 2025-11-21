<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckProfileComplete
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // If no user is authenticated, proceed (handled by auth middleware)
        if (!$user) {
            return $next($request);
        }

        // Only apply profile completion check for users with 'user' role
        if ($user->hasRole('user')) {
            $profile = $user->profile;

            // Define routes that are allowed without complete profile
            $allowedRoutes = [
                'profile.index',    // Profile form itself
                'profile.store',    // Profile save endpoint
                'profile.complete', // Profile completion endpoint
                'logout',           // Logout
                // 'dashboard',        // Dashboard (if you want to allow access)
            ];

            // Current route name
            $currentRoute = $request->route()->getName();

            // If accessing an allowed route, let them through
            if (in_array($currentRoute, $allowedRoutes)) {
                return $next($request);
            }

            // If no profile exists or profile is not completed, redirect to profile
            if (!$profile || !$profile->is_completed) {
                $step = $profile ? max(1, $profile->current_step) : 1;

                // Store the intended URL so we can redirect back after profile completion
                if (!in_array($currentRoute, ['profile.index', 'logout'])) {
                    session()->put('url.intended', $request->fullUrl());
                }

                return redirect()->route('profile.index', ['step' => $step])
                    ->with('warning', 'Veuillez compléter votre profil pour accéder à cette page.');
            }

            // Profile is completed, check if user is trying to access profile page
            if ($currentRoute === 'profile.index') {
                // Redirect to intended URL or dashboard
                $intendedUrl = session()->get('url.intended', route('dashboard'));
                session()->forget('url.intended');
                
                return redirect()->to($intendedUrl)
                    ->with('success', 'Votre profil est déjà complété!');
            }
        }

        // For admin users or users with complete profiles, allow access
        return $next($request);
    }
}