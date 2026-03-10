<?php

namespace App\Policies;

use App\Models\User;

class UserActivityPolicy
{
    /**
     * Determine whether the authenticated user can view the activity history of the target user.
     */
    public function viewAny(User $auth, User $target): bool
    {
        // Client: can only view own activities
        if ($auth->hasRole('user')) {
            return $auth->id === $target->id;
        }

        // Admin: can view any user's activities
        if ($auth->hasRole('admin')) {
            return true;
        }

        // Matchmaker: can only view activities of users assigned to them
        if ($auth->hasRole('matchmaker')) {
            return (int) $target->assigned_matchmaker_id === (int) $auth->id;
        }

        // Manager: can view activities of users within their agency scope
        if ($auth->hasRole('manager')) {
            if (! $auth->agency_id) {
                return false;
            }

            // 1) User explicitly belongs to manager's agency
            if ($target->agency_id && (int) $target->agency_id === (int) $auth->agency_id) {
                return true;
            }

            // 2) User was validated by this manager
            if ((int) $target->validated_by_manager_id === (int) $auth->id) {
                return true;
            }

            // 3) User is assigned to a matchmaker from the manager's agency
            if ($target->assigned_matchmaker_id) {
                $assigned = User::find($target->assigned_matchmaker_id);
                if ($assigned && $assigned->agency_id && (int) $assigned->agency_id === (int) $auth->agency_id) {
                    return true;
                }
            }

            return false;
        }

        return false;
    }
}

