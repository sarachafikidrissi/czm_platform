<?php

namespace App\Http\Controllers;

use App\Models\Agency;
use App\Models\Bill;
use App\Models\MonthlyObjective;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

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
        $agencyId = $request->input('agency_id') ? (int) $request->input('agency_id') : null;

        // Determine target user and role type for calculations
        $targetUserId = null;
        $targetAgencyId = null;
        $targetRoleType = null;
        $scopeType = 'self';

        if ($roleName === 'admin') {
            // Admin can view agency-level or individual staff results
            if ($userId) {
                $targetUser = User::find($userId);
                if (! $targetUser) {
                    abort(404, 'User not found.');
                }
                $targetUserId = $userId;
                // Determine role type from user's role
                $userRole = DB::table('model_has_roles')
                    ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
                    ->where('model_has_roles.model_id', $userId)
                    ->whereIn('roles.name', ['matchmaker', 'manager'])
                    ->value('roles.name');
                if (! $userRole) {
                    abort(403, 'Unauthorized staff selection.');
                }
                $targetRoleType = $userRole;
                $scopeType = $userRole === 'manager' ? 'manager_individual' : 'matchmaker_individual';
            } elseif ($agencyId) {
                $agency = Agency::find($agencyId);
                if (! $agency) {
                    abort(404, 'Agency not found.');
                }
                $targetAgencyId = $agency->id;
                $targetRoleType = 'manager';
                $scopeType = 'agency';
            } else {
                // Admin default: no specific user selected ("All")
                $targetUserId = null;
                $targetRoleType = 'matchmaker';
                $scopeType = 'all';
            }
        } elseif ($roleName === 'matchmaker') {
            // Matchmaker sees their own results
            $targetUserId = $me->id;
            $targetRoleType = 'matchmaker';
            $scopeType = 'self';
        } elseif ($roleName === 'manager') {
            // Manager sees agency aggregate by default, or a specific matchmaker in their agency when selected
            if ($userId) {
                $targetUser = User::where('id', $userId)
                    ->where('agency_id', $me->agency_id)
                    ->where('approval_status', 'approved')
                    ->whereHas('roles', function ($q) {
                        $q->where('name', 'matchmaker');
                    })
                    ->first();

                if (! $targetUser) {
                    abort(403, 'Unauthorized staff selection.');
                }

                $targetUserId = $targetUser->id;
                $targetRoleType = 'matchmaker';
                $scopeType = 'matchmaker_individual';
            } else {
                // Keep existing manager default behavior
                $targetUserId = $me->id;
                $targetRoleType = 'manager';
                $scopeType = 'agency';
            }
        } else {
            abort(403, 'Unauthorized access.');
        }

        // Resolve objective: agency row, per-user row, or role default (user_id null)
        if ($scopeType === 'agency') {
            $agencyIdForObjective = $roleName === 'admin' ? $targetAgencyId : $me->agency_id;
            $objective = $agencyIdForObjective
                ? $this->resolveObjectiveForAgency((int) $agencyIdForObjective, $month, $year)
                : null;
        } else {
            $objective = $this->resolveObjectiveForView(
                $targetRoleType,
                $month,
                $year,
                $this->objectiveUserIdForView($roleName, $scopeType, $targetUserId)
            );
        }

        // Calculate realized values based on selected scope
        if ($scopeType === 'manager_individual') {
            $realized = $this->calculateRealizedForManager($targetUserId, $month, $year);
        } elseif ($scopeType === 'agency') {
            if ($roleName === 'admin') {
                $realized = $this->calculateRealizedForAgencyById($targetAgencyId, $month, $year);
            } else {
                $realized = $this->calculateRealizedForAgency($targetUserId, $month, $year);
            }
        } elseif ($scopeType === 'all') {
            $realized = $this->calculateRealizedForAllMatchmakers($month, $year);
        } elseif ($targetRoleType === 'matchmaker') {
            $realized = $this->calculateRealizedForMatchmaker($targetUserId, $month, $year);
        } else {
            $realized = $this->calculateRealizedForManager($targetUserId, $month, $year);
        }

        // Calculate progress and commission
        $progress = $this->calculateProgress($objective, $realized);
        $commission = $this->calculateCommission($progress, $realized);

        // Reuse the same users query for admin and manager with role-based constraints
        $users = [];
        $agencies = [];
        if (in_array($roleName, ['admin', 'manager'])) {
            $usersQuery = User::where('approval_status', 'approved')
                ->with('roles');

            if ($roleName === 'admin') {
                $usersQuery->whereHas('roles', function ($q) {
                    $q->whereIn('name', ['matchmaker', 'manager']);
                });
                if ($agencyId) {
                    $usersQuery->where('agency_id', $agencyId);
                }
            } else {
                $usersQuery->where('agency_id', $me->agency_id)
                    ->whereHas('roles', function ($q) {
                        $q->where('name', 'matchmaker');
                    });
            }

            $users = $usersQuery->get(['id', 'name', 'email', 'agency_id']);
        }
        if ($roleName === 'admin') {
            $agencies = Agency::orderBy('name')->get(['id', 'name']);
        }

        $staffForObjectives = [];
        if ($roleName === 'admin') {
            $staffForObjectives = User::where('approval_status', 'approved')
                ->whereHas('roles', function ($q) {
                    $q->whereIn('name', ['matchmaker', 'manager']);
                })
                ->with('roles')
                ->orderBy('name')
                ->get(['id', 'name', 'email', 'agency_id']);
        }

        $selectedFilterUserId = in_array($scopeType, ['matchmaker_individual', 'manager_individual']) ? $targetUserId : null;

        return Inertia::render('objectives/index', [
            'objective' => $objective,
            'realized' => $realized,
            'progress' => $progress,
            'commission' => $commission,
            'month' => $month,
            'year' => $year,
            'userId' => $selectedFilterUserId,
            'agencyId' => $targetAgencyId,
            'roleType' => $targetRoleType,
            'scopeType' => $scopeType,
            'users' => $users,
            'agencies' => $agencies,
            'staffForObjectives' => $staffForObjectives,
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

        $objectiveScope = $request->input('objective_scope', 'staff');

        if ($objectiveScope === 'agency') {
            $validated = $request->validate([
                'objective_scope' => 'required|in:agency',
                'agency_id' => 'required|exists:agencies,id',
                'month' => 'required|integer|min:1|max:12',
                'year' => 'required|integer|min:2020|max:2100',
                'target_ventes' => 'required|numeric|min:0',
                'target_membres' => 'required|integer|min:0',
                'target_rdv' => 'required|integer|min:0',
                'target_match' => 'required|integer|min:0',
            ]);

            $targets = [
                'target_ventes' => $validated['target_ventes'],
                'target_membres' => $validated['target_membres'],
                'target_rdv' => $validated['target_rdv'],
                'target_match' => $validated['target_match'],
            ];

            MonthlyObjective::updateOrCreate(
                [
                    'agency_id' => (int) $validated['agency_id'],
                    'role_type' => MonthlyObjective::ROLE_TYPE_AGENCY,
                    'user_id' => null,
                    'month' => $validated['month'],
                    'year' => $validated['year'],
                ],
                $targets
            );

            return redirect()->back()->with('success', 'Objective saved successfully.');
        }

        $validated = $request->validate([
            'objective_scope' => 'nullable|in:staff',
            'role_type' => 'required|in:matchmaker,manager',
            'month' => 'required|integer|min:1|max:12',
            'year' => 'required|integer|min:2020|max:2100',
            'target_ventes' => 'required|numeric|min:0',
            'target_membres' => 'required|integer|min:0',
            'target_rdv' => 'required|integer|min:0',
            'target_match' => 'required|integer|min:0',
            'user_ids' => 'nullable|array',
            'user_ids.*' => 'integer|exists:users,id',
            'agency_id' => 'nullable|exists:agencies,id',
        ]);

        $userIds = array_values(array_unique(array_filter($validated['user_ids'] ?? [])));

        $targets = [
            'target_ventes' => $validated['target_ventes'],
            'target_membres' => $validated['target_membres'],
            'target_rdv' => $validated['target_rdv'],
            'target_match' => $validated['target_match'],
        ];

        if (empty($userIds)) {
            // Role-based default (applies to all users of this role without a per-user row)
            MonthlyObjective::updateOrCreate(
                [
                    'role_type' => $validated['role_type'],
                    'user_id' => null,
                    'agency_id' => null,
                    'month' => $validated['month'],
                    'year' => $validated['year'],
                ],
                $targets
            );
        } else {
            foreach ($userIds as $uid) {
                $this->assertStaffMatchesObjective(
                    (int) $uid,
                    $validated['role_type'],
                    isset($validated['agency_id']) ? (int) $validated['agency_id'] : null
                );
                MonthlyObjective::updateOrCreate(
                    [
                        'role_type' => $validated['role_type'],
                        'user_id' => (int) $uid,
                        'agency_id' => null,
                        'month' => $validated['month'],
                        'year' => $validated['year'],
                    ],
                    $targets
                );
            }
        }

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
            if (! in_array($roleName, ['admin', 'manager', 'matchmaker'])) {
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
            $agencyId = $request->input('agency_id') ? (int) $request->input('agency_id') : null;

            // Determine target user and role type
            $targetUserId = null;
            $targetRoleType = null;
            $scopeType = 'self';

            if ($roleName === 'admin') {
                if ($userId) {
                    $targetUserId = $userId;
                    $userRole = DB::table('model_has_roles')
                        ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
                        ->where('model_has_roles.model_id', $userId)
                        ->whereIn('roles.name', ['matchmaker', 'manager'])
                        ->value('roles.name');
                    if (! $userRole) {
                        abort(403, 'Unauthorized staff selection.');
                    }
                    $targetRoleType = $userRole;
                    $scopeType = $userRole === 'manager' ? 'manager_individual' : 'matchmaker_individual';
                } elseif ($agencyId) {
                    if (! Agency::where('id', $agencyId)->exists()) {
                        abort(404, 'Agency not found.');
                    }
                    $targetRoleType = 'manager';
                    $scopeType = 'agency';
                } else {
                    $targetRoleType = 'matchmaker';
                    $scopeType = 'all';
                }
            } elseif ($roleName === 'matchmaker') {
                $targetUserId = $me->id;
                $targetRoleType = 'matchmaker';
            } elseif ($roleName === 'manager') {
                $targetUserId = $me->id;
                $targetRoleType = 'manager';
                $scopeType = 'agency';
            }

            $startDate = Carbon::create($year, $month, 1)->startOfMonth();
            $endDate = Carbon::create($year, $month, 1)->endOfMonth();

            $details = [];

            if ($type === 'ventes') {
                if ($scopeType === 'agency' || $scopeType === 'all') {
                    $matchmakerIds = User::role('matchmaker')
                        ->where('approval_status', 'approved')
                        ->when($scopeType === 'agency', function ($query) use ($agencyId, $me) {
                            $query->where('agency_id', $agencyId ?? $me->agency_id);
                        })
                        ->pluck('id');

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
                } elseif ($scopeType === 'manager_individual') {
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
                } elseif ($targetRoleType === 'matchmaker') {
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
                if ($scopeType === 'agency' || $scopeType === 'all') {
                    $matchmakerIds = User::role('matchmaker')
                        ->where('approval_status', 'approved')
                        ->when($scopeType === 'agency', function ($query) use ($agencyId, $me) {
                            $query->where('agency_id', $agencyId ?? $me->agency_id);
                        })
                        ->pluck('id');

                    $details = User::role('user')
                        ->whereIn('status', ['member', 'client', 'client_expire'])
                        ->whereIn('assigned_matchmaker_id', $matchmakerIds)
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
                } elseif ($scopeType === 'manager_individual') {
                    $details = User::role('user')
                        ->whereIn('status', ['member', 'client', 'client_expire'])
                        ->where('validated_by_manager_id', $targetUserId)
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
                } elseif ($targetRoleType === 'matchmaker') {
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
                                ->where(function ($query) use ($matchmakerIds, $targetUserId) {
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
            return response()->json([
                'error' => 'Failed to load details: '.$e->getMessage(),
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
        if (! $manager || ! $manager->agency_id) {
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
            ->where(function ($query) use ($matchmakerIds, $managerId) {
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
     * Calculate realized values for a manager's own production.
     */
    private function calculateRealizedForManager($managerId, $month, $year)
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
     * Calculate realized values for an agency (all approved matchmakers in the agency).
     */
    private function calculateRealizedForAgencyById($agencyId, $month, $year)
    {
        $startDate = Carbon::create($year, $month, 1)->startOfMonth();
        $endDate = Carbon::create($year, $month, 1)->endOfMonth();

        $matchmakerIds = User::role('matchmaker')
            ->where('agency_id', $agencyId)
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

    /**
     * Calculate realized values across all approved matchmakers.
     */
    private function calculateRealizedForAllMatchmakers($month, $year)
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

    /**
     * User id to use when resolving a per-user objective row (vs role default).
     */
    private function objectiveUserIdForView(string $roleName, string $scopeType, ?int $targetUserId): ?int
    {
        if (in_array($scopeType, ['matchmaker_individual', 'manager_individual'], true)) {
            return $targetUserId;
        }
        if ($scopeType === 'self' && $roleName === 'matchmaker') {
            return $targetUserId;
        }

        return null;
    }

    /**
     * Agency-level objective (aggregated performance) for a specific agency.
     * Falls back to the global manager role default when no agency row exists.
     */
    private function resolveObjectiveForAgency(int $agencyId, int $month, int $year): ?MonthlyObjective
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

    /**
     * Prefer per-user objective when set; otherwise role-based default (user_id null).
     */
    private function resolveObjectiveForView(?string $roleType, int $month, int $year, ?int $userId): ?MonthlyObjective
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

    /**
     * Ensure selected staff matches role type and optional agency filter.
     */
    private function assertStaffMatchesObjective(int $userId, string $roleType, ?int $agencyId): void
    {
        $user = User::findOrFail($userId);
        $userRole = DB::table('model_has_roles')
            ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
            ->where('model_has_roles.model_id', $userId)
            ->whereIn('roles.name', ['matchmaker', 'manager'])
            ->value('roles.name');
        if ($userRole !== $roleType) {
            throw ValidationException::withMessages([
                'user_ids' => 'Each selected user must match the chosen role type.',
            ]);
        }
        if ($agencyId !== null && (int) $user->agency_id !== $agencyId) {
            throw ValidationException::withMessages([
                'user_ids' => 'Each selected user must belong to the selected agency.',
            ]);
        }
    }

    /**
     * Calculate progress percentage for each metric
     */
    private function calculateProgress($objective, $realized)
    {
        if (! $objective) {
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
