<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Bill;
use App\Models\MatrimonialPack;
use App\Mail\BillEmail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
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
        
        // Check approval status for matchmaker and manager
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

        // Only show prospects dispatched to the user's agency
        if (in_array($roleName, ['manager','matchmaker'], true)) {
            $query->where('agency_id', $me->agency_id);
        }

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
            $services = \App\Models\Service::all(['id','name']);
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
        ]);
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
            'approval_status' => 'approved',
            'status' => 'member',
            'approved_by' => Auth::id(),
            'approved_at' => now(),
        ]);

        // Generate bill after validation
        $bill = $this->generateBill($prospect, $request);

        // Send bill email automatically
        try {
            Mail::to($prospect->email)->send(new BillEmail($bill));
            
            // Mark email as sent
            $bill->update([
                'email_sent' => true,
                'email_sent_at' => now(),
            ]);
            
            \Illuminate\Support\Facades\Log::info("Bill email sent successfully to {$prospect->email} for bill {$bill->bill_number}");
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error("Failed to send bill email to {$prospect->email}: " . $e->getMessage());
            // Don't fail the validation process if email fails
        }

        return redirect()->back()->with('success', 'Prospect validated and assigned successfully.');
    }

    public function validatedProspects(Request $request)
    {
        // Allow roles: admin, manager, matchmaker (middleware handles role)
        $me = Auth::user();
        $roleName = null;
        if ($me) {
            $roleName = \Illuminate\Support\Facades\DB::table('model_has_roles')
                ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
                ->where('model_has_roles.model_id', $me->id)
                ->value('roles.name');
        }
        
        // Check approval status for matchmaker and manager
        if (in_array($roleName, ['manager','matchmaker'], true)) {
            if ($me->approval_status !== 'approved') {
                abort(403, 'Your account is not validated yet.');
            }
        }

        $status = $request->string('status')->toString(); // all|member|client
        $query = User::role('user')
            ->whereIn('status', ['member','client'])
            ->with(['profile', 'assignedMatchmaker']);

        // Role-based filtering
        if ($me) {
            if ($roleName === 'matchmaker') {
                // Matchmaker: only see users they validated
                $query->where('approved_by', $me->id);
            } elseif ($roleName === 'manager') {
                // Manager: see users validated by matchmakers in their agency
                $query->whereHas('approvedBy', function($q) use ($me) {
                    $q->where('agency_id', $me->agency_id)
                      ->whereHas('roles', function($roleQuery) {
                          $roleQuery->where('name', 'matchmaker');
                      });
                });
            }
            // Admin: no additional filtering (sees all)
        }

        if ($status !== 'all') {
            $query->where('status', $status);
        }

        $prospects = $query->with(['profile.matrimonialPack', 'subscriptions' => function($q) {
            $q->orderBy('created_at', 'desc');
        }])->get();

        return Inertia::render('matchmaker/validated-prospects', [
            'prospects' => $prospects,
            'status' => $status ?: 'all',
            'assignedMatchmaker' => $me,
        ]);
    }

    /**
     * Mark a member as client and update bill status
     */
    public function markAsClient(Request $request)
    {
        $request->validate([
            'user_id' => 'required|exists:users,id'
        ]);

        $me = Auth::user();
        
        // Check if user has permission
        $roleName = null;
        if ($me) {
            $roleName = \Illuminate\Support\Facades\DB::table('model_has_roles')
                ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
                ->where('model_has_roles.model_id', $me->id)
                ->value('roles.name');
        }

        // Only matchmakers and managers can mark as client
        if (!in_array($roleName, ['matchmaker', 'manager', 'admin'])) {
            abort(403, 'Unauthorized action.');
        }

        $user = User::findOrFail($request->user_id);
        
        // Check if user is currently a member
        if ($user->status !== 'member') {
            return redirect()->back()->with('error', 'User is not a member or already a client.');
        }

        // Get user's profile with matrimonial pack information
        $profile = $user->profile;
        if (!$profile || !$profile->matrimonial_pack_id) {
            return redirect()->back()->with('error', 'User profile or matrimonial pack information not found.');
        }

        // Create subscription record
        try {
            \App\Models\UserSubscription::createFromProfile(
                $profile, 
                $user, 
                $user->assigned_matchmaker_id
            );
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error("Failed to create subscription for user {$user->id}: " . $e->getMessage());
            return redirect()->back()->with('error', 'Failed to create subscription. Please try again.');
        }

        // Update user status to client
        $user->update(['status' => 'client']);

        // Update bill status to paid for this user
        Bill::where('user_id', $user->id)
            ->where('status', '!=', 'paid')
            ->update(['status' => 'paid']);

        return redirect()->back()->with('success', 'Member marked as client successfully. Subscription created and bill status updated to paid.');
    }

    public function agencyProspects(Request $request)
    {
        $me = Auth::user();
        $roleName = null;
        if ($me) {
            $roleName = \Illuminate\Support\Facades\DB::table('model_has_roles')
                ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
                ->where('model_has_roles.model_id', $me->id)
                ->value('roles.name');
        }
        
        // Check approval status for matchmaker and manager
        if (in_array($roleName, ['manager','matchmaker'], true)) {
            if ($me->approval_status !== 'approved') {
                abort(403, 'Your account is not validated yet.');
            }
        }

        $agencyId = $me?->agency_id;
        // Admin may filter by agency_id
        if ($me && $agencyId === null) {
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

    private function generateBill($prospect, $request)
    {
        $profile = $prospect->profile;
        $matrimonialPack = MatrimonialPack::find($request->matrimonial_pack_id);
        
        $billNumber = Bill::generateBillNumber();
        $orderNumber = Bill::generateOrderNumber();
        $billDate = now()->toDateString();
        $dueDate = now()->addDays(30)->toDateString(); // 30 days from now
        
        $totalAmount = $request->pack_price; // Total amount includes tax
        $taxRate = 15.00; // 15% tax
        $amount = $totalAmount / (1 + ($taxRate / 100)); // Calculate amount without tax
        $taxAmount = $totalAmount - $amount; // Calculate tax amount

        $bill = Bill::create([
            'bill_number' => $billNumber,
            'user_id' => $prospect->id,
            'profile_id' => $profile->id,
            'matchmaker_id' => Auth::id(),
            'order_number' => $orderNumber,
            'bill_date' => $billDate,
            'due_date' => $dueDate,
            'status' => 'unpaid',
            'amount' => $amount,
            'tax_rate' => $taxRate,
            'tax_amount' => $taxAmount,
            'total_amount' => $totalAmount,
            'currency' => 'MAD',
            'payment_method' => $request->payment_mode,
            'pack_name' => $matrimonialPack->name ?? 'Pack Standard',
            'pack_price' => $amount,
            'pack_advantages' => $request->pack_advantages,
            'notes' => $request->notes,
        ]);

        return $bill;
    }
}
