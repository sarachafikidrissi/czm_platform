<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use App\Models\Service;
use Illuminate\Support\Facades\Schema;

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
            $query->whereHas('profile', function($q) {
                $q->where('is_completed', true);
            });
        } else if ($filter === 'incomplete') {
            $query->whereHas('profile', function($q) {
                $q->where('is_completed', false);
            });
        }

        $prospects = $query->get();
        
        $services = [];
        if (Schema::hasTable('services')) {
            $services = Service::all(['id','name']);
        }

        return Inertia::render('matchmaker/prospects', [
            'prospects' => $prospects,
            'filter' => $filter ?: 'all',
            'services' => $services,
        ])->withViewData([]);
    }

    public function validateProspect(Request $request, $id)
    {
        $request->validate([
            'notes' => 'nullable|string|max:1000',
            'cin' => ['required','string','max:20','regex:/^[A-Za-z]{1,2}\d{4,6}$/','unique:profiles,cin'],
            'identity_card_front' => 'required|image|mimes:jpeg,png,jpg,gif|max:4096',
            'identity_card_back' => 'required|image|mimes:jpeg,png,jpg,gif|max:4096',
            'service_id' => 'required|exists:services,id',
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
                'service_id' => $request->service_id,
            ]
        );

        // Assign the prospect to the current matchmaker only if validator has matchmaker role
        $assignedId = null;
        $actor = Auth::user();
        if ($actor) {
            $actorRole = \Illuminate\Support\Facades\DB::table('model_has_roles')
                ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
                ->where('model_has_roles.model_id', $actor->id)
                ->value('roles.name');
            if ($actorRole === 'matchmaker') {
                $assignedId = $actor->id;
            }
        }

        $prospect->update([
            'assigned_matchmaker_id' => $assignedId,
            'status' => 'member',
        ]);

        return redirect()->back()->with('success', 'Prospect validated and assigned successfully.');
    }

    public function validatedProspects(Request $request)
    {
        // Allow roles: admin, manager, matchmaker (middleware handles role)
        $status = $request->string('status')->toString(); // all|member|client
        $query = User::role('user')
            ->whereIn('status', ['member','client'])
            ->with('profile');

        if ($status === 'member') {
            $query->where('status', 'member');
        } elseif ($status === 'client') {
            $query->where('status', 'client');
        }

        $prospects = $query->get();

        return Inertia::render('matchmaker/validated-prospects', [
            'prospects' => $prospects,
            'status' => $status ?: 'all',
        ]);
    }
}