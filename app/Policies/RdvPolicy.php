<?php

namespace App\Policies;

use App\Models\Rdv;
use App\Models\RdvFeedback;
use App\Models\User;

class RdvPolicy
{
    public function create(User $user): bool
    {
        return $user->hasRole('matchmaker');
    }

    public function view(User $user, Rdv $rdv): bool
    {
        return (int) $rdv->matchmaker_id === (int) $user->id
            || (int) $rdv->reference_user_id === (int) $user->id
            || (int) $rdv->compatible_user_id === (int) $user->id;
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
            && $user->hasRole('matchmaker');
    }

    public function deleteFeedback(User $user, RdvFeedback $feedback): bool
    {
        return (int) $feedback->author_id === (int) $user->id
            && $user->hasRole('matchmaker');
    }

    public function updateStatus(User $user, Rdv $rdv): bool
    {
        return (int) $rdv->matchmaker_id === (int) $user->id
            && $user->hasRole('matchmaker');
    }
}
