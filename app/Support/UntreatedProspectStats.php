<?php

namespace App\Support;

use App\Models\Agency;
use App\Models\User;
use App\Services\StatsService;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;

class UntreatedProspectStats
{
    /**
     * Single definition of "untreated": active prospect, not rejected, not marked traité.
     */
    public static function constrainToUntreated(Builder $query): Builder
    {
        return $query
            ->whereNull('rejection_reason')
            ->where(function ($q) {
                $q->where('is_traite', false)->orWhereNull('is_traite');
            });
    }

    public static function baseQuery(): Builder
    {
        return self::constrainToUntreated(
            User::role('user')->where('status', 'prospect')
        );
    }

    /**
     * Wait start = current assignment assigned_at when the prospect is in a
     * matchmaker's queue, otherwise users.created_at (unassigned / never assigned).
     */
    private static function waitStartSql(): string
    {
        return 'COALESCE((SELECT assigned_at FROM user_assignments WHERE user_assignments.user_id = users.id AND user_assignments.unassigned_at IS NULL LIMIT 1), users.created_at)';
    }

    /**
     * @return array{count: int, oldest_days: int|null, overdue_48h_count: int}
     */
    public static function summarize(Builder $query): array
    {
        $waitExpr = self::waitStartSql();
        $count = (clone $query)->count();

        if ($count === 0) {
            return [
                'count' => 0,
                'oldest_days' => null,
                'overdue_48h_count' => 0,
            ];
        }

        $oldestAt = (clone $query)
            ->reorder()
            ->selectRaw("MIN({$waitExpr}) as oldest_wait_at")
            ->value('oldest_wait_at');

        $oldestDays = $oldestAt !== null
            ? (int) Carbon::parse($oldestAt)->diffInDays(now())
            : null;

        $overdue = (clone $query)
            ->whereRaw("{$waitExpr} <= ?", [now()->subHours(48)])
            ->count();

        return [
            'count' => $count,
            'oldest_days' => $oldestDays,
            'overdue_48h_count' => $overdue,
        ];
    }

    public static function applyManagerAgencyScope(Builder $query, User $manager): Builder
    {
        $matchmakerIds = User::role('matchmaker')
            ->where('agency_id', $manager->agency_id)
            ->pluck('id')
            ->all();

        $otherManagerIds = User::role('manager')
            ->where('agency_id', $manager->agency_id)
            ->where('id', '!=', $manager->id)
            ->pluck('id')
            ->all();

        return $query->where(function ($q) use ($manager, $matchmakerIds, $otherManagerIds) {
            $q->where(function ($subQ) use ($manager, $otherManagerIds) {
                $subQ->where('agency_id', $manager->agency_id);

                if (! empty($otherManagerIds)) {
                    $subQ->where(function ($subSubQ) use ($otherManagerIds) {
                        $subSubQ->whereNotIn('assigned_matchmaker_id', $otherManagerIds)
                            ->orWhereNull('assigned_matchmaker_id');
                    });
                }
            });

            if (! empty($matchmakerIds)) {
                $q->orWhere(function ($subQ) use ($matchmakerIds, $otherManagerIds) {
                    $subQ->whereIn('assigned_matchmaker_id', $matchmakerIds);

                    if (! empty($otherManagerIds)) {
                        $subQ->whereNotIn('assigned_matchmaker_id', $otherManagerIds);
                    }
                });
            }
        });
    }

    public static function countForAssignedStaff(int $staffId): int
    {
        return self::baseQuery()
            ->where('assigned_matchmaker_id', $staffId)
            ->count();
    }

    /**
     * @return array{untreatedCount: int, untreatedUnassigned: int, untreatedByStaff: array<int, array{id: int, name: string, role: string, count: int}>}
     */
    public static function forStaffList(User $viewer, string $roleName, string $scope, ?int $matchmakerIdFilter = null): array
    {
        $query = self::baseQuery();

        if ($roleName === 'matchmaker' || ($roleName === 'manager' && $scope === 'mine')) {
            $query->where('assigned_matchmaker_id', $viewer->id);
            $summary = self::summarize($query);

            return [
                'untreatedCount' => $summary['count'],
                'untreatedSummary' => $summary,
                'untreatedUnassigned' => 0,
                'untreatedByStaff' => [],
            ];
        }

        if ($roleName === 'manager') {
            self::applyManagerAgencyScope($query, $viewer);

            $staff = collect(StatsService::getMatchmakerList((int) $viewer->agency_id))
                ->reject(fn (array $member) => $member['role'] === 'manager' && (int) $member['id'] !== (int) $viewer->id)
                ->values();

            $countsByStaff = self::countsByAssignedStaff(
                self::applyManagerAgencyScope(self::baseQuery(), $viewer)
            );

            $untreatedByStaff = $staff->map(fn (array $member) => [
                'id' => (int) $member['id'],
                'name' => $member['name'],
                'role' => $member['role'],
                'count' => (int) ($countsByStaff[(int) $member['id']] ?? 0),
            ])->all();

            $untreatedUnassigned = (clone $query)
                ->whereNull('assigned_matchmaker_id')
                ->count();

            if ($matchmakerIdFilter) {
                $allowedIds = $staff->pluck('id')->all();
                if (in_array($matchmakerIdFilter, $allowedIds, true)) {
                    $query->where('assigned_matchmaker_id', $matchmakerIdFilter);
                }
            }

            $summary = self::summarize($query);

            return [
                'untreatedCount' => $summary['count'],
                'untreatedSummary' => $summary,
                'untreatedUnassigned' => $untreatedUnassigned,
                'untreatedByStaff' => $untreatedByStaff,
            ];
        }

        return [
            'untreatedCount' => 0,
            'untreatedSummary' => ['count' => 0, 'oldest_days' => null, 'overdue_48h_count' => 0],
            'untreatedUnassigned' => 0,
            'untreatedByStaff' => [],
        ];
    }

    /**
     * @return array{untreatedCount: int, untreatedUnassigned: int, untreatedByAgency: array<int, array{id: int, name: string, count: int}>, untreatedByStaff: array<int, array{id: int, name: string, role: string, agency_id: int|null, count: int}>}
     */
    public static function forAdmin(?int $agencyIdFilter, ?int $matchmakerIdFilter): array
    {
        $allStaff = collect(StatsService::getMatchmakerList());
        $staffForFilter = $agencyIdFilter
            ? $allStaff->where('agency_id', $agencyIdFilter)->values()
            : $allStaff;
        $countsByStaff = self::countsByAssignedStaff(self::baseQuery());

        $untreatedByStaff = $staffForFilter->map(fn (array $member) => [
            'id' => (int) $member['id'],
            'name' => $member['name'],
            'role' => $member['role'],
            'agency_id' => $member['agency_id'] !== null ? (int) $member['agency_id'] : null,
            'count' => (int) ($countsByStaff[(int) $member['id']] ?? 0),
        ])->all();

        $agencies = Agency::query()->orderBy('name')->get(['id', 'name']);
        $staffIdsByAgency = $allStaff->groupBy(fn (array $member) => (int) $member['agency_id']);
        $unassignedByAgency = self::baseQuery()
            ->whereNull('assigned_matchmaker_id')
            ->whereNotNull('agency_id')
            ->selectRaw('agency_id, COUNT(*) as aggregate_count')
            ->groupBy('agency_id')
            ->pluck('aggregate_count', 'agency_id');

        $untreatedByAgency = $agencies->map(function (Agency $agency) use ($staffIdsByAgency, $countsByStaff, $unassignedByAgency) {
            $agencyStaffIds = $staffIdsByAgency->get($agency->id, collect())->pluck('id');
            $assigned = $agencyStaffIds->sum(fn ($id) => (int) ($countsByStaff[(int) $id] ?? 0));
            $unassigned = (int) ($unassignedByAgency[$agency->id] ?? 0);

            return [
                'id' => (int) $agency->id,
                'name' => $agency->name,
                'count' => $assigned + $unassigned,
            ];
        })->all();

        $query = self::baseQuery();

        if ($matchmakerIdFilter) {
            $query->where('assigned_matchmaker_id', $matchmakerIdFilter);
        } elseif ($agencyIdFilter) {
            $assigneeIds = $staffForFilter->pluck('id')->all();
            $query->where(function ($q) use ($agencyIdFilter, $assigneeIds) {
                $q->where('agency_id', $agencyIdFilter);
                if (! empty($assigneeIds)) {
                    $q->orWhereIn('assigned_matchmaker_id', $assigneeIds);
                }
            });
        }

        $summary = self::summarize($query);

        return [
            'untreatedCount' => $summary['count'],
            'untreatedSummary' => $summary,
            'untreatedUnassigned' => self::baseQuery()
                ->whereNull('agency_id')
                ->whereNull('assigned_matchmaker_id')
                ->count(),
            'untreatedByAgency' => $untreatedByAgency,
            'untreatedByStaff' => $untreatedByStaff,
        ];
    }

    /**
     * @return array<int, int>
     */
    private static function countsByAssignedStaff(Builder $query): array
    {
        return $query
            ->whereNotNull('assigned_matchmaker_id')
            ->selectRaw('assigned_matchmaker_id, COUNT(*) as aggregate_count')
            ->groupBy('assigned_matchmaker_id')
            ->pluck('aggregate_count', 'assigned_matchmaker_id')
            ->map(fn ($count) => (int) $count)
            ->all();
    }
}
