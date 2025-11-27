<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Bill;
use App\Models\MatrimonialPack;
use App\Models\MatchmakerNote;
use App\Mail\BillEmail;
use App\Mail\ProspectCredentialsMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules;
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
        $statusFilter = $request->string('status_filter')->toString(); // active | rejected
        $query = User::role('user')
            ->where('status', 'prospect')
            ->with(['profile', 'assignedMatchmaker', 'agency']);

        // Role-based filtering (applied before rejection filter to ensure correct filtering)
        if ($roleName === 'matchmaker') {
            // Matchmaker: see prospects they added OR prospects added by manager to their agency
            $query->where(function($q) use ($me) {
                $q->where('assigned_matchmaker_id', $me->id)
                  ->orWhere(function($subQ) use ($me) {
                      // Prospects added by manager to their agency (agency_id matches and no assigned matchmaker)
                      $subQ->where('agency_id', $me->agency_id)
                           ->whereNull('assigned_matchmaker_id');
                  });
            });
        } elseif ($roleName === 'manager') {
            // Manager: see prospects from their agency (including those added by matchmakers in their agency)
            // Get all matchmaker IDs in the manager's agency to avoid relationship caching issues
            $matchmakerIds = User::role('matchmaker')
                ->where('agency_id', $me->agency_id)
                ->pluck('id')
                ->toArray();
            
            $query->where(function($q) use ($me, $matchmakerIds) {
                // Prospects assigned to the agency directly (added by manager)
                $q->where('agency_id', $me->agency_id)
                  ->whereNull('assigned_matchmaker_id');
                // OR prospects added by matchmakers in their agency
                if (!empty($matchmakerIds)) {
                    $q->orWhereIn('assigned_matchmaker_id', $matchmakerIds);
                }
            });
        }

        // Filter by rejection status (after role-based filtering)
        if ($statusFilter === 'rejected') {
            $query->whereNotNull('rejection_reason');
            // For matchmakers, only show prospects they rejected
            if ($roleName === 'matchmaker') {
                $query->where('rejected_by', $me->id);
            }
        } else {
            // Default to active (non-rejected) prospects
            $query->whereNull('rejection_reason');
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

        $prospects = $query->get(['id','name','email','phone','country','city','status','agency_id','assigned_matchmaker_id','rejection_reason','rejected_by','rejected_at','created_at']);
        $prospects->load(['profile', 'assignedMatchmaker', 'agency']);
        
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
            'statusFilter' => $statusFilter ?: 'active',
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
            'payment_mode' => 'required|string|in:Virement,Caisse agence,Chèque,CMI,TPE,Avance,Reliquat,RDV',
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
        // But matchmaker can optionally replace it even if user uploaded one
        if (!$hasExistingFront) {
            $rules['identity_card_front'] = 'required|image|mimes:jpeg,png,jpg,gif|max:4096';
        } else {
            // Allow optional upload to replace existing image
            $rules['identity_card_front'] = 'nullable|image|mimes:jpeg,png,jpg,gif|max:4096';
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
        
        // Handle front upload if matchmaker needs to fill it OR wants to replace existing one
        if ($request->hasFile('identity_card_front')) {
            // Delete old file if it exists
            if ($hasExistingFront && $profile && $profile->identity_card_front_path) {
                $oldPath = storage_path('app/public/' . $profile->identity_card_front_path);
                if (file_exists($oldPath)) {
                    unlink($oldPath);
                }
            }
            
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
                // Use prospect's agency_id if available, otherwise use matchmaker's agency_id
                $agencyId = $prospect->agency_id ?? $actor->agency_id;
                
                if ($agencyId) {
                    $manager = User::role('manager')
                        ->where('agency_id', $agencyId)
                        ->where('approval_status', 'approved')
                        ->first();
                    if ($manager) {
                        $validatedByManagerId = $manager->id;
                    }
                }
            } elseif ($actorRole === 'manager') {
                // If a manager validates directly, set validated_by_manager_id to themselves
                $validatedByManagerId = $actor->id;
                // If there's an assigned matchmaker, use that; otherwise, the manager is handling it
                if ($prospect->assigned_matchmaker_id) {
                    $assignedId = $prospect->assigned_matchmaker_id;
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

        // Save notes to MatchmakerNote table if provided
        if ($request->filled('notes') && trim($request->notes) !== '') {
            MatchmakerNote::create([
                'user_id' => $prospect->id,
                'author_id' => Auth::id(),
                'content' => trim($request->notes),
                'contact_type' => $request->input('contact_type'),
                'created_during_validation' => true,
            ]);
        }

        return redirect()->back()->with('success', 'Prospect validated and assigned successfully. You can now create a subscription using the "Abonnement" button.');
    }

    public function rejectProspect(Request $request, $id)
    {
        $request->validate([
            'rejection_reason' => 'required|string|max:1000',
        ]);

        $prospect = User::findOrFail($id);
        
        // Check if prospect status is 'prospect'
        if ($prospect->status !== 'prospect') {
            return redirect()->back()->with('error', 'Seuls les prospects peuvent être rejetés.');
        }

        $me = Auth::user();
        if (!$me) {
            abort(403, 'Unauthorized.');
        }

        $roleName = \Illuminate\Support\Facades\DB::table('model_has_roles')
            ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
            ->where('model_has_roles.model_id', $me->id)
            ->value('roles.name');

        // Check authorization: admin, assigned matchmaker, matchmaker from same agency (for manager-added prospects), or manager of the agency
        $canReject = false;
        
        if ($roleName === 'admin') {
            $canReject = true;
        } elseif ($roleName === 'matchmaker') {
            // Matchmaker can reject if:
            // 1. They are assigned to the prospect (they added it)
            // 2. OR the prospect is from their agency and was added by manager (assigned_matchmaker_id is NULL)
            if ($prospect->assigned_matchmaker_id === $me->id) {
                $canReject = true;
            } elseif ($prospect->agency_id === $me->agency_id && $prospect->assigned_matchmaker_id === null) {
                $canReject = true;
            }
        } elseif ($roleName === 'manager') {
            // Manager can reject if the prospect is assigned to their agency
            if ($prospect->agency_id === $me->agency_id) {
                $canReject = true;
            }
        }

        if (!$canReject) {
            abort(403, 'Vous n\'êtes pas autorisé à rejeter ce prospect.');
        }

        // If matchmaker rejects a prospect added by manager, assign it to them
        if ($roleName === 'matchmaker' && $prospect->assigned_matchmaker_id === null && $prospect->agency_id === $me->agency_id) {
            $prospect->update([
                'assigned_matchmaker_id' => $me->id,
                'rejection_reason' => $request->rejection_reason,
                'rejected_by' => $me->id,
                'rejected_at' => now(),
            ]);
        } else {
            // Update prospect with rejection information
            $prospect->update([
                'rejection_reason' => $request->rejection_reason,
                'rejected_by' => $me->id,
                'rejected_at' => now(),
            ]);
        }

        return redirect()->back()->with('success', 'Prospect rejeté avec succès.');
    }

    public function acceptRejectedProspect(Request $request, $id)
    {
        $request->validate([
            'acceptance_reason' => 'required|string|max:1000',
        ]);

        $prospect = User::findOrFail($id);
        
        // Check if prospect was previously rejected
        if (!$prospect->rejection_reason) {
            return redirect()->back()->with('error', 'Ce prospect n\'a pas été rejeté.');
        }

        // Check if prospect status is still 'prospect'
        if ($prospect->status !== 'prospect') {
            return redirect()->back()->with('error', 'Ce prospect n\'est plus un prospect.');
        }

        $me = Auth::user();
        if (!$me) {
            abort(403, 'Unauthorized.');
        }

        $roleName = \Illuminate\Support\Facades\DB::table('model_has_roles')
            ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
            ->where('model_has_roles.model_id', $me->id)
            ->value('roles.name');

        // Check authorization: admin, assigned matchmaker, matchmaker from same agency (for manager-added prospects), or manager of the agency
        $canAccept = false;
        
        if ($roleName === 'admin') {
            $canAccept = true;
        } elseif ($roleName === 'matchmaker') {
            // Matchmaker can accept if:
            // 1. They are assigned to the prospect (they added it)
            // 2. OR the prospect is from their agency and was added by manager (assigned_matchmaker_id is NULL)
            if ($prospect->assigned_matchmaker_id === $me->id) {
                $canAccept = true;
            } elseif ($prospect->agency_id === $me->agency_id && $prospect->assigned_matchmaker_id === null) {
                $canAccept = true;
            }
        } elseif ($roleName === 'manager') {
            // Manager can accept if the prospect is assigned to their agency
            if ($prospect->agency_id === $me->agency_id) {
                $canAccept = true;
            }
        }

        if (!$canAccept) {
            abort(403, 'Vous n\'êtes pas autorisé à accepter ce prospect.');
        }

        // Clear rejection information and store acceptance reason
        $prospect->update([
            'rejection_reason' => null,
            'rejected_by' => null,
            'rejected_at' => null,
            'acceptance_reason' => $request->acceptance_reason,
            'accepted_by' => $me->id,
            'accepted_at' => now(),
        ]);

        return redirect()->back()->with('success', 'Prospect accepté et restauré avec succès.');
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

        $status = $request->input('status', 'all'); // all|member|client|client_expire
        $query = User::role('user')
            ->whereIn('status', ['member','client','client_expire'])
            ->with(['profile', 'assignedMatchmaker']);

        // Role-based filtering
        if ($me) {
            if ($roleName === 'matchmaker') {
                // Matchmaker: see users they validated OR assigned to them (not all from agency)
                $query->where(function($q) use ($me) {
                    $q->where('approved_by', $me->id)
                      ->orWhere('assigned_matchmaker_id', $me->id);
                });
            } elseif ($roleName === 'manager') {
                // Manager: see users validated by matchmakers in their agency OR assigned to matchmakers in their agency OR from their agency
                $query->where(function($q) use ($me) {
                    $q->whereHas('approvedBy', function($subQ) use ($me) {
                        $subQ->where('agency_id', $me->agency_id)
                            ->whereHas('roles', function($roleQuery) {
                                $roleQuery->where('name', 'matchmaker');
                            });
                    })
                    ->orWhereHas('assignedMatchmaker', function($subQ) use ($me) {
                        $subQ->where('agency_id', $me->agency_id);
                    })
                    ->orWhere('agency_id', $me->agency_id);
                });
            }
            // Admin: no additional filtering (sees all)
        }

        // Apply status filter - if status is 'all', show all validated prospects (member, client, client_expire)
        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        $prospects = $query->with([
            'profile', 
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
        
        // Check if user is currently a member or client_expire (can become a client again)
        if (!in_array($user->status, ['member', 'client_expire'])) {
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

        $statusFilter = $request->string('status_filter')->toString(); // active | rejected
        $query = User::role('user')
            ->where('status', 'prospect')
            ->with(['profile', 'assignedMatchmaker', 'agency']);
        
        // Filter by rejection status
        if ($statusFilter === 'rejected') {
            $query->whereNotNull('rejection_reason');
        } else {
            // Default to active (non-rejected) prospects
            $query->whereNull('rejection_reason');
        }

        // Role-based filtering
        if ($roleName === 'matchmaker') {
            // Matchmaker: see prospects they added OR prospects added by manager to their agency
            $query->where(function($q) use ($me) {
                $q->where('assigned_matchmaker_id', $me->id)
                  ->orWhere(function($subQ) use ($me) {
                      // Prospects added by manager to their agency (agency_id matches and no assigned matchmaker)
                      $subQ->where('agency_id', $me->agency_id)
                           ->whereNull('assigned_matchmaker_id');
                  });
            });
        } elseif ($roleName === 'manager') {
            // Manager: see prospects from their agency (including those added by matchmakers in their agency)
            // Get all matchmaker IDs in the manager's agency to avoid relationship caching issues
            $matchmakerIds = User::role('matchmaker')
                ->where('agency_id', $me->agency_id)
                ->pluck('id')
                ->toArray();
            
            $query->where(function($q) use ($me, $matchmakerIds) {
                // Prospects assigned to the agency directly (added by manager)
                $q->where('agency_id', $me->agency_id)
                  ->whereNull('assigned_matchmaker_id');
                // OR prospects added by matchmakers in their agency
                if (!empty($matchmakerIds)) {
                    $q->orWhereIn('assigned_matchmaker_id', $matchmakerIds);
                }
            });
        }

        // Filter by rejection status (after role-based filtering)
        if ($statusFilter === 'rejected') {
            $query->whereNotNull('rejection_reason');
            // For matchmakers, only show prospects they rejected
            if ($roleName === 'matchmaker') {
                $query->where('rejected_by', $me->id);
            }
        } else {
            // Default to active (non-rejected) prospects
            $query->whereNull('rejection_reason');
        }

        if ($roleName === 'admin') {
            // Admin: may filter by agency_id
            $agencyId = (int) $request->integer('agency_id');
            if ($agencyId) {
                $query->where('agency_id', $agencyId);
            }
        }

        $prospects = $query->get(['id','name','email','phone','country','city','status','agency_id','assigned_matchmaker_id','rejection_reason','rejected_by','rejected_at','created_at']);
        $prospects->load(['profile', 'assignedMatchmaker', 'agency']);
        
        $services = [];
        if (\Illuminate\Support\Facades\Schema::hasTable('services')) {
            $services = \App\Models\Service::all(['id','name']);
        }

        $matrimonialPacks = [];
        if (\Illuminate\Support\Facades\Schema::hasTable('matrimonial_packs')) {
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

        return Inertia::render('matchmaker/agency-prospects', [
            'prospects' => $prospects,
            'statusFilter' => $statusFilter ?: 'active',
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
        
        $taxRate = 20.00; // 20% TVA
        $amount = $request->pack_price; // Base amount (pack price)
        $taxAmount = $amount * ($taxRate / 100); // Calculate tax: 20% of pack price
        $totalAmount = $amount + $taxAmount; // Total = pack price + 20% TVA

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
            'payment_mode' => 'required|string|in:Virement,Caisse agence,Chèque,CMI,TPE,Avance,Reliquat,RDV',
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
        
        // Check if user is currently a member or client_expire (can create new subscription)
        if (!in_array($user->status, ['member', 'client_expire'])) {
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
        } catch (\Exception $e) {
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
        
        if (!in_array($user->status, ['member', 'client_expire'])) {
            return response()->json(['error' => 'User is not a member or client expired'], 400);
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
            $user->update(['status' => 'client_expire']);
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
            $message .= "Status changed to 'client_expire'. ";
        }
        if ($emailSent) {
            $message .= "Email sent successfully to {$user->email}.";
        } elseif ($emailError) {
            $message .= "Email failed: {$emailError}";
        }

        return redirect()->back()->with('success', $message);
    }

    /**
     * Show the form to add a new prospect
     */
    public function createProspect()
    {
        $me = Auth::user();
        if (!$me) {
            abort(403, 'Unauthorized.');
        }

        $roleName = \Illuminate\Support\Facades\DB::table('model_has_roles')
            ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
            ->where('model_has_roles.model_id', $me->id)
            ->value('roles.name');

        // Only matchmakers and managers can add prospects
        if (!in_array($roleName, ['matchmaker', 'manager'])) {
            abort(403, 'Unauthorized action.');
        }

        // Check approval status
        if ($me->approval_status !== 'approved') {
            abort(403, 'Your account is not validated yet.');
        }

        // Restrict matchmaker access: must be linked to an agency
        if ($roleName === 'matchmaker' && !$me->agency_id) {
            abort(403, 'You must be linked to an agency to add prospects.');
        }

        return Inertia::render('matchmaker/add-prospect');
    }

    /**
     * Store a new prospect added by matchmaker or manager
     */
    public function storeProspect(Request $request)
    {
        $me = Auth::user();
        if (!$me) {
            abort(403, 'Unauthorized.');
        }

        $roleName = \Illuminate\Support\Facades\DB::table('model_has_roles')
            ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
            ->where('model_has_roles.model_id', $me->id)
            ->value('roles.name');

        // Only matchmakers and managers can add prospects
        if (!in_array($roleName, ['matchmaker', 'manager'])) {
            abort(403, 'Unauthorized action.');
        }

        // Check approval status
        if ($me->approval_status !== 'approved') {
            abort(403, 'Your account is not validated yet.');
        }

        // Restrict matchmaker access: must be linked to an agency
        if ($roleName === 'matchmaker' && !$me->agency_id) {
            abort(403, 'You must be linked to an agency to add prospects.');
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:'.User::class,
            'phone' => 'required|string|max:20',
            'gender' => 'required|string|in:male,female,other,prefer-not-to-say',
            'country' => 'required|string|max:100',
            'city' => 'required|string|max:100',
        ]);

        // Generate unique username
        $baseUsername = Str::slug($request->name);
        $username = $baseUsername;
        $counter = 1;
        
        while (User::where('username', $username)->exists()) {
            $username = $baseUsername . $counter;
            $counter++;
        }

        // Generate a secure random password that meets password rules
        // Generate password with uppercase, lowercase, numbers, and special characters
        $uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        $lowercase = 'abcdefghijklmnopqrstuvwxyz';
        $numbers = '0123456789';
        $special = '!@#$%^&*';
        $all = $uppercase . $lowercase . $numbers . $special;
        
        $password = '';
        // Ensure at least one character from each set
        $password .= $uppercase[random_int(0, strlen($uppercase) - 1)];
        $password .= $lowercase[random_int(0, strlen($lowercase) - 1)];
        $password .= $numbers[random_int(0, strlen($numbers) - 1)];
        $password .= $special[random_int(0, strlen($special) - 1)];
        
        // Fill the rest randomly
        for ($i = strlen($password); $i < 12; $i++) {
            $password .= $all[random_int(0, strlen($all) - 1)];
        }
        
        // Shuffle the password to randomize character positions
        $password = str_shuffle($password);

        // Determine assignment based on role
        $assignedMatchmakerId = null;
        $agencyId = null;

        if ($roleName === 'matchmaker') {
            // If matchmaker adds prospect, assign directly to them
            $assignedMatchmakerId = $me->id;
            $agencyId = $me->agency_id;
        } elseif ($roleName === 'manager') {
            // If manager adds prospect, assign to agency (visible to all matchmakers in that agency)
            $agencyId = $me->agency_id;
            // Don't set assigned_matchmaker_id, so it's visible to all matchmakers in the agency
        }

        $user = User::create([
            'name' => $request->name,
            'username' => $username,
            'email' => $request->email,
            'phone' => $request->phone,
            'gender' => $request->gender,
            'country' => $request->country,
            'city' => $request->city,
            'password' => Hash::make($password),
            'status' => 'prospect',
            'agency_id' => $agencyId,
            'assigned_matchmaker_id' => $assignedMatchmakerId,
        ]);

        $user->assignRole('user');
        $user->profile()->create([]);

        // Send email with credentials
        try {
            Mail::to($user->email)->send(new ProspectCredentialsMail(
                name: $user->name,
                email: $user->email,
                password: $password,
            ));
        } catch (\Exception $e) {
            // Don't fail the creation if email fails
        }

        return redirect()->route('staff.agency-prospects')->with('success', 'Prospect créé avec succès. Les identifiants ont été envoyés par email.');
    }

    /**
     * Show edit profile form for a prospect
     */
    public function editProspectProfile($id)
    {
        $me = Auth::user();
        if (!$me) {
            abort(403, 'Unauthorized.');
        }

        $roleName = \Illuminate\Support\Facades\DB::table('model_has_roles')
            ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
            ->where('model_has_roles.model_id', $me->id)
            ->value('roles.name');

        // Only matchmakers and managers can edit profiles
        if (!in_array($roleName, ['matchmaker', 'manager', 'admin'])) {
            abort(403, 'Unauthorized action.');
        }

        $prospect = User::findOrFail($id);
        $profile = $prospect->profile;

        // Check authorization
        if ($roleName === 'matchmaker') {
            // Matchmaker can only edit prospects from their agency or assigned to them
            if ($prospect->agency_id !== $me->agency_id && $prospect->assigned_matchmaker_id !== $me->id) {
                abort(403, 'You can only edit prospects from your agency or assigned to you.');
            }
        } elseif ($roleName === 'manager') {
            // Manager can only edit prospects from their agency
            if ($prospect->agency_id !== $me->agency_id) {
                abort(403, 'You can only edit prospects from your agency.');
            }
        }

        // Format profile data for frontend (similar to ProfileController)
        $profileData = $profile ? [
            'nom' => $profile->nom,
            'prenom' => $profile->prenom,
            'dateNaissance' => $profile->date_naissance,
            'niveauEtudes' => $profile->niveau_etudes,
            'situationProfessionnelle' => $profile->situation_professionnelle,
            'secteur' => $profile->secteur,
            'revenu' => $profile->revenu,
            'religion' => $profile->religion,
            'origine' => $profile->origine,
            'paysResidence' => $profile->pays_residence,
            'villeResidence' => $profile->ville_residence,
            'paysOrigine' => $profile->pays_origine,
            'villeOrigine' => $profile->ville_origine,
            'aproposDescription' => $profile->apropos_description,
            'heardAboutUs' => $profile->heard_about_us,
            'heardAboutReference' => $profile->heard_about_reference,
            'etatMatrimonial' => $profile->etat_matrimonial,
            'logement' => $profile->logement,
            'taille' => $profile->taille,
            'poids' => $profile->poids,
            'etatSante' => $profile->etat_sante,
            'fumeur' => $profile->fumeur,
            'buveur' => $profile->buveur,
            'sport' => $profile->sport,
            'motorise' => $profile->motorise,
            'loisirs' => $profile->loisirs,
            'hasChildren' => $profile->has_children,
            'childrenCount' => $profile->children_count,
            'childrenGuardian' => $profile->children_guardian,
            'hijabChoice' => $profile->hijab_choice,
            'situationSante' => $profile->situation_sante,
            'ageMinimum' => $profile->age_minimum,
            'ageMaximum' => $profile->age_maximum,
            'situationMatrimonialeRecherche' => $profile->situation_matrimoniale_recherche,
            'paysRecherche' => $profile->pays_recherche,
            'villesRecherche' => $profile->villes_recherche,
            'niveauEtudesRecherche' => $profile->niveau_etudes_recherche,
            'statutEmploiRecherche' => $profile->statut_emploi_recherche,
            'revenuMinimum' => $profile->revenu_minimum,
            'religionRecherche' => $profile->religion_recherche,
            'profilRechercheDescription' => $profile->profil_recherche_description,
            'profilePicturePath' => $profile->profile_picture_path,
            'identityCardFrontPath' => $profile->identity_card_front_path,
            'currentStep' => $profile->current_step,
            'isCompleted' => $profile->is_completed,
        ] : null;

        return Inertia::render('matchmaker/edit-prospect-profile', [
            'prospect' => $prospect,
            'profile' => $profileData,
        ]);
    }

    /**
     * Update prospect profile (staff can fill/edit)
     */
    public function updateProspectProfile(Request $request, $id)
    {
        $me = Auth::user();
        if (!$me) {
            abort(403, 'Unauthorized.');
        }

        $roleName = \Illuminate\Support\Facades\DB::table('model_has_roles')
            ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
            ->where('model_has_roles.model_id', $me->id)
            ->value('roles.name');

        // Only matchmakers and managers can update profiles
        if (!in_array($roleName, ['matchmaker', 'manager', 'admin'])) {
            abort(403, 'Unauthorized action.');
        }

        $prospect = User::findOrFail($id);

        // Check authorization
        if ($roleName === 'matchmaker') {
            if ($prospect->agency_id !== $me->agency_id && $prospect->assigned_matchmaker_id !== $me->id) {
                abort(403, 'You can only update prospects from your agency or assigned to you.');
            }
        } elseif ($roleName === 'manager') {
            if ($prospect->agency_id !== $me->agency_id) {
                abort(403, 'You can only update prospects from your agency.');
            }
        }

        $request->validate([
            'currentStep' => 'required|integer|between:1,4',
        ]);

        $profile = \App\Models\Profile::where('user_id', $prospect->id)->first();

        if (!$profile) {
            $profile = new \App\Models\Profile();
            $profile->user_id = $prospect->id;
        }

        // Validate and update fields based on current step
        switch ($request->currentStep) {
            case 1:
                $this->validateStep1ForStaff($request);
                $this->updateStep1DataForStaff($profile, $request);
                $profile->current_step = 2;
                break;
                
            case 2:
                $this->validateStep2ForStaff($request);
                $this->updateStep2DataForStaff($profile, $request);
                $profile->current_step = 3;
                break;
                
            case 3:
                $this->validateStep3ForStaff($request);
                $this->updateStep3DataForStaff($profile, $request);
                $profile->current_step = 4;
                break;
                
            case 4:
                $this->validateStep4ForStaff($request);
                $this->updateStep4DataForStaff($profile, $request);
                $profile->current_step = 4;
                $profile->is_completed = true;
                $profile->completed_at = now();
                break;
        }

        $profile->save();

        return redirect()->back()->with('success', 'Profil mis à jour avec succès');
    }

    // Validation methods for each step (similar to ProfileController)
    private function validateStep1ForStaff(Request $request)
    {
        $request->validate([
            'nom' => 'required|string|max:255',
            'prenom' => 'required|string|max:255',
            'dateNaissance' => 'required|date',
            'niveauEtudes' => 'required|string',
            'situationProfessionnelle' => 'required|string',
            'heardAboutUs' => 'nullable|string|in:recommande,passage,pub,online_ads,google_search,youtube_video,facebook_post,instagram_post,tiktok_video,collaboration,phone_call',
            'heardAboutReference' => 'nullable|string|max:255',
        ]);
    }

    private function validateStep2ForStaff(Request $request)
    {
        $rules = [
            'etatMatrimonial' => 'required|string',
            'logement' => 'required|string',
            'taille' => 'nullable|integer|min:100|max:250',
            'poids' => 'nullable|integer|min:30|max:200',
            'etatSante' => 'nullable|string|max:1000',
            'fumeur' => 'nullable|string',
            'buveur' => 'nullable|string',
            'sport' => 'nullable|string',
            'motorise' => 'nullable|string',
            'loisirs' => 'nullable|string|max:1000',
            'hasChildren' => 'nullable|in:true,false,1,0',
            'childrenCount' => 'nullable|integer|min:0|max:20',
            'childrenGuardian' => 'nullable|in:mother,father',
            'hijabChoice' => 'nullable|in:voile,non_voile,niqab,idea_niqab,idea_hijab',
            'situationSante' => 'nullable',
            'heardAboutUs' => 'required|string|in:recommande,passage,pub,online_ads,google_search,youtube_video,facebook_post,instagram_post,tiktok_video,collaboration,phone_call',
            'heardAboutReference' => 'nullable|string|max:255',
        ];
        
        if ($request->filled('situationSante')) {
            $situationSante = $request->situationSante;
            $situationArray = is_string($situationSante) ? json_decode($situationSante, true) : $situationSante;
            if (is_array($situationArray)) {
                $validValues = ['sante_tres_bonne', 'maladie_chronique', 'personne_handicap', 'non_voyant_malvoyant', 'cecite_totale', 'troubles_psychiques', 'autres'];
                foreach ($situationArray as $value) {
                    if (!in_array($value, $validValues)) {
                        throw \Illuminate\Validation\ValidationException::withMessages([
                            'situationSante' => ['Valeur invalide pour la situation de santé: ' . $value],
                        ]);
                    }
                }
            }
        }

        if ($request->etatMatrimonial === 'divorce') {
            if ($request->boolean('hasChildren')) {
                $rules['childrenCount'] = 'required|integer|min:1|max:20';
                $rules['childrenGuardian'] = 'required|in:mother,father';
            }
        }

        if ($request->string('heardAboutUs')->toString() === 'pub' || $request->string('heardAboutUs')->toString() === 'recommande') {
            $rules['heardAboutReference'] = 'required|string|max:255';
        }
        $request->validate($rules);
    }

    private function validateStep3ForStaff(Request $request)
    {
        $rules = [
            'ageMinimum' => 'required|integer|min:18|max:100',
            'ageMaximum' => 'required|integer|min:18|max:100|gt:ageMinimum',
            'situationMatrimonialeRecherche' => 'required',
            'paysRecherche' => 'required',
        ];
        $request->validate($rules);
        
        $situationMatrimonialeRecherche = $request->situationMatrimonialeRecherche;
        $situationArray = is_string($situationMatrimonialeRecherche) ? json_decode($situationMatrimonialeRecherche, true) : $situationMatrimonialeRecherche;
        if (!is_array($situationArray) || count($situationArray) === 0) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'situationMatrimonialeRecherche' => ['Au moins une situation matrimoniale doit être sélectionnée.'],
            ]);
        }
        
        $paysRecherche = $request->paysRecherche;
        $paysArray = is_string($paysRecherche) ? json_decode($paysRecherche, true) : $paysRecherche;
        if (!is_array($paysArray) || count($paysArray) === 0) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'paysRecherche' => ['Au moins un pays doit être sélectionné.'],
            ]);
        }
    }

    private function validateStep4ForStaff(Request $request)
    {
        $rules = [];
        
        if ($request->filled('cin')) {
            $rules['cin'] = [
                'string',
                'regex:/^[A-Za-z]{1,2}\d{4,6}$/',
                function ($attribute, $value, $fail) use ($request) {
                    $cinUpper = strtoupper($value);
                    $existingProfile = \App\Models\Profile::where('cin', $cinUpper)
                        ->where('user_id', '!=', $request->route('user'))
                        ->first();
                    
                    if ($existingProfile) {
                        $fail('Ce numéro de CNI est déjà utilisé par un autre utilisateur.');
                    }
                },
            ];
        }
        
        if ($request->hasFile('identityCardFront')) {
            $rules['identityCardFront'] = 'file|mimes:jpeg,png,jpg,pdf|max:5120';
        }
        
        if ($request->hasFile('profilePicture')) {
            $rules['profilePicture'] = 'image|mimes:jpeg,png,jpg|max:2048';
        }
        
        if (!empty($rules)) {
            $request->validate($rules);
        }
    }

    // Helper methods for updating profile data (similar to ProfileController but for staff)
    private function updateStep1DataForStaff(\App\Models\Profile $profile, Request $request)
    {
        $profile->nom = $request->nom;
        $profile->prenom = $request->prenom;
        $profile->date_naissance = $request->dateNaissance;
        $profile->niveau_etudes = $request->niveauEtudes;
        $profile->situation_professionnelle = $request->situationProfessionnelle;
        $profile->secteur = $request->secteur;
        $profile->revenu = $request->revenu;
        $profile->religion = $request->religion;
        $profile->origine = $request->origine;
        $profile->pays_residence = $request->paysResidence;
        $profile->ville_residence = $request->villeResidence;
        $profile->pays_origine = $request->paysOrigine;
        $profile->ville_origine = $request->villeOrigine;
        $profile->apropos_description = $request->aproposDescription;
        $profile->heard_about_us = $request->heardAboutUs;
        $profile->heard_about_reference = $request->heardAboutReference;
    }

    private function updateStep2DataForStaff(\App\Models\Profile $profile, Request $request)
    {
        $profile->etat_matrimonial = $request->etatMatrimonial;
        $profile->logement = $request->logement;
        $profile->taille = $request->taille;
        $profile->poids = $request->poids;
        $profile->etat_sante = $request->etatSante;
        $profile->fumeur = $request->fumeur;
        $profile->buveur = $request->buveur;
        $profile->sport = $request->sport;
        $profile->motorise = $request->motorise;
        $profile->loisirs = $request->loisirs;
        $profile->has_children = $request->boolean('hasChildren');
        $profile->children_count = $request->childrenCount;
        $profile->children_guardian = $request->childrenGuardian;
        $profile->hijab_choice = $request->hijabChoice;
        
        $situationSante = $request->situationSante;
        if (is_string($situationSante)) {
            $decoded = json_decode($situationSante, true);
            $profile->situation_sante = is_array($decoded) ? $decoded : ($decoded ? [$decoded] : []);
        } else {
            $profile->situation_sante = is_array($situationSante) ? $situationSante : ($situationSante ? [$situationSante] : []);
        }
        
        $profile->heard_about_us = $request->heardAboutUs;
        $profile->heard_about_reference = $request->heardAboutReference;
    }

    private function updateStep3DataForStaff(\App\Models\Profile $profile, Request $request)
    {
        $profile->age_minimum = $request->ageMinimum;
        $profile->age_maximum = $request->ageMaximum;
        
        $situationMatrimonialeRecherche = $request->situationMatrimonialeRecherche;
        if (is_string($situationMatrimonialeRecherche)) {
            $decoded = json_decode($situationMatrimonialeRecherche, true);
            $profile->situation_matrimoniale_recherche = is_array($decoded) ? $decoded : [$situationMatrimonialeRecherche];
        } else {
            $profile->situation_matrimoniale_recherche = is_array($situationMatrimonialeRecherche) ? $situationMatrimonialeRecherche : [$situationMatrimonialeRecherche];
        }
        
        $paysRecherche = $request->paysRecherche;
        if (is_string($paysRecherche)) {
            $decoded = json_decode($paysRecherche, true);
            $profile->pays_recherche = is_array($decoded) ? $decoded : [$paysRecherche];
        } else {
            $profile->pays_recherche = is_array($paysRecherche) ? $paysRecherche : [$paysRecherche];
        }
        
        $villesRecherche = $request->villesRecherche;
        if (is_string($villesRecherche)) {
            $decoded = json_decode($villesRecherche, true);
            $profile->villes_recherche = is_array($decoded) ? $decoded : [];
        } else {
            $profile->villes_recherche = is_array($villesRecherche) ? $villesRecherche : [];
        }
        
        $profile->niveau_etudes_recherche = $request->niveauEtudesRecherche;
        $profile->statut_emploi_recherche = $request->statutEmploiRecherche;
        $profile->revenu_minimum = $request->revenuMinimum;
        $profile->religion_recherche = $request->religionRecherche;
        $profile->profil_recherche_description = $request->profilRechercheDescription;
    }

    private function updateStep4DataForStaff(\App\Models\Profile $profile, Request $request)
    {
        if ($request->hasFile('profilePicture')) {
            if ($profile->profile_picture_path) {
                \Illuminate\Support\Facades\Storage::disk('public')->delete($profile->profile_picture_path);
            }
            $path = $request->file('profilePicture')->store('profile-pictures', 'public');
            $profile->profile_picture_path = $path;
        }
        
        if ($request->hasFile('identityCardFront')) {
            if ($profile->identity_card_front_path) {
                \Illuminate\Support\Facades\Storage::disk('public')->delete($profile->identity_card_front_path);
            }
            $file = $request->file('identityCardFront');
            $path = $file->store('identity-cards', 'public');
            $profile->identity_card_front_path = $path;
            
            $appKey = (string) config('app.key');
            if (str_starts_with($appKey, 'base64:')) {
                $decoded = base64_decode(substr($appKey, 7));
                if ($decoded !== false) {
                    $appKey = $decoded;
                }
            }
            $fileContent = file_get_contents($file->getRealPath());
            $profile->identity_card_front_hash = hash_hmac('sha256', $fileContent, $appKey);
        }
    }
}
