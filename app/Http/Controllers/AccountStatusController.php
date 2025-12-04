<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Profile;
use App\Models\ReactivationRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

class AccountStatusController extends Controller
{
    /**
     * Admin: Activate prospect account
     */
    public function activateAccount(Request $request, $userId)
    {
        $request->validate([
            'reason' => 'required|string|max:1000',
        ]);

        $me = Auth::user();
        $roleName = $this->getUserRole($me);

        if ($roleName !== 'admin') {
            abort(403, 'Only admin can activate prospect accounts.');
        }

        $user = User::findOrFail($userId);
        
        // Admin can activate any user (prospect, member, client, client_expire)
        $profile = $user->profile ?? $user->profile()->create([]);
        
        $profile->update([
            'account_status' => 'active',
            'activation_reason' => $request->reason,
            'deactivation_reason' => null, // Clear deactivation reason when activating
        ]);

        return redirect()->back()->with('success', 'Account activated successfully.');
    }

    /**
     * Admin: Deactivate prospect account
     */
    public function deactivateAccount(Request $request, $userId)
    {
        $request->validate([
            'reason' => 'required|string|max:1000',
        ]);

        $me = Auth::user();
        $roleName = $this->getUserRole($me);

        if ($roleName !== 'admin') {
            abort(403, 'Only admin can deactivate prospect accounts.');
        }

        $user = User::findOrFail($userId);
        
        // Admin can deactivate any user (prospect, member, client, client_expire)
        $profile = $user->profile ?? $user->profile()->create([]);
        
        $profile->update([
            'account_status' => 'desactivated',
            'deactivation_reason' => $request->reason,
            'activation_reason' => null, // Clear activation reason when deactivating
        ]);

        return redirect()->back()->with('success', 'Account deactivated successfully.');
    }

    /**
rrr     * Matchmaker/Admin: Activate member/client account
     * Matchmaker: only assigned to them
     * Admin: any user
     */
    public function activateMemberClient(Request $request, $userId)
    {
        $request->validate([
            'reason' => 'required|string|max:1000',
        ]);

        $me = Auth::user();
        $roleName = $this->getUserRole($me);

        if (!in_array($roleName, ['matchmaker', 'admin'])) {
            abort(403, 'Only matchmakers and admins can activate member/client accounts.');
        }

        $user = User::findOrFail($userId);
        
        // Check if user is a member or client (for matchmakers)
        // Admin can activate any user
        if ($roleName === 'matchmaker') {
            if (!in_array($user->status, ['member', 'client', 'client_expire'])) {
                return redirect()->back()->with('error', 'Can only activate member or client accounts.');
            }

            // Check if matchmaker is assigned to this user
            if ($user->assigned_matchmaker_id !== $me->id) {
                abort(403, 'You can only activate accounts assigned to you.');
            }
        }

        $profile = $user->profile ?? $user->profile()->create([]);
        
        $profile->update([
            'account_status' => 'active',
            'activation_reason' => $request->reason,
            'deactivation_reason' => null,
        ]);

        return redirect()->back()->with('success', 'Account activated successfully.');
    }

    /**
     * Matchmaker/Admin: Deactivate member/client account
     * Matchmaker: only assigned to them
     * Admin: any user
     */
    public function deactivateMemberClient(Request $request, $userId)
    {
        $request->validate([
            'reason' => 'required|string|max:1000',
        ]);

        $me = Auth::user();
        $roleName = $this->getUserRole($me);

        if (!in_array($roleName, ['matchmaker', 'admin'])) {
            abort(403, 'Only matchmakers and admins can deactivate member/client accounts.');
        }

        $user = User::findOrFail($userId);
        
        // Check if user is a member or client (for matchmakers)
        // Admin can deactivate any user
        if ($roleName === 'matchmaker') {
            if (!in_array($user->status, ['member', 'client', 'client_expire'])) {
                return redirect()->back()->with('error', 'Can only deactivate member or client accounts.');
            }

            // Check if matchmaker is assigned to this user
            if ($user->assigned_matchmaker_id !== $me->id) {
                abort(403, 'You can only deactivate accounts assigned to you.');
            }
        }

        $profile = $user->profile ?? $user->profile()->create([]);
        
        $profile->update([
            'account_status' => 'desactivated',
            'deactivation_reason' => $request->reason,
            'activation_reason' => null,
        ]);

        return redirect()->back()->with('success', 'Account deactivated successfully.');
    }

    /**
     * Submit reactivation request (user)
     */
    public function submitReactivationRequest(Request $request)
    {
        $request->validate([
            'reason' => 'required|string|max:1000',
        ]);

        $user = Auth::user();
        $profile = $user->profile;

        if (!$profile || $profile->account_status !== 'desactivated') {
            return redirect()->back()->with('error', 'Your account is not deactivated.');
        }

        // Check if there's already a pending request
        $existingRequest = ReactivationRequest::where('user_id', $user->id)
            ->where('status', 'pending')
            ->exists();

        if ($existingRequest) {
            return redirect()->back()->with('error', 'You already have a pending reactivation request.');
        }

        $reactivationRequest = ReactivationRequest::create([
            'user_id' => $user->id,
            'reason' => $request->reason,
            'status' => 'pending',
        ]);

        // Send notification to admin (always) and matchmaker (if user is member/client)
        // For now, we'll just create the request. Email notifications can be added later.

        return redirect()->back()->with('success', 'Demande de réactivation soumise avec succès.');
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
