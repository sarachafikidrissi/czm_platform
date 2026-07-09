<?php

namespace App\Services;

use App\Models\Proposition;
use App\Models\Rdv;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class PropositionStaffPayloadService
{
    public static function canonicalPairKey(int $a, int $b): string
    {
        return $a < $b ? "{$a}-{$b}" : "{$b}-{$a}";
    }

    public function visiblePropositionsQuery(User $me): Builder
    {
        if ($me->hasRole('admin')) {
            return Proposition::query();
        }

        if ($me->hasRole('manager') && $me->agency_id !== null) {
            $agencyId = (int) $me->agency_id;

            return Proposition::query()->where(function ($query) use ($agencyId) {
                $query->whereHas('matchmaker', fn ($q) => $q->where('agency_id', $agencyId))
                    ->orWhereHas('recipientUser', fn ($q) => $q->whereHas(
                        'assignedMatchmaker',
                        fn ($mm) => $mm->where('agency_id', $agencyId)
                    ))
                    ->orWhereHas('referenceUser', fn ($q) => $q->whereHas(
                        'assignedMatchmaker',
                        fn ($mm) => $mm->where('agency_id', $agencyId)
                    ))
                    ->orWhereHas('compatibleUser', fn ($q) => $q->whereHas(
                        'assignedMatchmaker',
                        fn ($mm) => $mm->where('agency_id', $agencyId)
                    ));
            });
        }

        return Proposition::query()->where(function ($query) use ($me) {
            $query->where('matchmaker_id', $me->id)
                ->orWhereHas('recipientUser', fn ($q) => $q->where('assigned_matchmaker_id', $me->id))
                ->orWhereHas('referenceUser', fn ($q) => $q->where('assigned_matchmaker_id', $me->id))
                ->orWhereHas('compatibleUser', fn ($q) => $q->where('assigned_matchmaker_id', $me->id));
        });
    }

    public function applyAgencyNarrowingFilter(Builder $query, int $agencyId): Builder
    {
        return $query->where(function ($query) use ($agencyId) {
            $query->whereHas('matchmaker', fn ($q) => $q->where('agency_id', $agencyId))
                ->orWhereHas('recipientUser', fn ($q) => $q->whereHas(
                    'assignedMatchmaker',
                    fn ($mm) => $mm->where('agency_id', $agencyId)
                ))
                ->orWhereHas('referenceUser', fn ($q) => $q->whereHas(
                    'assignedMatchmaker',
                    fn ($mm) => $mm->where('agency_id', $agencyId)
                ))
                ->orWhereHas('compatibleUser', fn ($q) => $q->whereHas(
                    'assignedMatchmaker',
                    fn ($mm) => $mm->where('agency_id', $agencyId)
                ));
        });
    }

    public function applyMatchmakerNarrowingFilter(Builder $query, int $matchmakerId): Builder
    {
        return $query->where(function ($query) use ($matchmakerId) {
            $query->whereHas('recipientUser', fn ($q) => $q->where('assigned_matchmaker_id', $matchmakerId))
                ->orWhereHas('referenceUser', fn ($q) => $q->where('assigned_matchmaker_id', $matchmakerId))
                ->orWhereHas('compatibleUser', fn ($q) => $q->where('assigned_matchmaker_id', $matchmakerId));
        });
    }

    public function userIsAssignedMatchmakerToParties(User $user, Proposition $proposition): bool
    {
        $matchmakerId = (int) $user->id;

        foreach ($this->resolvePropositionParties($proposition) as $party) {
            if ($party && (int) $party->assigned_matchmaker_id === $matchmakerId) {
                return true;
            }
        }

        return false;
    }

    /**
     * @return array<int, User|null>
     */
    public function resolvePropositionParties(Proposition $proposition): array
    {
        $recipient = $proposition->relationLoaded('recipientUser')
            ? $proposition->recipientUser
            : User::query()->select(['id', 'assigned_matchmaker_id'])->find($proposition->recipient_user_id);

        $referenceUser = $proposition->relationLoaded('referenceUser')
            ? $proposition->referenceUser
            : User::query()->select(['id', 'assigned_matchmaker_id'])->find($proposition->reference_user_id);

        $compatibleUser = $proposition->relationLoaded('compatibleUser')
            ? $proposition->compatibleUser
            : User::query()->select(['id', 'assigned_matchmaker_id'])->find($proposition->compatible_user_id);

        return [$recipient, $referenceUser, $compatibleUser];
    }

    /**
     * @return array{
     *     bothAcceptedPairKeySet: array<string, bool>,
     *     bothClosedPairKeySet: array<string, bool>,
     *     existingRdvPairKeySet: array<string, bool>,
     *     successfulRdvPairKeySet: array<string, bool>,
     *     failedEchecPairKeySet: array<string, bool>,
     *     recreationAllowedByPairKey: array<string, bool>,
     *     latestFailedRdvIdByPairKey: array<int, int>
     * }
     */
    public function buildStaffContext(Collection $rawPropositions, User $me): array
    {
        $pairAcceptedByMember = [];
        foreach ($rawPropositions as $p) {
            if ((int) $p->matchmaker_id !== (int) $me->id) {
                continue;
            }
            $ref = (int) $p->reference_user_id;
            $comp = (int) $p->compatible_user_id;
            if ($ref === $comp) {
                continue;
            }
            $pairKey = self::canonicalPairKey($ref, $comp);
            if (! isset($pairAcceptedByMember[$pairKey])) {
                $pairAcceptedByMember[$pairKey] = [];
            }
            if ($p->status === Proposition::STATUS_INTERESTED || $p->status === Proposition::STATUS_ACCEPTED) {
                $recipient = (int) $p->recipient_user_id;
                if ($recipient === $ref || $recipient === $comp) {
                    $pairAcceptedByMember[$pairKey][$recipient] = true;
                }
            }
        }

        $bothAcceptedPairKeySet = [];
        foreach ($pairAcceptedByMember as $key => $accepted) {
            [$u1, $u2] = array_map('intval', explode('-', $key));
            if (($accepted[$u1] ?? false) && ($accepted[$u2] ?? false)) {
                $bothAcceptedPairKeySet[$key] = true;
            }
        }

        $existingRdvPairKeySet = Rdv::query()
            ->whereIn('status', [Rdv::STATUS_EN_COURS, Rdv::STATUS_REUSSI])
            ->get(['reference_user_id', 'compatible_user_id'])
            ->mapWithKeys(fn ($r) => [
                self::canonicalPairKey((int) $r->reference_user_id, (int) $r->compatible_user_id) => true,
            ])
            ->all();

        $successfulRdvPairKeySet = Rdv::query()
            ->where('status', Rdv::STATUS_REUSSI)
            ->get(['reference_user_id', 'compatible_user_id'])
            ->mapWithKeys(fn ($r) => [
                self::canonicalPairKey((int) $r->reference_user_id, (int) $r->compatible_user_id) => true,
            ])
            ->all();

        $failedEchecPairKeySet = Rdv::query()
            ->where('status', Rdv::STATUS_ECHEC)
            ->get(['reference_user_id', 'compatible_user_id'])
            ->mapWithKeys(fn ($r) => [
                self::canonicalPairKey((int) $r->reference_user_id, (int) $r->compatible_user_id) => true,
            ])
            ->all();

        $recreationAllowedByPairKey = [];
        foreach (array_keys($failedEchecPairKeySet) as $pairKey) {
            [$u1, $u2] = array_map('intval', explode('-', $pairKey));
            if (Rdv::pairRecreationGuardsPass($u1, $u2)) {
                $recreationAllowedByPairKey[$pairKey] = true;
            }
        }

        $latestFailedRdvIdByPairKey = [];
        foreach (array_keys($failedEchecPairKeySet) as $pairKey) {
            [$u1, $u2] = array_map('intval', explode('-', $pairKey));
            $rid = Rdv::query()
                ->where('status', Rdv::STATUS_ECHEC)
                ->where(function ($q) use ($u1, $u2) {
                    $q->where(function ($forward) use ($u1, $u2) {
                        $forward->where('reference_user_id', $u1)->where('compatible_user_id', $u2);
                    })->orWhere(function ($reverse) use ($u1, $u2) {
                        $reverse->where('reference_user_id', $u2)->where('compatible_user_id', $u1);
                    });
                })
                ->orderByDesc('id')
                ->value('id');
            if ($rid !== null) {
                $latestFailedRdvIdByPairKey[$pairKey] = (int) $rid;
            }
        }

        $pairClosedByMember = [];
        foreach ($rawPropositions as $p) {
            if ((int) $p->matchmaker_id !== (int) $me->id) {
                continue;
            }
            if ($p->status !== Proposition::STATUS_CLOSED) {
                continue;
            }
            $ref = (int) $p->reference_user_id;
            $comp = (int) $p->compatible_user_id;
            if ($ref === $comp) {
                continue;
            }
            $pairKey = self::canonicalPairKey($ref, $comp);
            if (! isset($pairClosedByMember[$pairKey])) {
                $pairClosedByMember[$pairKey] = [];
            }
            $recipient = (int) $p->recipient_user_id;
            if ($recipient === $ref || $recipient === $comp) {
                $pairClosedByMember[$pairKey][$recipient] = true;
            }
        }

        $bothClosedPairKeySet = [];
        foreach ($pairClosedByMember as $key => $closed) {
            [$u1, $u2] = array_map('intval', explode('-', $key));
            if (($closed[$u1] ?? false) && ($closed[$u2] ?? false)) {
                $bothClosedPairKeySet[$key] = true;
            }
        }

        return compact(
            'bothAcceptedPairKeySet',
            'bothClosedPairKeySet',
            'existingRdvPairKeySet',
            'successfulRdvPairKeySet',
            'failedEchecPairKeySet',
            'recreationAllowedByPairKey',
            'latestFailedRdvIdByPairKey',
        );
    }

    public function mapStaffRow(Proposition $proposition, User $me, array $context): array
    {
        $isExpired = $proposition->status === 'expired'
            || ($proposition->status === 'pending'
                && $proposition->created_at
                && $proposition->created_at->lt(now()->subDays(7)));
        $displayStatus = $isExpired ? Proposition::STATUS_EXPIRED : $proposition->status;

        $isActive = $proposition->isActive();
        $canCancel = ! $isExpired && $proposition->canBeCancelledByMatchmaker() && $me->can('cancel', $proposition);

        $pairKey = self::canonicalPairKey((int) $proposition->reference_user_id, (int) $proposition->compatible_user_id);
        $hasPastEchec = isset($context['failedEchecPairKeySet'][$pairKey]);
        $recreationAllowed = isset($context['recreationAllowedByPairKey'][$pairKey]);
        $mutualInterested = isset($context['bothAcceptedPairKeySet'][$pairKey]);
        $mutualClosedReady = isset($context['bothClosedPairKeySet'][$pairKey]) && $hasPastEchec && $recreationAllowed;
        $bothSidesAccepted = ($mutualInterested && (! $hasPastEchec || $recreationAllowed))
            || $mutualClosedReady;
        $rdvExists = isset($context['existingRdvPairKeySet'][$pairKey]);
        $hasSuccessfulRdv = isset($context['successfulRdvPairKeySet'][$pairKey]);
        $canCreateRdv = $bothSidesAccepted
            && ! $rdvExists
            && ! $hasSuccessfulRdv
            && (int) $proposition->matchmaker_id === (int) $me->id;
        $isRecreationContext = $canCreateRdv && $hasPastEchec;

        return [
            'id' => $proposition->id,
            'pair_id' => $proposition->pair_id,
            'matchmaker_id' => $proposition->matchmaker_id,
            'reference_user_id' => $proposition->reference_user_id,
            'compatible_user_id' => $proposition->compatible_user_id,
            'recipient_user_id' => $proposition->recipient_user_id,
            'message' => $proposition->message,
            'status' => $displayStatus,
            'user_response' => $proposition->user_response,
            'is_expired' => $isExpired,
            'is_active' => $isActive,
            'can_cancel' => $canCancel,
            'can_create_rdv' => $canCreateRdv,
            'is_recreation_context' => $isRecreationContext,
            'recreate_from_failed_rdv_id' => $isRecreationContext ? ($context['latestFailedRdvIdByPairKey'][$pairKey] ?? null) : null,
            'rdv_exists' => $rdvExists,
            'cancelled_at' => $proposition->cancelled_at,
            'response_message' => $proposition->response_message,
            'user_comment' => $proposition->user_comment,
            'responded_at' => $proposition->responded_at,
            'created_at' => $proposition->created_at,
            'can_update_response' => $proposition->recipientUser
                && $proposition->status !== Proposition::STATUS_CANCELLED
                && $proposition->status !== Proposition::STATUS_CLOSED
                && (int) $proposition->recipientUser->assigned_matchmaker_id === (int) $me->id,
            'recipient_user' => $this->mapUserSummary($proposition->recipientUser),
            'reference_user' => $this->mapUserSummary($proposition->referenceUser),
            'compatible_user' => $this->mapUserSummary($proposition->compatibleUser),
        ];
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $mappedRows
     * @return array<int, array<string, mixed>>
     */
    public function groupStaffRows(Collection $mappedRows): array
    {
        $map = [];

        $prefersBetterRecipientRow = function (?array $prev, array $next): array {
            if ($prev === null) {
                return $next;
            }
            $prevCan = (bool) ($prev['can_create_rdv'] ?? false);
            $nextCan = (bool) ($next['can_create_rdv'] ?? false);
            if ($nextCan && ! $prevCan) {
                return $next;
            }
            if ($prevCan && ! $nextCan) {
                return $prev;
            }
            $ta = strtotime((string) ($prev['created_at'] ?? '')) ?: 0;
            $tb = strtotime((string) ($next['created_at'] ?? '')) ?: 0;
            if ($tb !== $ta) {
                return $tb >= $ta ? $next : $prev;
            }

            return ((int) ($next['id'] ?? 0)) >= ((int) ($prev['id'] ?? 0)) ? $next : $prev;
        };

        $sorted = $mappedRows->sortBy([
            fn ($a) => strtotime((string) ($a['created_at'] ?? '')) ?: 0,
            fn ($a) => (int) ($a['id'] ?? 0),
        ])->values();

        foreach ($sorted as $row) {
            $key = $row['pair_id'] ? 'pair-'.$row['pair_id'] : 'single-'.$row['id'];
            if (! isset($map[$key])) {
                $map[$key] = [
                    'key' => $key,
                    'id' => $row['id'],
                    'pair_id' => $row['pair_id'],
                    'matchmaker_id' => $row['matchmaker_id'],
                    'reference_user' => $row['reference_user'],
                    'compatible_user' => $row['compatible_user'],
                    'message' => $row['message'],
                    'created_at' => $row['created_at'],
                    'recipients' => [],
                ];
            }
            $rid = $row['recipient_user_id'];
            $map[$key]['recipients'][$rid] = $prefersBetterRecipientRow($map[$key]['recipients'][$rid] ?? null, $row);

            if (strtotime((string) $row['created_at']) < strtotime((string) $map[$key]['created_at'])) {
                $map[$key]['created_at'] = $row['created_at'];
            }
        }

        return array_values(array_map(function (array $entry) {
            $entry['aggregate_status'] = $this->computeAggregateStatus($entry);

            return $entry;
        }, $map));
    }

    public function computeAggregateStatus(array $entry): string
    {
        $recipientEntries = array_values($entry['recipients'] ?? []);
        $normalized = array_map(fn ($item) => $this->normalizeDisplayStatus(
            (string) ($item['status'] ?? 'pending'),
            (bool) ($item['is_expired'] ?? false),
            $item['user_response'] ?? null,
        ), $recipientEntries);

        if (in_array('cancelled', $normalized, true)) {
            return 'cancelled';
        }
        if (in_array('expired', $normalized, true)) {
            return 'expired';
        }
        if (in_array('rejected', $normalized, true)) {
            return 'rejected';
        }
        if (count($normalized) > 0 && count(array_filter($normalized, fn ($s) => $s === 'closed')) === count($normalized)) {
            return 'closed';
        }
        if (count($normalized) === 2 && count(array_filter($normalized, fn ($s) => $s === 'accepted')) === 2) {
            return 'accepted';
        }

        return 'pending';
    }

    public function normalizeDisplayStatus(string $status, bool $isExpired, ?string $userResponse = null): string
    {
        if ($isExpired || $status === Proposition::STATUS_EXPIRED) {
            return 'expired';
        }
        if ($status === Proposition::STATUS_CLOSED) {
            return 'closed';
        }
        if ($status === Proposition::STATUS_CANCELLED) {
            return 'cancelled';
        }
        if ($userResponse === Proposition::STATUS_INTERESTED || $userResponse === Proposition::STATUS_ACCEPTED
            || $status === Proposition::STATUS_INTERESTED || $status === Proposition::STATUS_ACCEPTED) {
            return 'accepted';
        }
        if ($userResponse === Proposition::STATUS_NOT_INTERESTED || $status === Proposition::STATUS_NOT_INTERESTED) {
            return 'rejected';
        }

        return 'pending';
    }

    /**
     * @param  array<int, array<string, mixed>>  $groups
     * @return array<int, array<string, mixed>>
     */
    public function filterGroupsByStatus(array $groups, ?string $statusFilter): array
    {
        if ($statusFilter === null || $statusFilter === '' || $statusFilter === 'all') {
            return $groups;
        }

        return array_values(array_filter(
            $groups,
            fn ($entry) => ($entry['aggregate_status'] ?? 'pending') === $statusFilter
        ));
    }

    public function mapUserSummary(?User $user, bool $fullProfile = false): ?array
    {
        if (! $user) {
            return null;
        }

        $base = [
            'id' => $user->id,
            'name' => $user->name,
            'username' => $user->username,
        ];

        if (! $fullProfile) {
            return array_merge($base, [
                'assigned_matchmaker_id' => $user->assigned_matchmaker_id ?? null,
                'profile' => $user->relationLoaded('profile') ? $user->profile : null,
            ]);
        }

        return array_merge($base, [
            'phone' => $user->phone ?? null,
            'gender' => $user->gender ?? null,
            'status' => $user->status ?? null,
            'assigned_matchmaker_id' => $user->assigned_matchmaker_id ?? null,
            'profile' => $user->relationLoaded('profile') ? $user->profile : null,
        ]);
    }
}
