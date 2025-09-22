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

        // Log the whole user object (will dump all attributes)
        Log::info('Authenticated user:', $user->toArray());
    
        if ($user->hasRole('user')) {
            $profile = $user->profile;
    
            // Log the profile and current step
            if ($profile) {
                Log::info('User profile found', [
                    'current_step' => $profile->current_step,
                    'is_completed' => $profile->is_completed ?? null,
                ]);
            } else {
                Log::warning('User has no profile record yet.');
            }
    
            if (!$profile || $profile->current_step < 4) {
                $step = $profile ? $profile->current_step : 1;
    
                Log::info("Redirecting user to profile step", ['step' => $step]);
    
                return redirect()->route('profile.index', ['step' => $step]);
            }
        }
        return $next($request);
    }
}
