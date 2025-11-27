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

        // Base query for users
        $usersQuery = User::role('user')
            ->where(function($q) use ($query) {
                $q->where('name', 'like', "%{$query}%")
                  ->orWhere('username', 'like', "%{$query}%")
                  ->orWhere('email', 'like', "%{$query}%")
                  ->orWhere('phone', 'like', "%{$query}%");
            })
            ->with(['profile', 'agency', 'assignedMatchmaker']);

        // Apply role-based filtering
        if ($roleName === 'admin') {
            // Admin can see all users
            // No additional filtering needed
        } elseif ($roleName === 'matchmaker') {
            // Matchmaker can only see users assigned to them
            $usersQuery->where('assigned_matchmaker_id', $user->id);
        } elseif ($roleName === 'manager') {
            // Manager can see all users from their agency (including those assigned to matchmakers in their agency)
            // but excluding users assigned to other managers in the same agency
            if ($user->agency_id) {
                // Get all matchmaker IDs in the manager's agency
                $matchmakerIds = User::role('matchmaker')
                    ->where('agency_id', $user->agency_id)
                    ->pluck('id')
                    ->toArray();
                
                // Get all manager IDs in the manager's agency (excluding themselves)
                $otherManagerIds = User::role('manager')
                    ->where('agency_id', $user->agency_id)
                    ->where('id', '!=', $user->id)
                    ->pluck('id')
                    ->toArray();
                
                $usersQuery->where(function($q) use ($user, $matchmakerIds, $otherManagerIds) {
                    // Users validated by this manager
                    $q->where('validated_by_manager_id', $user->id)
                      // OR users from their agency
                      ->orWhere(function($subQ) use ($user, $matchmakerIds) {
                          $subQ->where('agency_id', $user->agency_id)
                            ->where(function($subSubQ) use ($user, $matchmakerIds) {
                          // Users assigned to matchmakers in their agency
                                if (!empty($matchmakerIds)) {
                                    $subSubQ->whereIn('assigned_matchmaker_id', $matchmakerIds);
                                }
                                // OR users assigned to them (prospects they created)
                                $subSubQ->orWhere('assigned_matchmaker_id', $user->id);
                                // OR unassigned users from their agency
                                $subSubQ->orWhereNull('assigned_matchmaker_id');
                            });
                      })
                      // OR users assigned to matchmakers in their agency (even if agency_id doesn't match)
                      ->orWhere(function($subQ) use ($matchmakerIds) {
                          if (!empty($matchmakerIds)) {
                              $subQ->whereIn('assigned_matchmaker_id', $matchmakerIds);
                          }
                      });
                    
                    // Exclude users assigned to other managers in the same agency
                    if (!empty($otherManagerIds)) {
                        $q->whereNotIn('assigned_matchmaker_id', $otherManagerIds);
                    }
                });
            } else {
                // If manager has no agency, return empty results
                return response()->json(['users' => []]);
            }
        }

        $users = $usersQuery->limit(20)->get();

        // Format results
        $formattedUsers = $users->map(function($user) {
            // For regular users, profile picture is in profile->profile_picture_path
            $profilePicture = null;
            if ($user->profile && $user->profile->profile_picture_path) {
                $profilePicture = $user->profile->profile_picture_path;
            } elseif ($user->profile_picture) {
                // Fallback to user->profile_picture (for staff users if any)
                $profilePicture = $user->profile_picture;
            }

            return [
                'id' => $user->id,
                'name' => $user->name,
                'username' => $user->username,
                'email' => $user->email,
                'phone' => $user->phone,
                'status' => $user->status,
                'profile_picture' => $profilePicture,
                'agency' => $user->agency ? [
                    'id' => $user->agency->id,
                    'name' => $user->agency->name,
                ] : null,
                'assigned_matchmaker' => $user->assignedMatchmaker ? [
                    'id' => $user->assignedMatchmaker->id,
                    'name' => $user->assignedMatchmaker->name,
                ] : null,
            ];
        });

        return response()->json(['users' => $formattedUsers]);
    }
}

