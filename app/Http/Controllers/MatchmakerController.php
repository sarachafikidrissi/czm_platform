<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class MatchmakerController extends Controller
{
    public function prospects(Request $request)
    {
        // Restrict access for unvalidated staff
        $me = Auth::user();
        $roleName = null;
        if ($me) {
            $roleName = \Illuminate\Support\Facades\DB::table('model_has_roles')
                ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
                ->where('model_has_roles.model_id', $me->id)
                ->value('roles.name');
        }
        if (in_array($roleName, ['manager','matchmaker'], true)) {
            if ($me->approval_status !== 'approved') {
                abort(403, 'Your account is not validated yet.');
            }
        }

        $filter = $request->string('filter')->toString(); // all | complete | incomplete
        $query = User::role('user')
            ->where('status', 'prospect')
            ->whereNull('assigned_matchmaker_id')
            ->with('profile');

        if ($filter === 'complete') {
            $query->whereHas('profile');
        } elseif ($filter === 'incomplete') {
            $query->whereDoesntHave('profile');
        }

        $prospects = $query->get();
        
        return Inertia::render('matchmaker/prospects', [
            'prospects' => $prospects,
            'filter' => $filter ?: 'all',
        ])->withViewData([]);
    }

    public function validateProspect(Request $request, $id)
    {
        $request->validate([
            'notes' => 'nullable|string|max:1000',
            'recommendations' => 'nullable|string|max:1000',
            'cin' => ['required','string','max:20','regex:/^[A-Za-z]{1,2}\d{4,6}$/','unique:profiles,cin'],
            'identity_card_front' => 'required|image|mimes:jpeg,png,jpg,gif|max:4096',
            'identity_card_back' => 'required|image|mimes:jpeg,png,jpg,gif|max:4096',
        ]);

        $prospect = User::findOrFail($id);
        
        // Store ID card images in profile
        $frontPath = $request->file('identity_card_front')->store('identity-cards', 'public');
        $backPath = $request->file('identity_card_back')->store('identity-cards', 'public');

        $prospect->profile()->updateOrCreate(
            ['user_id' => $prospect->id],
            [
                'cin' => strtoupper($request->cin),
                'identity_card_front_path' => $frontPath,
                'identity_card_back_path' => $backPath,
                'notes' => $request->notes,
                'recommendations' => $request->recommendations,
            ]
        );

        // Assign the prospect to the current matchmaker and set status to member
        $prospect->update([
            'assigned_matchmaker_id' => Auth::id(),
            'status' => 'member', // Change status from prospect to member
        ]);

        return redirect()->back()->with('success', 'Prospect validated and assigned successfully.');
    }
}