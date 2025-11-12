<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Bill;
use App\Models\UserSubscription;
use App\Models\MatchmakerEvaluation;
use App\Models\MatchmakerNote;
use App\Models\MonthlyObjective;
use App\Models\Agency;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Carbon\Carbon;

class MatchmakerStatisticsController extends Controller
{
    /**
     * Display matchmaker statistics dashboard
     */
    public function index(Request $request)
    {
        $me = Auth::user();
        $roleName = null;
        if ($me) {
            $roleName = DB::table('model_has_roles')
                ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
                ->where('model_has_roles.model_id', $me->id)
                ->value('roles.name');
        }

        // Only admin, manager, and matchmaker can access
        if (!in_array($roleName, ['admin', 'manager', 'matchmaker'])) {
            abort(403, 'Unauthorized access.');
        }

        // Get filters
        $timeRange = $request->input('time_range', 'month'); // month, quarter, year
        $agencyId = $request->input('agency_id');
        $matchmakerId = $request->input('matchmaker_id');
        $selectedMonth = $request->integer('month', now()->month);
        $selectedYear = $request->integer('year', now()->year);

        // Determine date range based on time range
        $dateRange = $this->getDateRange($timeRange, $selectedMonth, $selectedYear);
        $startDate = $dateRange['start'];
        $endDate = $dateRange['end'];

        // Determine which matchmakers to analyze
        $matchmakerIds = $this->getMatchmakerIds($roleName, $me, $matchmakerId, $agencyId);

        // Get all statistics
        $statistics = [];
        foreach ($matchmakerIds as $id) {
            try {
                $matchmaker = User::find($id);
                if (!$matchmaker) continue;

                $statistics[] = [
                    'matchmaker_id' => $id,
                    'matchmaker_name' => $matchmaker->name,
                    'matchmaker_email' => $matchmaker->email,
                    'agency_id' => $matchmaker->agency_id,
                    'agency_name' => $matchmaker->agency ? $matchmaker->agency->name : null,
                    'users' => $this->getUserStatistics($id, $startDate, $endDate),
                    'bills' => $this->getBillStatistics($id, $startDate, $endDate),
                    'subscriptions' => $this->getSubscriptionStatistics($id, $startDate, $endDate),
                    'evaluations' => $this->getEvaluationStatistics($id, $startDate, $endDate),
                    'notes' => $this->getNoteStatistics($id, $startDate, $endDate),
                    'objectives' => $this->getObjectiveStatistics($id, $selectedMonth, $selectedYear),
                    'activity' => $this->getActivityStatistics($id, $startDate, $endDate),
                    'profile_insights' => $this->getProfileInsights($id, $startDate, $endDate),
                ];
            } catch (\Exception $e) {
                Log::error('Error getting statistics for matchmaker ' . $id . ': ' . $e->getMessage(), [
                    'trace' => $e->getTraceAsString()
                ]);
                // Continue with next matchmaker instead of failing completely
                continue;
            }
        }

        // Get filter options
        $agencies = Agency::withCount(['matchmakers' => function($q) {
            $q->where('approval_status', 'approved');
        }])->get();

        $matchmakers = User::role('matchmaker')
            ->where('approval_status', 'approved')
            ->with('agency')
            ->get(['id', 'name', 'email', 'agency_id']);

        return Inertia::render('admin/matchmaker-statistics', [
            'statistics' => $statistics,
            'filters' => [
                'time_range' => $timeRange,
                'agency_id' => $agencyId,
                'matchmaker_id' => $matchmakerId,
                'month' => $selectedMonth,
                'year' => $selectedYear,
            ],
            'agencies' => $agencies,
            'matchmakers' => $matchmakers,
            'canViewAll' => $roleName === 'admin',
        ]);
    }

    /**
     * Get date range based on time range type
     */
    private function getDateRange($timeRange, $month, $year)
    {
        switch ($timeRange) {
            case 'quarter':
                $quarter = ceil($month / 3);
                $startMonth = ($quarter - 1) * 3 + 1;
                $startDate = Carbon::create($year, $startMonth, 1)->startOfMonth();
                $endDate = Carbon::create($year, $startMonth + 2, 1)->endOfMonth();
                break;
            case 'year':
                $startDate = Carbon::create($year, 1, 1)->startOfYear();
                $endDate = Carbon::create($year, 12, 31)->endOfYear();
                break;
            case 'month':
            default:
                $startDate = Carbon::create($year, $month, 1)->startOfMonth();
                $endDate = Carbon::create($year, $month, 1)->endOfMonth();
                break;
        }

        return ['start' => $startDate, 'end' => $endDate];
    }

    /**
     * Get matchmaker IDs to analyze based on role and filters
     */
    private function getMatchmakerIds($roleName, $me, $matchmakerId, $agencyId)
    {
        if ($roleName === 'matchmaker') {
            // Matchmaker sees only their own stats
            return [$me->id];
        }

        if ($matchmakerId) {
            // Specific matchmaker selected
            return [(int)$matchmakerId];
        }

        if ($agencyId) {
            // All matchmakers in agency
            return User::role('matchmaker')
                ->where('agency_id', $agencyId)
                ->where('approval_status', 'approved')
                ->pluck('id')
                ->toArray();
        }

        if ($roleName === 'manager' && $me->agency_id) {
            // Manager sees all matchmakers in their agency
            return User::role('matchmaker')
                ->where('agency_id', $me->agency_id)
                ->where('approval_status', 'approved')
                ->pluck('id')
                ->toArray();
        }

        // Admin sees all matchmakers (or can filter)
        return User::role('matchmaker')
            ->where('approval_status', 'approved')
            ->pluck('id')
            ->toArray();
    }

    /**
     * Get user management statistics
     */
    private function getUserStatistics($matchmakerId, $startDate, $endDate)
    {
        // Base query for all assigned users (all time)
        $baseQuery = User::role('user')
            ->where('assigned_matchmaker_id', $matchmakerId);

        // Total assigned users (all time)
        $totalAssigned = (clone $baseQuery)->count();

        // By status
        $byStatus = (clone $baseQuery)
            ->select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();

        // Active vs inactive (based on condition field or last activity)
        $active = (clone $baseQuery)->where('condition', true)->count();
        $inactive = (clone $baseQuery)->where('condition', false)->count();

        // Validated users (by approved_by)
        $validated = (clone $baseQuery)
            ->whereNotNull('approved_by')
            ->where('approved_by', $matchmakerId)
            ->count();

        // Validation trends per month
        $validationTrends = (clone $baseQuery)
            ->whereNotNull('approved_at')
            ->whereBetween('approved_at', [$startDate, $endDate])
            ->selectRaw('DATE_FORMAT(approved_at, "%Y-%m") as month, COUNT(*) as count')
            ->groupBy('month')
            ->orderBy('month')
            ->pluck('count', 'month')
            ->toArray();

        // Status changes over time
        $statusChanges = (clone $baseQuery)
            ->whereBetween('updated_at', [$startDate, $endDate])
            ->selectRaw('DATE_FORMAT(updated_at, "%Y-%m-%d") as date, status, COUNT(*) as count')
            ->groupBy('date', 'status')
            ->orderBy('date')
            ->get()
            ->groupBy('date')
            ->map(function($group) {
                return $group->pluck('count', 'status')->toArray();
            })
            ->toArray();

        // Conversion funnel
        $funnel = [
            'prospect' => (clone $baseQuery)->where('status', 'prospect')->count(),
            'member' => (clone $baseQuery)->where('status', 'member')->count(),
            'client' => (clone $baseQuery)->where('status', 'client')->count(),
            'client_expire' => (clone $baseQuery)->where('status', 'client_expire')->count(),
        ];

        return [
            'total_assigned' => $totalAssigned,
            'by_status' => $byStatus,
            'active' => $active,
            'inactive' => $inactive,
            'validated' => $validated,
            'validation_trends' => $validationTrends,
            'status_changes' => $statusChanges,
            'funnel' => $funnel,
        ];
    }

    /**
     * Get bill/financial statistics
     */
    private function getBillStatistics($matchmakerId, $startDate, $endDate)
    {
        $baseQuery = Bill::where('matchmaker_id', $matchmakerId)
            ->whereBetween('created_at', [$startDate, $endDate]);

        // Total sales amount
        $totalSales = (clone $baseQuery)->sum('total_amount') ?? 0;

        // Sales count
        $salesCount = (clone $baseQuery)->count();

        // Sales by status
        $byStatus = (clone $baseQuery)
            ->select('status', DB::raw('count(*) as count'), DB::raw('sum(total_amount) as total'))
            ->groupBy('status')
            ->get()
            ->mapWithKeys(function($item) {
                return [$item->status => [
                    'count' => $item->count,
                    'total' => (float)$item->total,
                ]];
            })
            ->toArray();

        // Monthly/quarterly/yearly trends
        $trends = (clone $baseQuery)
            ->selectRaw('DATE_FORMAT(created_at, "%Y-%m") as period, COUNT(*) as count, SUM(total_amount) as total')
            ->groupBy('period')
            ->orderBy('period')
            ->get()
            ->map(function($item) {
                return [
                    'period' => $item->period,
                    'count' => $item->count,
                    'total' => (float)$item->total,
                ];
            })
            ->toArray();

        // Average bill amount
        $averageAmount = $salesCount > 0 ? $totalSales / $salesCount : 0;

        // Payment method distribution
        $paymentMethods = (clone $baseQuery)
            ->select('payment_method', DB::raw('count(*) as count'), DB::raw('sum(total_amount) as total'))
            ->groupBy('payment_method')
            ->get()
            ->map(function($item) {
                return [
                    'method' => $item->payment_method,
                    'count' => $item->count,
                    'total' => (float)$item->total,
                ];
            })
            ->toArray();

        // Email sent metrics
        $emailSent = (clone $baseQuery)->where('email_sent', true)->count();
        $emailNotSent = (clone $baseQuery)->where('email_sent', false)->count();

        return [
            'total_sales' => (float)$totalSales,
            'sales_count' => $salesCount,
            'by_status' => $byStatus,
            'trends' => $trends,
            'average_amount' => (float)$averageAmount,
            'payment_methods' => $paymentMethods,
            'email_sent' => $emailSent,
            'email_not_sent' => $emailNotSent,
        ];
    }

    /**
     * Get subscription statistics
     */
    private function getSubscriptionStatistics($matchmakerId, $startDate, $endDate)
    {
        $baseQuery = UserSubscription::where('assigned_matchmaker_id', $matchmakerId)
            ->whereBetween('created_at', [$startDate, $endDate]);

        // Active subscriptions count
        $active = (clone $baseQuery)
            ->where('status', 'active')
            ->where('subscription_end', '>=', now())
            ->count();

        // Expired subscriptions count
        $expired = (clone $baseQuery)
            ->where(function($q) {
                $q->where('status', 'expired')
                  ->orWhere('subscription_end', '<', now());
            })
            ->count();

        // Average duration
        $avgDuration = (clone $baseQuery)->avg('duration_months') ?? 0;

        // Pack distribution
        $packDistribution = [];
        try {
            $packQuery = (clone $baseQuery)
                ->whereNotNull('matrimonial_pack_id')
                ->join('matrimonial_packs', 'user_subscriptions.matrimonial_pack_id', '=', 'matrimonial_packs.id')
                ->select('matrimonial_packs.name', DB::raw('count(*) as count'))
                ->groupBy('matrimonial_packs.name')
                ->get();
            
            if ($packQuery->count() > 0) {
                $packDistribution = $packQuery->map(function($item) {
                    return [
                        'pack_name' => $item->name,
                        'count' => $item->count,
                    ];
                })->toArray();
            }
        } catch (\Exception $e) {
            // If join fails, just return empty array
            Log::warning('Error getting pack distribution: ' . $e->getMessage());
            $packDistribution = [];
        }

        // Start/end date overview
        $dateOverview = (clone $baseQuery)
            ->selectRaw('MIN(subscription_start) as earliest_start, MAX(subscription_end) as latest_end')
            ->first();

        return [
            'active_count' => $active,
            'expired_count' => $expired,
            'average_duration' => (float)$avgDuration,
            'pack_distribution' => $packDistribution,
            'earliest_start' => $dateOverview && $dateOverview->earliest_start ? Carbon::parse($dateOverview->earliest_start)->format('Y-m-d') : null,
            'latest_end' => $dateOverview && $dateOverview->latest_end ? Carbon::parse($dateOverview->latest_end)->format('Y-m-d') : null,
        ];
    }

    /**
     * Get evaluation statistics
     */
    private function getEvaluationStatistics($matchmakerId, $startDate, $endDate)
    {
        $baseQuery = MatchmakerEvaluation::where('author_id', $matchmakerId)
            ->whereBetween('created_at', [$startDate, $endDate]);

        // Total evaluations
        $total = (clone $baseQuery)->count();

        // By status
        $byStatus = (clone $baseQuery)
            ->select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();

        // Recommendation distribution
        $recommendations = (clone $baseQuery)
            ->select('recommendation', DB::raw('count(*) as count'))
            ->groupBy('recommendation')
            ->pluck('count', 'recommendation')
            ->toArray();

        // Average scores by category (if stored as numeric)
        $avgScores = [];
        $scoreFields = ['appearance', 'communication', 'seriousness', 'emotional_psychological', 'values_principles', 'social_compatibility'];
        
        // Note: These fields are text fields, so we can't calculate numeric averages
        // But we can count non-null values
        foreach ($scoreFields as $field) {
            $avgScores[$field] = (clone $baseQuery)->whereNotNull($field)->count();
        }

        return [
            'total' => $total,
            'by_status' => $byStatus,
            'recommendations' => $recommendations,
            'avg_scores' => $avgScores,
        ];
    }

    /**
     * Get note statistics
     */
    private function getNoteStatistics($matchmakerId, $startDate, $endDate)
    {
        $baseQuery = MatchmakerNote::where('author_id', $matchmakerId)
            ->whereBetween('created_at', [$startDate, $endDate]);

        // Total notes
        $total = (clone $baseQuery)->count();

        // Notes per user
        $notesPerUser = (clone $baseQuery)
            ->select('user_id', DB::raw('count(*) as count'))
            ->groupBy('user_id')
            ->get()
            ->map(function($item) {
                return [
                    'user_id' => $item->user_id,
                    'count' => $item->count,
                ];
            })
            ->toArray();

        // Notes trend by date
        $trends = (clone $baseQuery)
            ->selectRaw('DATE_FORMAT(created_at, "%Y-%m-%d") as date, COUNT(*) as count')
            ->groupBy('date')
            ->orderBy('date')
            ->pluck('count', 'date')
            ->toArray();

        // Average notes per user
        $uniqueUsers = (clone $baseQuery)->distinct('user_id')->count('user_id');
        $avgPerUser = $uniqueUsers > 0 ? $total / $uniqueUsers : 0;

        return [
            'total' => $total,
            'notes_per_user' => $notesPerUser,
            'trends' => $trends,
            'average_per_user' => (float)$avgPerUser,
        ];
    }

    /**
     * Get objective statistics
     */
    private function getObjectiveStatistics($matchmakerId, $month, $year)
    {
        // Get objective for matchmaker role type
        $objective = MonthlyObjective::where('role_type', 'matchmaker')
            ->whereNull('user_id')
            ->where('month', $month)
            ->where('year', $year)
            ->first();

        if (!$objective) {
            return [
                'target_ventes' => 0,
                'target_membres' => 0,
                'target_rdv' => 0,
                'target_match' => 0,
                'realized_ventes' => 0,
                'realized_membres' => 0,
                'realized_rdv' => 0,
                'realized_match' => 0,
                'progress' => [
                    'ventes' => 0,
                    'membres' => 0,
                    'rdv' => 0,
                    'match' => 0,
                ],
            ];
        }

        // Calculate realized values
        $startDate = Carbon::create($year, $month, 1)->startOfMonth();
        $endDate = Carbon::create($year, $month, 1)->endOfMonth();

        $realizedVentes = Bill::where('matchmaker_id', $matchmakerId)
            ->where('status', 'paid')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->sum('total_amount') ?? 0;

        $realizedMembres = User::role('user')
            ->whereIn('status', ['member', 'client', 'client_expire'])
            ->where('assigned_matchmaker_id', $matchmakerId)
            ->whereBetween('approved_at', [$startDate, $endDate])
            ->count();

        $realizedRdv = 0; // Placeholder
        $realizedMatch = 0; // Placeholder

        // Calculate progress
        $progress = [
            'ventes' => $objective->target_ventes > 0 
                ? min(100, ($realizedVentes / $objective->target_ventes) * 100) 
                : 0,
            'membres' => $objective->target_membres > 0 
                ? min(100, ($realizedMembres / $objective->target_membres) * 100) 
                : 0,
            'rdv' => 0,
            'match' => 0,
        ];

        return [
            'target_ventes' => (float)$objective->target_ventes,
            'target_membres' => $objective->target_membres,
            'target_rdv' => $objective->target_rdv,
            'target_match' => $objective->target_match,
            'realized_ventes' => (float)$realizedVentes,
            'realized_membres' => $realizedMembres,
            'realized_rdv' => $realizedRdv,
            'realized_match' => $realizedMatch,
            'progress' => $progress,
        ];
    }

    /**
     * Get activity statistics
     */
    private function getActivityStatistics($matchmakerId, $startDate, $endDate)
    {
        // Activity per month/year
        $activity = [
            'bills_created' => Bill::where('matchmaker_id', $matchmakerId)
                ->whereBetween('created_at', [$startDate, $endDate])
                ->count(),
            'users_validated' => User::role('user')
                ->where('assigned_matchmaker_id', $matchmakerId)
                ->whereNotNull('approved_at')
                ->whereBetween('approved_at', [$startDate, $endDate])
                ->count(),
            'notes_created' => MatchmakerNote::where('author_id', $matchmakerId)
                ->whereBetween('created_at', [$startDate, $endDate])
                ->count(),
            'evaluations_created' => MatchmakerEvaluation::where('author_id', $matchmakerId)
                ->whereBetween('created_at', [$startDate, $endDate])
                ->count(),
        ];

        // First validation date
        $firstValidation = User::role('user')
            ->where('assigned_matchmaker_id', $matchmakerId)
            ->whereNotNull('approved_at')
            ->orderBy('approved_at', 'asc')
            ->value('approved_at');

        // Last activity date
        $lastBill = Bill::where('matchmaker_id', $matchmakerId)
            ->orderBy('created_at', 'desc')
            ->value('created_at');
        $lastNote = MatchmakerNote::where('author_id', $matchmakerId)
            ->orderBy('created_at', 'desc')
            ->value('created_at');
        $lastEvaluation = MatchmakerEvaluation::where('author_id', $matchmakerId)
            ->orderBy('created_at', 'desc')
            ->value('created_at');

        $lastActivity = collect([$lastBill, $lastNote, $lastEvaluation])
            ->filter()
            ->max();

        return [
            'activity' => $activity,
            'first_validation' => $firstValidation ? Carbon::parse($firstValidation)->format('Y-m-d') : null,
            'last_activity' => $lastActivity ? Carbon::parse($lastActivity)->format('Y-m-d H:i:s') : null,
        ];
    }

    /**
     * Get profile insights
     */
    private function getProfileInsights($matchmakerId, $startDate, $endDate)
    {
        $users = User::role('user')
            ->where('assigned_matchmaker_id', $matchmakerId)
            ->whereBetween('created_at', [$startDate, $endDate])
            ->with('profile')
            ->get();

        // Gender distribution
        $genderDistribution = $users->groupBy('gender')
            ->map->count()
            ->toArray();

        // Age distribution (if date of birth is available in profile)
        $ageGroups = ['18-25' => 0, '26-35' => 0, '36-45' => 0, '46-55' => 0, '56+' => 0];
        foreach ($users as $user) {
            if ($user->profile && isset($user->profile->date_naissance)) {
                $age = Carbon::parse($user->profile->date_naissance)->age;
                if ($age >= 18 && $age <= 25) $ageGroups['18-25']++;
                elseif ($age >= 26 && $age <= 35) $ageGroups['26-35']++;
                elseif ($age >= 36 && $age <= 45) $ageGroups['36-45']++;
                elseif ($age >= 46 && $age <= 55) $ageGroups['46-55']++;
                elseif ($age >= 56) $ageGroups['56+']++;
            }
        }

        // Geographic distribution
        $countryDistribution = $users->groupBy('country')
            ->map->count()
            ->toArray();
        $cityDistribution = $users->groupBy('city')
            ->map->count()
            ->toArray();

        // Matrimonial pack preferences
        $packPreferences = $users->filter(function($user) {
            return $user->profile && $user->profile->matrimonial_pack_id;
        })
        ->groupBy('profile.matrimonial_pack_id')
        ->map->count()
        ->toArray();

        return [
            'gender_distribution' => $genderDistribution,
            'age_distribution' => $ageGroups,
            'country_distribution' => $countryDistribution,
            'city_distribution' => $cityDistribution,
            'pack_preferences' => $packPreferences,
        ];
    }
}

