<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class SearchController extends Controller
{
    public function searchUsers(Request $request)
    {
        $user = Auth::user();
        
        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        // Get user role
        $roleName = DB::table('model_has_roles')
            ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
            ->where('model_has_roles.model_id', $user->id)
            ->value('roles.name');

        // Only allow admin, matchmaker, and manager
        if (!in_array($roleName, ['admin', 'matchmaker', 'manager'])) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $query = $request->input('q', '');
        
        if (empty($query) || strlen($query) < 2) {
            return response()->json(['users' => []]);
        }

        // Prepare CIN hash for search if query looks like a CIN (alphanumeric, typically uppercase)
        $cinHash = null;
        $cinUpper = strtoupper(trim($query));
        // Check if query might be a CIN (alphanumeric, typically 6-12 characters)
        if (preg_match('/^[A-Z0-9]{6,12}$/i', $cinUpper)) {
            $appKey = (string) config('app.key');
            if (str_starts_with($appKey, 'base64:')) {
                $decoded = base64_decode(substr($appKey, 7));
                if ($decoded !== false) {
                    $appKey = $decoded;
                }
            }
            $cinHash = hash_hmac('sha256', $cinUpper, $appKey);
        }

        // Base query for users - matchmakers and managers can now search all users
        $usersQuery = User::role('user')
            ->where(function($q) use ($query, $cinHash) {
                $q->where('name', 'like', "%{$query}%")
                  ->orWhere('username', 'like', "%{$query}%")
                  ->orWhere('email', 'like', "%{$query}%")
                  ->orWhere('phone', 'like', "%{$query}%");
                
                // Add CIN search if hash was generated
                if ($cinHash) {
                    $q->orWhereHas('profile', function($profileQ) use ($cinHash) {
                        $profileQ->where('cin_hash', $cinHash);
                    });
                }
            })
            ->with(['profile', 'agency', 'assignedMatchmaker']);

        // No role-based filtering - matchmakers and managers can search all users

        $users = $usersQuery->orderBy('created_at', 'desc')->limit(20)->get();

        // Search for staff members (admin, matchmaker, manager can all see staff)
        $staffMembers = collect();
        if (in_array($roleName, ['admin', 'matchmaker', 'manager'])) {
            $staffQuery = User::whereHas('roles', function($q) {
                    $q->whereIn('name', ['admin', 'manager', 'matchmaker']);
                })
                ->where(function($q) use ($query) {
                    $q->where('name', 'like', "%{$query}%")
                      ->orWhere('username', 'like', "%{$query}%")
                      ->orWhere('email', 'like', "%{$query}%")
                      ->orWhere('phone', 'like', "%{$query}%");
                })
                ->with(['roles', 'agency'])
                ->orderBy('created_at', 'desc')
                ->limit(20)
                ->get();
            
            $staffMembers = $staffQuery;
        }

        // Merge regular users and staff members, then limit to 20 total
        $allResults = $users->merge($staffMembers)->take(20);

        // Format results
        $formattedUsers = $allResults->map(function($user) {
            // For regular users, profile picture is in profile->profile_picture_path
            // For staff members, profile picture is in user->profile_picture
            $profilePicture = null;
            if ($user->profile && $user->profile->profile_picture_path) {
                $profilePicture = $user->profile->profile_picture_path;
            } elseif ($user->profile_picture) {
                // Fallback to user->profile_picture (for staff users)
                $profilePicture = $user->profile_picture;
            }

            // Get user roles to determine if it's a staff member
            $userRoles = $user->roles->pluck('name')->toArray();
            $isStaffMember = !empty(array_intersect($userRoles, ['admin', 'manager', 'matchmaker']));

            return [
                'id' => $user->id,
                'name' => $user->name,
                'username' => $user->username,
                'email' => $user->email,
                'phone' => $user->phone,
                'status' => $isStaffMember ? ($userRoles[0] ?? 'staff') : $user->status,
                'profile_picture' => $profilePicture,
                'agency' => $user->agency ? [
                    'id' => $user->agency->id,
                    'name' => $user->agency->name,
                ] : null,
                'assigned_matchmaker' => $user->assignedMatchmaker ? [
                    'id' => $user->assignedMatchmaker->id,
                    'name' => $user->assignedMatchmaker->name,
                ] : null,
                'role' => $isStaffMember ? ($userRoles[0] ?? null) : null,
            ];
        });

        return response()->json(['users' => $formattedUsers]);
    }
}

