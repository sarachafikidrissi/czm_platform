<?php

namespace App\Policies;

use App\Models\Rdv;
use App\Models\RdvFeedback;
use App\Models\User;

class RdvPolicy
{
    public function create(User $user): bool
    {
        return $user->hasAnyRole(['matchmaker', 'manager']);
    }

    public function view(User $user, Rdv $rdv): bool
    {
        if ($user->hasRole('admin')) {
            return true;
        }

        if ((int) $rdv->matchmaker_id === (int) $user->id) {
            return true;
        }

        if ((int) $rdv->reference_user_id === (int) $user->id
            || (int) $rdv->compatible_user_id === (int) $user->id) {
            return true;
        }

        if ($user->hasRole('manager') && $user->agency_id !== null) {
            $rdvMatchmaker = User::find($rdv->matchmaker_id);
            if ($rdvMatchmaker && (int) $rdvMatchmaker->agency_id === (int) $user->agency_id) {
                return true;
            }
        }

        return false;
    }

    public function addFeedback(User $user, Rdv $rdv): bool
    {
        $isParticipant = (int) $rdv->matchmaker_id === (int) $user->id
            || (int) $rdv->reference_user_id === (int) $user->id
            || (int) $rdv->compatible_user_id === (int) $user->id;

        if (! $isParticipant) {
            return false;
        }

        return ! $rdv->feedbacks()->where('author_id', $user->id)->exists();
    }

    public function updateFeedback(User $user, RdvFeedback $feedback): bool
    {
        return (int) $feedback->author_id === (int) $user->id
            && $user->hasAnyRole(['matchmaker', 'manager']);
    }

    public function deleteFeedback(User $user, RdvFeedback $feedback): bool
    {
        return (int) $feedback->author_id === (int) $user->id
            && $user->hasAnyRole(['matchmaker', 'manager']);
    }

    public function updateStatus(User $user, Rdv $rdv): bool
    {
        if ($user->hasRole('admin')) {
            return true;
        }

        if ((int) $rdv->matchmaker_id === (int) $user->id
            && $user->hasAnyRole(['matchmaker', 'manager'])) {
            return true;
        }

        if ($user->hasRole('manager') && $user->agency_id !== null) {
            $rdvMatchmaker = User::find($rdv->matchmaker_id);
            if ($rdvMatchmaker && (int) $rdvMatchmaker->agency_id === (int) $user->agency_id) {
                return true;
            }
        }

        return false;
    }
}
