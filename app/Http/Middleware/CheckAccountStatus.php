<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class CheckAccountStatus
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = Auth::user();
        
        // Only check for regular users (not admin/manager/matchmaker)
        if ($user && $user->hasRole('user')) {
            $profile = $user->profile;
            $accountStatus = $profile ? $profile->account_status : 'active';
            
            // If account is desactivated, allow only dashboard and reactivation request
            if ($accountStatus === 'desactivated') {
                $allowedRoutes = ['dashboard', 'user.reactivation-request'];
                $routeName = $request->route()->getName();
                
                // Allow dashboard and reactivation request routes
                if (in_array($routeName, $allowedRoutes) || str_starts_with($request->path(), 'dashboard') || $request->is('user/reactivation-request')) {
                    return $next($request);
                }
                
                // Redirect to dashboard for all other routes
                return redirect()->route('dashboard');
            }
        }
        
        return $next($request);
    }
}
