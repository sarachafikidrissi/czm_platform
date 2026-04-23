<?php

namespace App\Policies;

use App\Models\Proposition;
use App\Models\User;

class PropositionPolicy
{
    /**
     * Matchmaker assigned to the recipient, reference profile, or compatible profile may cancel.
     */
    public function cancel(User $user, Proposition $proposition): bool
    {
        if (! $user->hasRole('matchmaker')) {
            return false;
        }

        $mmId = (int) $user->id;

        $recipient = $proposition->relationLoaded('recipientUser')
            ? $proposition->recipientUser
            : User::query()->select(['id', 'assigned_matchmaker_id'])->find($proposition->recipient_user_id);

        $referenceUser = $proposition->relationLoaded('referenceUser')
            ? $proposition->referenceUser
            : User::query()->select(['id', 'assigned_matchmaker_id'])->find($proposition->reference_user_id);

        $compatibleUser = $proposition->relationLoaded('compatibleUser')
            ? $proposition->compatibleUser
            : User::query()->select(['id', 'assigned_matchmaker_id'])->find($proposition->compatible_user_id);

        foreach ([$recipient, $referenceUser, $compatibleUser] as $party) {
            if ($party && (int) $party->assigned_matchmaker_id === $mmId) {
                return true;
            }
        }

        return false;
    }
}
