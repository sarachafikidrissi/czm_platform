<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
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

        // Log the user info for debugging
        Log::info('Authenticated user check:', [
            'user_id' => $user->id,
            'roles' => $user->getRoleNames()->toArray()
        ]);

        // Only apply profile completion check for users with 'user' role
        if ($user->hasRole('user')) {
            $profile = $user->profile;

            if ($profile) {
                Log::info('User profile status:', [
                    'current_step' => $profile->current_step,
                    'is_completed' => $profile->is_completed,
                    'completed_at' => $profile->completed_at
                ]);
            } else {
                Log::info('User has no profile record yet');
            }

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
            
            Log::info('Route check:', [
                'current_route' => $currentRoute,
                'is_allowed' => in_array($currentRoute, $allowedRoutes)
            ]);

            // If accessing an allowed route, let them through
            if (in_array($currentRoute, $allowedRoutes)) {
                Log::info('Allowing access to allowed route: ' . $currentRoute);
                return $next($request);
            }

            // If no profile exists or profile is not completed, redirect to profile
            if (!$profile || !$profile->is_completed) {
                $step = $profile ? $profile->current_step : 1;
                
                Log::info('Profile not complete, redirecting to profile step:', [
                    'step' => $step,
                    'target_route' => $currentRoute,
                    'profile_exists' => $profile ? true : false,
                    'is_completed' => $profile ? $profile->is_completed : 'no profile'
                ]);

                // Store the intended URL so we can redirect back after profile completion
                if (!in_array($currentRoute, ['profile.index', 'logout'])) {
                    session()->put('url.intended', $request->fullUrl());
                }

                return redirect()->route('profile.index', ['step' => $step])
                    ->with('warning', 'Veuillez compléter votre profil pour accéder à cette page.');
            }

            // Profile is completed, check if user is trying to access profile page
            if ($currentRoute === 'profile.index') {
                Log::info('Profile completed, redirecting from profile to intended URL', [
                    'user_id' => $user->id,
                    'profile_completed' => $profile->is_completed,
                    'completed_at' => $profile->completed_at
                ]);
                
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