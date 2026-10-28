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

        // Matchmakers: creator only (above). Managers keep access to propositions involving their profiles.
        $service = app(PropositionStaffPayloadService::class);
        if ($user->hasRole('manager')
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
     * Staff answering (or updating the answer) on behalf of this proposition's recipient.
     * - Matchmaker/manager assigned to the recipient: always (unchanged behaviour).
     * - Matchmaker/manager who created the proposition: for both profiles, at any time, as long as
     *   they still follow one of its profiles (after a transfer, the new matchmaker takes over).
     * Any other staff, including a matchmaker linked to the other profile only, cannot answer for it.
     */
    public function respondFor(User $user, Proposition $proposition): bool
    {
        if (! $user->hasAnyRole(['matchmaker', 'manager'])) {
            return false;
        }

        if (self::isAssignedToRecipient($user, $proposition)) {
            return true;
        }

        return (int) $proposition->matchmaker_id === (int) $user->id
            && app(PropositionStaffPayloadService::class)->userIsAssignedMatchmakerToParties($user, $proposition);
    }

    public static function isAssignedToRecipient(User $user, Proposition $proposition): bool
    {
        $recipient = app(PropositionStaffPayloadService::class)->resolvePropositionParties($proposition)[0] ?? null;

        return $recipient !== null
            && $recipient->assigned_matchmaker_id !== null
            && (int) $recipient->assigned_matchmaker_id === (int) $user->id;
    }

    /**
     * The creator may cancel. Managers keep cancelling propositions involving their profiles.
     */
    public function cancel(User $user, Proposition $proposition): bool
    {
        if (! $user->hasAnyRole(['matchmaker', 'manager'])) {
            return false;
        }

        if ((int) $proposition->matchmaker_id === (int) $user->id) {
            return true;
        }

        return $user->hasRole('manager')
            && app(PropositionStaffPayloadService::class)->userIsAssignedMatchmakerToParties($user, $proposition);
    }
}
