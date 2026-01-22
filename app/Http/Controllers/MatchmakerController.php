<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Bill;
use App\Models\MatrimonialPack;
use App\Models\MatchmakerNote;
use App\Models\MatchmakerEvaluation;
use App\Models\TransferRequest;
use App\Models\UserPhoto;
use App\Models\AppointmentRequest;
use App\Models\Proposition;
use App\Models\PropositionRequest;
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
use App\Services\MatchmakingService;
use Illuminate\Support\Facades\Storage;

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
            // Matchmaker: see only prospects assigned to them
            $query->where('assigned_matchmaker_id', $me->id);
        } elseif ($roleName === 'manager') {
            // Manager: see all prospects from their agency (including those assigned to matchmakers in their agency)
            // but excluding prospects created by other managers in the same agency
            // Get all matchmaker IDs in the manager's agency
            $matchmakerIds = User::role('matchmaker')
                ->where('agency_id', $me->agency_id)
                ->pluck('id')
                ->toArray();
            
            // Get all manager IDs in the manager's agency (excluding themselves)
            $otherManagerIds = User::role('manager')
                ->where('agency_id', $me->agency_id)
                ->where('id', '!=', $me->id)
                ->pluck('id')
                ->toArray();
            
            $query->where(function($q) use ($me, $matchmakerIds, $otherManagerIds) {
                // Prospects from their agency
                $q->where('agency_id', $me->agency_id)
                  ->where(function($subQ) use ($me, $matchmakerIds) {
                      // Prospects assigned to matchmakers in their agency
                      if (!empty($matchmakerIds)) {
                          $subQ->whereIn('assigned_matchmaker_id', $matchmakerIds);
                      }
                      // OR prospects assigned to them (prospects they created)
                      $subQ->orWhere('assigned_matchmaker_id', $me->id);
                      // OR unassigned prospects from their agency
                      $subQ->orWhereNull('assigned_matchmaker_id');
                  });
                
                // Exclude prospects assigned to other managers in the same agency
                if (!empty($otherManagerIds)) {
                    $q->whereNotIn('assigned_matchmaker_id', $otherManagerIds);
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
        } elseif ($statusFilter === 'traite') {
            // Show only treated prospects (but still active, not rejected)
            $query->where('is_traite', true);
            $query->whereNull('rejection_reason');
        } else {
            // Default to active (non-rejected) prospects - show ALL active prospects regardless of is_traite
            // is_traite is just a marker to show if matchmaker has seen/contacted, not a filter
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

        $prospects = $query->orderBy('created_at', 'desc')->get(['id','name','username','email','phone','country','city','status','agency_id','assigned_matchmaker_id','rejection_reason','rejected_by','rejected_at','is_traite','created_at']);
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
                // Matchmaker can only validate prospects assigned to them
                if ($prospect->assigned_matchmaker_id !== $me->id) {
                    return redirect()->back()->with('error', 'You can only validate prospects assigned to you.');
                }
            } elseif ($roleName === 'manager') {
                // Manager can validate prospects that are NOT dispatched to matchmakers
                // (i.e., assigned_matchmaker_id is null) OR assigned to them
                if ($prospect->assigned_matchmaker_id !== null && $prospect->assigned_matchmaker_id !== $me->id) {
                    return redirect()->back()->with('error', 'You cannot validate prospects that are dispatched to matchmakers.');
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
                // When a matchmaker validates, only they can add notes/evaluation
                // validated_by_manager_id remains null unless a manager validates directly
            } elseif ($actorRole === 'manager') {
                // If a manager validates directly, set validated_by_manager_id to themselves
                $validatedByManagerId = $actor->id;
                // If there's an assigned matchmaker, use that; otherwise, the manager is handling it
                if ($prospect->assigned_matchmaker_id) {
                    $assignedId = $prospect->assigned_matchmaker_id;
                }
            }
        }

        // Record initial matchmaker assignment in history when prospect becomes member
        $history = $prospect->matchmaker_assignment_history ?? [];
        $oldAssignedId = $prospect->assigned_matchmaker_id;
        
        // If assigned_matchmaker_id is being set/changed and not already in history, record it
        if ($assignedId && ($oldAssignedId !== $assignedId || empty($history))) {
            // Check if this matchmaker is already in history
            $alreadyRecorded = false;
            foreach ($history as $entry) {
                if (isset($entry['matchmaker_id']) && $entry['matchmaker_id'] == $assignedId) {
                    $alreadyRecorded = true;
                    break;
                }
            }
            
            // If not already recorded, add initial assignment
            if (!$alreadyRecorded) {
                $history[] = [
                    'matchmaker_id' => $assignedId,
                    'assigned_at' => now()->toIso8601String(),
                ];
            }
        }
        
        $prospect->update([
            'assigned_matchmaker_id' => $assignedId,
            'approval_status' => 'approved',
            'status' => 'member',
            'approved_by' => Auth::id(),
            'approved_at' => now(),
            'validated_by_manager_id' => $validatedByManagerId,
            'matchmaker_assignment_history' => $history,
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
            // Matchmaker can reject if they are assigned to the prospect
            if ($prospect->assigned_matchmaker_id === $me->id) {
                $canReject = true;
            }
        } elseif ($roleName === 'manager') {
            // Manager can reject if the prospect is assigned to them
            if ($prospect->assigned_matchmaker_id === $me->id) {
                $canReject = true;
            }
        }

        if (!$canReject) {
            abort(403, 'Vous n\'êtes pas autorisé à rejeter ce prospect.');
        }

        // Update prospect with rejection information
        $prospect->update([
            'rejection_reason' => $request->rejection_reason,
            'rejected_by' => $me->id,
            'rejected_at' => now(),
        ]);

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

        // Check authorization: admin, assigned matchmaker, or manager assigned to the prospect
        $canAccept = false;
        
        if ($roleName === 'admin') {
            $canAccept = true;
        } elseif ($roleName === 'matchmaker') {
            // Matchmaker can accept if they are assigned to the prospect
            if ($prospect->assigned_matchmaker_id === $me->id) {
                $canAccept = true;
            }
        } elseif ($roleName === 'manager') {
            // Manager can accept if the prospect is assigned to them
            if ($prospect->assigned_matchmaker_id === $me->id) {
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

    public function markAsRappeler(Request $request, $id)
    {
        $user = User::findOrFail($id);
        
        // Check if user is a rejected prospect OR an expired client
        $isRejectedProspect = $user->rejection_reason && $user->status === 'prospect';
        $isExpiredClient = $user->status === 'client_expire';
        
        if (!$isRejectedProspect && !$isExpiredClient) {
            return redirect()->back()->with('error', 'Seuls les prospects rejetés ou les clients expirés peuvent être marqués comme "A rappeler".');
        }

        $me = Auth::user();
        if (!$me) {
            abort(403, 'Unauthorized.');
        }

        $roleName = \Illuminate\Support\Facades\DB::table('model_has_roles')
            ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
            ->where('model_has_roles.model_id', $me->id)
            ->value('roles.name');

        // Check authorization: admin, assigned matchmaker, or manager assigned to the user
        $canMarkRappeler = false;
        
        if ($roleName === 'admin') {
            $canMarkRappeler = true;
        } elseif ($roleName === 'matchmaker') {
            // For rejected prospects: matchmaker can mark if assigned to them OR if prospect is from their agency
            if ($isRejectedProspect) {
                if ($user->assigned_matchmaker_id === $me->id) {
                    $canMarkRappeler = true;
                }
                if ($user->agency_id === $me->agency_id && $user->assigned_matchmaker_id === null) {
                    $canMarkRappeler = true;
                }
            }
            // For expired clients: matchmaker can mark if they validated them OR if assigned to them
            if ($isExpiredClient) {
                if ($user->approved_by === $me->id || $user->assigned_matchmaker_id === $me->id) {
                    $canMarkRappeler = true;
                }
            }
        } elseif ($roleName === 'manager') {
            // Manager can mark if the user is from their agency
            if ($user->agency_id === $me->agency_id) {
                $canMarkRappeler = true;
            }
            // Or if they validated the user
            if ($user->validated_by_manager_id === $me->id) {
                $canMarkRappeler = true;
            }
        }

        if (!$canMarkRappeler) {
            abort(403, 'Vous n\'êtes pas autorisé à marquer cet utilisateur comme "A rappeler".');
        }

        // Mark user as "A rappeler"
        $user->update([
            'to_rappeler' => true,
        ]);

        $userType = $isRejectedProspect ? 'Prospect' : 'Utilisateur';
        return redirect()->back()->with('success', $userType . ' marqué comme "A rappeler" avec succès.');
    }

    /**
     * Toggle traité status for a prospect
     */
    public function toggleTraite(Request $request, $id)
    {
        $me = Auth::user();
        if (!$me) {
            abort(403, 'Unauthorized.');
        }

        $roleName = \Illuminate\Support\Facades\DB::table('model_has_roles')
            ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
            ->where('model_has_roles.model_id', $me->id)
            ->value('roles.name');

        if (!in_array($roleName, ['matchmaker', 'manager', 'admin'])) {
            abort(403, 'Unauthorized action.');
        }

        $prospect = User::findOrFail($id);

        // Check if prospect status is still 'prospect'
        if ($prospect->status !== 'prospect') {
            return redirect()->back()->with('error', 'Ce prospect n\'est plus un prospect.');
        }

        // Check authorization: admin, assigned matchmaker, or manager from same agency
        $canToggle = false;
        if ($roleName === 'admin') {
            $canToggle = true;
        } elseif ($roleName === 'matchmaker') {
            if ($prospect->assigned_matchmaker_id === $me->id) {
                $canToggle = true;
            }
        } elseif ($roleName === 'manager') {
            if ($prospect->agency_id === $me->agency_id || $prospect->assigned_matchmaker_id === $me->id) {
                $canToggle = true;
            }
        }

        if (!$canToggle) {
            abort(403, 'You are not authorized to toggle this prospect\'s status.');
        }

        // Toggle the is_traite status
        $prospect->update([
            'is_traite' => !$prospect->is_traite,
        ]);

        $status = $prospect->is_traite ? 'traité' : 'pas traité';
        return redirect()->back()->with('success', "Prospect marqué comme {$status}.");
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

        $status = $request->input('status', 'all'); // all|member|client|client_expire|rappeler
        $query = User::role('user')
            ->whereIn('status', ['member','client','client_expire'])
            ->with(['profile', 'assignedMatchmaker']);

        // Role-based filtering
        if ($me) {
            if ($roleName === 'matchmaker') {
                // Matchmaker: see only users assigned to them (removed from old matchmaker's list when transferred)
                $query->where('assigned_matchmaker_id', $me->id);
            } elseif ($roleName === 'manager') {
                // Manager: see all members/clients validated from prospects assigned to their agency
                // This includes:
                // 1. Members validated when they were the manager (validated_by_manager_id = manager.id)
                // 2. Members from prospects that were dispatched to their agency (agency_id = manager.agency_id)
                // 3. Members assigned to matchmakers in their agency
                // Get all matchmaker IDs in the manager's agency
                $matchmakerIds = User::role('matchmaker')
                    ->where('agency_id', $me->agency_id)
                    ->pluck('id')
                    ->toArray();
                
                // Get all manager IDs in the manager's agency (excluding themselves)
                $otherManagerIds = User::role('manager')
                    ->where('agency_id', $me->agency_id)
                    ->where('id', '!=', $me->id)
                    ->pluck('id')
                    ->toArray();
                
                $query->where(function($q) use ($me, $matchmakerIds, $otherManagerIds) {
                    // Members validated when this manager was in charge
                    $q->where('validated_by_manager_id', $me->id)
                      // OR members from prospects that were dispatched to their agency
                      ->orWhere(function($subQ) use ($me, $matchmakerIds) {
                          // Users from their agency
                          $subQ->where('agency_id', $me->agency_id)
                            ->where(function($subSubQ) use ($me, $matchmakerIds) {
                                // Users assigned to matchmakers in their agency
                                if (!empty($matchmakerIds)) {
                                    $subSubQ->whereIn('assigned_matchmaker_id', $matchmakerIds);
                                }
                                // OR users assigned to them (prospects they created)
                                $subSubQ->orWhere('assigned_matchmaker_id', $me->id);
                                // OR unassigned users from their agency
                                $subSubQ->orWhereNull('assigned_matchmaker_id');
                            });
                      })
                      // OR members assigned to matchmakers in their agency (even if agency_id is null)
                      ->orWhere(function($subQ) use ($matchmakerIds) {
                          if (!empty($matchmakerIds)) {
                              $subQ->whereIn('assigned_matchmaker_id', $matchmakerIds);
                          }
                      });
                    
                    // Exclude users assigned to other managers in the same agency
                    if (!empty($otherManagerIds)) {
                        $q->whereNotIn('assigned_matchmaker_id', $otherManagerIds);
                    }
                });
            }
            // Admin: no additional filtering (sees all)
        }

        // Apply status filter - if status is 'all', show all validated prospects (member, client, client_expire)
        // If status is 'rappeler', show only expired clients marked as "A rappeler"
        // If status is 'en_attente_paiement', show members OR clients (including expired) with unpaid bills
        // If status is 'client_expire', show only expired clients who DON'T have unpaid bills (those with unpaid bills appear in "en attente de paiement")
        // If status is 'expiring_in_3_days', show clients with active subscriptions expiring within 3 days
        if ($status && $status !== 'all') {
            if ($status === 'rappeler') {
                // Show only expired clients marked as "A rappeler"
                $query->where('status', 'client_expire')
                      ->where('to_rappeler', true);
            } elseif ($status === 'en_attente_paiement') {
                // Show members OR clients (including expired) with unpaid bills
                $query->whereIn('status', ['member', 'client', 'client_expire'])
                      ->whereHas('bills', function($billQuery) {
                          $billQuery->where('status', 'unpaid');
                      });
            } elseif ($status === 'client_expire') {
                // Show only expired clients who DON'T have unpaid bills
                // If they have unpaid bills, they should appear in "en attente de paiement" instead
                $query->where('status', 'client_expire')
                      ->whereDoesntHave('bills', function($billQuery) {
                          $billQuery->where('status', 'unpaid');
                      });
            } elseif ($status === 'expiring_in_3_days') {
                // Show clients with active subscriptions expiring within 3 days (0-3 days)
                $today = \Carbon\Carbon::today();
                $threeDaysFromNow = $today->copy()->addDays(3);
                $query->whereIn('status', ['client', 'client_expire'])
                      ->whereHas('subscriptions', function($subQuery) use ($today, $threeDaysFromNow) {
                          $subQuery->where('status', 'active')
                                   ->whereDate('subscription_end', '>=', $today)
                                   ->whereDate('subscription_end', '<=', $threeDaysFromNow);
                      });
            } elseif ($status === 'deactivated') {
                // Show only deactivated users
                $query->whereHas('profile', function($profileQuery) {
                    $profileQuery->where('account_status', 'desactivated');
                });
            } else {
                $query->where('status', $status);
            }
        }

        $prospects = $query->with([
            'profile', 
            'profile.matrimonialPack', 
            'agency', 
            'validatedByManager',
            'approvedBy',
            'assignedMatchmaker',
            'bills', 
            'subscriptions' => function($q) {
                $q->orderBy('created_at', 'desc');
            },
            'subscriptions.matrimonialPack',
            'subscriptions.assignedMatchmaker'
        ])->orderBy('created_at', 'desc')->paginate(8)->withQueryString();
        
        // Ensure to_rappeler is included in the response
        $prospects->each(function($prospect) {
            $prospect->to_rappeler = $prospect->to_rappeler ?? false;
        });

        // Add has_bill flag to each prospect
        $prospects->each(function($prospect) {
            $prospect->has_bill = $prospect->bills->where('status', '!=', 'paid')->isNotEmpty();
        });

        // Add expiring_in_3_days flag to each prospect
        $today = \Carbon\Carbon::today();
        $threeDaysFromNow = $today->copy()->addDays(3);
        $prospects->each(function($prospect) use ($today, $threeDaysFromNow) {
            $prospect->expiring_in_3_days = false;
            $prospect->expiration_date = null;
            $prospect->expiring_pack_name = null;
            
            // Check if user has an active subscription expiring within 3 days (0-3 days)
            $activeSubscription = $prospect->subscriptions
                ->where('status', 'active')
                ->first();
            
            if ($activeSubscription && $activeSubscription->subscription_end) {
                $expirationDate = \Carbon\Carbon::parse($activeSubscription->subscription_end);
                $daysUntilExpiration = $today->diffInDays($expirationDate, false);
                
                // Check if subscription expires within 3 days (0 to 3 days)
                if ($daysUntilExpiration >= 0 && $daysUntilExpiration <= 3) {
                    $prospect->expiring_in_3_days = true;
                    $prospect->expiration_date = $expirationDate->format('d/m/Y');
                    $prospect->expiring_pack_name = $activeSubscription->matrimonialPack->name ?? null;
                }
            }
        });

        // Load pending transfer requests for each prospect
        $prospectIds = $prospects->pluck('id')->toArray();
        $pendingTransferRequests = TransferRequest::whereIn('user_id', $prospectIds)
            ->where('status', 'pending')
            ->where('from_matchmaker_id', $me->id)
            ->get()
            ->keyBy('user_id');
        
        // Add pending transfer request info to each prospect
        $prospects->each(function ($prospect) use ($pendingTransferRequests) {
            $transferRequest = $pendingTransferRequests->get($prospect->id);
            $prospect->pending_transfer_request = $transferRequest ? [
                'id' => $transferRequest->id,
                'to_matchmaker_id' => $transferRequest->to_matchmaker_id,
                'to_matchmaker' => $transferRequest->toMatchmaker ? [
                    'id' => $transferRequest->toMatchmaker->id,
                    'name' => $transferRequest->toMatchmaker->name,
                ] : null,
            ] : null;
        });

        return Inertia::render('matchmaker/validated-prospects', [
            'prospects' => $prospects,
            'status' => $status ?: 'all',
            'assignedMatchmaker' => $me,
        ]);
    }

    /**
     * Display evaluated users with filter by recommendation status
     */
    public function evaluatedUsers(Request $request)
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
        if (in_array($roleName, ['manager', 'matchmaker'], true)) {
            if ($me->approval_status !== 'approved') {
                abort(403, 'Your account is not validated yet.');
            }
        }

        $recommendationFilter = $request->input('recommendation', 'all'); // all|ready|accompany|not_ready

        // Base query: get all evaluations with user relationships
        // Load all possible agency sources including author's agency
        $query = \App\Models\MatchmakerEvaluation::with([
            'user.profile',
            'user.assignedMatchmaker.agency',
            'user.assignedMatchmaker',
            'user.agency',
            'user.validatedByManager.agency',
            'user.validatedByManager',
            'author' => function($q) {
                // Load author with agency_id so we can query their agency if needed
                $q->select('id', 'name', 'username', 'agency_id');
            }
        ])->whereHas('user'); // Ensure user still exists

        // Role-based filtering
        if ($roleName === 'matchmaker') {
            // Matchmaker: see evaluations for users assigned to them OR evaluations they created
            $query->where(function($q) use ($me) {
                $q->where('author_id', $me->id) // Evaluations they created
                  ->orWhereHas('user', function($subQ) use ($me) {
                      // OR evaluations for users assigned to them
                      $subQ->where('assigned_matchmaker_id', $me->id);
                  });
            });
        } elseif ($roleName === 'manager') {
            // Manager: see evaluations for users they validated OR users from their agency
            // This includes:
            // 1. Users validated by this manager (validated_by_manager_id = manager.id)
            // 2. Users from their agency (agency_id = manager.agency_id)
            // 3. Users assigned to matchmakers in their agency
            // 4. Users assigned to them
            $matchmakerIds = User::role('matchmaker')
                ->where('agency_id', $me->agency_id)
                ->pluck('id')
                ->toArray();

            $query->whereHas('user', function($q) use ($me, $matchmakerIds) {
                $q->where(function($subQ) use ($me, $matchmakerIds) {
                    // Users validated by this manager
                    $subQ->where('validated_by_manager_id', $me->id)
                      // OR users from their agency
                      ->orWhere(function($subSubQ) use ($me, $matchmakerIds) {
                          // Users from their agency
                          $subSubQ->where('agency_id', $me->agency_id)
                            ->where(function($subSubSubQ) use ($me, $matchmakerIds) {
                                // Users assigned to matchmakers in their agency
                                if (!empty($matchmakerIds)) {
                                    $subSubSubQ->whereIn('assigned_matchmaker_id', $matchmakerIds);
                                }
                                // OR users assigned to them
                                $subSubSubQ->orWhere('assigned_matchmaker_id', $me->id);
                                // OR unassigned users from their agency
                                $subSubSubQ->orWhereNull('assigned_matchmaker_id');
                            });
                      })
                      // OR users assigned to matchmakers in their agency (even if agency_id is null)
                      ->orWhere(function($subSubQ) use ($matchmakerIds) {
                          if (!empty($matchmakerIds)) {
                              $subSubQ->whereIn('assigned_matchmaker_id', $matchmakerIds);
                          }
                      });
                });
            });
        }
        // Admin: no additional filtering (sees all)

        // Apply recommendation filter
        if ($recommendationFilter !== 'all') {
            $query->where('recommendation', $recommendationFilter);
        }

        $evaluations = $query->orderBy('updated_at', 'desc')->get();

        // Transform data for frontend
        $evaluatedUsers = $evaluations->map(function($evaluation) {
            // Get agency from multiple sources with fallback priority:
            // 1. User's agency (if agency_id is set)
            // 2. Assigned matchmaker's agency
            // 3. Validated manager's agency
            // 4. Evaluator's (author's) agency
            // 5. Direct query by agency_id if relationship didn't load
            $agency = null;
            
            // Try user's agency first (check both relationship and direct ID)
            if ($evaluation->user->agency) {
                $agency = [
                    'id' => $evaluation->user->agency->id,
                    'name' => $evaluation->user->agency->name,
                ];
            } elseif ($evaluation->user->agency_id) {
                // Try direct query if relationship didn't load
                $userAgency = \App\Models\Agency::find($evaluation->user->agency_id);
                if ($userAgency) {
                    $agency = [
                        'id' => $userAgency->id,
                        'name' => $userAgency->name,
                    ];
                }
            }
            
            // Fallback to assigned matchmaker's agency
            if (!$agency && $evaluation->user->assignedMatchmaker) {
                if ($evaluation->user->assignedMatchmaker->agency) {
                    $agency = [
                        'id' => $evaluation->user->assignedMatchmaker->agency->id,
                        'name' => $evaluation->user->assignedMatchmaker->agency->name,
                    ];
                } elseif ($evaluation->user->assignedMatchmaker->agency_id) {
                    // Try direct query if relationship didn't load
                    $matchmakerAgency = \App\Models\Agency::find($evaluation->user->assignedMatchmaker->agency_id);
                    if ($matchmakerAgency) {
                        $agency = [
                            'id' => $matchmakerAgency->id,
                            'name' => $matchmakerAgency->name,
                        ];
                    }
                }
            }
            
            // Fallback to validated manager's agency
            if (!$agency && $evaluation->user->validatedByManager) {
                if ($evaluation->user->validatedByManager->agency) {
                    $agency = [
                        'id' => $evaluation->user->validatedByManager->agency->id,
                        'name' => $evaluation->user->validatedByManager->agency->name,
                    ];
                } elseif ($evaluation->user->validatedByManager->agency_id) {
                    // Try direct query if relationship didn't load
                    $managerAgency = \App\Models\Agency::find($evaluation->user->validatedByManager->agency_id);
                    if ($managerAgency) {
                        $agency = [
                            'id' => $managerAgency->id,
                            'name' => $managerAgency->name,
                        ];
                    }
                }
            }
            
            // Fallback to evaluator's (author's) agency
            if (!$agency && $evaluation->author) {
                if ($evaluation->author->agency_id) {
                    $authorAgency = \App\Models\Agency::find($evaluation->author->agency_id);
                    if ($authorAgency) {
                        $agency = [
                            'id' => $authorAgency->id,
                            'name' => $authorAgency->name,
                        ];
                    }
                }
            }

            return [
                'id' => $evaluation->id,
                'user_id' => $evaluation->user_id,
                'user' => [
                    'id' => $evaluation->user->id,
                    'name' => $evaluation->user->name,
                    'username' => $evaluation->user->username,
                    'email' => $evaluation->user->email,
                    'phone' => $evaluation->user->phone,
                    'assigned_matchmaker' => $evaluation->user->assignedMatchmaker ? [
                        'id' => $evaluation->user->assignedMatchmaker->id,
                        'name' => $evaluation->user->assignedMatchmaker->name,
                        'username' => $evaluation->user->assignedMatchmaker->username,
                    ] : null,
                    'agency' => $agency,
                    'validated_by_manager' => $evaluation->user->validatedByManager ? [
                        'id' => $evaluation->user->validatedByManager->id,
                        'name' => $evaluation->user->validatedByManager->name,
                        'username' => $evaluation->user->validatedByManager->username,
                    ] : null,
                ],
                'recommendation' => $evaluation->recommendation,
                'author' => $evaluation->author ? [
                    'id' => $evaluation->author->id,
                    'name' => $evaluation->author->name,
                    'username' => $evaluation->author->username,
                ] : null,
                'updated_at' => $evaluation->updated_at,
                'created_at' => $evaluation->created_at,
            ];
        });

        return Inertia::render('staff/evaluated-users', [
            'evaluatedUsers' => $evaluatedUsers,
            'recommendationFilter' => $recommendationFilter,
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
        
        // Restrict manager access: must be linked to an agency
        if ($roleName === 'manager' && !$me->agency_id) {
            abort(403, 'You must be linked to an agency to access prospects.');
        }

        $statusFilter = $request->string('status_filter')->toString(); // active | rejected | rappeler
        $query = User::role('user')
            ->where('status', 'prospect')
            ->with(['profile', 'assignedMatchmaker', 'agency']);

        // Role-based filtering
        if ($roleName === 'matchmaker') {
            // Matchmaker: see only prospects assigned to them
            $query->where('assigned_matchmaker_id', $me->id);
        } elseif ($roleName === 'manager') {
            // Manager: see all prospects from their agency (including those assigned to matchmakers)
            // Get all matchmaker IDs in the manager's agency
            $matchmakerIds = User::role('matchmaker')
                ->where('agency_id', $me->agency_id)
                ->pluck('id')
                ->toArray();
            
            // Get all manager IDs in the manager's agency (excluding themselves)
            $otherManagerIds = User::role('manager')
                ->where('agency_id', $me->agency_id)
                ->where('id', '!=', $me->id)
                ->pluck('id')
                ->toArray();
            
            $query->where(function($q) use ($me, $matchmakerIds, $otherManagerIds) {
                // Option 1: Prospects from their agency (normal case)
                $q->where(function($subQ) use ($me, $otherManagerIds) {
                    $subQ->where('agency_id', $me->agency_id);
                    
                    // Exclude prospects assigned to other managers in the same agency
                    if (!empty($otherManagerIds)) {
                        $subQ->where(function($subSubQ) use ($otherManagerIds) {
                            $subSubQ->whereNotIn('assigned_matchmaker_id', $otherManagerIds)
                                    ->orWhereNull('assigned_matchmaker_id');
                        });
                    }
                });
                
                // Option 2: Prospects dispatched to matchmakers in their agency (even if agency_id is null)
                if (!empty($matchmakerIds)) {
                    $q->orWhere(function($subQ) use ($matchmakerIds, $otherManagerIds) {
                        $subQ->whereIn('assigned_matchmaker_id', $matchmakerIds);
                        
                        // Exclude prospects assigned to other managers
                        if (!empty($otherManagerIds)) {
                            $subQ->whereNotIn('assigned_matchmaker_id', $otherManagerIds);
                        }
                    });
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
        } elseif ($statusFilter === 'rappeler') {
            // Show only prospects marked as "A rappeler"
            $query->where('to_rappeler', true);
            $query->whereNotNull('rejection_reason');
            // For matchmakers, only show prospects they rejected
            if ($roleName === 'matchmaker') {
                $query->where('rejected_by', $me->id);
            }
        } elseif ($statusFilter === 'traite') {
            // Show only treated prospects (but still active, not rejected)
            $query->where('is_traite', true);
            $query->whereNull('rejection_reason');
        } else {
            // Default to active (non-rejected) prospects - show ALL active prospects regardless of is_traite
            // is_traite is just a marker to show if matchmaker has seen/contacted, not a filter
            $query->whereNull('rejection_reason');
        }

        if ($roleName === 'admin') {
            // Admin: may filter by agency_id
            $agencyId = (int) $request->integer('agency_id');
            if ($agencyId) {
                $query->where('agency_id', $agencyId);
            }
        }

        $prospects = $query->select(['id','name','username','email','phone','country','city','gender','status','agency_id','assigned_matchmaker_id','rejection_reason','rejected_by','rejected_at','to_rappeler','is_traite','created_at'])
            ->with(['profile', 'assignedMatchmaker', 'agency'])
            ->orderBy('created_at', 'desc')
            ->paginate(8)
            ->withQueryString();
        
        // Load pending transfer requests for each prospect
        $prospectIds = $prospects->pluck('id')->toArray();
        $pendingTransferRequests = TransferRequest::whereIn('user_id', $prospectIds)
            ->where('status', 'pending')
            ->where('from_matchmaker_id', $me->id)
            ->get()
            ->keyBy('user_id');
        
        // Transform the collection to add additional data
        $prospects->getCollection()->transform(function ($prospect) use ($pendingTransferRequests) {
            // Add pending transfer request info
            $transferRequest = $pendingTransferRequests->get($prospect->id);
            $prospect->pending_transfer_request = $transferRequest ? [
                'id' => $transferRequest->id,
                'to_matchmaker_id' => $transferRequest->to_matchmaker_id,
                'to_matchmaker' => $transferRequest->toMatchmaker ? [
                    'id' => $transferRequest->toMatchmaker->id,
                    'name' => $transferRequest->toMatchmaker->name,
                ] : null,
            ] : null;
            
            // Decrypt CNI for prospects who already provided it (for validation form display)
            if ($prospect->profile && $prospect->profile->cin) {
                try {
                    $prospect->profile->cin_decrypted = Crypt::decryptString($prospect->profile->cin);
                } catch (\Exception $e) {
                    // If decryption fails, mark as not provided
                    $prospect->profile->cin_decrypted = null;
                }
            }
            
            return $prospect;
        });
        
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
     * Test 3-day expiration reminder for a user (sets end date to 3 days from now)
     */
    public function testThreeDayReminder(Request $request)
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

        // Set subscription to expire in 3 days
        $threeDaysFromNow = \Carbon\Carbon::today()->addDays(3);
        $subscription->update(['subscription_end' => $threeDaysFromNow]);

        // Send 3-day reminder email
        $emailSent = false;
        $emailError = null;
        
        try {
            $daysRemaining = \Carbon\Carbon::today()->diffInDays($subscription->subscription_end, false);
            \Illuminate\Support\Facades\Mail::to($user->email)->send(
                new \App\Mail\SubscriptionReminderEmail($subscription, $daysRemaining)
            );
            $emailSent = true;
        } catch (\Exception $e) {
            $emailError = $e->getMessage();
        }

        $message = "Test 3-day reminder completed: ";
        $message .= "Subscription end date set to {$threeDaysFromNow->format('d/m/Y')}. ";
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
            // If manager adds prospect, assign to the manager (manager can also play role of matchmaker)
            $assignedMatchmakerId = $me->id;
            $agencyId = $me->agency_id;
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
            // Matchmaker can edit if:
            // 1. Prospect/member/client is assigned to them, OR
            // 2. User is a member/client with incomplete profile and was approved by them
            $canEdit = false;
            
            if ($prospect->assigned_matchmaker_id === $me->id) {
                $canEdit = true;
            } elseif (in_array($prospect->status, ['member', 'client', 'client_expire'])) {
                // For members/clients, allow if profile is incomplete and they approved them
                if (!$profile || !$profile->is_completed) {
                    if ($prospect->approved_by === $me->id) {
                        $canEdit = true;
                    }
                }
            }
            
            if (!$canEdit) {
                abort(403, 'You can only edit prospects assigned to you or members/clients with incomplete profiles that you approved.');
            }
        } elseif ($roleName === 'manager') {
            // Manager can edit if:
            // 1. Prospect is not dispatched yet (assigned_matchmaker_id is null) and from their agency, OR
            // 2. Prospect/member/client is assigned to them, OR
            // 3. User is a member/client with incomplete profile and was validated by them
            $canEdit = false;
            
            // If prospect is not dispatched and from manager's agency, manager can edit
            if ($prospect->status === 'prospect' && !$prospect->assigned_matchmaker_id && $prospect->agency_id === $me->agency_id) {
                $canEdit = true;
            } elseif ($prospect->assigned_matchmaker_id === $me->id) {
                $canEdit = true;
            } elseif (in_array($prospect->status, ['member', 'client', 'client_expire'])) {
                // For members/clients, allow if profile is incomplete and they validated them
                if (!$profile || !$profile->is_completed) {
                    if ($prospect->validated_by_manager_id === $me->id) {
                        $canEdit = true;
                    }
                }
            }
            
            if (!$canEdit) {
                abort(403, 'You can only edit prospects that are not dispatched (from your agency), prospects assigned to you, or members/clients with incomplete profiles that you validated.');
            }
        } elseif ($roleName === 'admin') {
            // Admin should not be able to edit profiles through this route
            abort(403, 'Admins cannot edit profiles through this route.');
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
     * Show subscription creation page for a member/client
     */
    public function createSubscriptionPage($id)
    {
        $me = Auth::user();
        if (!$me) {
            abort(403, 'Unauthorized.');
        }

        $roleName = \Illuminate\Support\Facades\DB::table('model_has_roles')
            ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
            ->where('model_has_roles.model_id', $me->id)
            ->value('roles.name');

        if (!in_array($roleName, ['matchmaker', 'manager', 'admin'])) {
            abort(403, 'Unauthorized action.');
        }

        $user = User::findOrFail($id);
        
        // Check if user is a member or client_expire
        if (!in_array($user->status, ['member', 'client_expire'])) {
            return redirect()->back()->with('error', 'Seuls les membres ou clients expirés peuvent avoir un abonnement créé.');
        }

        $profile = $user->profile;
        if (!$profile) {
            return redirect()->back()->with('error', 'Profil utilisateur non trouvé.');
        }

        // Check authorization
        $canCreate = false;
        if ($roleName === 'admin') {
            $canCreate = true;
        } elseif ($roleName === 'matchmaker') {
            if ($user->assigned_matchmaker_id === $me->id) {
                $canCreate = true;
            }
        } elseif ($roleName === 'manager') {
            if ($user->agency_id === $me->agency_id || $user->assigned_matchmaker_id === $me->id) {
                $canCreate = true;
            }
        }

        if (!$canCreate) {
            abort(403, 'Vous n\'êtes pas autorisé à créer un abonnement pour cet utilisateur.');
        }

        // Get matrimonial packs
        $matrimonialPacks = \App\Models\MatrimonialPack::all();

        return Inertia::render('matchmaker/create-subscription', [
            'user' => $user,
            'profile' => $profile,
            'matrimonialPacks' => $matrimonialPacks,
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
            // Matchmaker can only update prospects assigned to them
            if ($prospect->assigned_matchmaker_id !== $me->id) {
                abort(403, 'You can only update prospects assigned to you.');
            }
        } elseif ($roleName === 'manager') {
            // Manager can update prospects that are NOT dispatched to matchmakers
            // (i.e., assigned_matchmaker_id is null) OR assigned to them
            if ($prospect->assigned_matchmaker_id !== null && $prospect->assigned_matchmaker_id !== $me->id) {
                abort(403, 'You cannot edit prospects that are dispatched to matchmakers.');
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
                
                // Handle photo uploads
                if ($request->hasFile('photos')) {
                    $this->handlePhotoUploads($prospect, $request);
                }
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

    /**
     * Handle photo uploads for user gallery
     */
    private function handlePhotoUploads(User $user, Request $request)
    {
        $request->validate([
            'photos' => 'required|array|min:1|max:10',
            'photos.*' => 'image|mimes:jpeg,png,jpg,gif,webp|max:10240', // 10MB max per image
        ]);

        $currentUser = Auth::user(); // Get the matchmaker/admin who is uploading

        foreach ($request->file('photos') as $file) {
            $path = $file->store('user-photos', 'public');
            
            UserPhoto::create([
                'user_id' => $user->id,
                'uploaded_by' => $currentUser->id, // Track who uploaded the photo
                'file_path' => $path,
                'file_name' => $file->getClientOriginalName(),
                'file_disk' => 'public',
                'file_size' => $file->getSize(),
                'mime_type' => $file->getMimeType(),
            ]);
        }
    }

    /**
     * Get list of all matchmakers for transfer selection
     */
    public function getMatchmakersForTransfer()
    {
        $me = Auth::user();
        if (!$me) {
            abort(403, 'Unauthorized.');
        }

        $roleName = \Illuminate\Support\Facades\DB::table('model_has_roles')
            ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
            ->where('model_has_roles.model_id', $me->id)
            ->value('roles.name');

        if (!in_array($roleName, ['matchmaker', 'manager', 'admin'])) {
            abort(403, 'Unauthorized action.');
        }

        // Get all approved matchmakers, excluding the current user
        $matchmakers = User::role('matchmaker')
            ->where('approval_status', 'approved')
            ->where('id', '!=', $me->id)
            ->with('agency:id,name')
            ->select('id', 'name', 'email', 'phone', 'agency_id')
            ->get();

        return response()->json($matchmakers);
    }

    /**
     * Create a transfer request
     */
    public function createTransferRequest(Request $request)
    {
        $me = Auth::user();
        if (!$me) {
            abort(403, 'Unauthorized.');
        }

        $roleName = \Illuminate\Support\Facades\DB::table('model_has_roles')
            ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
            ->where('model_has_roles.model_id', $me->id)
            ->value('roles.name');

        if (!in_array($roleName, ['matchmaker', 'manager', 'admin'])) {
            abort(403, 'Unauthorized action.');
        }

        $request->validate([
            'user_id' => 'required|exists:users,id',
            'to_matchmaker_id' => 'required|exists:users,id',
            'reason' => 'nullable|string|max:1000',
        ]);

        $user = User::findOrFail($request->user_id);
        $toMatchmaker = User::findOrFail($request->to_matchmaker_id);

        // Verify the to_matchmaker_id is actually a matchmaker
        if (!$toMatchmaker->hasRole('matchmaker')) {
            return redirect()->back()->with('error', 'Selected user is not a matchmaker.');
        }

        // Check if user is assigned to current matchmaker
        if ($roleName === 'matchmaker' && $user->assigned_matchmaker_id !== $me->id) {
            abort(403, 'You can only transfer users assigned to you.');
        }

        // Check if there's already a pending transfer request for this user
        $existingRequest = TransferRequest::where('user_id', $user->id)
            ->where('status', 'pending')
            ->first();

        if ($existingRequest) {
            return redirect()->back()->with('error', 'A pending transfer request already exists for this user.');
        }

        // Create transfer request
        $transferRequest = TransferRequest::create([
            'user_id' => $user->id,
            'from_matchmaker_id' => $me->id,
            'to_matchmaker_id' => $toMatchmaker->id,
            'status' => 'pending',
            'reason' => $request->reason,
        ]);

        return redirect()->back()->with('success', 'Transfer request sent successfully.');
    }

    /**
     * Get transfer requests for the current matchmaker
     */
    public function getTransferRequests(Request $request)
    {
        $me = Auth::user();
        if (!$me) {
            abort(403, 'Unauthorized.');
        }

        $roleName = \Illuminate\Support\Facades\DB::table('model_has_roles')
            ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
            ->where('model_has_roles.model_id', $me->id)
            ->value('roles.name');

        if (!in_array($roleName, ['matchmaker', 'manager', 'admin'])) {
            abort(403, 'Unauthorized action.');
        }

        // Get requests where current user is the recipient (to_matchmaker_id)
        $receivedRequests = TransferRequest::where('to_matchmaker_id', $me->id)
            ->where('status', 'pending')
            ->with([
                'user.profile', 
                'user.agency',
                'fromMatchmaker', 
                'fromMatchmaker.agency',
                'user.assignedMatchmaker'
            ])
            ->orderBy('created_at', 'desc')
            ->get();

        // Get requests sent by current user
        $sentRequests = TransferRequest::where('from_matchmaker_id', $me->id)
            ->with([
                'user.profile', 
                'user.agency',
                'toMatchmaker', 
                'toMatchmaker.agency',
                'user.assignedMatchmaker'
            ])
            ->orderBy('created_at', 'desc')
            ->get();

        return Inertia::render('matchmaker/transfer-requests', [
            'receivedRequests' => $receivedRequests,
            'sentRequests' => $sentRequests,
        ]);
    }

    /**
     * Accept a transfer request
     */
    public function acceptTransferRequest(Request $request, $id)
    {
        $me = Auth::user();
        if (!$me) {
            abort(403, 'Unauthorized.');
        }

        $roleName = \Illuminate\Support\Facades\DB::table('model_has_roles')
            ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
            ->where('model_has_roles.model_id', $me->id)
            ->value('roles.name');

        if (!in_array($roleName, ['matchmaker', 'manager', 'admin'])) {
            abort(403, 'Unauthorized action.');
        }

        $transferRequest = TransferRequest::findOrFail($id);

        // Verify the request is for the current matchmaker
        if ($transferRequest->to_matchmaker_id !== $me->id) {
            abort(403, 'You can only accept transfer requests sent to you.');
        }

        // Verify the request is still pending
        if ($transferRequest->status !== 'pending') {
            return redirect()->back()->with('error', 'This transfer request has already been processed.');
        }

        // Update user's assigned matchmaker and record history
        $user = $transferRequest->user;
        $oldMatchmakerId = $user->assigned_matchmaker_id;
        
        // Get existing history or initialize empty array
        $history = $user->matchmaker_assignment_history ?? [];
        
        // Add old matchmaker to history if exists
        if ($oldMatchmakerId) {
            // Check if old matchmaker is already in history
            $found = false;
            foreach ($history as &$entry) {
                if (isset($entry['matchmaker_id']) && $entry['matchmaker_id'] == $oldMatchmakerId) {
                    // Update existing entry with transfer timestamp
                    $entry['transferred_at'] = now()->toIso8601String();
                    $found = true;
                    break;
                }
            }
            
            // If not found, add new entry
            if (!$found) {
                $history[] = [
                    'matchmaker_id' => $oldMatchmakerId,
                    'assigned_at' => $user->updated_at ? $user->updated_at->toIso8601String() : now()->toIso8601String(),
                    'transferred_at' => now()->toIso8601String(),
                ];
            }
        }
        
        // Add new matchmaker to history
        $newMatchmakerId = $me->id;
        // Check if new matchmaker is already in history
        $alreadyRecorded = false;
        foreach ($history as $entry) {
            if (isset($entry['matchmaker_id']) && $entry['matchmaker_id'] == $newMatchmakerId) {
                $alreadyRecorded = true;
                break;
            }
        }
        
        // If not already recorded, add new assignment entry
        if (!$alreadyRecorded) {
            $history[] = [
                'matchmaker_id' => $newMatchmakerId,
                'assigned_at' => now()->toIso8601String(),
            ];
        }
        
        // Update user's assigned matchmaker and history
        $user->update([
            'assigned_matchmaker_id' => $me->id,
            'matchmaker_assignment_history' => $history,
        ]);

        // Update transfer request status
        $transferRequest->update([
            'status' => 'accepted',
        ]);

        return redirect()->back()->with('success', 'Transfer request accepted. User has been assigned to you.');
    }

    /**
     * Reject a transfer request
     */
    public function rejectTransferRequest(Request $request, $id)
    {
        $me = Auth::user();
        if (!$me) {
            abort(403, 'Unauthorized.');
        }

        $roleName = \Illuminate\Support\Facades\DB::table('model_has_roles')
            ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
            ->where('model_has_roles.model_id', $me->id)
            ->value('roles.name');

        if (!in_array($roleName, ['matchmaker', 'manager', 'admin'])) {
            abort(403, 'Unauthorized action.');
        }

        $request->validate([
            'rejection_reason' => 'required|string|max:1000',
        ]);

        $transferRequest = TransferRequest::findOrFail($id);

        // Verify the request is for the current matchmaker
        if ($transferRequest->to_matchmaker_id !== $me->id) {
            abort(403, 'You can only reject transfer requests sent to you.');
        }

        // Verify the request is still pending
        if ($transferRequest->status !== 'pending') {
            return redirect()->back()->with('error', 'This transfer request has already been processed.');
        }

        // Update transfer request status with rejection reason
        $transferRequest->update([
            'status' => 'rejected',
            'rejection_reason' => $request->rejection_reason,
        ]);

        return redirect()->back()->with('success', 'Transfer request rejected.');
    }

    /**
     * Display propositions list page (to be implemented)
     */
    public function propositionsList(Request $request)
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

        $propositions = Proposition::query()
            ->where('matchmaker_id', $me->id)
            ->with([
                'recipientUser:id,name,username',
                'recipientUser.profile:id,user_id,profile_picture_path',
                'referenceUser:id,name,username',
                'referenceUser.profile:id,user_id,profile_picture_path',
                'compatibleUser:id,name,username',
                'compatibleUser.profile:id,user_id,profile_picture_path',
            ])
            ->latest()
            ->get()
            ->map(function (Proposition $proposition) {
                $isExpired = $proposition->status === 'pending'
                    && $proposition->created_at
                    && $proposition->created_at->lt(now()->subDays(7));

                return [
                    'id' => $proposition->id,
                    'reference_user_id' => $proposition->reference_user_id,
                    'compatible_user_id' => $proposition->compatible_user_id,
                    'recipient_user_id' => $proposition->recipient_user_id,
                    'message' => $proposition->message,
                    'status' => $proposition->status,
                    'is_expired' => $isExpired,
                    'response_message' => $proposition->response_message,
                    'user_comment' => $proposition->user_comment,
                    'responded_at' => $proposition->responded_at,
                    'created_at' => $proposition->created_at,
                    'recipient_user' => $proposition->recipientUser ? [
                        'id' => $proposition->recipientUser->id,
                        'name' => $proposition->recipientUser->name,
                        'username' => $proposition->recipientUser->username,
                        'profile' => $proposition->recipientUser->profile,
                    ] : null,
                    'reference_user' => $proposition->referenceUser ? [
                        'id' => $proposition->referenceUser->id,
                        'name' => $proposition->referenceUser->name,
                        'username' => $proposition->referenceUser->username,
                        'profile' => $proposition->referenceUser->profile,
                    ] : null,
                    'compatible_user' => $proposition->compatibleUser ? [
                        'id' => $proposition->compatibleUser->id,
                        'name' => $proposition->compatibleUser->name,
                        'username' => $proposition->compatibleUser->username,
                        'profile' => $proposition->compatibleUser->profile,
                    ] : null,
                ];
            })
            ->values();

        return Inertia::render('matchmaker/propositions-list', [
            'propositions' => $propositions,
        ]);
    }

    /**
     * Display matchmaker change page (to be implemented)
     */
    public function matchmakerChange(Request $request)
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

        return Inertia::render('matchmaker/matchmaker-change');
    }

    /**
     * Display match list page (to be implemented)
     */
    public function matchList(Request $request)
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

        return Inertia::render('matchmaker/match-list');
    }

    /**
     * Display matchmaking entry page - list all eligible prospects
     * This page allows matchmaker to select User A
     */
    public function searchMatchProfiles(Request $request)
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

        $matchmakingService = new MatchmakingService();
        
        // Get eligible members/clients based on role
        $matchmakerId = ($roleName === 'matchmaker') ? $me->id : null;
        $agencyId = ($roleName === 'manager') ? $me->agency_id : (($roleName === 'matchmaker') ? $me->agency_id : null);
        
        $prospects = $matchmakingService->getEligibleProspects($matchmakerId, $agencyId);
        
        // Format prospects for frontend (ensure proper serialization)
        $formattedProspects = $prospects->map(function($prospect) {
            return [
                'id' => $prospect->id,
                'name' => $prospect->name,
                'email' => $prospect->email,
                'username' => $prospect->username,
                'status' => $prospect->status,
                'gender' => $prospect->gender,
                'assigned_matchmaker_id' => $prospect->assigned_matchmaker_id,
                'approved_by' => $prospect->approved_by,
                'profile' => $prospect->profile ? $prospect->profile->toArray() : null,
            ];
        })->values();

        return Inertia::render('matchmaker/matchmaking-entry', [
            'prospects' => $formattedProspects,
        ]);
    }

    /**
     * Display smart matchmaking results page
     * Shows compatible matches for selected User A
     */
    public function matchmakingResults(Request $request, $userAId)
    {
        $me = Auth::user();
        $roleName = null;
        if ($me) {
            $roleName = \Illuminate\Support\Facades\DB::table('model_has_roles')
                ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
                ->where('model_has_roles.model_id', $me->id)
                ->value('roles.name');
        }
        
        // Check approval status
        if (in_array($roleName, ['manager','matchmaker'], true)) {
            if ($me->approval_status !== 'approved') {
                abort(403, 'Your account is not validated yet.');
            }
        }

        $matchmakingService = new MatchmakingService();
        
        // Get filter overrides from request
        $filterOverrides = $request->only([
            'age_min', 'age_max', 'pays_recherche', 'villes_recherche', 'religion',
            'revenu_minimum', 'niveau_etudes', 'situation_professionnelle',
            'etat_matrimonial', 'etat_sante', 'fumeur', 'buveur', 'has_children',
            'origine', 'logement', 'taille_min', 'taille_max', 'poids_min', 'poids_max',
            'pays_residence', 'pays_origine', 'ville_residence', 'ville_origine',
            'situation_sante', 'motorise', 'children_count',
            'hijab_choice', 'veil', 'niqab_acceptance', 'sport', 'secteur',
            'polygamy', 'foreign_marriage', 'work_after_marriage'
        ]);

        // Handle array fields
        if ($request->has('pays_recherche')) {
            if (is_array($request->pays_recherche)) {
                $filterOverrides['pays_recherche'] = $request->pays_recherche;
            } elseif (is_string($request->pays_recherche)) {
                $filterOverrides['pays_recherche'] = json_decode($request->pays_recherche, true) ?? [$request->pays_recherche];
            }
        }
        if ($request->has('villes_recherche')) {
            if (is_array($request->villes_recherche)) {
                $filterOverrides['villes_recherche'] = $request->villes_recherche;
            } elseif (is_string($request->villes_recherche)) {
                $filterOverrides['villes_recherche'] = json_decode($request->villes_recherche, true) ?? [$request->villes_recherche];
            }
        }
        if ($request->has('etat_matrimonial')) {
            if (is_array($request->etat_matrimonial)) {
                $filterOverrides['etat_matrimonial'] = $request->etat_matrimonial;
            } elseif (is_string($request->etat_matrimonial)) {
                $filterOverrides['etat_matrimonial'] = json_decode($request->etat_matrimonial, true) ?? [$request->etat_matrimonial];
            }
        }
        if ($request->has('situation_sante')) {
            if (is_array($request->situation_sante)) {
                $filterOverrides['situation_sante'] = $request->situation_sante;
            } elseif (is_string($request->situation_sante)) {
                $filterOverrides['situation_sante'] = json_decode($request->situation_sante, true) ?? [$request->situation_sante];
            }
        }
        if ($request->has('pays_residence') && is_string($request->pays_residence)) {
            $filterOverrides['pays_residence'] = json_decode($request->pays_residence, true) ?? [$request->pays_residence];
        }
        if ($request->has('pays_origine') && is_string($request->pays_origine)) {
            $filterOverrides['pays_origine'] = json_decode($request->pays_origine, true) ?? [$request->pays_origine];
        }
        if ($request->has('ville_residence') && is_string($request->ville_residence)) {
            $filterOverrides['ville_residence'] = json_decode($request->ville_residence, true) ?? [$request->ville_residence];
        }
        if ($request->has('ville_origine') && is_string($request->ville_origine)) {
            $filterOverrides['ville_origine'] = json_decode($request->ville_origine, true) ?? [$request->ville_origine];
        }
        if ($request->has('situation_sante') && is_string($request->situation_sante)) {
            $filterOverrides['situation_sante'] = json_decode($request->situation_sante, true) ?? [$request->situation_sante];
        }

        // Remove empty values
        $filterOverrides = array_filter($filterOverrides, function($value) {
            if (is_array($value)) {
                return !empty($value);
            }
            return $value !== null && $value !== '';
        });

        try {
            $result = $matchmakingService->findMatches($userAId, $filterOverrides);
            
            $me = Auth::user();

            $compatibleIds = array_map(function ($match) {
                return $match['user']->id;
            }, $result['matches']);

            $statusMap = [];
            if (!empty($compatibleIds)) {
                $requestQuery = PropositionRequest::query()
                    ->where('from_matchmaker_id', $me->id)
                    ->whereIn('compatible_user_id', $compatibleIds)
                    ->orderByDesc('created_at');

                if (Schema::hasColumn('proposition_requests', 'reference_user_id')) {
                    $requestQuery->where('reference_user_id', $userAId);
                }

                $sentRequests = $requestQuery->get(['compatible_user_id', 'status']);
                foreach ($sentRequests as $sent) {
                    $compId = (int) $sent->compatible_user_id;
                    if (!array_key_exists($compId, $statusMap)) {
                        $statusMap[$compId] = $sent->status;
                    }
                }
            }

            // Format matches for Inertia (ensure proper serialization)
            $formattedMatches = array_map(function($match) use ($me, $statusMap) {
                return [
                    'user' => [
                        'id' => $match['user']->id,
                        'name' => $match['user']->name,
                        'email' => $match['user']->email,
                        'username' => $match['user']->username,
                        'gender' => $match['user']->gender,
                        'created_at' => $match['user']->created_at,
                        'updated_at' => $match['user']->updated_at,
                        'assigned_matchmaker_id' => $match['user']->assigned_matchmaker_id,
                    ],
                    'assigned_matchmaker' => $match['user']->assignedMatchmaker ? [
                        'id' => $match['user']->assignedMatchmaker->id,
                        'name' => $match['user']->assignedMatchmaker->name,
                        'username' => $match['user']->assignedMatchmaker->username,
                    ] : null,
                    'isAssignedToMe' => $match['user']->assigned_matchmaker_id === $me->id,
                    'profile' => $match['profile']->toArray(),
                    'score' => $match['score'],
                    'scoreDetails' => $match['scoreDetails'],
                    'completeness' => $match['completeness'],
                    'proposition_request_status' => $statusMap[$match['user']->id] ?? null,
                ];
            }, $result['matches']);
            
            return Inertia::render('matchmaker/matchmaking-results', [
                'userA' => [
                    'id' => $result['userA']->id,
                    'name' => $result['userA']->name,
                    'email' => $result['userA']->email,
                    'username' => $result['userA']->username,
                    'gender' => $result['userA']->gender,
                    'assigned_matchmaker_id' => $result['userA']->assigned_matchmaker_id,
                    'isAssignedToMe' => $result['userA']->assigned_matchmaker_id === $me->id,
                    'profile' => $result['userA']->profile ? $result['userA']->profile->toArray() : null,
                ],
                'matches' => $formattedMatches,
                'defaultFilters' => $result['defaultFilters'],
                'appliedFilters' => $result['appliedFilters'],
                'authenticatedMatchmaker' => [
                    'id' => $me->id,
                    'name' => $me->name,
                ]
            ]);
        } catch (\Exception $e) {
            return redirect()->route('staff.match.search')
                ->with('error', $e->getMessage());
        }
    }

    /**
     * API endpoint for dynamic filtering
     * Allows matchmaker to update filters and get refreshed results
     */
    public function updateMatchmakingFilters(Request $request, $userAId)
    {
        $me = Auth::user();
        
        // Check approval status
        $roleName = null;
        if ($me) {
            $roleName = \Illuminate\Support\Facades\DB::table('model_has_roles')
                ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
                ->where('model_has_roles.model_id', $me->id)
                ->value('roles.name');
        }
        
        if (in_array($roleName, ['manager','matchmaker'], true)) {
            if ($me->approval_status !== 'approved') {
                return response()->json(['error' => 'Unauthorized'], 403);
            }
        }

        $matchmakingService = new MatchmakingService();
        
        // Get filter overrides from request
        $filterOverrides = $request->only([
            'age_min', 'age_max', 'pays_recherche', 'villes_recherche', 'religion',
            'revenu_minimum', 'niveau_etudes', 'situation_professionnelle',
            'etat_matrimonial', 'etat_sante', 'fumeur', 'buveur', 'has_children',
            'origine', 'logement', 'taille_min', 'taille_max', 'poids_min', 'poids_max',
            'pays_residence', 'pays_origine', 'ville_residence', 'ville_origine',
            'situation_sante', 'motorise', 'children_count',
            'hijab_choice', 'veil', 'niqab_acceptance', 'sport', 'secteur',
            'polygamy', 'foreign_marriage', 'work_after_marriage'
        ]);

        // Handle array fields
        if ($request->has('pays_recherche')) {
            if (is_array($request->pays_recherche)) {
                $filterOverrides['pays_recherche'] = $request->pays_recherche;
            } elseif (is_string($request->pays_recherche)) {
                $filterOverrides['pays_recherche'] = json_decode($request->pays_recherche, true) ?? [$request->pays_recherche];
            }
        }
        if ($request->has('villes_recherche')) {
            if (is_array($request->villes_recherche)) {
                $filterOverrides['villes_recherche'] = $request->villes_recherche;
            } elseif (is_string($request->villes_recherche)) {
                $filterOverrides['villes_recherche'] = json_decode($request->villes_recherche, true) ?? [$request->villes_recherche];
            }
        }
        if ($request->has('etat_matrimonial')) {
            if (is_array($request->etat_matrimonial)) {
                $filterOverrides['etat_matrimonial'] = $request->etat_matrimonial;
            } elseif (is_string($request->etat_matrimonial)) {
                $filterOverrides['etat_matrimonial'] = json_decode($request->etat_matrimonial, true) ?? [$request->etat_matrimonial];
            }
        }
        if ($request->has('situation_sante')) {
            if (is_array($request->situation_sante)) {
                $filterOverrides['situation_sante'] = $request->situation_sante;
            } elseif (is_string($request->situation_sante)) {
                $filterOverrides['situation_sante'] = json_decode($request->situation_sante, true) ?? [$request->situation_sante];
            }
        }
        if ($request->has('pays_residence') && is_string($request->pays_residence)) {
            $filterOverrides['pays_residence'] = json_decode($request->pays_residence, true) ?? [$request->pays_residence];
        }
        if ($request->has('pays_origine') && is_string($request->pays_origine)) {
            $filterOverrides['pays_origine'] = json_decode($request->pays_origine, true) ?? [$request->pays_origine];
        }
        if ($request->has('ville_residence') && is_string($request->ville_residence)) {
            $filterOverrides['ville_residence'] = json_decode($request->ville_residence, true) ?? [$request->ville_residence];
        }
        if ($request->has('ville_origine') && is_string($request->ville_origine)) {
            $filterOverrides['ville_origine'] = json_decode($request->ville_origine, true) ?? [$request->ville_origine];
        }
        if ($request->has('situation_sante') && is_string($request->situation_sante)) {
            $filterOverrides['situation_sante'] = json_decode($request->situation_sante, true) ?? [$request->situation_sante];
        }

        // Convert numeric strings to integers for age and numeric filters
        $numericFields = ['age_min', 'age_max', 'taille_min', 'taille_max', 'poids_min', 'poids_max', 'children_count'];
        foreach ($numericFields as $field) {
            if (isset($filterOverrides[$field])) {
                // Convert to integer if it's a numeric string, or set to null if empty
                if ($filterOverrides[$field] === '' || $filterOverrides[$field] === null) {
                    unset($filterOverrides[$field]);
                } else {
                    $filterOverrides[$field] = (int)$filterOverrides[$field];
                }
            }
        }

        // Remove empty values
        $filterOverrides = array_filter($filterOverrides, function($value) {
            if (is_array($value)) {
                return !empty($value);
            }
            return $value !== null && $value !== '';
        });

        try {
            // Mixed logic: unchanged filters use OR, manually changed filters use AND
            $result = $matchmakingService->findMatches($userAId, $filterOverrides);
            
            $compatibleIds = array_map(function ($match) {
                return $match['user']->id;
            }, $result['matches']);

            $statusMap = [];
            if (!empty($compatibleIds)) {
                $requestQuery = PropositionRequest::query()
                    ->where('from_matchmaker_id', $me->id)
                    ->whereIn('compatible_user_id', $compatibleIds)
                    ->orderByDesc('created_at');

                if (Schema::hasColumn('proposition_requests', 'reference_user_id')) {
                    $requestQuery->where('reference_user_id', $userAId);
                }

                $sentRequests = $requestQuery->get(['compatible_user_id', 'status']);
                foreach ($sentRequests as $sent) {
                    $compId = (int) $sent->compatible_user_id;
                    if (!array_key_exists($compId, $statusMap)) {
                        $statusMap[$compId] = $sent->status;
                    }
                }
            }

            // Format matches for JSON response
            $formattedMatches = array_map(function($match) use ($me, $statusMap) {
                return [
                    'user' => [
                        'id' => $match['user']->id,
                        'name' => $match['user']->name,
                        'email' => $match['user']->email,
                        'username' => $match['user']->username,
                        'gender' => $match['user']->gender,
                        'created_at' => $match['user']->created_at,
                        'updated_at' => $match['user']->updated_at,
                        'assigned_matchmaker_id' => $match['user']->assigned_matchmaker_id,
                    ],
                    'assignedMatchmaker' => $match['user']->assignedMatchmaker ? [
                        'id' => $match['user']->assignedMatchmaker->id,
                        'name' => $match['user']->assignedMatchmaker->name,
                        'username' => $match['user']->assignedMatchmaker->username,
                    ] : null,
                    'isAssignedToMe' => $match['user']->assigned_matchmaker_id === $me->id,
                    'profile' => $match['profile']->toArray(),
                    'score' => $match['score'],
                    'scoreDetails' => $match['scoreDetails'],
                    'completeness' => $match['completeness'],
                    'proposition_request_status' => $statusMap[$match['user']->id] ?? null,
                ];
            }, $result['matches']);
            
            return response()->json([
                'matches' => $formattedMatches,
                'defaultFilters' => $result['defaultFilters'],
                'appliedFilters' => $result['appliedFilters'],
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Upload profile picture for a member (matchmaker only)
     */
    public function uploadProfilePicture(Request $request)
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
            abort(403, 'Unauthorized.');
        }

        $request->validate([
            'profile_picture' => 'required|image|mimes:jpeg,png,jpg|max:2048',
            'user_id' => 'required|exists:users,id',
        ]);

        $targetUser = User::findOrFail($request->user_id);

        // Check permissions
        if ($roleName === 'matchmaker' && $targetUser->assigned_matchmaker_id !== $me->id) {
            abort(403, 'You can only upload pictures for users assigned to you.');
        }

        if ($request->hasFile('profile_picture')) {
            $profilePicturePath = $request->file('profile_picture')->store('profile-pictures', 'public');
            
            $profile = $targetUser->profile;
            if (!$profile) {
                $profile = $targetUser->profile()->create([]);
            }
            
            // Delete old profile picture if exists
            if ($profile->profile_picture_path) {
                Storage::disk('public')->delete($profile->profile_picture_path);
            }
            
            $profile->update(['profile_picture_path' => $profilePicturePath]);
        }

        return redirect()->back()->with('success', 'Profile picture uploaded successfully.');
    }

    /**
     * Upload cover picture for a member (matchmaker only)
     */
    public function uploadCoverPicture(Request $request)
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
            abort(403, 'Unauthorized.');
        }

        $request->validate([
            'banner_image' => 'required|image|mimes:jpeg,png,jpg|max:5120',
            'user_id' => 'required|exists:users,id',
        ]);

        $targetUser = User::findOrFail($request->user_id);

        // Check permissions
        if ($roleName === 'matchmaker' && $targetUser->assigned_matchmaker_id !== $me->id) {
            abort(403, 'You can only upload pictures for users assigned to you.');
        }

        if ($request->hasFile('banner_image')) {
            $bannerImagePath = $request->file('banner_image')->store('banner-images', 'public');
            
            // For regular users, store in profiles table
            $profile = $targetUser->profile;
            if (!$profile) {
                $profile = $targetUser->profile()->create([]);
            }
            
            // Delete old banner image if exists
            if ($profile->banner_image_path) {
                Storage::disk('public')->delete($profile->banner_image_path);
            }
            
            $profile->update(['banner_image_path' => $bannerImagePath]);
        }

        return redirect()->back()->with('success', 'Cover picture uploaded successfully.');
    }

    /**
     * List appointment requests assigned to matchmaker
     */
    public function appointmentRequests(Request $request)
    {
        $me = Auth::user();
        $roleName = null;
        if ($me) {
            $roleName = \Illuminate\Support\Facades\DB::table('model_has_roles')
                ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
                ->where('model_has_roles.model_id', $me->id)
                ->value('roles.name');
        }

        // Check approval status for matchmaker
        if ($roleName === 'matchmaker') {
            if ($me->approval_status !== 'approved') {
                abort(403, 'Your account is not validated yet.');
            }
        }

        // Restrict matchmaker access: must be linked to an agency
        if ($roleName === 'matchmaker' && !$me->agency_id) {
            abort(403, 'You must be linked to an agency to access appointment requests.');
        }

        $treatmentStatusFilter = $request->string('treatment_status')->toString(); // pending, done

        // Show only requests assigned to current matchmaker
        $query = AppointmentRequest::where('assigned_matchmaker_id', $me->id)
            ->with(['assignedAgency', 'assignedMatchmaker']);

        // Filter by treatment_status
        if ($treatmentStatusFilter && $treatmentStatusFilter !== 'all') {
            $query->where('treatment_status', $treatmentStatusFilter);
        }

        $appointmentRequests = $query->orderBy('created_at', 'desc')->get();

        return Inertia::render('matchmaker/appointment-requests', [
            'appointmentRequests' => $appointmentRequests,
            'treatmentStatusFilter' => $treatmentStatusFilter ?: 'all',
        ]);
    }

    /**
     * Mark appointment request as done
     */
    public function markAppointmentDone(Request $request, AppointmentRequest $appointmentRequest)
    {
        $me = Auth::user();

        // Validate matchmaker is assigned to this request
        if ($appointmentRequest->assigned_matchmaker_id !== $me->id) {
            abort(403, 'You are not assigned to this appointment request.');
        }

        // Update treatment status
        $appointmentRequest->update([
            'treatment_status' => 'done',
            'done_at' => now(),
            'done_by' => $me->id,
        ]);

        return redirect()->back()->with('success', 'Appointment request marked as done successfully.');
    }
}
