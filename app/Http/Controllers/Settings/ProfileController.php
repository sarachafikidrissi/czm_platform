<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use App\Models\User;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
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
        
        $validated = $request->validated();
        
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
                
                // Delete old profile picture if exists
                if ($profile->profile_picture_path) {
                    Storage::disk('public')->delete($profile->profile_picture_path);
                }
                
                $profile->update(['profile_picture_path' => $profilePicturePath]);
            } else {
                // For staff (admin, manager, matchmaker), store in users table
                if ($user->profile_picture) {
                    Storage::disk('public')->delete($user->profile_picture);
                }
                $validated['profile_picture'] = $profilePicturePath;
            }
        }

        // Handle banner image upload or deletion
        if ($request->hasFile('banner_image')) {
            $bannerImagePath = $request->file('banner_image')->store('banner-images', 'public');
            
            if ($userRole === 'user') {
                // For regular users, store in profiles table
                $profile = $user->profile;
                if (!$profile) {
                    $profile = $user->profile()->create([]);
                }
                
                // Delete old banner image if exists
                if ($profile->banner_image_path) {
                    Storage::disk('public')->delete($profile->banner_image_path);
                }
                
                $profile->update(['banner_image_path' => $bannerImagePath]);
            } else {
                // For staff (admin, manager, matchmaker), store in users table
                if ($user->banner_image_path) {
                    Storage::disk('public')->delete($user->banner_image_path);
                }
                $validated['banner_image_path'] = $bannerImagePath;
            }
        } elseif ($request->has('delete_banner') && $request->input('delete_banner') === '1') {
            // Handle banner deletion
            if ($userRole === 'user') {
                $profile = $user->profile;
                if ($profile && $profile->banner_image_path) {
                    Storage::disk('public')->delete($profile->banner_image_path);
                    $profile->update(['banner_image_path' => null]);
                }
            } else {
                if ($user->banner_image_path) {
                    Storage::disk('public')->delete($user->banner_image_path);
                }
                $validated['banner_image_path'] = null;
            }
        }

        // Remove profile_picture from validated data if it's null (no file uploaded)
        // But only if no file was actually uploaded
        if (!isset($validated['profile_picture']) || $validated['profile_picture'] === null) {
            unset($validated['profile_picture']);
        }

        // Convert empty strings to null for all optional fields
        $optionalFields = ['name', 'email', 'phone', 'facebook_url', 'instagram_url', 'linkedin_url', 'youtube_url', 'matchmaker_bio'];
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
            $user->fill($fieldsToUpdate);

            if ($user->isDirty('email')) {
                $user->email_verified_at = null;
            }

            $user->save();
        }

        // If request comes from profile page (uploading images only), redirect back to profile
        // Note: Frontend will handle the reload via router.reload(), but we still redirect for consistency
        if ($request->has('from_profile_page') && $request->input('from_profile_page') === '1') {
            // Use username if available, otherwise redirect back
            if ($user->username) {
                return redirect()->route('profile.show', ['username' => $user->username]);
            } else {
                // If username is not set, redirect back to the previous page
                // This ensures the upload succeeds even if username is missing
                return redirect()->back()->with('success', 'Banner image uploaded successfully.');
            }
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
