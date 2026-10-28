<?php

namespace App\Services;

use App\Models\Agency;
use App\Models\Proposition;
use App\Models\PropositionRequest;
use App\Models\Rdv;
use App\Models\User;
use App\Http\Controllers\PropositionRequestController;
use App\Policies\UserProfileActionPolicy;
use Illuminate\Support\Facades\Schema;

/**
 * Builds match rows for matchmakers (match results page + member profile "À proposer").
 */
class MatchmakingResultsPayloadService
{
    /** Identity-document fields never sent with a match card (the cards do not use them). */
    public const SENSITIVE_PROFILE_FIELDS = ['cin', 'cin_hash', 'identity_card_front_path', 'identity_card_front_hash'];

    /** Profile data for a match card, without identity-document fields. */
    public static function cardProfile($profile): array
    {
        return $profile ? (clone $profile)->makeHidden(self::SENSITIVE_PROFILE_FIELDS)->toArray() : [];
    }

    /** Flag shown on a searched profile that cannot receive a proposition. */
    public const RESTRICTION_LABELS = [
        'deactivated' => 'Compte désactivé — proposition impossible',
        'rejected' => 'Prospect rejeté — proposition impossible',
        'prospect' => 'Prospect non validé — proposition impossible',
        'incomplete' => 'Profil incomplet — proposition impossible',
        'not_member' => 'Statut non éligible — proposition impossible',
        'same_gender' => 'Même sexe — proposition impossible',
    ];

    /**
     * Server-side rule for sending a proposition / request to $candidate: never to a prospect (validated or
     * rejected) or a deactivated account. Returns the reason code, or null when allowed.
     */
    public static function propositionBlockedFor(?User $candidate): ?string
    {
        if (! $candidate) {
            return null;
        }
        if (UserProfileActionPolicy::isDeactivated($candidate)) {
            return 'deactivated';
        }
        if ($candidate->status === 'prospect') {
            return UserProfileActionPolicy::isRejectedProspect($candidate) ? 'rejected' : 'prospect';
        }

        return null;
    }

    /**
     * Why $candidate cannot receive a proposition with $userA (same rules as the engine's candidates), or null.
     *
     * @return array{code: string, label: string}|null
     */
    public static function candidateRestriction(User $candidate, User $userA): ?array
    {
        if (UserProfileActionPolicy::isDeactivated($candidate)) {
            $code = 'deactivated';
        } elseif (UserProfileActionPolicy::isRejectedProspect($candidate)) {
            $code = 'rejected';
        } else {
            $code = PropositionRequestController::referenceIneligibility($candidate, $userA);
        }

        return $code === null ? null : ['code' => $code, 'label' => self::RESTRICTION_LABELS[$code]];
    }

    /**
     * Options for the results "agency" and "matchmaker" filters: every agency and every approved
     * matchmaker / manager (profiles can be assigned to either), sorted by name.
     *
     * @return array{agencies: array<int, array{id: int, name: string}>, matchmakers: array<int, array{id: int, name: string}>}
     */
    public static function filterOptions(): array
    {
        return [
            'agencies' => Agency::orderBy('name')->get(['id', 'name'])
                ->map(static fn ($a) => ['id' => (int) $a->id, 'name' => $a->name])->values()->all(),
            'matchmakers' => User::query()
                ->whereHas('roles', static fn ($q) => $q->whereIn('name', ['matchmaker', 'manager']))
                ->where('approval_status', 'approved')
                ->orderBy('name')
                ->get(['id', 'name'])
                ->map(static fn ($u) => ['id' => (int) $u->id, 'name' => $u->name])->values()->all(),
        ];
    }

    /**
     * Who follows each match and in which agency (the profile's agency, else its matchmaker's), keyed by user id.
     *
     * @param  array<int, array{user: User}>  $matches
     * @return array<int, array{assigned_matchmaker: ?array, isAssignedToMe: bool, agency: ?array}>
     */
    public static function assignmentInfo(array $matches, User $me): array
    {
        $agencyIdFor = static fn (User $user) => $user->agency_id ?: $user->assignedMatchmaker?->agency_id;
        $agencyIds = array_values(array_unique(array_filter(array_map(static fn ($m) => $agencyIdFor($m['user']), $matches))));
        $agencyNames = $agencyIds === [] ? collect() : Agency::whereIn('id', $agencyIds)->pluck('name', 'id');

        $info = [];
        foreach ($matches as $match) {
            $user = $match['user'];
            $matchmaker = $user->assignedMatchmaker;
            $agencyId = $agencyIdFor($user);
            $info[(int) $user->id] = [
                'assigned_matchmaker' => $matchmaker ? [
                    'id' => $matchmaker->id,
                    'name' => $matchmaker->name,
                    'username' => $matchmaker->username,
                ] : null,
                'isAssignedToMe' => (int) $user->assigned_matchmaker_id === (int) $me->id,
                'agency' => $agencyId && isset($agencyNames[$agencyId]) ? ['id' => (int) $agencyId, 'name' => $agencyNames[$agencyId]] : null,
            ];
        }

        return $info;
    }

    /**
     * @param  array<int, array{user: User, profile: mixed, score: float|int, scoreDetails: array, completeness: float|int}>  $matches
     * @return array<int, array<string, mixed>>
     */
    public static function formatMatchesForMatchmaker(array $matches, User $me, int $referenceUserId): array
    {
        $compatibleIds = array_map(static fn ($m) => $m['user']->id, $matches);
        $assignmentInfo = self::assignmentInfo($matches, $me);

        $userAHasActiveProposition = Proposition::hasActiveProposition((int) $referenceUserId);
        $compatibleRecipientActiveMap = [];
        foreach ($compatibleIds as $cid) {
            $compatibleRecipientActiveMap[(int) $cid] = Proposition::hasActiveProposition((int) $cid);
        }
        $compatibleHasBlockingRdvMap = [];
        foreach ($compatibleIds as $cid) {
            $compatibleHasBlockingRdvMap[(int) $cid] = Rdv::query()
                ->whereIn('status', [Rdv::STATUS_EN_COURS, Rdv::STATUS_REUSSI])
                ->where(function ($q) use ($referenceUserId, $cid) {
                    $q->where('reference_user_id', $referenceUserId)
                        ->orWhere('compatible_user_id', $referenceUserId)
                        ->orWhere('reference_user_id', $cid)
                        ->orWhere('compatible_user_id', $cid);
                })
                ->exists();
        }

        $statusMap = [];
        $requestMetaMap = [];
        if ($compatibleIds !== []) {
            $requestQuery = PropositionRequest::query()
                ->where(function ($q) use ($me) {
                    $q->where('from_matchmaker_id', $me->id)
                        ->orWhere('to_matchmaker_id', $me->id);
                })
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
            // Bidirectional lookup: rows may exist as either (ref=A, comp=B) or (ref=B, comp=A) for
            // the same conceptual pair when the matchmaker started from the opposite profile's
            // match-results page. Without this, the status map disagrees with `acceptedBothQuery`
            // (which is bidirectional) and the UI loses the proposition status badge for reverse rows.
            $latestPropositions = Proposition::query()
                ->where('matchmaker_id', $me->id)
                ->where(function ($q) use ($referenceUserId, $compatibleIds) {
                    $q->where(function ($forward) use ($referenceUserId, $compatibleIds) {
                        $forward->where('reference_user_id', $referenceUserId)
                            ->whereIn('compatible_user_id', $compatibleIds);
                    })->orWhere(function ($reverse) use ($referenceUserId, $compatibleIds) {
                        $reverse->where('compatible_user_id', $referenceUserId)
                            ->whereIn('reference_user_id', $compatibleIds);
                    });
                })
                ->orderByDesc('created_at')
                ->get(['reference_user_id', 'compatible_user_id', 'status', 'created_at']);

            foreach ($latestPropositions as $proposition) {
                $counterpartId = (int) $proposition->reference_user_id === $referenceUserId
                    ? (int) $proposition->compatible_user_id
                    : ((int) $proposition->compatible_user_id === $referenceUserId
                        ? (int) $proposition->reference_user_id
                        : null);
                if ($counterpartId === null) {
                    continue;
                }
                if (! array_key_exists($counterpartId, $propositionStatusMap)) {
                    $isExpired = $proposition->status === 'expired'
                        || ($proposition->status === 'pending'
                            && $proposition->created_at
                            && $proposition->created_at->lt(now()->subDays(7)));

                    $propositionStatusMap[$counterpartId] = $isExpired ? 'expired' : $proposition->status;
                }
            }
        }

        /** @var array<int, array{cancellable_proposition: array{id: int}|null, pending_response_proposition: array{id: int}|null}> $pairActions */
        $pairActions = [];
        if ($compatibleIds !== []) {
            // Bidirectional, mirroring the status map and `acceptedBothQuery`. We key the action map
            // by the "counterpart" user id (the one in $compatibleIds), regardless of which column
            // (reference_user_id or compatible_user_id) actually holds it on the row.
            // Not scoped to matchmaker_id: a matchmaker who manages one of the parties
            // (recipient/reference/compatible) may act on a proposition created by another
            // matchmaker. Authorization is enforced per-row below via $canManagePair.
            $pairPropositions = Proposition::query()
                ->where(function ($q) use ($referenceUserId, $compatibleIds) {
                    $q->where(function ($forward) use ($referenceUserId, $compatibleIds) {
                        $forward->where('reference_user_id', $referenceUserId)
                            ->whereIn('compatible_user_id', $compatibleIds);
                    })->orWhere(function ($reverse) use ($referenceUserId, $compatibleIds) {
                        $reverse->where('compatible_user_id', $referenceUserId)
                            ->whereIn('reference_user_id', $compatibleIds);
                    });
                })
                ->whereNotIn('status', [Proposition::STATUS_CANCELLED, Proposition::STATUS_CLOSED])
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
                $counterpartId = (int) $prop->reference_user_id === $referenceUserId
                    ? (int) $prop->compatible_user_id
                    : ((int) $prop->compatible_user_id === $referenceUserId
                        ? (int) $prop->reference_user_id
                        : null);
                if ($counterpartId === null || ! isset($pairActions[$counterpartId])) {
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
                if ($prop->status === 'pending'
                    && $prop->responded_at === null
                    && $recipient
                    && (int) $recipient->assigned_matchmaker_id === $mmId
                    && $pairActions[$counterpartId]['pending_response_proposition'] === null) {
                    $pairActions[$counterpartId]['pending_response_proposition'] = ['id' => $prop->id];
                }
                if ($prop->canBeCancelledByMatchmaker() && $me->can('cancel', $prop)
                    && $pairActions[$counterpartId]['cancellable_proposition'] === null) {
                    $pairActions[$counterpartId]['cancellable_proposition'] = ['id' => $prop->id];
                }
            }
        }

        // Batch-compute both-sides-accepted and RDV-exists for the reference user against each compatible
        $mutualInterestedCompatIds = [];
        if ($compatibleIds !== []) {
            $acceptedBothQuery = Proposition::query()
                ->where('matchmaker_id', $me->id)
                ->where(function ($q) use ($referenceUserId, $compatibleIds) {
                    $q->where(function ($forward) use ($referenceUserId, $compatibleIds) {
                        $forward->where('reference_user_id', $referenceUserId)
                            ->whereIn('compatible_user_id', $compatibleIds);
                    })->orWhere(function ($reverse) use ($referenceUserId, $compatibleIds) {
                        $reverse->where('compatible_user_id', $referenceUserId)
                            ->whereIn('reference_user_id', $compatibleIds);
                    });
                })
                ->whereIn('status', [Proposition::STATUS_INTERESTED, Proposition::STATUS_ACCEPTED])
                ->get(['reference_user_id', 'compatible_user_id', 'recipient_user_id']);

            $refAcceptedSet = [];
            $compAcceptedSet = [];
            foreach ($acceptedBothQuery as $proposition) {
                $counterpartId = null;
                if ((int) $proposition->reference_user_id === $referenceUserId) {
                    $counterpartId = (int) $proposition->compatible_user_id;
                } elseif ((int) $proposition->compatible_user_id === $referenceUserId) {
                    $counterpartId = (int) $proposition->reference_user_id;
                }

                if ($counterpartId === null) {
                    continue;
                }

                if ((int) $proposition->recipient_user_id === $referenceUserId) {
                    $refAcceptedSet[$counterpartId] = true;
                }
                if ((int) $proposition->recipient_user_id === $counterpartId) {
                    $compAcceptedSet[$counterpartId] = true;
                }
            }

            foreach ($compatibleIds as $cid) {
                if (($refAcceptedSet[(int) $cid] ?? false) && ($compAcceptedSet[(int) $cid] ?? false)) {
                    $mutualInterestedCompatIds[$cid] = true;
                }
            }
        }

        $failedEchecCompatIds = [];
        $recreationAllowedCompatIds = [];
        if ($compatibleIds !== []) {
            $failedRdvs = Rdv::query()
                ->where(function ($q) use ($referenceUserId, $compatibleIds) {
                    $q->where(function ($forward) use ($referenceUserId, $compatibleIds) {
                        $forward->where('reference_user_id', $referenceUserId)
                            ->whereIn('compatible_user_id', $compatibleIds);
                    })->orWhere(function ($reverse) use ($referenceUserId, $compatibleIds) {
                        $reverse->where('compatible_user_id', $referenceUserId)
                            ->whereIn('reference_user_id', $compatibleIds);
                    });
                })
                ->where('status', Rdv::STATUS_ECHEC)
                ->get(['reference_user_id', 'compatible_user_id']);
            foreach ($failedRdvs as $rdv) {
                $counterpartId = (int) $rdv->reference_user_id === $referenceUserId
                    ? (int) $rdv->compatible_user_id
                    : ((int) $rdv->compatible_user_id === $referenceUserId ? (int) $rdv->reference_user_id : null);
                if ($counterpartId !== null) {
                    $failedEchecCompatIds[$counterpartId] = true;
                }
            }
            foreach (array_keys($failedEchecCompatIds) as $cid) {
                if (Proposition::pairRecreationBlockedByExternalPendingOrInterested((int) $referenceUserId, (int) $cid)) {
                    continue;
                }
                if (Rdv::hasInProgressRdvForUser((int) $referenceUserId) || Rdv::hasInProgressRdvForUser((int) $cid)) {
                    continue;
                }
                $recreationAllowedCompatIds[$cid] = true;
            }
        }

        $closedOnlyRecreationCompatIds = [];
        $bothAcceptedCompatIds = $mutualInterestedCompatIds;
        foreach ($compatibleIds as $cid) {
            if (isset($bothAcceptedCompatIds[$cid])) {
                continue;
            }
            if (! isset($failedEchecCompatIds[$cid]) || ! isset($recreationAllowedCompatIds[$cid])) {
                continue;
            }
            if (! Proposition::pairHasMutualClosedForMatchmaker((int) $me->id, (int) $referenceUserId, (int) $cid)) {
                continue;
            }
            $bothAcceptedCompatIds[$cid] = true;
            $closedOnlyRecreationCompatIds[$cid] = true;
        }

        $failedRdvIdForClosedRecreationCompat = [];
        foreach (array_keys($closedOnlyRecreationCompatIds) as $cid) {
            $rid = Rdv::query()
                ->where('status', Rdv::STATUS_ECHEC)
                ->where(function ($q) use ($referenceUserId, $cid) {
                    $q->where(function ($forward) use ($referenceUserId, $cid) {
                        $forward->where('reference_user_id', $referenceUserId)
                            ->where('compatible_user_id', $cid);
                    })->orWhere(function ($reverse) use ($referenceUserId, $cid) {
                        $reverse->where('reference_user_id', $cid)
                            ->where('compatible_user_id', $referenceUserId);
                    });
                })
                ->orderByDesc('id')
                ->value('id');
            if ($rid !== null) {
                $failedRdvIdForClosedRecreationCompat[(int) $cid] = (int) $rid;
            }
        }

        $rdvExistsCompatIds = [];
        $successfulRdvCompatIds = [];
        if (! empty($bothAcceptedCompatIds)) {
            $existingRdvs = Rdv::query()
                ->where(function ($q) use ($referenceUserId, $bothAcceptedCompatIds) {
                    $q->where(function ($forward) use ($referenceUserId, $bothAcceptedCompatIds) {
                        $forward->where('reference_user_id', $referenceUserId)
                            ->whereIn('compatible_user_id', array_keys($bothAcceptedCompatIds));
                    })->orWhere(function ($reverse) use ($referenceUserId, $bothAcceptedCompatIds) {
                        $reverse->where('compatible_user_id', $referenceUserId)
                            ->whereIn('reference_user_id', array_keys($bothAcceptedCompatIds));
                    });
                })
                ->whereIn('status', [Rdv::STATUS_EN_COURS, Rdv::STATUS_REUSSI])
                ->get(['reference_user_id', 'compatible_user_id']);
            foreach ($existingRdvs as $rdv) {
                $counterpartId = (int) $rdv->reference_user_id === $referenceUserId
                    ? (int) $rdv->compatible_user_id
                    : ((int) $rdv->compatible_user_id === $referenceUserId ? (int) $rdv->reference_user_id : null);
                if ($counterpartId !== null) {
                    $rdvExistsCompatIds[$counterpartId] = true;
                }
            }

            $successfulRdvCompatIds = Rdv::query()
                ->where(function ($q) use ($referenceUserId, $bothAcceptedCompatIds) {
                    $q->where(function ($forward) use ($referenceUserId, $bothAcceptedCompatIds) {
                        $forward->where('reference_user_id', $referenceUserId)
                            ->whereIn('compatible_user_id', array_keys($bothAcceptedCompatIds));
                    })->orWhere(function ($reverse) use ($referenceUserId, $bothAcceptedCompatIds) {
                        $reverse->where('compatible_user_id', $referenceUserId)
                            ->whereIn('reference_user_id', array_keys($bothAcceptedCompatIds));
                    });
                })
                ->where('status', Rdv::STATUS_REUSSI)
                ->get(['reference_user_id', 'compatible_user_id']);
            $successfulRdvMap = [];
            foreach ($successfulRdvCompatIds as $rdv) {
                $counterpartId = (int) $rdv->reference_user_id === $referenceUserId
                    ? (int) $rdv->compatible_user_id
                    : ((int) $rdv->compatible_user_id === $referenceUserId ? (int) $rdv->reference_user_id : null);
                if ($counterpartId !== null) {
                    $successfulRdvMap[$counterpartId] = true;
                }
            }
            $successfulRdvCompatIds = $successfulRdvMap;
        }

        return array_map(function ($match) use ($referenceUserId, $statusMap, $requestMetaMap, $propositionStatusMap, $userAHasActiveProposition, $compatibleRecipientActiveMap, $compatibleHasBlockingRdvMap, $pairActions, $mutualInterestedCompatIds, $closedOnlyRecreationCompatIds, $failedRdvIdForClosedRecreationCompat, $bothAcceptedCompatIds, $rdvExistsCompatIds, $successfulRdvCompatIds, $failedEchecCompatIds, $recreationAllowedCompatIds, $assignmentInfo) {
            $compatId = $match['user']->id;
            $requestMeta = $requestMetaMap[$compatId] ?? null;
            $canProposeFromRequest = ($requestMeta['status'] ?? null) === 'accepted';
            $actions = $pairActions[$compatId] ?? [
                'cancellable_proposition' => null,
                'pending_response_proposition' => null,
            ];

            $hasPastEchec = isset($failedEchecCompatIds[$compatId]);
            $recreationAllowed = isset($recreationAllowedCompatIds[$compatId]);
            $mutualInterested = isset($mutualInterestedCompatIds[$compatId]);
            $closedRecreation = isset($closedOnlyRecreationCompatIds[$compatId]);
            $bothSidesAccepted = ($mutualInterested && (! $hasPastEchec || $recreationAllowed))
                || $closedRecreation;
            $rdvExists = isset($rdvExistsCompatIds[$compatId]);
            $hasSuccessfulRdv = isset($successfulRdvCompatIds[$compatId]);
            $canCreateRdv = $bothSidesAccepted
                && ! $rdvExists
                && ! $hasSuccessfulRdv;
            $isRecreationContext = $canCreateRdv && $hasPastEchec;
            $canPropose = ! $userAHasActiveProposition
                && ! ($compatibleRecipientActiveMap[$compatId] ?? false)
                && ! ($compatibleHasBlockingRdvMap[$compatId] ?? false);

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
                'assigned_matchmaker' => $assignmentInfo[$compatId]['assigned_matchmaker'],
                'isAssignedToMe' => $assignmentInfo[$compatId]['isAssignedToMe'],
                'agency' => $assignmentInfo[$compatId]['agency'],
                'profile' => self::cardProfile($match['profile']),
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
                'can_propose' => $canPropose,
                'has_active_proposition' => Proposition::pairMatchHasActiveProposition((int) $referenceUserId, (int) $compatId),
                'proposition' => Proposition::activeSnapshotForPair((int) $referenceUserId, (int) $compatId, (int) $compatId),
                'can_create_rdv' => $canCreateRdv,
                'is_recreation_context' => $isRecreationContext,
                'recreate_from_failed_rdv_id' => $failedRdvIdForClosedRecreationCompat[$compatId] ?? null,
                'rdv_exists' => $rdvExists,
            ];
        }, $matches);
    }
}
