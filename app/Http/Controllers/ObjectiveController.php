<?php

namespace App\Http\Controllers;

use App\Models\MonthlyObjective;
use App\Models\User;
use App\Models\Bill;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Carbon\Carbon;

class ObjectiveController extends Controller
{
    /**
     * Display objectives dashboard
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

        // Get month and year from request, default to current month
        $month = $request->integer('month', now()->month);
        $year = $request->integer('year', now()->year);
        $userId = $request->input('user_id') ? (int) $request->input('user_id') : null;

        // Determine target user and role type for calculations
        $targetUserId = null;
        $targetRoleType = null;
        
        if ($roleName === 'admin') {
            // Admin can view any user's results
            if ($userId) {
                $targetUser = User::find($userId);
                if (!$targetUser) {
                    abort(404, 'User not found.');
                }
                $targetUserId = $userId;
                // Determine role type from user's role
                $userRole = DB::table('model_has_roles')
                    ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
                    ->where('model_has_roles.model_id', $userId)
                    ->whereIn('roles.name', ['matchmaker', 'manager'])
                    ->value('roles.name');
                $targetRoleType = $userRole ?: 'matchmaker';
            } else {
                // Default to first matchmaker for admin view
                $firstMatchmaker = User::role('matchmaker')
                    ->where('approval_status', 'approved')
                    ->first();
                $targetUserId = $firstMatchmaker ? $firstMatchmaker->id : $me->id;
                $targetRoleType = 'matchmaker';
            }
        } elseif ($roleName === 'matchmaker') {
            // Matchmaker sees their own results
            $targetUserId = $me->id;
            $targetRoleType = 'matchmaker';
        } elseif ($roleName === 'manager') {
            // Manager sees their agency's results
            $targetUserId = $me->id;
            $targetRoleType = 'manager';
        } else {
            abort(403, 'Unauthorized access.');
        }

        // Get objective for the role type (shared objective, not per user)
        $objective = MonthlyObjective::where('role_type', $targetRoleType)
            ->whereNull('user_id') // Shared objectives have null user_id
            ->where('month', $month)
            ->where('year', $year)
            ->first();

        // Calculate realized values based on individual user/agency
        if ($targetRoleType === 'matchmaker') {
            $realized = $this->calculateRealizedForMatchmaker($targetUserId, $month, $year);
        } else { // manager
            $realized = $this->calculateRealizedForAgency($targetUserId, $month, $year);
        }

        // Calculate progress and commission
        $progress = $this->calculateProgress($objective, $realized);
        $commission = $this->calculateCommission($progress, $realized);

        // For admin: get list of all matchmakers and managers
        $users = [];
        if ($roleName === 'admin') {
            $users = User::whereHas('roles', function($q) {
                $q->whereIn('name', ['matchmaker', 'manager']);
            })
            ->where('approval_status', 'approved')
            ->with('roles')
            ->get(['id', 'name', 'email', 'agency_id']);
        }

        return Inertia::render('objectives/index', [
            'objective' => $objective,
            'realized' => $realized,
            'progress' => $progress,
            'commission' => $commission,
            'month' => $month,
            'year' => $year,
            'userId' => $targetUserId,
            'roleType' => $targetRoleType,
            'users' => $users,
            'canEdit' => $roleName === 'admin',
            'currentUser' => [
                'id' => $me->id,
                'name' => $me->name,
                'role' => $roleName,
            ],
        ]);
    }

    /**
     * Store or update objective (Admin only)
     */
    public function store(Request $request)
    {
        $me = Auth::user();
        $roleName = null;
        if ($me) {
            $roleName = DB::table('model_has_roles')
                ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
                ->where('model_has_roles.model_id', $me->id)
                ->value('roles.name');
        }

        if ($roleName !== 'admin') {
            abort(403, 'Only admins can set objectives.');
        }

        $request->validate([
            'role_type' => 'required|in:matchmaker,manager',
            'month' => 'required|integer|min:1|max:12',
            'year' => 'required|integer|min:2020|max:2100',
            'target_ventes' => 'required|numeric|min:0',
            'target_membres' => 'required|integer|min:0',
            'target_rdv' => 'required|integer|min:0',
            'target_match' => 'required|integer|min:0',
        ]);

        // Objectives are shared per role type (not per user)
        $objective = MonthlyObjective::updateOrCreate(
            [
                'role_type' => $request->role_type,
                'user_id' => null, // Shared objectives have null user_id
                'month' => $request->month,
                'year' => $request->year,
            ],
            [
                'target_ventes' => $request->target_ventes,
                'target_membres' => $request->target_membres,
                'target_rdv' => $request->target_rdv,
                'target_match' => $request->target_match,
            ]
        );

        return redirect()->back()->with('success', 'Objective saved successfully.');
    }

    /**
     * Mark commission as paid (Admin only)
     */
    public function markCommissionPaid(Request $request, $id)
    {
        $me = Auth::user();
        $roleName = null;
        if ($me) {
            $roleName = DB::table('model_has_roles')
                ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
                ->where('model_has_roles.model_id', $me->id)
                ->value('roles.name');
        }

        if ($roleName !== 'admin') {
            abort(403, 'Only admins can mark commissions as paid.');
        }

        $objective = MonthlyObjective::findOrFail($id);
        $objective->update([
            'commission_paid' => true,
            'commission_paid_at' => now(),
            'commission_paid_by' => $me->id,
        ]);

        return redirect()->back()->with('success', 'Commission marked as paid.');
    }

    /**
     * Get detailed history for a specific objective type
     */
    public function getDetails(Request $request)
    {
        try {
            $me = Auth::user();
            $roleName = null;
            if ($me) {
                $roleName = DB::table('model_has_roles')
                    ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
                    ->where('model_has_roles.model_id', $me->id)
                    ->value('roles.name');
            }

            // Only allow admin, manager, and matchmaker
            if (!in_array($roleName, ['admin', 'manager', 'matchmaker'])) {
                abort(403, 'Unauthorized access.');
            }

            $request->validate([
                'type' => 'required|in:ventes,membres,rdv,match',
                'user_id' => 'nullable|exists:users,id',
                'month' => 'required|integer|min:1|max:12',
                'year' => 'required|integer|min:2020|max:2100',
            ]);

            $month = $request->integer('month');
            $year = $request->integer('year');
            $type = $request->input('type');
            $userId = $request->input('user_id') ? (int) $request->input('user_id') : null;

            // Determine target user and role type
            $targetUserId = null;
            $targetRoleType = null;

            if ($roleName === 'admin') {
                if ($userId) {
                    $targetUserId = $userId;
                    $userRole = DB::table('model_has_roles')
                        ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
                        ->where('model_has_roles.model_id', $userId)
                        ->whereIn('roles.name', ['matchmaker', 'manager'])
                        ->value('roles.name');
                    $targetRoleType = $userRole ?: 'matchmaker';
                } else {
                    abort(400, 'User ID is required for admin.');
                }
            } elseif ($roleName === 'matchmaker') {
                $targetUserId = $me->id;
                $targetRoleType = 'matchmaker';
            } elseif ($roleName === 'manager') {
                $targetUserId = $me->id;
                $targetRoleType = 'manager';
            }

            $startDate = Carbon::create($year, $month, 1)->startOfMonth();
            $endDate = Carbon::create($year, $month, 1)->endOfMonth();

            $details = [];

            if ($type === 'ventes') {
                if ($targetRoleType === 'matchmaker') {
                    $details = Bill::where('matchmaker_id', $targetUserId)
                        ->where('status', 'paid')
                        ->whereBetween('created_at', [$startDate, $endDate])
                        ->with(['user', 'profile'])
                        ->orderBy('created_at', 'desc')
                        ->get()
                        ->map(function ($bill) {
                            return [
                                'id' => $bill->id,
                                'bill_number' => $bill->bill_number,
                                'user_name' => $bill->user->name ?? 'N/A',
                                'user_email' => $bill->user->email ?? 'N/A',
                                'total_amount' => $bill->total_amount,
                                'pack_name' => $bill->pack_name,
                                'payment_method' => $bill->payment_method,
                                'created_at' => $bill->created_at->format('Y-m-d H:i:s'),
                                'bill_date' => $bill->bill_date->format('Y-m-d'),
                            ];
                        });
                } else { // manager
                    $manager = User::find($targetUserId);
                    if ($manager && $manager->agency_id) {
                        $matchmakerIds = User::role('matchmaker')
                            ->where('agency_id', $manager->agency_id)
                            ->where('approval_status', 'approved')
                            ->pluck('id');

                        if ($matchmakerIds->isEmpty()) {
                            $details = collect([]);
                        } else {
                            $details = Bill::whereIn('matchmaker_id', $matchmakerIds)
                                ->where('status', 'paid')
                                ->whereBetween('created_at', [$startDate, $endDate])
                                ->with(['user', 'profile', 'matchmaker'])
                                ->orderBy('created_at', 'desc')
                                ->get()
                                ->map(function ($bill) {
                                    return [
                                        'id' => $bill->id,
                                        'bill_number' => $bill->bill_number,
                                        'user_name' => $bill->user->name ?? 'N/A',
                                        'user_email' => $bill->user->email ?? 'N/A',
                                        'matchmaker_name' => $bill->matchmaker->name ?? 'N/A',
                                        'total_amount' => $bill->total_amount,
                                        'pack_name' => $bill->pack_name,
                                        'payment_method' => $bill->payment_method,
                                        'created_at' => $bill->created_at->format('Y-m-d H:i:s'),
                                        'bill_date' => $bill->bill_date->format('Y-m-d'),
                                    ];
                                });
                        }
                    } else {
                        $details = collect([]);
                    }
                }
            } elseif ($type === 'membres') {
                if ($targetRoleType === 'matchmaker') {
                    $details = User::role('user')
                        ->whereIn('status', ['member', 'client', 'client_expire'])
                        ->where('assigned_matchmaker_id', $targetUserId)
                        ->whereNotNull('approved_at')
                        ->whereBetween('approved_at', [$startDate, $endDate])
                        ->with(['profile'])
                        ->orderBy('approved_at', 'desc')
                        ->get()
                        ->map(function ($user) {
                            $approvedAt = $user->approved_at;
                            if ($approvedAt && is_string($approvedAt)) {
                                $approvedAt = Carbon::parse($approvedAt);
                            }
                            return [
                                'id' => $user->id,
                                'name' => $user->name,
                                'email' => $user->email,
                                'phone' => $user->phone,
                                'status' => $user->status,
                                'approved_at' => $approvedAt ? $approvedAt->format('Y-m-d H:i:s') : null,
                            ];
                        });
                } else { // manager
                    $manager = User::find($targetUserId);
                    if ($manager && $manager->agency_id) {
                        $matchmakerIds = User::role('matchmaker')
                            ->where('agency_id', $manager->agency_id)
                            ->where('approval_status', 'approved')
                            ->pluck('id');

                        if ($matchmakerIds->isEmpty()) {
                            $details = collect([]);
                        } else {
                            $details = User::role('user')
                                ->whereIn('status', ['member', 'client', 'client_expire'])
                                ->where(function($query) use ($matchmakerIds, $targetUserId) {
                                    $query->whereIn('assigned_matchmaker_id', $matchmakerIds)
                                          ->orWhere('validated_by_manager_id', $targetUserId);
                                })
                                ->whereNotNull('approved_at')
                                ->whereBetween('approved_at', [$startDate, $endDate])
                                ->with(['profile', 'assignedMatchmaker'])
                                ->orderBy('approved_at', 'desc')
                                ->get()
                                ->map(function ($user) {
                                    $approvedAt = $user->approved_at;
                                    if ($approvedAt && is_string($approvedAt)) {
                                        $approvedAt = Carbon::parse($approvedAt);
                                    }
                                    return [
                                        'id' => $user->id,
                                        'name' => $user->name,
                                        'email' => $user->email,
                                        'phone' => $user->phone,
                                        'status' => $user->status,
                                        'matchmaker_name' => $user->assignedMatchmaker ? $user->assignedMatchmaker->name : 'N/A',
                                        'approved_at' => $approvedAt ? $approvedAt->format('Y-m-d H:i:s') : null,
                                    ];
                                });
                        }
                    } else {
                        $details = collect([]);
                    }
                }
            } elseif ($type === 'rdv' || $type === 'match') {
                // Placeholder for future implementation
                $details = [];
            }

            // Convert collection to array if needed
            if ($details instanceof \Illuminate\Support\Collection) {
                $details = $details->toArray();
            }

            return response()->json([
                'type' => $type,
                'month' => $month,
                'year' => $year,
                'total' => is_array($details) ? count($details) : 0,
                'details' => $details,
            ]);
        } catch (\Exception $e) {
            \Log::error('Error fetching objective details: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'request' => $request->all(),
            ]);
            
            return response()->json([
                'error' => 'Failed to load details: ' . $e->getMessage(),
                'type' => $request->input('type'),
            ], 500);
        }
    }

    /**
     * Calculate realized values for a specific matchmaker
     */
    private function calculateRealizedForMatchmaker($matchmakerId, $month, $year)
    {
        $startDate = Carbon::create($year, $month, 1)->startOfMonth();
        $endDate = Carbon::create($year, $month, 1)->endOfMonth();

        // Ventes: Sum of paid bills created by this matchmaker in the month
        $ventes = Bill::where('matchmaker_id', $matchmakerId)
            ->where('status', 'paid')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->sum('total_amount');

        // Membres: Count of users validated by this matchmaker in the month
        $membres = User::role('user')
            ->whereIn('status', ['member', 'client', 'client_expire'])
            ->where('assigned_matchmaker_id', $matchmakerId)
            ->whereBetween('approved_at', [$startDate, $endDate])
            ->count();

        // RDV: To be implemented later (placeholder)
        $rdv = 0;

        // Match: To be implemented later (placeholder)
        $match = 0;

        return [
            'ventes' => (float) $ventes,
            'membres' => (int) $membres,
            'rdv' => (int) $rdv,
            'match' => (int) $match,
        ];
    }

    /**
     * Calculate realized values for a manager's agency
     * Aggregates data from all matchmakers in the manager's agency
     */
    private function calculateRealizedForAgency($managerId, $month, $year)
    {
        $startDate = Carbon::create($year, $month, 1)->startOfMonth();
        $endDate = Carbon::create($year, $month, 1)->endOfMonth();

        // Get the manager's agency
        $manager = User::find($managerId);
        if (!$manager || !$manager->agency_id) {
            return [
                'ventes' => 0,
                'membres' => 0,
                'rdv' => 0,
                'match' => 0,
            ];
        }

        // Get all matchmaker IDs in this agency
        $matchmakerIds = User::role('matchmaker')
            ->where('agency_id', $manager->agency_id)
            ->where('approval_status', 'approved')
            ->pluck('id');

        // Ventes: Sum of paid bills created by all matchmakers in this agency in the month
        $ventes = Bill::whereIn('matchmaker_id', $matchmakerIds)
            ->where('status', 'paid')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->sum('total_amount');

        // Membres: Count of users validated by matchmakers in this agency or by the manager in the month
        $membres = User::role('user')
            ->whereIn('status', ['member', 'client', 'client_expire'])
            ->where(function($query) use ($matchmakerIds, $managerId) {
                $query->whereIn('assigned_matchmaker_id', $matchmakerIds)
                      ->orWhere('validated_by_manager_id', $managerId);
            })
            ->whereBetween('approved_at', [$startDate, $endDate])
            ->count();

        // RDV: To be implemented later (placeholder)
        $rdv = 0;

        // Match: To be implemented later (placeholder)
        $match = 0;

        return [
            'ventes' => (float) $ventes,
            'membres' => (int) $membres,
            'rdv' => (int) $rdv,
            'match' => (int) $match,
        ];
    }

    /**
     * Calculate progress percentage for each metric
     */
    private function calculateProgress($objective, $realized)
    {
        if (!$objective) {
            return [
                'ventes' => 0,
                'membres' => 0,
                'rdv' => 0,
                'match' => 0,
            ];
        }

        return [
            'ventes' => $objective->target_ventes > 0 
                ? min(100, ($realized['ventes'] / $objective->target_ventes) * 100) 
                : 0,
            'membres' => $objective->target_membres > 0 
                ? min(100, ($realized['membres'] / $objective->target_membres) * 100) 
                : 0,
            'rdv' => $objective->target_rdv > 0 
                ? min(100, ($realized['rdv'] / $objective->target_rdv) * 100) 
                : 0,
            'match' => $objective->target_match > 0 
                ? min(100, ($realized['match'] / $objective->target_match) * 100) 
                : 0,
        ];
    }

    /**
     * Calculate commission eligibility and amount
     * Note: Commission amount is only calculated for Ventes (monetary)
     * For other metrics, only eligibility is tracked
     */
    private function calculateCommission($progress, $realized)
    {
        $commission = [
            'ventes' => [
                'eligible' => $progress['ventes'] >= 50,
                'amount' => $progress['ventes'] >= 50 ? $realized['ventes'] * 0.10 : 0,
            ],
            'membres' => [
                'eligible' => $progress['membres'] >= 50,
                'amount' => 0, // Commission amount for membres to be determined separately
            ],
            'rdv' => [
                'eligible' => $progress['rdv'] >= 50,
                'amount' => 0, // Commission amount for RDV to be determined separately
            ],
            'match' => [
                'eligible' => $progress['match'] >= 50,
                'amount' => 0, // Commission amount for Match to be determined separately
            ],
        ];

        return $commission;
    }
}
