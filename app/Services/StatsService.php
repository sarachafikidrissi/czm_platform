<?php

namespace App\Services;

use App\Models\Agency;
use App\Models\MonthlyObjective;
use App\Models\Proposition;
use App\Models\Rdv;
use App\Models\User;
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
 *    Stats credit the CURRENT assigned matchmaker (whoever holds assigned_matchmaker_id
 *    at the time the query runs). If a prospect is transferred mid-month, the receiving
 *    matchmaker gets credit from transfer date onward for live counts; historical
 *    new_this_month counts follow created_at which reflects the original assignment.
 *    A UI tooltip reads: "Les statistiques reflètent le conseiller actuellement assigné."
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
        $base = User::role('user')->whereIn('assigned_matchmaker_id', $mmIds);

        $new = (clone $base)->where('status', 'prospect')
            ->whereBetween('created_at', [$start, $end])
            ->count();

        $prevNew = (clone $base)->where('status', 'prospect')
            ->whereBetween('created_at', [$prevStart, $prevEnd])
            ->count();

        $total = (clone $base)->where('status', 'prospect')->count();

        return $this->metric($new, $total, $new - $prevNew, $targets['prospects'] ?? null);
    }

    private function memberStats(array $mmIds, Carbon $start, Carbon $end, Carbon $prevStart, Carbon $prevEnd, array $targets): array
    {
        $memberStatuses = ['member', 'client', 'client_expire'];
        $base = User::role('user')->whereIn('assigned_matchmaker_id', $mmIds);

        $new = (clone $base)->whereIn('status', $memberStatuses)
            ->whereBetween('approved_at', [$start, $end])
            ->count();

        $prevNew = (clone $base)->whereIn('status', $memberStatuses)
            ->whereBetween('approved_at', [$prevStart, $prevEnd])
            ->count();

        $total = (clone $base)->whereIn('status', $memberStatuses)->count();

        return $this->metric($new, $total, $new - $prevNew, $targets['membres'] ?? null);
    }

    private function clientStats(array $mmIds, Carbon $start, Carbon $end, Carbon $prevStart, Carbon $prevEnd, array $targets): array
    {
        $base = User::role('user')->whereIn('assigned_matchmaker_id', $mmIds);

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

        // "Active" in month = same as new (scheduled this month)
        $total = $new;

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
                return User::role('matchmaker')
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
            // Admin with matchmaker filter: load that matchmaker's objective
            if ($matchmakerId) {
                $objective = MonthlyObjective::where('user_id', $matchmakerId)
                    ->where('month', $month)->where('year', $year)
                    ->whereNull('agency_id')
                    ->first();
            } elseif ($agencyId) {
                $objective = MonthlyObjective::where('agency_id', $agencyId)
                    ->where('role_type', MonthlyObjective::ROLE_TYPE_AGENCY)
                    ->where('month', $month)->where('year', $year)
                    ->first();
            }
            // Platform-wide: no single objective, return nulls
        } elseif ($scope === 'agency' && $viewer->hasRole('manager')) {
            $objective = MonthlyObjective::where('agency_id', $viewer->agency_id)
                ->where('role_type', MonthlyObjective::ROLE_TYPE_AGENCY)
                ->where('month', $month)->where('year', $year)
                ->first();
        } else {
            // Personal scope
            $objective = MonthlyObjective::where('user_id', $viewer->id)
                ->whereNull('agency_id')
                ->where('month', $month)->where('year', $year)
                ->first();
        }

        if (!$objective) {
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
            'personal' => sprintf('kpi_stats:personal:mm%d:%s', $viewer->id, $period),
            'agency' => sprintf(
                'kpi_stats:agency:a%d:%s:m%d',
                $agencyId ?? $viewer->agency_id ?? 0,
                $period,
                $matchmakerId ?? 0
            ),
            'platform' => sprintf(
                'kpi_stats:platform:%s:a%d:m%d',
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
    public static function invalidateForMatchmaker(int $matchmakerId): void
    {
        $agencyId = User::whereKey($matchmakerId)->value('agency_id');

        $now = Carbon::now();
        for ($offset = 0; $offset <= 2; $offset++) {
            $date = $now->copy()->subMonths($offset);
            $period = sprintf('%d-%02d', $date->year, $date->month);

            Cache::forget(sprintf('kpi_stats:personal:mm%d:%s', $matchmakerId, $period));

            Cache::forget(sprintf('kpi_stats:platform:%s:a0:m0', $period));
            Cache::forget(sprintf('kpi_stats:platform:%s:a0:m%d', $period, $matchmakerId));

            if ($agencyId) {
                Cache::forget(sprintf('kpi_stats:agency:a%d:%s:m0', $agencyId, $period));
                Cache::forget(sprintf('kpi_stats:agency:a%d:%s:m%d', $agencyId, $period, $matchmakerId));
                Cache::forget(sprintf('kpi_stats:platform:%s:a%d:m0', $period, $agencyId));
                Cache::forget(sprintf('kpi_stats:platform:%s:a%d:m%d', $period, $agencyId, $matchmakerId));
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
        return User::role('matchmaker')
            ->where('approval_status', 'approved')
            ->when($agencyId, fn($q) => $q->where('agency_id', $agencyId))
            ->select('id', 'name', 'agency_id')
            ->orderBy('name')
            ->get()
            ->map(fn($u) => ['id' => $u->id, 'name' => $u->name, 'agency_id' => $u->agency_id])
            ->toArray();
    }
}
