<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password;
use Inertia\Inertia;
use Inertia\Response;

class PasswordResetLinkController extends Controller
{
    /**
     * Show the password reset link request page.
     */
    public function create(Request $request): Response
    {
        return Inertia::render('auth/forgot-password', [
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * Handle an incoming password reset link request.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        // We will send the password reset link to this user. Once we have attempted
        // to send the link, we will examine the response then see the message we
        // need to show to the user. Finally, we'll send out a proper response.
        $status = Password::sendResetLink(
            $request->only('email')
        );

        if ($status == Password::RESET_LINK_SENT) {
            return back()->with('status', __('Un lien de réinitialisation de mot de passe a été envoyé à votre adresse email.'));
        }

        // Handle different error cases
        if ($status == Password::RESET_THROTTLED) {
            return back()->withErrors(['email' => __('Veuillez patienter avant de réessayer.')]);
        }

        // If the email doesn't exist or there's an error, we still want to show a success message
        // for security reasons (to prevent email enumeration attacks)
        // However, we should log the actual error for debugging
        Log::warning('Password reset link failed to send', [
            'email' => $request->email,
            'status' => $status
        ]);

        return back()->with('status', __('Si cette adresse email existe dans notre système, un lien de réinitialisation vous a été envoyé.'));
    }
}
