<?php

namespace App\Services;

use App\Models\Proposition;
use App\Models\PropositionRequest;
use App\Models\User;
use Illuminate\Support\Facades\Schema;

/**
 * Builds match rows for matchmakers (match results page + member profile "À proposer").
 */
class MatchmakingResultsPayloadService
{
    /**
     * @param  array<int, array{user: User, profile: mixed, score: float|int, scoreDetails: array, completeness: float|int}>  $matches
     * @return array<int, array<string, mixed>>
     */
    public static function formatMatchesForMatchmaker(array $matches, User $me, int $referenceUserId): array
    {
        $compatibleIds = array_map(static fn ($m) => $m['user']->id, $matches);

        $userAHasActiveProposition = Proposition::hasActiveProposition((int) $referenceUserId);
        $compatibleRecipientActiveMap = [];
        foreach ($compatibleIds as $cid) {
            $compatibleRecipientActiveMap[(int) $cid] = Proposition::hasActiveProposition((int) $cid);
        }

        $statusMap = [];
        $requestMetaMap = [];
        if ($compatibleIds !== []) {
            $requestQuery = PropositionRequest::query()
                ->where('from_matchmaker_id', $me->id)
                ->whereIn('compatible_user_id', $compatibleIds)
                ->orderByDesc('created_at');

            if (Schema::hasColumn('proposition_requests', 'reference_user_id')) {
                $requestQuery->where('reference_user_id', $referenceUserId);
            }

            $sentRequests = $requestQuery->get(['compatible_user_id', 'status', 'created_at', 'responded_at']);
            foreach ($sentRequests as $sent) {
                $compId = (int) $sent->compatible_user_id;
                if (! array_key_exists($compId, $statusMap)) {
                    $statusMap[$compId] = $sent->status;
                    $requestMetaMap[$compId] = [
                        'status' => $sent->status,
                        'accepted_at' => $sent->responded_at ?? $sent->created_at,
                    ];
                }
            }
        }

        $propositionStatusMap = [];
        if ($compatibleIds !== []) {
            $latestPropositions = Proposition::query()
                ->where('matchmaker_id', $me->id)
                ->where('reference_user_id', $referenceUserId)
                ->whereIn('compatible_user_id', $compatibleIds)
                ->orderByDesc('created_at')
                ->get(['compatible_user_id', 'status', 'created_at']);

            foreach ($latestPropositions as $proposition) {
                $compId = (int) $proposition->compatible_user_id;
                if (! array_key_exists($compId, $propositionStatusMap)) {
                    $isExpired = $proposition->status === 'expired'
                        || ($proposition->status === 'pending'
                            && $proposition->created_at
                            && $proposition->created_at->lt(now()->subDays(7)));

                    $propositionStatusMap[$compId] = $isExpired ? 'expired' : $proposition->status;
                }
            }
        }

        /** @var array<int, array{cancellable_proposition: array{id: int}|null, pending_response_proposition: array{id: int}|null}> $pairActions */
        $pairActions = [];
        if ($compatibleIds !== []) {
            $pairPropositions = Proposition::query()
                ->where('matchmaker_id', $me->id)
                ->where('reference_user_id', $referenceUserId)
                ->whereIn('compatible_user_id', $compatibleIds)
                ->where('status', '!=', Proposition::STATUS_CANCELLED)
                ->orderByDesc('id')
                ->with([
                    'recipientUser' => static fn ($q) => $q->select(['id', 'assigned_matchmaker_id']),
                    'referenceUser' => static fn ($q) => $q->select(['id', 'assigned_matchmaker_id']),
                    'compatibleUser' => static fn ($q) => $q->select(['id', 'assigned_matchmaker_id']),
                ])
                ->get();

            foreach ($compatibleIds as $cid) {
                $pairActions[(int) $cid] = [
                    'cancellable_proposition' => null,
                    'pending_response_proposition' => null,
                ];
            }

            foreach ($pairPropositions as $prop) {
                $cid = (int) $prop->compatible_user_id;
                if (! isset($pairActions[$cid])) {
                    continue;
                }
                $mmId = (int) $me->id;
                $recipient = $prop->recipientUser;
                $refParty = $prop->referenceUser;
                $compParty = $prop->compatibleUser;
                $canManagePair = ($recipient && (int) $recipient->assigned_matchmaker_id === $mmId)
                    || ($refParty && (int) $refParty->assigned_matchmaker_id === $mmId)
                    || ($compParty && (int) $compParty->assigned_matchmaker_id === $mmId);
                if (! $canManagePair) {
                    continue;
                }
                if ($prop->status === 'pending' && $recipient && (int) $recipient->assigned_matchmaker_id === $mmId && $pairActions[$cid]['pending_response_proposition'] === null) {
                    $pairActions[$cid]['pending_response_proposition'] = ['id' => $prop->id];
                }
                if ($prop->canBeCancelledByMatchmaker() && $pairActions[$cid]['cancellable_proposition'] === null) {
                    $pairActions[$cid]['cancellable_proposition'] = ['id' => $prop->id];
                }
            }
        }

        return array_map(function ($match) use ($me, $referenceUserId, $statusMap, $requestMetaMap, $propositionStatusMap, $userAHasActiveProposition, $compatibleRecipientActiveMap, $pairActions) {
            $compatId = $match['user']->id;
            $requestMeta = $requestMetaMap[$compatId] ?? null;
            $canProposeFromRequest = ($requestMeta['status'] ?? null) === 'accepted';
            $actions = $pairActions[$compatId] ?? [
                'cancellable_proposition' => null,
                'pending_response_proposition' => null,
            ];

            return [
                'user' => [
                    'id' => $match['user']->id,
                    'name' => $match['user']->name,
                    'email' => $match['user']->email,
                    'username' => $match['user']->username,
                    'gender' => $match['user']->gender,
                    'created_at' => $match['user']->created_at,
                    'updated_at' => $match['user']->updated_at,
                    'assigned_matchmaker_id' => $match['user']->assigned_matchmaker_id,
                ],
                'assigned_matchmaker' => $match['user']->assignedMatchmaker ? [
                    'id' => $match['user']->assignedMatchmaker->id,
                    'name' => $match['user']->assignedMatchmaker->name,
                    'username' => $match['user']->assignedMatchmaker->username,
                ] : null,
                'isAssignedToMe' => (int) $match['user']->assigned_matchmaker_id === (int) $me->id,
                'profile' => $match['profile']->toArray(),
                'score' => $match['score'],
                'scoreDetails' => $match['scoreDetails'],
                'completeness' => $match['completeness'],
                'proposition_request_status' => $statusMap[$compatId] ?? null,
                'can_propose_from_request' => $canProposeFromRequest,
                'proposition_status' => $propositionStatusMap[$compatId] ?? null,
                'user_a_has_active_proposition' => $userAHasActiveProposition,
                'compatible_user_has_active_proposition' => $compatibleRecipientActiveMap[$compatId] ?? false,
                'cancellable_proposition' => $actions['cancellable_proposition'],
                'pending_response_proposition' => $actions['pending_response_proposition'],
                'can_cancel' => $actions['cancellable_proposition'] !== null,
                'has_active_proposition' => Proposition::pairMatchHasActiveProposition((int) $referenceUserId, (int) $compatId),
                'proposition' => Proposition::activeSnapshotForPair((int) $referenceUserId, (int) $compatId, (int) $compatId),
            ];
        }, $matches);
    }
}
