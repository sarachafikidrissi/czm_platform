<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\UserPhoto;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class PhotoController extends Controller
{
    public function index(Request $request): Response
    {
        $currentUser = Auth::user();
        
        if (!$currentUser) {
            abort(403, 'Unauthorized');
        }

        $targetUserId = $request->get('user_id');
        $targetUser = null;
        $availableUsers = [];

        // Determine which user's photos to show based on role
        if ($currentUser->hasRole('user')) {
            // Regular users can only see their own photos
            $targetUser = $currentUser;
        } elseif ($currentUser->hasRole('admin')) {
            // Admins can see all users' photos
            if ($targetUserId) {
                $targetUser = User::role('user')->findOrFail($targetUserId);
            } else {
                $targetUser = $currentUser; // Default to own photos, but can select others
            }
            // Get all users for admin
            $availableUsers = User::role('user')
                ->select('id', 'name', 'email', 'username')
                ->orderBy('name')
                ->get()
                ->map(function ($user) {
                    return [
                        'id' => $user->id,
                        'name' => $user->name,
                        'email' => $user->email,
                        'username' => $user->username,
                    ];
                });
        } elseif ($currentUser->hasRole('matchmaker')) {
            // Matchmakers can see photos of users assigned to them
            // Get users assigned to this matchmaker
            $availableUsers = User::role('user')
                ->where('assigned_matchmaker_id', $currentUser->id)
                ->select('id', 'name', 'email', 'username')
                ->orderBy('name')
                ->get()
                ->map(function ($user) {
                    return [
                        'id' => $user->id,
                        'name' => $user->name,
                        'email' => $user->email,
                        'username' => $user->username,
                    ];
                });
            
            if ($targetUserId) {
                $targetUser = User::role('user')
                    ->where('assigned_matchmaker_id', $currentUser->id)
                    ->findOrFail($targetUserId);
            } elseif ($availableUsers->count() > 0) {
                // Default to first assigned user if no specific user selected
                $firstUser = $availableUsers->first();
                $targetUser = User::find($firstUser['id']);
            } else {
                // No assigned users, show empty state
                $targetUser = null;
            }
        } elseif ($currentUser->hasRole('manager')) {
            // Managers can see photos of users in their agency or validated by them
            // Get users in manager's agency or validated by them
            $availableUsers = User::role('user')
                ->where(function ($query) use ($currentUser) {
                    $query->where('agency_id', $currentUser->agency_id)
                        ->orWhere('validated_by_manager_id', $currentUser->id);
                })
                ->select('id', 'name', 'email', 'username')
                ->orderBy('name')
                ->get()
                ->map(function ($user) {
                    return [
                        'id' => $user->id,
                        'name' => $user->name,
                        'email' => $user->email,
                        'username' => $user->username,
                    ];
                });
            
            if ($targetUserId) {
                $targetUser = User::role('user')
                    ->where(function ($query) use ($currentUser) {
                        $query->where('agency_id', $currentUser->agency_id)
                            ->orWhere('validated_by_manager_id', $currentUser->id);
                    })
                    ->findOrFail($targetUserId);
            } elseif ($availableUsers->count() > 0) {
                // Default to first available user if no specific user selected
                $firstUser = $availableUsers->first();
                $targetUser = User::find($firstUser['id']);
            } else {
                // No assigned users, show empty state
                $targetUser = null;
            }
        } else {
            abort(403, 'Unauthorized');
        }

        // Build query for photos
        if ($targetUser) {
            $query = $targetUser->photos()->orderBy('created_at', 'desc');

            // Search functionality
            if ($request->has('search') && $request->search) {
                $query->where('file_name', 'like', '%' . $request->search . '%');
            }

            // Paginate with 8 items per page
            $photos = $query->paginate(8)->withQueryString();
            
            // Transform the data
            $photos->getCollection()->transform(function ($photo) {
                return [
                    'id' => $photo->id,
                    'file_name' => $photo->file_name,
                    'url' => $photo->file_path,
                    'created_at' => $photo->created_at->format('D, M d, Y'),
                    'created_at_raw' => $photo->created_at->toIso8601String(),
                ];
            });
        } else {
            // No target user, return empty pagination
            $photos = new \Illuminate\Pagination\LengthAwarePaginator(
                collect([]),
                0,
                8,
                1
            );
        }

        return Inertia::render('photos', [
            'photos' => $photos,
            'search' => $request->search ?? '',
            'targetUser' => $targetUser ? [
                'id' => $targetUser->id,
                'name' => $targetUser->name,
                'email' => $targetUser->email,
                'username' => $targetUser->username,
            ] : null,
            'availableUsers' => $availableUsers,
            'canUpload' => $currentUser->hasRole('user') && $targetUser && $targetUser->id === $currentUser->id,
            'canDelete' => $currentUser->hasRole('user') && $targetUser && $targetUser->id === $currentUser->id,
        ]);
    }

    public function store(Request $request)
    {
        $user = Auth::user();
        
        // Only allow users with 'user' role
        if (!$user || !$user->hasRole('user')) {
            abort(403, 'Unauthorized');
        }

        $request->validate([
            'photos' => 'required|array|min:1|max:10',
            'photos.*' => 'image|mimes:jpeg,png,jpg,gif,webp|max:10240', // 10MB max per image
        ]);

        $uploadedPhotos = [];

        foreach ($request->file('photos') as $file) {
            $path = $file->store('user-photos', 'public');
            
            $photo = UserPhoto::create([
                'user_id' => $user->id,
                'file_path' => $path,
                'file_name' => $file->getClientOriginalName(),
                'file_disk' => 'public',
                'file_size' => $file->getSize(),
                'mime_type' => $file->getMimeType(),
            ]);

            $uploadedPhotos[] = $photo;
        }

        return redirect()->route('photos')->with('success', count($uploadedPhotos) . ' photo(s) uploaded successfully.');
    }

    public function destroy(UserPhoto $photo)
    {
        $user = Auth::user();
        
        // Only allow users with 'user' role
        if (!$user || !$user->hasRole('user')) {
            abort(403, 'Unauthorized');
        }

        // Ensure the photo belongs to the authenticated user
        if ($photo->user_id !== $user->id) {
            abort(403, 'Unauthorized');
        }

        // Delete the file from storage
        Storage::disk($photo->file_disk)->delete($photo->file_path);

        // Delete the database record
        $photo->delete();

        return redirect()->route('photos')->with('success', 'Photo deleted successfully.');
    }
}
