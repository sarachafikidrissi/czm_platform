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
            // if ($request->has('search') && $request->search) {
            //     $query->where('file_name', 'like', '%' . $request->search . '%');
            // }

            // Paginate with 8 items per page
            $photos = $query->paginate(8)->withQueryString();
            
            // Transform the data
            $photos->getCollection()->transform(function ($photo) use ($currentUser, $targetUser) {
                // Check if current user can delete this specific photo
                $canDeleteThisPhoto = false;
                if ($currentUser->hasRole('user') && $photo->user_id === $currentUser->id) {
                    // User can only delete photos they uploaded themselves
                    $canDeleteThisPhoto = ($photo->uploaded_by === $currentUser->id || $photo->uploaded_by === null);
                } elseif ($currentUser->hasRole('matchmaker') && $targetUser && $targetUser->assigned_matchmaker_id === $currentUser->id) {
                    // Matchmaker can delete photos of assigned users
                    $canDeleteThisPhoto = true;
                } elseif ($currentUser->hasRole('admin')) {
                    // Admin can delete any photo
                    $canDeleteThisPhoto = true;
                }
                
                return [
                    'id' => $photo->id,
                    'file_name' => $photo->file_name,
                    'url' => $photo->file_path,
                    'created_at' => $photo->created_at->format('D, M d, Y'),
                    'created_at_raw' => $photo->created_at->toIso8601String(),
                    'uploaded_by' => $photo->uploaded_by,
                    'can_delete' => $canDeleteThisPhoto,
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
            'canUpload' => $this->canUploadPhotos($currentUser, $targetUser),
            'canDelete' => $this->canDeletePhotos($currentUser, $targetUser),
        ]);
    }

    public function store(Request $request)
    {
        $currentUser = Auth::user();
        
        if (!$currentUser) {
            abort(403, 'Unauthorized');
        }

        // Determine target user for photo upload
        $targetUserId = $request->input('user_id');
        $targetUser = null;

        if ($currentUser->hasRole('user')) {
            // Regular users can only upload to their own account
            $targetUser = $currentUser;
        } elseif ($currentUser->hasRole('matchmaker') && $targetUserId) {
            // Matchmakers can upload for assigned users
            $targetUser = User::role('user')
                ->where('assigned_matchmaker_id', $currentUser->id)
                ->findOrFail($targetUserId);
        } elseif ($currentUser->hasRole('admin') && $targetUserId) {
            // Admins can upload for any user
            $targetUser = User::role('user')->findOrFail($targetUserId);
        } else {
            abort(403, 'Unauthorized');
        }

        // Check if current user can upload for target user
        if (!$this->canUploadPhotos($currentUser, $targetUser)) {
            abort(403, 'You are not authorized to upload photos for this user.');
        }

        $request->validate([
            'photos' => 'required|array|min:1|max:10',
            'photos.*' => 'image|mimes:jpeg,png,jpg,gif,webp|max:10240', // 10MB max per image
        ]);

        $uploadedPhotos = [];

        foreach ($request->file('photos') as $file) {
            $path = $file->store('user-photos', 'public');
            
            $photo = UserPhoto::create([
                'user_id' => $targetUser->id,
                'uploaded_by' => $currentUser->id, // Track who uploaded the photo
                'file_path' => $path,
                'file_name' => $file->getClientOriginalName(),
                'file_disk' => 'public',
                'file_size' => $file->getSize(),
                'mime_type' => $file->getMimeType(),
            ]);

            $uploadedPhotos[] = $photo;
        }

        return redirect()->route('photos', $targetUserId ? ['user_id' => $targetUserId] : [])->with('success', count($uploadedPhotos) . ' photo(s) uploaded successfully.');
    }

    public function destroy(UserPhoto $photo)
    {
        $user = Auth::user();
        
        if (!$user) {
            abort(403, 'Unauthorized');
        }

        // Get the photo owner
        $photoOwner = User::findOrFail($photo->user_id);

        // Check if user can delete this photo
        $canDelete = false;

        if ($user->hasRole('user') && $photo->user_id === $user->id) {
            // User can only delete photos they uploaded themselves
            if ($photo->uploaded_by === $user->id || $photo->uploaded_by === null) {
                // Allow deletion if user uploaded it, or if uploaded_by is null (legacy photos)
                $canDelete = true;
            }
        } elseif ($user->hasRole('matchmaker') && $photoOwner->assigned_matchmaker_id === $user->id) {
            // Matchmaker can delete photos of assigned users (regardless of who uploaded)
            $canDelete = true;
        } elseif ($user->hasRole('admin')) {
            // Admin can delete any photo
            $canDelete = true;
        }

        if (!$canDelete) {
            abort(403, 'Unauthorized');
        }

        // Delete the file from storage
        Storage::disk($photo->file_disk)->delete($photo->file_path);

        // Delete the database record
        $photo->delete();

        return redirect()->route('photos')->with('success', 'Photo deleted successfully.');
    }

    /**
     * Check if current user can upload photos
     */
    private function canUploadPhotos($currentUser, $targetUser)
    {
        if (!$currentUser || !$targetUser) {
            return false;
        }

        // User can upload their own photos
        if ($currentUser->hasRole('user') && $targetUser->id === $currentUser->id) {
            return true;
        }

        // Matchmaker can upload photos for assigned users
        if ($currentUser->hasRole('matchmaker') && $targetUser->assigned_matchmaker_id === $currentUser->id) {
            return true;
        }

        // Admin can upload for any user
        if ($currentUser->hasRole('admin')) {
            return true;
        }

        return false;
    }

    /**
     * Check if current user can delete photos
     * Note: This checks if they CAN delete ANY photos, but individual photo deletion
     * is further restricted in destroy() method based on uploaded_by
     */
    private function canDeletePhotos($currentUser, $targetUser)
    {
        if (!$currentUser || !$targetUser) {
            return false;
        }

        // User can delete their own photos (but only ones they uploaded - checked in destroy())
        if ($currentUser->hasRole('user') && $targetUser->id === $currentUser->id) {
            return true;
        }

        // Matchmaker can delete photos of assigned users
        if ($currentUser->hasRole('matchmaker') && $targetUser->assigned_matchmaker_id === $currentUser->id) {
            return true;
        }

        // Admin can delete any photos
        if ($currentUser->hasRole('admin')) {
            return true;
        }

        return false;
    }
}
