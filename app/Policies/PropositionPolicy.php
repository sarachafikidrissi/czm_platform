<?php

namespace App\Policies;

use App\Models\Proposition;
use App\Models\User;
use App\Services\PropositionStaffPayloadService;

class PropositionPolicy
{
    public function view(User $user, Proposition $proposition): bool
    {
        if ($user->hasRole('admin')) {
            return true;
        }

        if ((int) $proposition->matchmaker_id === (int) $user->id) {
            return true;
        }

        $service = app(PropositionStaffPayloadService::class);
        if ($user->hasAnyRole(['matchmaker', 'manager'])
            && $service->userIsAssignedMatchmakerToParties($user, $proposition)) {
            return true;
        }

        if ($user->hasRole('user') && ! $user->hasAnyRole(['admin', 'matchmaker', 'manager'])) {
            if ((int) $proposition->recipient_user_id === (int) $user->id) {
                return true;
            }

            return Proposition::recipientHasRespondedInPair($proposition, (int) $user->id);
        }

        if ($user->hasRole('manager') && $user->agency_id !== null) {
            $matchmaker = User::find($proposition->matchmaker_id);
            if ($matchmaker && (int) $matchmaker->agency_id === (int) $user->agency_id) {
                return true;
            }
        }

        return false;
    }

    /**
     * Matchmaker assigned to the recipient, reference profile, or compatible profile may cancel.
     */
    public function cancel(User $user, Proposition $proposition): bool
    {
        if (! $user->hasAnyRole(['matchmaker', 'manager'])) {
            return false;
        }

        return app(PropositionStaffPayloadService::class)
            ->userIsAssignedMatchmakerToParties($user, $proposition);
    }
}
