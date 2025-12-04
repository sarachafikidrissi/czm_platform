<?php

namespace App\Http\Controllers;

use App\Models\ReactivationRequest;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ReactivationRequestController extends Controller
{
    /**
     * Admin/Manager/Matchmaker: View reactivation requests
     */
    public function index()
    {
        $me = Auth::user();
        $roleName = $this->getUserRole($me);

        if ($roleName === 'admin') {
            // Admin sees all pending requests
            $requests = ReactivationRequest::with(['user.profile', 'user.assignedMatchmaker'])
                ->where('status', 'pending')
                ->orderBy('created_at', 'desc')
                ->get();
        } elseif ($roleName === 'matchmaker') {
            // Matchmaker sees requests for their assigned members/clients only
            $requests = ReactivationRequest::with(['user.profile', 'user.assignedMatchmaker'])
                ->where('status', 'pending')
                ->whereHas('user', function($query) use ($me) {
                    $query->where('assigned_matchmaker_id', $me->id)
                          ->whereIn('status', ['member', 'client', 'client_expire']);
                })
                ->orderBy('created_at', 'desc')
                ->get();
        } elseif ($roleName === 'manager') {
            // Manager sees requests for:
            // 1. Users from their agency
            // 2. Users validated by them
            // 3. Users assigned to matchmakers in their agency
            if (!$me->agency_id) {
                // If manager has no agency, return empty results
                $requests = collect();
            } else {
                // Get all matchmaker IDs in the manager's agency
                $matchmakerIds = User::role('matchmaker')
                    ->where('agency_id', $me->agency_id)
                    ->pluck('id')
                    ->toArray();
                
                $requests = ReactivationRequest::with(['user.profile', 'user.assignedMatchmaker'])
                    ->where('status', 'pending')
                    ->whereHas('user', function($query) use ($me, $matchmakerIds) {
                        $query->whereIn('status', ['member', 'client', 'client_expire'])
                              ->where(function($q) use ($me, $matchmakerIds) {
                                  // Users from their agency
                                  $q->where('agency_id', $me->agency_id)
                                    // OR users validated by them
                                    ->orWhere('validated_by_manager_id', $me->id)
                                    // OR users assigned to matchmakers in their agency
                                    ->orWhere(function($subQ) use ($matchmakerIds) {
                                        if (!empty($matchmakerIds)) {
                                            $subQ->whereIn('assigned_matchmaker_id', $matchmakerIds);
                                        }
                                    });
                              });
                    })
                    ->orderBy('created_at', 'desc')
                    ->get();
            }
        } else {
            abort(403, 'Unauthorized.');
        }

        // Determine the route prefix based on role
        $routePrefix = $roleName === 'admin' ? 'admin' : 'staff';
        
        return Inertia::render('admin/reactivation-requests', [
            'requests' => $requests,
            'routePrefix' => $routePrefix,
        ]);
    }

    /**
     * Approve a reactivation request
     */
    public function approve(Request $request, $id)
    {
        $reactivationRequest = ReactivationRequest::findOrFail($id);
        $me = Auth::user();
        $roleName = $this->getUserRole($me);

        // Check permissions
        if ($roleName === 'admin') {
            // Admin can approve any request
        } elseif ($roleName === 'matchmaker') {
            // Matchmaker can only approve requests for their assigned members/clients
            $user = $reactivationRequest->user;
            if ($user->assigned_matchmaker_id !== $me->id || 
                !in_array($user->status, ['member', 'client', 'client_expire'])) {
                abort(403, 'Vous ne pouvez approuver que les demandes pour vos membres/clients assignés.');
            }
        } elseif ($roleName === 'manager') {
            // Manager can approve requests for users from their agency, validated by them, or assigned to matchmakers in their agency
            $user = $reactivationRequest->user;
            if (!in_array($user->status, ['member', 'client', 'client_expire'])) {
                abort(403, 'Vous ne pouvez approuver que les demandes pour les membres/clients.');
            }
            
            $canApprove = false;
            if ($me->agency_id && $user->agency_id === $me->agency_id) {
                $canApprove = true;
            }
            if ($user->validated_by_manager_id === $me->id) {
                $canApprove = true;
            }
            if ($me->agency_id && $user->assigned_matchmaker_id) {
                $matchmaker = User::find($user->assigned_matchmaker_id);
                if ($matchmaker && $matchmaker->agency_id === $me->agency_id) {
                    $canApprove = true;
                }
            }
            
            if (!$canApprove) {
                abort(403, 'Vous ne pouvez approuver que les demandes pour les utilisateurs de votre agence ou validés par vous.');
            }
        } else {
            abort(403, 'Unauthorized.');
        }

        // Activate the account
        $profile = $reactivationRequest->user->profile;
        if ($profile) {
            $profile->update([
                'account_status' => 'active',
                'activation_reason' => 'Réactivé via demande de réactivation - ' . ($request->review_notes ?? 'Approuvé'),
                'deactivation_reason' => null,
            ]);
        }

        // Update request status
        $reactivationRequest->update([
            'status' => 'approved',
            'reviewed_by' => $me->id,
            'reviewed_at' => now(),
            'review_notes' => $request->review_notes ?? null,
        ]);

        return redirect()->back()->with('success', 'Demande de réactivation approuvée avec succès.');
    }

    /**
     * Reject a reactivation request
     */
    public function reject(Request $request, $id)
    {
        $reactivationRequest = ReactivationRequest::findOrFail($id);
        $me = Auth::user();
        $roleName = $this->getUserRole($me);

        // Check permissions
        if ($roleName === 'admin') {
            // Admin can reject any request
        } elseif ($roleName === 'matchmaker') {
            // Matchmaker can only reject requests for their assigned members/clients
            $user = $reactivationRequest->user;
            if ($user->assigned_matchmaker_id !== $me->id || 
                !in_array($user->status, ['member', 'client', 'client_expire'])) {
                abort(403, 'Vous ne pouvez rejeter que les demandes pour vos membres/clients assignés.');
            }
        } elseif ($roleName === 'manager') {
            // Manager can reject requests for users from their agency, validated by them, or assigned to matchmakers in their agency
            $user = $reactivationRequest->user;
            if (!in_array($user->status, ['member', 'client', 'client_expire'])) {
                abort(403, 'Vous ne pouvez rejeter que les demandes pour les membres/clients.');
            }
            
            $canReject = false;
            if ($me->agency_id && $user->agency_id === $me->agency_id) {
                $canReject = true;
            }
            if ($user->validated_by_manager_id === $me->id) {
                $canReject = true;
            }
            if ($me->agency_id && $user->assigned_matchmaker_id) {
                $matchmaker = User::find($user->assigned_matchmaker_id);
                if ($matchmaker && $matchmaker->agency_id === $me->agency_id) {
                    $canReject = true;
                }
            }
            
            if (!$canReject) {
                abort(403, 'Vous ne pouvez rejeter que les demandes pour les utilisateurs de votre agence ou validés par vous.');
            }
        } else {
            abort(403, 'Unauthorized.');
        }

        // Update request status
        $reactivationRequest->update([
            'status' => 'rejected',
            'reviewed_by' => $me->id,
            'reviewed_at' => now(),
            'review_notes' => $request->review_notes ?? null,
        ]);

        return redirect()->back()->with('success', 'Demande de réactivation rejetée.');
    }

    /**
     * Helper method to get user role
     */
    private function getUserRole($user)
    {
        if (!$user) {
            return null;
        }
        
        return DB::table('model_has_roles')
            ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
            ->where('model_has_roles.model_id', $user->id)
            ->value('roles.name');
    }
}
