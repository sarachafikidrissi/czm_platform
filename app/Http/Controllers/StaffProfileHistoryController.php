<?php

namespace App\Http\Controllers;

use App\Models\Proposition;
use App\Models\Rdv;
use App\Models\User;
use App\Policies\UserProfileActionPolicy;
use Illuminate\Support\Facades\Auth;

/**
 * Propositions and RDVs made over one profile, for the "Propositions" and "RDV" tabs of the staff profile.
 * Only staff who follow the profile can list them; each row links to its details page only when the
 * viewer may open it (creator-only rule for propositions), and says who created it.
 */
class StaffProfileHistoryController extends Controller
{
    public function propositions(User $user)
    {
        $me = Auth::user();
        abort_unless(UserProfileActionPolicy::followsProfile($me, $user), 403, 'Unauthorized.');

        $rows = Proposition::query()
            ->where(function ($q) use ($user) {
                $q->where('reference_user_id', $user->id)->orWhere('compatible_user_id', $user->id);
            })
            ->with([
                'matchmaker:id,name',
                'referenceUser:id,name,username',
                'referenceUser.profile:id,user_id,profile_picture_path',
                'compatibleUser:id,name,username',
                'compatibleUser.profile:id,user_id,profile_picture_path',
            ])
            ->orderByDesc('id')
            ->limit(100)
            ->get();

        // One entry per pair (one row per recipient), newest first.
        $entries = $rows
            ->groupBy(fn (Proposition $p) => $p->pair_id ? 'pair-'.$p->pair_id : 'single-'.$p->id)
            ->map(function ($pairRows) use ($me, $user) {
                /** @var Proposition $latest */
                $latest = $pairRows->sortByDesc('id')->first();
                $counterpart = (int) $latest->reference_user_id === (int) $user->id ? $latest->compatibleUser : $latest->referenceUser;
                $answerOf = function (?User $person) use ($pairRows) {
                    $row = $person ? $pairRows->firstWhere('recipient_user_id', $person->id) : null;

                    return $row ? ['user_response' => $row->user_response, 'responded_at' => $row->responded_at] : null;
                };

                return [
                    'id' => $latest->id,
                    'created_at' => $latest->created_at,
                    'status' => $latest->status,
                    'creator' => ['id' => $latest->matchmaker_id, 'name' => $latest->matchmaker?->name],
                    'created_by_me' => (int) $latest->matchmaker_id === (int) $me->id,
                    'counterpart' => $this->person($counterpart),
                    'profile_answer' => $answerOf($user),
                    'counterpart_answer' => $answerOf($counterpart),
                    'url' => $me->can('view', $latest) ? route('staff.staff.propositions.show', $latest->id) : null,
                ];
            })
            ->values()
            ->take(50);

        return response()->json(['propositions' => $entries]);
    }

    public function rdvs(User $user)
    {
        $me = Auth::user();
        abort_unless(UserProfileActionPolicy::followsProfile($me, $user), 403, 'Unauthorized.');

        $rdvs = Rdv::query()
            ->where(function ($q) use ($user) {
                $q->where('reference_user_id', $user->id)->orWhere('compatible_user_id', $user->id);
            })
            ->with([
                'matchmaker:id,name',
                'referenceUser:id,name,username',
                'referenceUser.profile:id,user_id,profile_picture_path',
                'compatibleUser:id,name,username',
                'compatibleUser.profile:id,user_id,profile_picture_path',
            ])
            ->withCount('feedbacks')
            ->orderByDesc('id')
            ->limit(50)
            ->get()
            ->map(function (Rdv $rdv) use ($me, $user) {
                $counterpart = (int) $rdv->reference_user_id === (int) $user->id ? $rdv->compatibleUser : $rdv->referenceUser;

                return [
                    'id' => $rdv->id,
                    'created_at' => $rdv->created_at,
                    'status' => $rdv->status,
                    'creator' => ['id' => $rdv->matchmaker_id, 'name' => $rdv->matchmaker?->name],
                    'created_by_me' => (int) $rdv->matchmaker_id === (int) $me->id,
                    'counterpart' => $this->person($counterpart),
                    'has_feedback' => $rdv->feedbacks_count > 0,
                    'url' => $me->can('view', $rdv) ? route('staff.rdv.show', $rdv->id) : null,
                ];
            })
            ->values();

        return response()->json(['rdvs' => $rdvs]);
    }

    private function person(?User $user): ?array
    {
        return $user ? [
            'id' => $user->id,
            'name' => $user->name,
            'username' => $user->username,
            'photo' => $user->profile?->profile_picture_path ? '/storage/'.$user->profile->profile_picture_path : null,
        ] : null;
    }
}
