<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\UsernameGenerator;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Inertia\Inertia;
use Inertia\Response;

class StaffRegistrationController extends Controller
{
    /**
     * Show the staff registration page.
     */
    public function create(): Response
    {
        return Inertia::render('auth/staff-register', [
            'agencies' => \App\Models\Agency::all(['id','name'])
        ]);
    }

    /**
     * Handle an incoming staff registration request.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:'.User::class,
            'phone' => 'required|string|max:20',
            'role' => 'required|string|in:manager,matchmaker',
            'agency' => 'required_if:role,manager,matchmaker|string|max:255',
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        $username = UsernameGenerator::fromName($request->name, $request->email);

        $user = User::create([
            'name' => $request->name,
            'username' => $username,
            'email' => $request->email,
            'phone' => $request->phone,
            'agency' => $request->agency,
            'approval_status' => 'pending',
            'password' => Hash::make($request->password),
        ]);

        $user->assignRole($request->role);
        $user->profile()->create([]);

        event(new Registered($user));

        Auth::login($user);

        return to_route('dashboard');
    }
}