<?php

namespace App\Policies;

use App\Models\User;
use App\Models\UserSubscription;

class SubscriptionPolicy
{
    protected static function isApprovedStaff(User $user): bool
    {
        if ($user->hasRole('admin')) {
            return true;
        }

        if ($user->hasAnyRole(['matchmaker', 'manager'])) {
            return $user->approval_status === 'approved';
        }

        return false;
    }

    public function view(User $user, UserSubscription $subscription): bool
    {
        if ($user->hasRole('admin')) {
            return true;
        }

        if ((int) $subscription->user_id === (int) $user->id) {
            return true;
        }

        if (! self::isApprovedStaff($user)) {
            return false;
        }

        if (! $user->hasAnyRole(['matchmaker', 'manager'])) {
            return false;
        }

        $member = $subscription->relationLoaded('user')
            ? $subscription->user
            : User::query()->select(['id', 'assigned_matchmaker_id', 'agency_id'])->find($subscription->user_id);

        if (! $member) {
            return false;
        }

        if ((int) $member->assigned_matchmaker_id === (int) $user->id) {
            return true;
        }

        if ($user->hasRole('manager') && $user->agency_id !== null) {
            if ((int) $member->agency_id === (int) $user->agency_id) {
                return true;
            }
        }

        return false;
    }
}
