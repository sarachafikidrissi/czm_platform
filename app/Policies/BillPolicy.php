<?php

namespace App\Policies;

use App\Models\Bill;
use App\Models\User;

class BillPolicy
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

    public function view(User $user, Bill $bill): bool
    {
        if ($user->hasRole('admin')) {
            return true;
        }

        if ((int) $bill->user_id === (int) $user->id) {
            return true;
        }

        if (! $user->hasAnyRole(['matchmaker', 'manager'])) {
            return false;
        }

        $member = $bill->relationLoaded('user')
            ? $bill->user
            : User::query()->select(['id', 'assigned_matchmaker_id', 'agency_id'])->find($bill->user_id);

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

    /**
     * Resend invoice email: assigned matchmaker, their agency manager, or admin.
     */
    public function resendEmail(User $user, Bill $bill): bool
    {
        if ($user->hasRole('admin')) {
            return true;
        }

        if (! self::isApprovedStaff($user)) {
            return false;
        }

        if (! $user->hasAnyRole(['matchmaker', 'manager'])) {
            return false;
        }

        $member = $bill->relationLoaded('user')
            ? $bill->user
            : User::query()->select(['id', 'assigned_matchmaker_id', 'agency_id'])->find($bill->user_id);

        if (! $member) {
            return false;
        }

        if ((int) $member->assigned_matchmaker_id === (int) $user->id) {
            return true;
        }

        if ($user->hasRole('manager') && $user->agency_id !== null) {
            $assignedMatchmaker = User::query()
                ->select(['id', 'agency_id'])
                ->find($member->assigned_matchmaker_id);

            if ($assignedMatchmaker && (int) $assignedMatchmaker->agency_id === (int) $user->agency_id) {
                return true;
            }
        }

        return false;
    }

    /**
     * Staff may mark bills paid / member as client only when assigned matchmaker or admin.
     */
    public function markPaid(User $user, Bill $bill): bool
    {
        if ($user->hasRole('admin')) {
            return true;
        }

        if (! self::isApprovedStaff($user)) {
            return false;
        }

        $member = $bill->relationLoaded('user')
            ? $bill->user
            : User::query()->select(['id', 'assigned_matchmaker_id'])->find($bill->user_id);

        return $member && (int) $member->assigned_matchmaker_id === (int) $user->id;
    }

    /**
     * Whether staff may create a bill for the given member (matches createSubscriptionPage rules).
     */
    public static function canCreateBillForMember(User $staff, User $member): bool
    {
        if ($staff->hasRole('admin')) {
            return true;
        }

        if (! self::isApprovedStaff($staff)) {
            return false;
        }

        if ($staff->hasRole('matchmaker')) {
            return (int) $member->assigned_matchmaker_id === (int) $staff->id;
        }

        if ($staff->hasRole('manager') && $staff->agency_id !== null) {
            return (int) $member->agency_id === (int) $staff->agency_id
                || (int) $member->assigned_matchmaker_id === (int) $staff->id;
        }

        return false;
    }

    /**
     * Whether staff may mark a member as client (assigned matchmaker or admin only).
     */
    public static function canMarkMemberAsClient(User $staff, User $member): bool
    {
        if ($staff->hasRole('admin')) {
            return true;
        }

        if (! self::isApprovedStaff($staff)) {
            return false;
        }

        return (int) $member->assigned_matchmaker_id === (int) $staff->id;
    }
}
