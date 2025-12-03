<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

class FirstAdminSetupController extends Controller
{
    /**
     * Show the first admin setup page (only if no admins exist).
     */
    public function create(): Response|RedirectResponse
    {
        // Check if permissions tables exist and if any admin already exists
        try {
            if (Schema::hasTable('roles') && Schema::hasTable('model_has_roles')) {
                if (User::role('admin')->count() > 0) {
                    return redirect()->route('login')
                        ->with('error', 'Admin setup is no longer available. Please log in.');
                }
            }
        } catch (\Exception $e) {
            // If there's an error checking roles, allow setup to proceed
            // This handles cases where database isn't fully migrated yet
        }

        return Inertia::render('auth/first-admin-setup');
    }

    /**
     * Handle the first admin registration request.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        // Double-check: prevent admin creation if one already exists
        try {
            if (Schema::hasTable('roles') && Schema::hasTable('model_has_roles')) {
                if (User::role('admin')->count() > 0) {
                    return redirect()->route('login')
                        ->with('error', 'Admin setup is no longer available. Please log in.');
                }
            }
        } catch (\Exception $e) {
            // If there's an error checking roles, allow setup to proceed
            // This handles cases where database isn't fully migrated yet
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:'.User::class,
            'phone' => 'required|string|max:20',
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        // Generate unique username
        $baseUsername = Str::slug($request->name);
        $username = $baseUsername;
        $counter = 1;
        
        while (User::where('username', $username)->exists()) {
            $username = $baseUsername . $counter;
            $counter++;
        }

        $user = User::create([
            'name' => $request->name,
            'username' => $username,
            'email' => $request->email,
            'phone' => $request->phone,
            'approval_status' => 'approved',
            'email_verified_at' => now(),
            'password' => Hash::make($request->password),
        ]);

        // Ensure the admin role exists before assigning it
        $adminRole = Role::firstOrCreate([
            'name' => 'admin',
            'guard_name' => 'web',
        ]);

        $user->assignRole($adminRole);

        event(new Registered($user));

        Auth::login($user);

        return to_route('dashboard')
            ->with('success', 'First admin account created successfully!');
    }
}

