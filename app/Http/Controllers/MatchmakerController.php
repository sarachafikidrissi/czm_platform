<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Bill;
use App\Models\MatrimonialPack;
use App\Mail\BillEmail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Crypt;
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

        // Restrict matchmaker access: must be linked to an agency
        if ($roleName === 'matchmaker' && !$me->agency_id) {
            abort(403, 'You must be linked to an agency to access prospects.');
        }

        $filter = $request->string('filter')->toString(); // all | complete | incomplete
        $query = User::role('user')
            ->where('status', 'prospect')
            ->with(['profile', 'assignedMatchmaker', 'agency']);

        // Role-based filtering
        if ($roleName === 'matchmaker') {
            // Matchmaker: see prospects dispatched to them specifically OR to their agency
            $query->where(function($q) use ($me) {
                $q->where('assigned_matchmaker_id', $me->id)
                  ->orWhere('agency_id', $me->agency_id);
            });
        } elseif ($roleName === 'manager') {
            // Manager: see prospects dispatched to their agency OR to matchmakers in their agency
            // Get all matchmaker IDs in the manager's agency to avoid relationship caching issues
            $matchmakerIds = User::role('matchmaker')
                ->where('agency_id', $me->agency_id)
                ->pluck('id')
                ->toArray();
            
            $query->where(function($q) use ($me, $matchmakerIds) {
                $q->where('agency_id', $me->agency_id);
                // Only add the matchmaker check if there are matchmakers in the agency
                if (!empty($matchmakerIds)) {
                    $q->orWhereIn('assigned_matchmaker_id', $matchmakerIds);
                }
            });
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

        // Decrypt CNI for prospects who already provided it (for validation form display)
        $prospects->each(function ($prospect) {
            if ($prospect->profile && $prospect->profile->cin) {
                try {
                    $prospect->profile->cin_decrypted = Crypt::decryptString($prospect->profile->cin);
                } catch (\Exception $e) {
                    // If decryption fails, mark as not provided
                    $prospect->profile->cin_decrypted = null;
                }
            }
        });

        return Inertia::render('matchmaker/prospects', [
            'prospects' => $prospects,
            'filter' => $filter ?: 'all',
            'services' => $services,
            'matrimonialPacks' => $matrimonialPacks,
        ]);
    }

    public function validateProspect(Request $request, $id)
    {
        $prospect = User::findOrFail($id);
        $profile = $prospect->profile;
        
        // Check if user already provided CNI and front
        // Note: cin is encrypted, so we check if it exists (not null/empty)
        $hasExistingCin = $profile && $profile->cin && !empty($profile->cin);
        $hasExistingFront = $profile && $profile->identity_card_front_path;
        
        // Build validation rules
        $rules = [
            'notes' => 'nullable|string|max:1000',
            'service_id' => 'required|exists:services,id',
            'matrimonial_pack_id' => 'required|exists:matrimonial_packs,id',
            'pack_price' => 'required|numeric|min:0',
            'pack_advantages' => 'required|array|min:1',
            'pack_advantages.*' => 'string|in:Suivi et accompagnement personnalisé,Suivi et accompagnement approfondi,Suivi et accompagnement premium,Suivi et accompagnement exclusif avec assistance personnalisée,Rendez-vous avec des profils compatibles,Rendez-vous avec des profils correspondant à vos attentes,Rendez-vous avec des profils soigneusement sélectionnés,Rendez-vous illimités avec des profils rigoureusement sélectionnés,Formations pré-mariage avec le profil choisi,Formations pré-mariage avancées avec le profil choisi,Accès prioritaire aux nouveaux profils,Accès prioritaire aux profils VIP,Réduction à vie sur les séances de conseil conjugal et coaching familial (-10% à -25%)',
            'payment_mode' => 'required|string|in:Virement,Caisse agence,Chèque,CMI,Avance,Reliquat,RDV',
        ];
        
        // CNI is required only if user didn't provide it
        // Note: We can't use 'unique:profiles,cin' because cin is encrypted
        // We'll check uniqueness manually in validation
        if (!$hasExistingCin) {
            $rules['cin'] = [
                'required',
                'string',
                'max:20',
                'regex:/^[A-Za-z]{1,2}\d{4,6}$/',
                function ($attribute, $value, $fail) use ($prospect) {
                    $cinUpper = strtoupper($value);
                    
                    // Check if this CNI is already used by another user
                    $existingProfiles = \App\Models\Profile::where('user_id', '!=', $prospect->id)
                        ->whereNotNull('cin')
                        ->get();
                    
                    foreach ($existingProfiles as $existingProfile) {
                        try {
                            $decrypted = Crypt::decryptString($existingProfile->cin);
                            if ($decrypted === $cinUpper) {
                                $fail('Ce numéro de CNI est déjà utilisé par un autre utilisateur.');
                                return;
                            }
                        } catch (\Exception $e) {
                            // If decryption fails, skip this profile
                            continue;
                        }
                    }
                },
            ];
        }
        
        // Front is required only if user didn't provide it
        if (!$hasExistingFront) {
            $rules['identity_card_front'] = 'required|image|mimes:jpeg,png,jpg,gif|max:4096';
        }
        
        $request->validate($rules);
        
        // Check if matchmaker can validate this prospect
        $me = Auth::user();
        if ($me) {
            $roleName = \Illuminate\Support\Facades\DB::table('model_has_roles')
                ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
                ->where('model_has_roles.model_id', $me->id)
                ->value('roles.name');
            
            if ($roleName === 'matchmaker') {
                // Matchmaker can only validate prospects from their agency or assigned to them
                if ($prospect->agency_id !== $me->agency_id && $prospect->assigned_matchmaker_id !== $me->id) {
                    return redirect()->back()->with('error', 'You can only validate prospects from your agency or assigned to you.');
                }
            }
        }
        
        // Prepare app key for hashing
        $appKey = (string) config('app.key');
        if (str_starts_with($appKey, 'base64:')) {
            $decoded = base64_decode(substr($appKey, 7));
            if ($decoded !== false) {
                $appKey = $decoded;
            }
        }
        
        // Store ID card images and hashes
        $frontPath = ($hasExistingFront && $profile) ? $profile->identity_card_front_path : null;
        $frontHash = ($hasExistingFront && $profile) ? $profile->identity_card_front_hash : null;
        $cinValue = ($hasExistingCin && $profile) ? $profile->cin : null;
        $cinHash = ($hasExistingCin && $profile) ? $profile->cin_hash : null;
        
        // Handle front upload if matchmaker needs to fill it
        if (!$hasExistingFront && $request->hasFile('identity_card_front')) {
            $frontFile = $request->file('identity_card_front');
            $frontPath = $frontFile->store('identity-cards', 'public');
            $frontContent = file_get_contents($frontFile->getRealPath());
            $frontHash = hash_hmac('sha256', $frontContent, $appKey);
        }
        
        // Handle CNI if matchmaker needs to fill it
        if (!$hasExistingCin && $request->filled('cin')) {
            $cinPlain = strtoupper($request->cin);
            // Encrypt the CNI number for security
            $cinValue = Crypt::encryptString($cinPlain);
            $cinHash = hash_hmac('sha256', (string) $cinPlain, $appKey);
        }
        
        $prospect->profile()->updateOrCreate(
            ['user_id' => $prospect->id],
            [
                'cin' => $cinValue,
                'cin_hash' => $cinHash,
                'identity_card_front_path' => $frontPath,
                'identity_card_front_hash' => $frontHash,
                'notes' => $request->notes,
                'service_id' => $request->service_id,
                'matrimonial_pack_id' => $request->matrimonial_pack_id,
                'pack_price' => $request->pack_price,
                'pack_advantages' => $request->pack_advantages,
                'payment_mode' => $request->payment_mode,
            ]
        );

        $actor = Auth::user();
        $assignedId = null;
        $validatedByManagerId = null;
        
        if ($actor) {
            $actorRole = \Illuminate\Support\Facades\DB::table('model_has_roles')
                ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
                ->where('model_has_roles.model_id', $actor->id)
                ->value('roles.name');
            if ($actorRole === 'matchmaker') {
                $assignedId = $actor->id;
                
                // Find the manager of the agency at the time of validation
                if ($prospect->agency_id) {
                    $manager = User::role('manager')
                        ->where('agency_id', $prospect->agency_id)
                        ->where('approval_status', 'approved')
                        ->first();
                    if ($manager) {
                        $validatedByManagerId = $manager->id;
                    }
                }
            }
        }

        $prospect->update([
            'assigned_matchmaker_id' => $assignedId,
            'approval_status' => 'approved',
            'status' => 'member',
            'approved_by' => Auth::id(),
            'approved_at' => now(),
            'validated_by_manager_id' => $validatedByManagerId,
            // Note: agency_id is preserved to maintain original agency tracking
        ]);

        return redirect()->back()->with('success', 'Prospect validated and assigned successfully. You can now create a subscription using the "Abonnement" button.');
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

        // Restrict matchmaker access: must be linked to an agency
        if ($roleName === 'matchmaker' && !$me->agency_id) {
            abort(403, 'You must be linked to an agency to access prospects.');
        }

        $status = $request->string('status')->toString(); // all|member|client
        $query = User::role('user')
            ->whereIn('status', ['member','client'])
            ->with(['profile', 'assignedMatchmaker']);

        // Role-based filtering
        if ($me) {
            if ($roleName === 'matchmaker') {
                // Matchmaker: see users they validated (regardless of agency)
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

        $prospects = $query->with([
            'profile.matrimonialPack', 
            'agency', 
            'validatedByManager', 
            'bills', 
            'subscriptions' => function($q) {
                $q->orderBy('created_at', 'desc');
            },
            'subscriptions.matrimonialPack',
            'subscriptions.assignedMatchmaker'
        ])->get();

        // Add has_bill flag to each prospect
        $prospects->each(function($prospect) {
            $prospect->has_bill = $prospect->bills->where('status', '!=', 'paid')->isNotEmpty();
        });

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

        // Update user status to client (preserve original agency assignment)
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

        // Restrict matchmaker access: must be linked to an agency
        if ($roleName === 'matchmaker' && !$me->agency_id) {
            abort(403, 'You must be linked to an agency to access prospects.');
        }

        $query = User::role('user')
            ->where('status', 'prospect')
            ->with(['profile', 'assignedMatchmaker', 'agency']);

        // Role-based filtering
        if ($roleName === 'matchmaker') {
            // Matchmaker: see prospects dispatched to them specifically OR to their agency
            $query->where(function($q) use ($me) {
                $q->where('assigned_matchmaker_id', $me->id)
                  ->orWhere('agency_id', $me->agency_id);
            });
        } elseif ($roleName === 'manager') {
            // Manager: see prospects dispatched to their agency OR to matchmakers in their agency
            // Get all matchmaker IDs in the manager's agency to avoid relationship caching issues
            $matchmakerIds = User::role('matchmaker')
                ->where('agency_id', $me->agency_id)
                ->pluck('id')
                ->toArray();
            
            $query->where(function($q) use ($me, $matchmakerIds) {
                $q->where('agency_id', $me->agency_id);
                // Only add the matchmaker check if there are matchmakers in the agency
                if (!empty($matchmakerIds)) {
                    $q->orWhereIn('assigned_matchmaker_id', $matchmakerIds);
                }
            });
        } elseif ($roleName === 'admin') {
            // Admin: may filter by agency_id
            $agencyId = (int) $request->integer('agency_id');
            if ($agencyId) {
                $query->where('agency_id', $agencyId);
            }
        }

        $prospects = $query->get(['id','name','email','phone','country','city','agency_id','assigned_matchmaker_id','created_at']);

        $services = [];
        if (\Illuminate\Support\Facades\Schema::hasTable('services')) {
            $services = \App\Models\Service::all(['id','name']);
        }

        $matrimonialPacks = [];
        if (\Illuminate\Support\Facades\Schema::hasTable('matrimonial_packs')) {
            $matrimonialPacks = \App\Models\MatrimonialPack::all(['id','name','duration']);
        }

        // Load profiles with relationships
        $prospects->load(['profile', 'assignedMatchmaker', 'agency']);
        
        // Decrypt CNI for prospects who already provided it (for validation form display)
        $prospects->each(function ($prospect) {
            if ($prospect->profile && $prospect->profile->cin) {
                try {
                    $prospect->profile->cin_decrypted = Crypt::decryptString($prospect->profile->cin);
                } catch (\Exception $e) {
                    // If decryption fails, mark as not provided
                    $prospect->profile->cin_decrypted = null;
                }
            }
        });

        return Inertia::render('matchmaker/agency-prospects', [
            'prospects' => $prospects,
            'agencyId' => $me?->agency_id,
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
        $taxRate = 20.00; // 20% TVA
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

    /**
     * Create bill for a member (Abonnement button)
     */
    public function createBill(Request $request)
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
            'matrimonial_pack_id' => 'required|exists:matrimonial_packs,id',
            'pack_price' => 'required|numeric|min:0',
            'pack_advantages' => 'required|array|min:1',
            'pack_advantages.*' => 'string',
            'payment_mode' => 'required|string|in:Virement,Caisse agence,Chèque,CMI,Avance,Reliquat,RDV',
        ]);

        $me = Auth::user();
        $roleName = null;
        if ($me) {
            $roleName = \Illuminate\Support\Facades\DB::table('model_has_roles')
                ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
                ->where('model_has_roles.model_id', $me->id)
                ->value('roles.name');
        }

        if (!in_array($roleName, ['matchmaker', 'manager', 'admin'])) {
            abort(403, 'Unauthorized action.');
        }

        $user = User::findOrFail($request->user_id);
        
        // Check if user is currently a member
        if ($user->status !== 'member') {
            return redirect()->back()->with('error', 'User is not a member or already has a subscription.');
        }

        // Get user's profile
        $profile = $user->profile;
        if (!$profile) {
            return redirect()->back()->with('error', 'User profile not found.');
        }

        // Update profile with bill data (but don't create subscription yet)
        $profile->update([
            'matrimonial_pack_id' => $request->matrimonial_pack_id,
            'pack_price' => $request->pack_price,
            'pack_advantages' => $request->pack_advantages,
            'payment_mode' => $request->payment_mode,
        ]);

        // Generate bill (but don't create subscription)
        $bill = $this->generateBill($user, $request);

        // Send bill email
        try {
            Mail::to($user->email)->send(new BillEmail($bill));
            
            // Mark email as sent
            $bill->update([
                'email_sent' => true,
                'email_sent_at' => now(),
            ]);
            
            \Illuminate\Support\Facades\Log::info("Bill email sent successfully to {$user->email} for bill {$bill->bill_number}");
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error("Failed to send bill email to {$user->email}: " . $e->getMessage());
            // Don't fail the bill process if email fails
        }

        return redirect()->back()->with('success', 'Bill created and sent successfully. Member can now pay the bill in "Mes Commandes".');
    }

    /**
     * Get subscription form data for a user
     */
    public function getSubscriptionFormData($userId)
    {
        $me = Auth::user();
        $roleName = null;
        if ($me) {
            $roleName = \Illuminate\Support\Facades\DB::table('model_has_roles')
                ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
                ->where('model_has_roles.model_id', $me->id)
                ->value('roles.name');
        }

        if (!in_array($roleName, ['matchmaker', 'manager', 'admin'])) {
            abort(403, 'Unauthorized action.');
        }

        $user = User::findOrFail($userId);
        
        if ($user->status !== 'member') {
            return response()->json(['error' => 'User is not a member'], 400);
        }

        $profile = $user->profile;
        if (!$profile) {
            return response()->json(['error' => 'User profile not found'], 400);
        }

        // Get matrimonial packs
        $matrimonialPacks = \App\Models\MatrimonialPack::all();

        return response()->json([
            'user' => $user,
            'profile' => $profile,
            'matrimonial_packs' => $matrimonialPacks,
        ]);
    }

    /**
     * Test subscription expiration for a user (sets end date to today and processes)
     */
    public function testSubscriptionExpiration(Request $request)
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
        ]);

        $me = Auth::user();
        $roleName = null;
        if ($me) {
            $roleName = \Illuminate\Support\Facades\DB::table('model_has_roles')
                ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
                ->where('model_has_roles.model_id', $me->id)
                ->value('roles.name');
        }

        if (!in_array($roleName, ['matchmaker', 'manager', 'admin'])) {
            abort(403, 'Unauthorized action.');
        }

        $user = User::findOrFail($request->user_id);
        
        // Find active subscription
        $subscription = \App\Models\UserSubscription::where('user_id', $user->id)
            ->where('status', 'active')
            ->with(['matrimonialPack', 'assignedMatchmaker'])
            ->latest()
            ->first();

        if (!$subscription) {
            return redirect()->back()->with('error', 'No active subscription found for this user.');
        }

        // Set subscription to expire today
        $subscription->update(['subscription_end' => \Carbon\Carbon::today()]);

        // Run the check subscription command logic
        $subscription->refresh();
        $subscription->load(['matrimonialPack', 'assignedMatchmaker']);
        $subscription->update(['status' => 'expired']);
        
        $statusChanged = false;
        $emailSent = false;
        $emailError = null;

        if ($user->status === 'client') {
            $user->update(['status' => 'Client expiré']);
            $statusChanged = true;

            // Send expiration email
            try {
                $daysRemaining = \Carbon\Carbon::today()->diffInDays($subscription->subscription_end, false);
                \Illuminate\Support\Facades\Mail::to($user->email)->send(
                    new \App\Mail\SubscriptionReminderEmail($subscription, $daysRemaining)
                );
                $emailSent = true;
            } catch (\Exception $e) {
                $emailError = $e->getMessage();
            }
        }

        $message = "Test completed: ";
        if ($statusChanged) {
            $message .= "Status changed to 'Client expiré'. ";
        }
        if ($emailSent) {
            $message .= "Email sent successfully to {$user->email}.";
        } elseif ($emailError) {
            $message .= "Email failed: {$emailError}";
        }

        return redirect()->back()->with('success', $message);
    }
}
