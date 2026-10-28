<?php

namespace App\Services;

use App\Models\Bill;
use App\Models\Proposition;
use App\Models\PropositionRequest;
use App\Models\Rdv;
use App\Models\UserSubscription;

/**
 * When a profile changes matchmaker (transfer, reassignment, takeover...), everything the previous
 * matchmaker handled for that profile moves to the new one, so stats (ventes, RDV, match, propositions)
 * and creator rights follow the profile:
 * - propositions and RDVs involving the profile that the previous matchmaker created
 *   (including those with another of the previous matchmaker's profiles; those created by a third
 *   matchmaker do not change);
 * - the profile's bills and subscriptions handled by the previous matchmaker;
 * - proposition requests involving the profile, sent by or addressed to the previous matchmaker.
 * Called from UserAssignment::recordAssignment(), the single entry-point for assignment changes.
 */
class ProfileOwnershipTransferService
{
    /**
     * @return array{propositions: int, rdvs: int, bills: int, subscriptions: int, requests: int}
     */
    public function moveHistory(int $userId, int $fromMatchmakerId, int $toMatchmakerId, ?int $performedBy = null): array
    {
        if ($fromMatchmakerId === $toMatchmakerId) {
            return ['propositions' => 0, 'rdvs' => 0, 'bills' => 0, 'subscriptions' => 0, 'requests' => 0];
        }

        // toBase(): change the owner only, keep created_at/updated_at as they were
        // (stats are counted by those dates, e.g. "match" by the RDV's updated_at month).
        $involvesProfile = function ($query) use ($userId) {
            $query->where('reference_user_id', $userId)->orWhere('compatible_user_id', $userId);
        };

        $propositions = Proposition::query()
            ->where('matchmaker_id', $fromMatchmakerId)
            ->where($involvesProfile)
            ->toBase()->update(['matchmaker_id' => $toMatchmakerId]);

        $rdvs = Rdv::query()
            ->where('matchmaker_id', $fromMatchmakerId)
            ->where($involvesProfile)
            ->toBase()->update(['matchmaker_id' => $toMatchmakerId]);

        $bills = Bill::query()
            ->where('user_id', $userId)
            ->where('matchmaker_id', $fromMatchmakerId)
            ->toBase()->update(['matchmaker_id' => $toMatchmakerId]);

        $subscriptions = UserSubscription::query()
            ->where('user_id', $userId)
            ->where('assigned_matchmaker_id', $fromMatchmakerId)
            ->toBase()->update(['assigned_matchmaker_id' => $toMatchmakerId]);

        // Requests: never turn one into a request between the new matchmaker and themselves.
        $requests = PropositionRequest::query()
            ->where('from_matchmaker_id', $fromMatchmakerId)
            ->where('reference_user_id', $userId)
            ->where('to_matchmaker_id', '!=', $toMatchmakerId)
            ->toBase()->update(['from_matchmaker_id' => $toMatchmakerId]);
        $requests += PropositionRequest::query()
            ->where('to_matchmaker_id', $fromMatchmakerId)
            ->where('compatible_user_id', $userId)
            ->where('from_matchmaker_id', '!=', $toMatchmakerId)
            ->toBase()->update(['to_matchmaker_id' => $toMatchmakerId]);

        $moved = compact('propositions', 'rdvs', 'bills', 'subscriptions', 'requests');

        if (array_sum($moved) > 0) {
            UserActivityService::log(
                $userId,
                $performedBy,
                'matchmaker_assigned',
                "Historique transféré au nouveau matchmaker : {$propositions} proposition(s), {$rdvs} RDV, {$bills} facture(s), {$subscriptions} abonnement(s), {$requests} demande(s).",
                $moved + [
                    'previous_matchmaker_id' => $fromMatchmakerId,
                    'new_matchmaker_id' => $toMatchmakerId,
                ]
            );
        }

        // Both matchmakers' KPIs change (ventes, RDV, match, propositions).
        StatsService::invalidateForMatchmaker($fromMatchmakerId);
        StatsService::invalidateForMatchmaker($toMatchmakerId);

        return $moved;
    }
}
