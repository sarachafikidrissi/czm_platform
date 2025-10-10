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

        $matrimonialPacks = [];
        if (Schema::hasTable('matrimonial_packs')) {
            $matrimonialPacks = \App\Models\MatrimonialPack::all(['id','name','duration']);
        }

        return Inertia::render('matchmaker/prospects', [
            'prospects' => $prospects,
            'filter' => $filter ?: 'all',
            'services' => $services,
            'matrimonialPacks' => $matrimonialPacks,
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
            'matrimonial_pack_id' => 'required|exists:matrimonial_packs,id',
            'pack_price' => 'required|numeric|min:0',
            'pack_advantages' => 'required|array|min:1',
            'pack_advantages.*' => 'string|in:Suivi et accompagnement personnalisé,Suivi et accompagnement approfondi,Suivi et accompagnement premium,Suivi et accompagnement exclusif avec assistance personnalisée,Rendez-vous avec des profils compatibles,Rendez-vous avec des profils correspondant à vos attentes,Rendez-vous avec des profils soigneusement sélectionnés,Rendez-vous illimités avec des profils rigoureusement sélectionnés,Formations pré-mariage avec le profil choisi,Formations pré-mariage avancées avec le profil choisi,Accès prioritaire aux nouveaux profils,Accès prioritaire aux profils VIP,Réduction à vie sur les séances de conseil conjugal et coaching familial (-10% à -25%)',
            'payment_mode' => 'required|string|in:Virement,Caisse agence,Chèque,CMI,Avance,Reliquat,RDV',
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
                'matrimonial_pack_id' => $request->matrimonial_pack_id,
                'pack_price' => $request->pack_price,
                'pack_advantages' => $request->pack_advantages,
                'payment_mode' => $request->payment_mode,
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

    public function agencyProspects(Request $request)
    {
        $me = Auth::user();
        $agencyId = $me?->agency_id;
        // Admin may filter by agency_id
        if ($me && $agencyId === null) {
            $roleName = \Illuminate\Support\Facades\DB::table('model_has_roles')
                ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
                ->where('model_has_roles.model_id', $me->id)
                ->value('roles.name');
            if ($roleName === 'admin') {
                $agencyId = (int) $request->integer('agency_id');
            }
        }

        $query = User::role('user')
            ->where('status', 'prospect')
            ->when($agencyId, fn($q) => $q->where('agency_id', $agencyId))
            ->with('profile');

        $prospects = $query->get(['id','name','email','phone','country','city','agency_id','created_at']);

        $services = [];
        if (\Illuminate\Support\Facades\Schema::hasTable('services')) {
            $services = \App\Models\Service::all(['id','name']);
        }

        $matrimonialPacks = [];
        if (\Illuminate\Support\Facades\Schema::hasTable('matrimonial_packs')) {
            $matrimonialPacks = \App\Models\MatrimonialPack::all(['id','name','duration']);
        }

        return Inertia::render('matchmaker/agency-prospects', [
            'prospects' => $prospects,
            'agencyId' => $agencyId,
            'services' => $services,
            'matrimonialPacks' => $matrimonialPacks,
        ]);
    }
}