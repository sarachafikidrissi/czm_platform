<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use App\Models\User;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Show the user's profile settings page.
     */
    public function edit(Request $request): Response
    {
        $user = User::where('id', Auth::user()->id)->with('profile')->first();

        return Inertia::render('settings/profile', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => $request->session()->get('status'),
            'user' => $user,
        ]);
    }

    /**
     * Update the user's profile settings.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $user = $request->user();
        
        // Debug: Log all request data BEFORE validation
        Log::info('=== BEFORE VALIDATION ===');
        Log::info('Raw request data:', $request->all());
        Log::info('Request method:', ['method' => $request->method()]);
        Log::info('Content type:', ['content_type' => $request->header('Content-Type')]);
        Log::info('Has file profile_picture:', ['has_file' => $request->hasFile('profile_picture')]);
        Log::info('All files:', $request->allFiles());
        Log::info('Request input:', $request->input());
        
        if ($request->hasFile('profile_picture')) {
            Log::info('Profile picture file details:', [
                'name' => $request->file('profile_picture')->getClientOriginalName(),
                'size' => $request->file('profile_picture')->getSize(),
                'mime' => $request->file('profile_picture')->getMimeType(),
            ]);
        }
        
        $validated = $request->validated();
        Log::info('=== AFTER VALIDATION ===');
        Log::info('Validated data:', $validated);
        
        $userRole = $user->roles->first()?->name ?? 'user';

        // Handle profile picture upload
        if ($request->hasFile('profile_picture')) {
            $profilePicturePath = $request->file('profile_picture')->store('profile-pictures', 'public');
            
            if ($userRole === 'user') {
                // For regular users, store in profiles table
                $profile = $user->profile;
                if (!$profile) {
                    $profile = $user->profile()->create([]);
                }
                
                Log::info('Before profile update:', [
                    'user_id' => $user->id,
                    'profile_id' => $profile->id,
                    'current_path' => $profile->profile_picture_path,
                    'new_path' => $profilePicturePath
                ]);
                
                // Delete old profile picture if exists
                if ($profile->profile_picture_path) {
                    Storage::disk('public')->delete($profile->profile_picture_path);
                }
                
                $updateResult = $profile->update(['profile_picture_path' => $profilePicturePath]);
                Log::info('Profile update result:', [
                    'update_result' => $updateResult,
                    'profile_after_update' => $profile->fresh()->toArray()
                ]);
            } else {
                // For staff (admin, manager, matchmaker), store in users table
                if ($user->profile_picture) {
                    Storage::disk('public')->delete($user->profile_picture);
                }
                $validated['profile_picture'] = $profilePicturePath;
            }
        }

        // Debug: Log what's in validated data before processing
        Log::info('Validated data before processing:', $validated);
        
        // Remove profile_picture from validated data if it's null (no file uploaded)
        // But only if no file was actually uploaded
        if (!isset($validated['profile_picture']) || $validated['profile_picture'] === null) {
            unset($validated['profile_picture']);
        }

        // Convert empty strings to null for all optional fields
        $optionalFields = ['name', 'email', 'phone', 'facebook_url', 'instagram_url', 'linkedin_url', 'youtube_url'];
        foreach ($optionalFields as $field) {
            if (isset($validated[$field]) && $validated[$field] === '') {
                $validated[$field] = null;
            }
        }

        // Only update fields that have values (not null)
        $fieldsToUpdate = array_filter($validated, function($value) {
            return $value !== null;
        });

        if (!empty($fieldsToUpdate)) {
            Log::info('Fields to update for user:', $fieldsToUpdate);
            $user->fill($fieldsToUpdate);

            if ($user->isDirty('email')) {
                $user->email_verified_at = null;
            }

            $user->save();
            Log::info('User updated successfully:', $user->fresh()->toArray());
        } else {
            Log::info('No fields to update for user');
        }

        return to_route('profile.edit');
    }

    /**
     * Delete the user's account.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}
