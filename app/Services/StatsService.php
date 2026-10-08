<?php

namespace App\Services;

use App\Models\Agency;
use App\Models\Proposition;
use App\Models\Rdv;
use App\Models\User;
use App\Models\UserAssignment;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

/**
 * Monthly KPI Statistics Service
 *
 * PRODUCT DECISIONS (documented 2026-05-15):
 *
 * 1. RESET SEMANTICS
 *    "Reset" means the month selector defaults to the current month.
 *    No data is ever deleted. Historical months are accessible by navigating back.
 *    Queried month = events/status-changes between the 1st and last day of the selected month.
 *
 * 2. MATCH DEFINITION
 *    A "Match" = an Rdv record where status = 'reussi' (Rdv::STATUS_REUSSI).
 *    Proposition acceptance ("interested"/"accepted") is NOT counted as a match.
 *    The match timestamp is the updated_at of the Rdv when it reached 'reussi' status.
 *    A tooltip in the UI reads: "RDV marqué réussi — les deux personnes se sont rencontrées avec succès."
 *
 * 3. TRANSFER ATTRIBUTION
 *    Prospects "new_this_month" counts open assignments (unassigned_at IS NULL) whose
 *    assigned_at falls in the selected month. If a prospect is reassigned mid-month, the
 *    old matchmaker's monthly new count decreases and the new matchmaker is credited
 *    from the transfer date (new open row). "total_active" reflects current
 *    assigned_matchmaker_id (live workload today).
 *    A UI tooltip reads: "Les statistiques reflètent le conseiller actuellement assigné."
 *
 * 4. MEMBER VALIDATION (new_this_month vs total_active)
 *    Both numbers count users whose current status is still 'member'.
 *    "new_this_month" = members approved in the selected month (approved_at).
 *    Promoting a member to client or client_expire removes them from this card.
 *    "total_active" = live members regardless of approval month.
 *
 * PER-METRIC SHAPE (returned by each getter):
 *   [
 *     'new_this_month' => int,   events in selected month
 *     'total_active'   => int,   live workload regardless of month
 *     'vs_last_month'  => int,   signed delta (new_this_month - prev month new_this_month)
 *     'target'         => ?int,  from MonthlyObjective, null if none set
 *   ]
 *
 * SCOPING RULES:
 *   matchmaker  → assigned_matchmaker_id = viewer id
 *   manager     → personal scope (same as matchmaker) OR agency scope (agency_id aggregate)
 *   admin       → platform-wide, optionally filtered by agency and/or matchmaker
 */
class StatsService
{
    /** Cache TTL in seconds (15 minutes) */
    private const CACHE_TTL = 900;

    /**
     * Return full KPI dashboard payload for the given viewer and scope.
     *
     * @param  User    $viewer       The authenticated staff member
     * @param  int     $month        1-12
     * @param  int     $year         Four-digit year
     * @param  string  $scope        'personal' | 'agency' | 'platform'
     * @param  int|null $agencyId    Admin/manager filter
     * @param  int|null $matchmakerId Admin/manager filter
     */
    public function getDashboardStats(
        User $viewer,
        int $month,
        int $year,
        string $scope = 'personal',
        ?int $agencyId = null,
        ?int $matchmakerId = null
    ): array {
        $cacheKey = $this->cacheKey($viewer, $scope, $month, $year, $agencyId, $matchmakerId);

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use (
            $viewer, $month, $year, $scope, $agencyId, $matchmakerId
        ) {
            return $this->compute($viewer, $month, $year, $scope, $agencyId, $matchmakerId);
        });
    }

    /**
     * Compute stats without cache — used internally and in tests.
     */
    public function compute(
        User $viewer,
        int $month,
        int $year,
        string $scope,
        ?int $agencyId,
        ?int $matchmakerId
    ): array {
        [$start, $end] = $this->monthBounds($month, $year);
        [$prevStart, $prevEnd] = $this->monthBounds(
            $month === 1 ? 12 : $month - 1,
            $month === 1 ? $year - 1 : $year
        );

        // Resolve the effective matchmaker ID(s) to scope queries
        $effectiveMatchmakerIds = $this->resolveMatchmakerIds($viewer, $scope, $agencyId, $matchmakerId);
        $singleMatchmakerId = count($effectiveMatchmakerIds) === 1 ? $effectiveMatchmakerIds[0] : null;

        $targets = $this->loadTargets($viewer, $scope, $month, $year, $agencyId, $matchmakerId);

        return [
            'prospects'    => $this->prospectStats($effectiveMatchmakerIds, $start, $end, $prevStart, $prevEnd, $targets),
            'membres'      => $this->memberStats($effectiveMatchmakerIds, $start, $end, $prevStart, $prevEnd, $targets),
            'clients'      => $this->clientStats($effectiveMatchmakerIds, $start, $end, $prevStart, $prevEnd, $targets),
            'propositions' => $this->propositionStats($effectiveMatchmakerIds, $start, $end, $prevStart, $prevEnd, $targets),
            'rdvs'         => $this->rdvStats($effectiveMatchmakerIds, $start, $end, $prevStart, $prevEnd, $targets),
            'matchs'       => $this->matchStats($effectiveMatchmakerIds, $start, $end, $prevStart, $prevEnd, $targets),
        ];
    }

    // -------------------------------------------------------------------------
    // Per-metric computations
    // -------------------------------------------------------------------------

    private function prospectStats(array $mmIds, Carbon $start, Carbon $end, Carbon $prevStart, Carbon $prevEnd, array $targets): array
    {
        // new_this_month: open assignments that started in the selected month (reassign
        // closes the old row so the previous matchmaker's monthly new count decreases).
        $new = UserAssignment::whereIn('matchmaker_id', $mmIds)
            ->whereNull('unassigned_at')
            ->whereBetween('assigned_at', [$start, $end])
            ->whereHas('user', fn ($q) => $q->role('user')->where('status', 'prospect'))
            ->distinct('user_id')
            ->count('user_id');

        $prevNew = UserAssignment::whereIn('matchmaker_id', $mmIds)
            ->whereNull('unassigned_at')
            ->whereBetween('assigned_at', [$prevStart, $prevEnd])
            ->whereHas('user', fn ($q) => $q->role('user')->where('status', 'prospect'))
            ->distinct('user_id')
            ->count('user_id');

        // total_active: live workload — current assignee from users table
        $total = User::role('user')
            ->whereIn('assigned_matchmaker_id', $mmIds)
            ->where('status', 'prospect')
            ->count();

        return $this->metric($new, $total, $new - $prevNew, $targets['prospects'] ?? null);
    }

    private function memberStats(array $mmIds, Carbon $start, Carbon $end, Carbon $prevStart, Carbon $prevEnd, array $targets): array
    {
        $scope = fn () => User::role('user')->where(function ($q) use ($mmIds) {
            $q->whereIn('assigned_matchmaker_id', $mmIds)
                ->orWhereIn('validated_by_manager_id', $mmIds);
        });

        // Only people who are still members. Promoting a member to client removes them.
        $monthlyBase = $scope()
            ->where('status', 'member')
            ->whereNotNull('approved_at');

        $new = (clone $monthlyBase)->whereBetween('approved_at', [$start, $end])->count();

        $prevNew = (clone $monthlyBase)->whereBetween('approved_at', [$prevStart, $prevEnd])->count();

        $total = $scope()->where('status', 'member')->count();

        return $this->metric($new, $total, $new - $prevNew, $targets['membres'] ?? null);
    }

    private function clientStats(array $mmIds, Carbon $start, Carbon $end, Carbon $prevStart, Carbon $prevEnd, array $targets): array
    {
        $base = User::role('user')->where(function ($q) use ($mmIds) {
            $q->whereIn('assigned_matchmaker_id', $mmIds)
                ->orWhereIn('validated_by_manager_id', $mmIds);
        });

        // A user "became client" this month = their status is 'client' and they were
        // approved (or transitioned) within the month. We approximate via approved_at
        // which aligns with ObjectiveMetricsService patterns in the existing codebase.
        $new = (clone $base)->where('status', 'client')
            ->whereBetween('approved_at', [$start, $end])
            ->count();

        $prevNew = (clone $base)->where('status', 'client')
            ->whereBetween('approved_at', [$prevStart, $prevEnd])
            ->count();

        $total = (clone $base)->where('status', 'client')->count();

        return $this->metric($new, $total, $new - $prevNew, $targets['clients'] ?? null);
    }

    private function propositionStats(array $mmIds, Carbon $start, Carbon $end, Carbon $prevStart, Carbon $prevEnd, array $targets): array
    {
        $base = Proposition::whereIn('matchmaker_id', $mmIds);

        $new = (clone $base)->whereBetween('created_at', [$start, $end])->count();

        $prevNew = (clone $base)->whereBetween('created_at', [$prevStart, $prevEnd])->count();

        // "Active" = propositions that are still open (not terminal)
        $terminalStatuses = [
            Proposition::STATUS_NOT_INTERESTED,
            Proposition::STATUS_CANCELLED,
            Proposition::STATUS_EXPIRED,
            Proposition::STATUS_CLOSED,
        ];
        $total = (clone $base)->whereNotIn('status', $terminalStatuses)->count();

        return $this->metric($new, $total, $new - $prevNew, $targets['propositions'] ?? null);
    }

    private function rdvStats(array $mmIds, Carbon $start, Carbon $end, Carbon $prevStart, Carbon $prevEnd, array $targets): array
    {
        $base = Rdv::whereIn('matchmaker_id', $mmIds);

        $new = (clone $base)->whereBetween('created_at', [$start, $end])->count();

        $prevNew = (clone $base)->whereBetween('created_at', [$prevStart, $prevEnd])->count();

        // "Active" = all RDVs not in a terminal status (reussi or echec)
        $total = (clone $base)->whereNotIn('status', [Rdv::STATUS_REUSSI, Rdv::STATUS_ECHEC])->count();

        return $this->metric($new, $total, $new - $prevNew, $targets['rdv'] ?? null);
    }

    private function matchStats(array $mmIds, Carbon $start, Carbon $end, Carbon $prevStart, Carbon $prevEnd, array $targets): array
    {
        // Match = Rdv with status 'reussi' where the status was set in the selected month.
        // We use updated_at as the timestamp of when the Rdv reached 'reussi'.
        $base = Rdv::whereIn('matchmaker_id', $mmIds)->where('status', Rdv::STATUS_REUSSI);

        $new = (clone $base)->whereBetween('updated_at', [$start, $end])->count();

        $prevNew = (clone $base)->whereBetween('updated_at', [$prevStart, $prevEnd])->count();

        $total = (clone $base)->count();

        return $this->metric($new, $total, $new - $prevNew, $targets['match'] ?? null);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private function metric(int $new, int $total, int $delta, ?int $target): array
    {
        return [
            'new_this_month' => $new,
            'total_active'   => $total,
            'vs_last_month'  => $delta,
            'target'         => $target,
        ];
    }

    /**
     * Resolve which matchmaker IDs to scope queries to, based on role/scope/filters.
     *
     * @return int[]
     */
    private function resolveMatchmakerIds(User $viewer, string $scope, ?int $agencyId, ?int $matchmakerId): array
    {
        // Admin: explicit matchmaker filter takes priority, then agency, then all
        if ($viewer->hasRole('admin')) {
            if ($matchmakerId) {
                return [$matchmakerId];
            }
            if ($agencyId) {
                return User::whereHas('roles', fn ($q) => $q->whereIn('name', ['matchmaker', 'manager']))
                    ->where('agency_id', $agencyId)
                    ->where('approval_status', 'approved')
                    ->pluck('id')
                    ->toArray();
            }
            // Platform-wide: include all matchmakers and managers
            return User::whereHas('roles', fn($q) => $q->whereIn('name', ['matchmaker', 'manager']))
                ->where('approval_status', 'approved')
                ->pluck('id')
                ->toArray();
        }

        // Manager agency scope: aggregate the agency's matchmakers
        if ($viewer->hasRole('manager') && $scope === 'agency') {
            if ($matchmakerId) {
                return [$matchmakerId];
            }
            $agencyId = $agencyId ?? $viewer->agency_id;
            $ids = User::role('matchmaker')
                ->where('agency_id', $agencyId)
                ->where('approval_status', 'approved')
                ->pluck('id')
                ->toArray();
            // Also include the manager themselves (they may directly assign users)
            $ids[] = $viewer->id;
            return array_unique($ids);
        }

        // Personal scope (matchmaker or manager-as-matchmaker)
        return [$viewer->id];
    }

    /**
     * Load MonthlyObjective targets for the given context.
     * Returns a flat array: ['membres' => ?int, 'rdv' => ?int, 'match' => ?int]
     *
     * @return array<string, int|null>
     */
    private function loadTargets(User $viewer, string $scope, int $month, int $year, ?int $agencyId, ?int $matchmakerId): array
    {
        $objective = null;

        if ($viewer->hasRole('admin')) {
            if ($matchmakerId) {
                $objective = ObjectiveMetricsService::resolveObjectiveForUser($matchmakerId, $month, $year);
            } elseif ($agencyId) {
                $objective = ObjectiveMetricsService::sumObjectivesForAgency($agencyId, $month, $year);
            }
            // Platform-wide (no agency/matchmaker filter): no aggregate target
        } elseif ($scope === 'agency' && $viewer->hasRole('manager')) {
            if ($viewer->agency_id) {
                $objective = ObjectiveMetricsService::sumObjectivesForAgency((int) $viewer->agency_id, $month, $year);
            }
        } else {
            $objective = ObjectiveMetricsService::resolveObjectiveForUser($viewer->id, $month, $year);
        }

        if (! $objective) {
            return [];
        }

        return [
            'membres' => $objective->target_membres ?: null,
            'rdv'     => $objective->target_rdv ?: null,
            'match'   => $objective->target_match ?: null,
        ];
    }

    private function monthBounds(int $month, int $year): array
    {
        $start = Carbon::create($year, $month, 1)->startOfMonth();
        $end   = Carbon::create($year, $month, 1)->endOfMonth();
        return [$start, $end];
    }

    /**
     * Cache keys are scope-based (not viewer-based): the same filters/month produce
     * identical stats regardless of which admin or manager loads them.
     */
    private function cacheKey(User $viewer, string $scope, int $month, int $year, ?int $agencyId, ?int $matchmakerId): string
    {
        $period = sprintf('%d-%02d', $year, $month);

        return match ($scope) {
            'personal' => sprintf('kpi_stats:v2:personal:mm%d:%s', $viewer->id, $period),
            'agency' => sprintf(
                'kpi_stats:v2:agency:a%d:%s:m%d',
                $agencyId ?? $viewer->agency_id ?? 0,
                $period,
                $matchmakerId ?? 0
            ),
            'platform' => sprintf(
                'kpi_stats:v2:platform:%s:a%d:m%d',
                $period,
                $agencyId ?? 0,
                $matchmakerId ?? 0
            ),
            default => throw new \InvalidArgumentException("Unknown KPI scope: {$scope}"),
        };
    }

    /**
     * Invalidate all cached stats affected by a change to this matchmaker's data.
     * Called from model observers when users, propositions, or rdvs change.
     */
    public static function invalidateForMatchmaker(int $matchmakerId, ?int $explicitAgencyId = null): void
    {
        $agencyId = $explicitAgencyId
            ?? User::whereKey($matchmakerId)->value('agency_id');

        $now = Carbon::now();
        for ($offset = 0; $offset <= 2; $offset++) {
            $date = $now->copy()->subMonths($offset);
            $period = sprintf('%d-%02d', $date->year, $date->month);

            Cache::forget(sprintf('kpi_stats:v2:personal:mm%d:%s', $matchmakerId, $period));

            Cache::forget(sprintf('kpi_stats:v2:platform:%s:a0:m0', $period));
            Cache::forget(sprintf('kpi_stats:v2:platform:%s:a0:m%d', $period, $matchmakerId));

            if ($agencyId) {
                Cache::forget(sprintf('kpi_stats:v2:agency:a%d:%s:m0', $agencyId, $period));
                Cache::forget(sprintf('kpi_stats:v2:agency:a%d:%s:m%d', $agencyId, $period, $matchmakerId));
                Cache::forget(sprintf('kpi_stats:v2:platform:%s:a%d:m0', $period, $agencyId));
                Cache::forget(sprintf('kpi_stats:v2:platform:%s:a%d:m%d', $period, $agencyId, $matchmakerId));
            }
        }
    }

    /**
     * Load the list of matchmakers for admin/manager filter dropdowns.
     *
     * @return array<array{id: int, name: string, agency_id: int|null}>
     */
    public static function getMatchmakerList(?int $agencyId = null): array
    {
        return User::whereHas('roles', fn ($q) => $q->whereIn('name', ['matchmaker', 'manager']))
            ->where('approval_status', 'approved')
            ->when($agencyId, fn ($q) => $q->where('agency_id', $agencyId))
            ->with('roles')
            ->select('id', 'name', 'agency_id')
            ->orderBy('name')
            ->get()
            ->map(fn ($u) => [
                'id' => $u->id,
                'name' => $u->name,
                'agency_id' => $u->agency_id,
                'role' => $u->hasRole('manager') ? 'manager' : 'matchmaker',
            ])
            ->toArray();
    }
}
