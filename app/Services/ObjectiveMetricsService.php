<?php

namespace App\Services;

use App\Models\Bill;
use App\Models\MonthlyObjective;
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
            ->whereIn('status', ['member', 'client', 'client_expire'])
            ->where('assigned_matchmaker_id', $matchmakerId)
            ->whereBetween('approved_at', [$startDate, $endDate])
            ->count();

        return [
            'ventes' => (float) $ventes,
            'membres' => (int) $membres,
            'rdv' => 0,
            'match' => 0,
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
            ->whereIn('status', ['member', 'client', 'client_expire'])
            ->where(function ($query) use ($matchmakerIds, $managerIds) {
                $query->whereIn('assigned_matchmaker_id', $matchmakerIds)
                    ->orWhereIn('validated_by_manager_id', $managerIds);
            })
            ->whereBetween('approved_at', [$startDate, $endDate])
            ->count();

        return [
            'ventes' => (float) $ventes,
            'membres' => (int) $membres,
            'rdv' => 0,
            'match' => 0,
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
            ->whereIn('status', ['member', 'client', 'client_expire'])
            ->where('validated_by_manager_id', $managerId)
            ->whereBetween('approved_at', [$startDate, $endDate])
            ->count();

        return [
            'ventes' => (float) $ventes,
            'membres' => (int) $membres,
            'rdv' => 0,
            'match' => 0,
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
            ->whereIn('status', ['member', 'client', 'client_expire'])
            ->where(function ($query) use ($matchmakerIds, $managerIds) {
                $query->whereIn('assigned_matchmaker_id', $matchmakerIds)
                    ->orWhereIn('validated_by_manager_id', $managerIds);
            })
            ->whereBetween('approved_at', [$startDate, $endDate])
            ->count();

        return [
            'ventes' => (float) $ventes,
            'membres' => (int) $membres,
            'rdv' => 0,
            'match' => 0,
        ];
    }

    /**
     * @return array{ventes: float|int, membres: int, rdv: int, match: int}
     */
    public static function calculateRealizedForAllMatchmakers(int $month, int $year): array
    {
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
            ->whereIn('status', ['member', 'client', 'client_expire'])
            ->whereIn('assigned_matchmaker_id', $matchmakerIds)
            ->whereBetween('approved_at', [$startDate, $endDate])
            ->count();

        return [
            'ventes' => (float) $ventes,
            'membres' => (int) $membres,
            'rdv' => 0,
            'match' => 0,
        ];
    }

    public static function resolveObjectiveForAgency(int $agencyId, int $month, int $year): ?MonthlyObjective
    {
        $agencyObjective = MonthlyObjective::where('agency_id', $agencyId)
            ->where('role_type', MonthlyObjective::ROLE_TYPE_AGENCY)
            ->where('month', $month)
            ->where('year', $year)
            ->first();

        if ($agencyObjective) {
            return $agencyObjective;
        }

        return MonthlyObjective::whereNull('agency_id')
            ->where('role_type', 'manager')
            ->whereNull('user_id')
            ->where('month', $month)
            ->where('year', $year)
            ->first();
    }

    public static function resolveObjectiveForView(?string $roleType, int $month, int $year, ?int $userId): ?MonthlyObjective
    {
        if (empty($roleType)) {
            return null;
        }
        if ($userId !== null) {
            $perUser = MonthlyObjective::where('role_type', $roleType)
                ->where('user_id', $userId)
                ->whereNull('agency_id')
                ->where('month', $month)
                ->where('year', $year)
                ->first();
            if ($perUser) {
                return $perUser;
            }
        }

        return MonthlyObjective::where('role_type', $roleType)
            ->whereNull('user_id')
            ->whereNull('agency_id')
            ->where('month', $month)
            ->where('year', $year)
            ->first();
    }

    public static function resolveManagerPersonalObjective(int $managerId, int $month, int $year): ?MonthlyObjective
    {
        $perUser = MonthlyObjective::where('role_type', 'manager')
            ->where('user_id', $managerId)
            ->whereNull('agency_id')
            ->where('month', $month)
            ->where('year', $year)
            ->first();

        if ($perUser) {
            return $perUser;
        }

        return MonthlyObjective::where('role_type', 'manager')
            ->whereNull('user_id')
            ->whereNull('agency_id')
            ->where('month', $month)
            ->where('year', $year)
            ->first();
    }
}
