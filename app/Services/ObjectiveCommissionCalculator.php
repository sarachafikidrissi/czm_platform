<?php

namespace App\Services;

use App\Models\User;

/**
 * Centralized objective progress and commission rules for matchmakers and managers.
 */
class ObjectiveCommissionCalculator
{
    public const KPI_THRESHOLD = 50.0;

    public const AGENCY_BONUS_TIER_80 = 500.0;

    public const AGENCY_BONUS_TIER_100 = 1000.0;

    /**
     * progress = min(100, (realized / objective) * 100) per KPI.
     *
     * @param  array<string, float|int>  $realized
     * @return array{ventes: float, membres: float, rdv: float, match: float}
     */
    public static function calculateProgress(?object $objective, array $realized): array
    {
        if (! $objective) {
            return [
                'ventes' => 0.0,
                'membres' => 0.0,
                'rdv' => 0.0,
                'match' => 0.0,
            ];
        }

        $tv = (float) $objective->target_ventes;
        $tm = (int) $objective->target_membres;
        $tr = (int) $objective->target_rdv;
        $tk = (int) $objective->target_match;

        // No target set for a KPI → treat as satisfied for eligibility (avoids blocking on placeholders).
        return [
            'ventes' => $tv <= 0
                ? 100.0
                : min(100.0, ((float) $realized['ventes'] / $tv) * 100),
            'membres' => $tm <= 0
                ? 100.0
                : min(100.0, ((float) $realized['membres'] / $tm) * 100),
            'rdv' => $tr <= 0
                ? 100.0
                : min(100.0, ((float) $realized['rdv'] / $tr) * 100),
            'match' => $tk <= 0
                ? 100.0
                : min(100.0, ((float) $realized['match'] / $tk) * 100),
        ];
    }

    /**
     * @param  array{ventes: float, membres: float, rdv: float, match: float}  $progress
     */
    public static function allKpiAtLeast(array $progress, float $percent): bool
    {
        return $progress['ventes'] >= $percent
            && $progress['membres'] >= $percent
            && $progress['rdv'] >= $percent
            && $progress['match'] >= $percent;
    }

    public static function allKpiAtLeastFull(array $progress): bool
    {
        return self::allKpiAtLeast($progress, 100.0);
    }

    public static function allKpiAtLeastEighty(array $progress): bool
    {
        return self::allKpiAtLeast($progress, 80.0);
    }

    /**
     * Matchmaker: eligible iff all KPI ≥ 50%. Commission = 10% of own ventes if eligible.
     *
     * @param  array<string, float|int>  $realized
     */
    public static function forMatchmaker(array $progress, array $realized): array
    {
        $payoutEligible = self::allKpiAtLeast($progress, self::KPI_THRESHOLD);
        $totalAmount = $payoutEligible ? (float) $realized['ventes'] * 0.10 : 0.0;

        return [
            'mode' => 'matchmaker',
            'summary' => [
                'eligible' => $payoutEligible,
                'total_amount' => round($totalAmount, 2),
            ],
            'ventes' => [
                'eligible' => $payoutEligible,
                'amount' => round($totalAmount, 2),
            ],
            'membres' => [
                'eligible' => $progress['membres'] >= self::KPI_THRESHOLD,
                'amount' => 0.0,
            ],
            'rdv' => [
                'eligible' => $progress['rdv'] >= self::KPI_THRESHOLD,
                'amount' => 0.0,
            ],
            'match' => [
                'eligible' => $progress['match'] >= self::KPI_THRESHOLD,
                'amount' => 0.0,
            ],
            'breakdown' => [
                'personal_ventes_commission' => round($totalAmount, 2),
                'team_commission' => 0.0,
                'bonus' => 0.0,
                'personal_gate' => $payoutEligible,
                'agency_gate' => null,
            ],
        ];
    }

    /**
     * Manager: personal + agency gates (all KPI ≥ 50% each); then personal 10% ventes,
     * team 5% per matchmaker who hits all KPI ≥ 50%, agency bonus 500 @ ≥80% or 1000 @ 100% on agency KPIs.
     *
     * @param  array<int, array{realized: array<string, float|int>, progress: array{ventes: float, membres: float, rdv: float, match: float}}>  $matchmakerSlices
     * @param  array{ventes: float, membres: float, rdv: float, match: float}  $agencyProgress  Used for commission row KPI alignment with agency table
     */
    public static function forManager(
        array $personalProgress,
        array $personalRealized,
        array $agencyProgress,
        array $agencyRealized,
        array $matchmakerSlices,
        array $rowProgressForKpiDisplay
    ): array {
        $personalGate = self::allKpiAtLeast($personalProgress, self::KPI_THRESHOLD);
        $agencyGate = self::allKpiAtLeast($agencyProgress, self::KPI_THRESHOLD);
        $bothGates = $personalGate && $agencyGate;

        $personalVentesCommission = $bothGates ? (float) $personalRealized['ventes'] * 0.10 : 0.0;

        $teamCommission = 0.0;
        if ($bothGates) {
            foreach ($matchmakerSlices as $slice) {
                $p = $slice['progress'];
                $r = $slice['realized'];
                if (self::allKpiAtLeast($p, self::KPI_THRESHOLD)) {
                    $teamCommission += (float) $r['ventes'] * 0.05;
                }
            }
        }

        $bonus = 0.0;
        if ($bothGates) {
            if (self::allKpiAtLeastFull($agencyProgress)) {
                $bonus = self::AGENCY_BONUS_TIER_100;
            } elseif (self::allKpiAtLeastEighty($agencyProgress)) {
                $bonus = self::AGENCY_BONUS_TIER_80;
            }
        }

        $totalAmount = $personalVentesCommission + $teamCommission + $bonus;

        return [
            'mode' => 'manager',
            'summary' => [
                'eligible' => $bothGates,
                'total_amount' => round($totalAmount, 2),
            ],
            'ventes' => [
                'eligible' => $bothGates,
                'amount' => round($personalVentesCommission, 2),
            ],
            'membres' => [
                'eligible' => $rowProgressForKpiDisplay['membres'] >= self::KPI_THRESHOLD,
                'amount' => 0.0,
            ],
            'rdv' => [
                'eligible' => $rowProgressForKpiDisplay['rdv'] >= self::KPI_THRESHOLD,
                'amount' => 0.0,
            ],
            'match' => [
                'eligible' => $rowProgressForKpiDisplay['match'] >= self::KPI_THRESHOLD,
                'amount' => 0.0,
            ],
            'breakdown' => [
                'personal_ventes_commission' => round($personalVentesCommission, 2),
                'team_commission' => round($teamCommission, 2),
                'bonus' => round($bonus, 2),
                'personal_gate' => $personalGate,
                'agency_gate' => $agencyGate,
            ],
        ];
    }

    /**
     * No staff commission (e.g. admin aggregate "all matchmakers" or agency-only admin view).
     *
     * @param  array{ventes: float, membres: float, rdv: float, match: float}  $progress
     */
    public static function none(array $progress): array
    {
        return [
            'mode' => 'none',
            'summary' => [
                'eligible' => false,
                'total_amount' => 0.0,
            ],
            'ventes' => ['eligible' => false, 'amount' => 0.0],
            'membres' => ['eligible' => $progress['membres'] >= self::KPI_THRESHOLD, 'amount' => 0.0],
            'rdv' => ['eligible' => $progress['rdv'] >= self::KPI_THRESHOLD, 'amount' => 0.0],
            'match' => ['eligible' => $progress['match'] >= self::KPI_THRESHOLD, 'amount' => 0.0],
            'breakdown' => [
                'personal_ventes_commission' => 0.0,
                'team_commission' => 0.0,
                'bonus' => 0.0,
                'personal_gate' => null,
                'agency_gate' => null,
            ],
        ];
    }

    /**
     * Manager production page / shared manager-commission resolution (personal + agency + team + bonus).
     */
    public static function forManagerDashboard(int $managerId, int $agencyId, int $month, int $year): array
    {
        $personalObjective = ObjectiveMetricsService::resolveManagerPersonalObjective($managerId, $month, $year);
        $personalRealized = ObjectiveMetricsService::calculateRealizedForManager($managerId, $month, $year);
        $personalProgress = self::calculateProgress($personalObjective, $personalRealized);

        $agencyObjective = ObjectiveMetricsService::resolveObjectiveForAgency($agencyId, $month, $year);
        $agencyRealized = ObjectiveMetricsService::calculateRealizedForAgencyById($agencyId, $month, $year);
        $agencyProgress = self::calculateProgress($agencyObjective, $agencyRealized);

        $matchmakerIds = User::role('matchmaker')
            ->where('agency_id', $agencyId)
            ->where('approval_status', 'approved')
            ->pluck('id');

        $slices = [];
        foreach ($matchmakerIds as $mmId) {
            $mmId = (int) $mmId;
            $r = ObjectiveMetricsService::calculateRealizedForMatchmaker($mmId, $month, $year);
            $o = ObjectiveMetricsService::resolveObjectiveForView('matchmaker', $month, $year, $mmId);
            $p = self::calculateProgress($o, $r);
            $slices[$mmId] = ['realized' => $r, 'progress' => $p];
        }

        return self::forManager(
            $personalProgress,
            $personalRealized,
            $agencyProgress,
            $agencyRealized,
            $slices,
            $agencyProgress
        );
    }
}
