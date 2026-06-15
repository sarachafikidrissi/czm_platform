<?php

namespace App\Services;

use App\Models\Bill;
use App\Models\MonthlyObjective;
use App\Models\Rdv;
use App\Models\User;
use Carbon\Carbon;

/**
 * Realized totals and objective resolution for the objectives module (shared by controllers).
 */
class ObjectiveMetricsService
{
    /**
     * @return array{ventes: float|int, membres: int, rdv: int, match: int}
     */
    public static function calculateRealizedForMatchmaker(int $matchmakerId, int $month, int $year): array
    {
        $startDate = Carbon::create($year, $month, 1)->startOfMonth();
        $endDate = Carbon::create($year, $month, 1)->endOfMonth();

        $ventes = Bill::where('matchmaker_id', $matchmakerId)
            ->where('status', 'paid')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->sum('total_amount');

        $membres = User::role('user')
            ->where('assigned_matchmaker_id', $matchmakerId)
            ->whereNotNull('approved_at')
            ->whereBetween('approved_at', [$startDate, $endDate])
            ->count();

        $rdv = Rdv::where('matchmaker_id', $matchmakerId)
            ->whereBetween('created_at', [$startDate, $endDate])
            ->count();

        $match = Rdv::where('matchmaker_id', $matchmakerId)
            ->where('status', Rdv::STATUS_REUSSI)
            ->whereBetween('updated_at', [$startDate, $endDate])
            ->count();

        return [
            'ventes' => (float) $ventes,
            'membres' => (int) $membres,
            'rdv' => (int) $rdv,
            'match' => (int) $match,
        ];
    }

    /**
     * Agency aggregate: ventes from all matchmakers + managers in the agency; membres assigned to MMs or validated by managers.
     *
     * @return array{ventes: float|int, membres: int, rdv: int, match: int}
     */
    public static function calculateRealizedForAgency(int $managerId, int $month, int $year): array
    {
        $startDate = Carbon::create($year, $month, 1)->startOfMonth();
        $endDate = Carbon::create($year, $month, 1)->endOfMonth();

        $manager = User::find($managerId);
        if (! $manager || ! $manager->agency_id) {
            return [
                'ventes' => 0,
                'membres' => 0,
                'rdv' => 0,
                'match' => 0,
            ];
        }

        $agencyId = (int) $manager->agency_id;

        $matchmakerIds = User::role('matchmaker')
            ->where('agency_id', $agencyId)
            ->where('approval_status', 'approved')
            ->pluck('id');

        $staffIdsForBills = User::where('agency_id', $agencyId)
            ->where('approval_status', 'approved')
            ->whereHas('roles', function ($q) {
                $q->whereIn('name', ['matchmaker', 'manager']);
            })
            ->pluck('id');

        $ventes = Bill::whereIn('matchmaker_id', $staffIdsForBills)
            ->where('status', 'paid')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->sum('total_amount');

        $managerIds = User::role('manager')
            ->where('agency_id', $agencyId)
            ->where('approval_status', 'approved')
            ->pluck('id');

        $membres = User::role('user')
            ->where(function ($query) use ($matchmakerIds, $managerIds) {
                $query->whereIn('assigned_matchmaker_id', $matchmakerIds)
                    ->orWhereIn('validated_by_manager_id', $managerIds);
            })
            ->whereNotNull('approved_at')
            ->whereBetween('approved_at', [$startDate, $endDate])
            ->count();

        $rdv = Rdv::whereIn('matchmaker_id', $staffIdsForBills)
            ->whereBetween('created_at', [$startDate, $endDate])
            ->count();

        $match = Rdv::whereIn('matchmaker_id', $staffIdsForBills)
            ->where('status', Rdv::STATUS_REUSSI)
            ->whereBetween('updated_at', [$startDate, $endDate])
            ->count();

        return [
            'ventes' => (float) $ventes,
            'membres' => (int) $membres,
            'rdv' => (int) $rdv,
            'match' => (int) $match,
        ];
    }

    /**
     * @return array{ventes: float|int, membres: int, rdv: int, match: int}
     */
    public static function calculateRealizedForManager(int $managerId, int $month, int $year): array
    {
        $startDate = Carbon::create($year, $month, 1)->startOfMonth();
        $endDate = Carbon::create($year, $month, 1)->endOfMonth();

        $ventes = Bill::where('matchmaker_id', $managerId)
            ->where('status', 'paid')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->sum('total_amount');

        $membres = User::role('user')
            ->where(function ($q) use ($managerId) {
                $q->where('validated_by_manager_id', $managerId)
                    ->orWhere('assigned_matchmaker_id', $managerId);
            })
            ->whereNotNull('approved_at')
            ->whereBetween('approved_at', [$startDate, $endDate])
            ->count();

        $rdv = Rdv::where('matchmaker_id', $managerId)
            ->whereBetween('created_at', [$startDate, $endDate])
            ->count();

        $match = Rdv::where('matchmaker_id', $managerId)
            ->where('status', Rdv::STATUS_REUSSI)
            ->whereBetween('updated_at', [$startDate, $endDate])
            ->count();

        return [
            'ventes' => (float) $ventes,
            'membres' => (int) $membres,
            'rdv' => (int) $rdv,
            'match' => (int) $match,
        ];
    }

    /**
     * @return array{ventes: float|int, membres: int, rdv: int, match: int}
     */
    public static function calculateRealizedForAgencyById(int $agencyId, int $month, int $year): array
    {
        $startDate = Carbon::create($year, $month, 1)->startOfMonth();
        $endDate = Carbon::create($year, $month, 1)->endOfMonth();

        $matchmakerIds = User::role('matchmaker')
            ->where('agency_id', $agencyId)
            ->where('approval_status', 'approved')
            ->pluck('id');

        $staffIdsForBills = User::where('agency_id', $agencyId)
            ->where('approval_status', 'approved')
            ->whereHas('roles', function ($q) {
                $q->whereIn('name', ['matchmaker', 'manager']);
            })
            ->pluck('id');

        $ventes = Bill::whereIn('matchmaker_id', $staffIdsForBills)
            ->where('status', 'paid')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->sum('total_amount');

        $managerIds = User::role('manager')
            ->where('agency_id', $agencyId)
            ->where('approval_status', 'approved')
            ->pluck('id');

        $membres = User::role('user')
            ->where(function ($query) use ($matchmakerIds, $managerIds) {
                $query->whereIn('assigned_matchmaker_id', $matchmakerIds)
                    ->orWhereIn('validated_by_manager_id', $managerIds);
            })
            ->whereNotNull('approved_at')
            ->whereBetween('approved_at', [$startDate, $endDate])
            ->count();

        $rdv = Rdv::whereIn('matchmaker_id', $staffIdsForBills)
            ->whereBetween('created_at', [$startDate, $endDate])
            ->count();

        $match = Rdv::whereIn('matchmaker_id', $staffIdsForBills)
            ->where('status', Rdv::STATUS_REUSSI)
            ->whereBetween('updated_at', [$startDate, $endDate])
            ->count();

        return [
            'ventes' => (float) $ventes,
            'membres' => (int) $membres,
            'rdv' => (int) $rdv,
            'match' => (int) $match,
        ];
    }

    /**
     * @return array{ventes: float|int, membres: int, rdv: int, match: int}
     */
    public static function calculateRealizedForAllMatchmakers(int $month, int $year): array
    {
        // Deferred: awaiting client confirmation on whether manager ventes should be included
        // in platform-wide realized total (platform objectives already include managers).
        $startDate = Carbon::create($year, $month, 1)->startOfMonth();
        $endDate = Carbon::create($year, $month, 1)->endOfMonth();

        $matchmakerIds = User::role('matchmaker')
            ->where('approval_status', 'approved')
            ->pluck('id');

        $ventes = Bill::whereIn('matchmaker_id', $matchmakerIds)
            ->where('status', 'paid')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->sum('total_amount');

        $membres = User::role('user')
            ->whereIn('assigned_matchmaker_id', $matchmakerIds)
            ->whereNotNull('approved_at')
            ->whereBetween('approved_at', [$startDate, $endDate])
            ->count();

        $rdv = Rdv::whereIn('matchmaker_id', $matchmakerIds)
            ->whereBetween('created_at', [$startDate, $endDate])
            ->count();

        $match = Rdv::whereIn('matchmaker_id', $matchmakerIds)
            ->where('status', Rdv::STATUS_REUSSI)
            ->whereBetween('updated_at', [$startDate, $endDate])
            ->count();

        return [
            'ventes' => (float) $ventes,
            'membres' => (int) $membres,
            'rdv' => (int) $rdv,
            'match' => (int) $match,
        ];
    }

    /**
     * Resolve a single staff member's per-user objective, or null if not set.
     */
    public static function resolveObjectiveForUser(int $userId, int $month, int $year): ?MonthlyObjective
    {
        return MonthlyObjective::where('user_id', $userId)
            ->where('month', $month)
            ->where('year', $year)
            ->first();
    }

    /**
     * Bottom-up agency display objective: sum of each producer's resolved targets
     * (approved matchmakers + managers in the agency, same staff set as agency realized).
     */
    public static function sumObjectivesForAgency(int $agencyId, int $month, int $year): ?object
    {
        $staffIds = self::fetchAgencyProducerStaffIds($agencyId);

        return self::sumObjectivesForStaffIds($staffIds, $agencyId, $month, $year);
    }

    /**
     * Platform-wide display objective: sum of all producers' resolved targets
     * (approved matchmakers + managers, aligned with platform production scope).
     */
    public static function sumObjectivesForPlatform(int $month, int $year): ?object
    {
        $staffIds = self::fetchPlatformProducerStaffIds();

        return self::sumObjectivesForStaffIds($staffIds, null, $month, $year);
    }

    public static function resolveManagerPersonalObjective(int $managerId, int $month, int $year): ?MonthlyObjective
    {
        return self::resolveObjectiveForUser($managerId, $month, $year);
    }

    /**
     * Approved matchmakers and managers in an agency (same producer set as agency realized).
     *
     * @return \Illuminate\Support\Collection<int, int>
     */
    private static function fetchAgencyProducerStaffIds(int $agencyId)
    {
        return User::where('agency_id', $agencyId)
            ->where('approval_status', 'approved')
            ->whereHas('roles', function ($q) {
                $q->whereIn('name', ['matchmaker', 'manager']);
            })
            ->pluck('id');
    }

    /**
     * @return \Illuminate\Support\Collection<int, int>
     */
    private static function fetchPlatformProducerStaffIds()
    {
        return User::where('approval_status', 'approved')
            ->whereHas('roles', function ($q) {
                $q->whereIn('name', ['matchmaker', 'manager']);
            })
            ->pluck('id');
    }

    /**
     * @param  \Illuminate\Support\Collection<int, int>|array<int, int>  $staffIds
     */
    private static function sumObjectivesForStaffIds($staffIds, ?int $agencyId, int $month, int $year): ?object
    {
        $sumVentes = 0.0;
        $sumMembres = 0;
        $sumRdv = 0;
        $sumMatch = 0;
        $anyResolved = false;

        foreach ($staffIds as $staffId) {
            $resolved = self::resolveObjectiveForUser((int) $staffId, $month, $year);
            if (! $resolved) {
                continue;
            }

            $anyResolved = true;
            $sumVentes += (float) $resolved->target_ventes;
            $sumMembres += (int) $resolved->target_membres;
            $sumRdv += (int) $resolved->target_rdv;
            $sumMatch += (int) $resolved->target_match;
        }

        if (! $anyResolved) {
            return null;
        }

        return self::buildSyntheticObjective(
            $sumVentes,
            $sumMembres,
            $sumRdv,
            $sumMatch,
            $month,
            $year,
            $agencyId
        );
    }

    private static function buildSyntheticObjective(
        float $targetVentes,
        int $targetMembres,
        int $targetRdv,
        int $targetMatch,
        int $month,
        int $year,
        ?int $agencyId
    ): object {
        return (object) [
            'id' => null,
            'user_id' => null,
            'agency_id' => $agencyId,
            'role_type' => 'aggregated',
            'month' => $month,
            'year' => $year,
            'target_ventes' => $targetVentes,
            'target_membres' => $targetMembres,
            'target_rdv' => $targetRdv,
            'target_match' => $targetMatch,
            'commission_paid' => false,
            'commission_paid_at' => null,
            'commission_paid_by' => null,
        ];
    }
}
