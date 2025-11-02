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
     * Admin: View all reactivation requests
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
