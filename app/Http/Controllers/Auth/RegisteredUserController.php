<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    /**
     * Show the registration page.
     */
    public function create(): Response
    {
        return Inertia::render('auth/register');
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:'.User::class,
            'phone' => 'required|string|max:20',
            'gender' => 'required|string|in:male,female,other,prefer-not-to-say',
            'country' => 'required|string|max:100',
            'city' => 'required|string|max:100',
            'condition' => 'required|boolean|accepted',
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
            'gender' => $request->gender,
            'country' => $request->country,
            'city' => $request->city,
            'condition' => $request->condition,
            'password' => Hash::make($request->password),
        ]);

        $user->assignRole('user');

        $user->profile()->create([]);

        event(new Registered($user));

        Auth::login($user);



        // return to_route('dashboard');
        return to_route('dashboard');
    }
}