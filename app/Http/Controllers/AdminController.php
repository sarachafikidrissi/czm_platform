<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Agency;
use App\Models\MatrimonialPack;
use App\Models\AppointmentRequest;
use App\Models\Activity;
use App\Models\UserAssignment;
use App\Services\StatsService;
use App\Services\UserActivityService;
use App\Support\ProspectListSearch;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use App\Mail\StaffCredentialsMail;
use Illuminate\Support\Str;
use Inertia\Inertia;
use App\Models\Service;
use App\Models\Secteur;

class AdminController extends Controller
{
    public function index()
    {
        $managers = User::role('manager')->with(['approvedBy', 'agency', 'roles'])->get();
        $matchmakers = User::role('matchmaker')->with(['approvedBy', 'agency', 'roles'])->get();
        $totalUsers = User::count();
        $pendingCount = User::where('approval_status', 'pending')->count();
        $approvedManagers = User::role('manager')->where('approval_status', 'approved')->count();
        $approvedMatchmakers = User::role('matchmaker')->where('approval_status', 'approved')->count();
        $agencies = Agency::all();
        
        // Guard: services table might not exist during early setup
        $services = [];
        if (\Illuminate\Support\Facades\Schema::hasTable('services')) {
            $services = Service::all();
        }

        // Load matrimonial packs
        $matrimonialPacks = [];
        if (\Illuminate\Support\Facades\Schema::hasTable('matrimonial_packs')) {
            $matrimonialPacks = MatrimonialPack::all();
        }

        // Load secteurs
        $secteurs = [];
        if (\Illuminate\Support\Facades\Schema::hasTable('secteurs')) {
            $secteurs = Secteur::orderBy('name')->get();
        }

        return Inertia::render('admin/dashboard', [
            'managers' => $managers,
            'matchmakers' => $matchmakers,
            'agencies' => $agencies,
            'services' => $services,
            'matrimonialPacks' => $matrimonialPacks,
            'secteurs' => $secteurs,
            'stats' => [
                'totalUsers' => $totalUsers,
                'pending' => $pendingCount,
                'approvedManagers' => $approvedManagers,
                'approvedMatchmakers' => $approvedMatchmakers,
            ],
        ]);
    }

    public function prospects(Request $request)
    {
        $country = $request->string('country')->toString();
        $city = $request->string('city')->toString();
        $dispatch = $request->string('dispatch')->toString(); // all|dispatched|not_dispatched
        $statusFilter = $request->string('status_filter')->toString(); // active | rejected
        $query = User::role('user')->where('status', 'prospect')->with(['profile', 'agency', 'assignedMatchmaker']);

        $agencyIdFilter = $request->filled('agency_id') ? (int) $request->integer('agency_id') : null;
        $matchmakerIdFilter = null;
        if ($request->filled('matchmaker_id')) {
            $requestedMatchmakerId = (int) $request->integer('matchmaker_id');
            $matchmaker = User::query()
                ->where('id', $requestedMatchmakerId)
                ->whereHas('roles', fn ($q) => $q->whereIn('name', ['matchmaker', 'manager']))
                ->where('approval_status', 'approved')
                ->whereNotNull('agency_id')
                ->first();
            if ($matchmaker) {
                $matchmakerIdFilter = $requestedMatchmakerId;
            }
        }

        if ($agencyIdFilter && $matchmakerIdFilter) {
            $matchmaker = User::query()->select('id', 'agency_id')->find($matchmakerIdFilter);
            if (! $matchmaker || (int) $matchmaker->agency_id !== $agencyIdFilter) {
                $matchmakerIdFilter = null;
            }
        }

        // Filter by rejection / traité status
        if ($statusFilter === 'rejected') {
            $query->whereNotNull('rejection_reason');
        } elseif ($statusFilter === 'rappeler') {
            $query->where('to_rappeler', true)->whereNotNull('rejection_reason');
        } elseif ($statusFilter === 'traite') {
            $query->where('is_traite', true)->whereNull('rejection_reason');
        } else {
            // Default to active (non-rejected) prospects
            $query->whereNull('rejection_reason');
        }

        if ($country) {
            $query->where('country', $country);
        }
        if ($city) {
            $query->where('city', $city);
        }
        if ($dispatch === 'dispatched') {
            $query->where(function ($q) {
                $q->whereNotNull('agency_id')->orWhereNotNull('assigned_matchmaker_id');
            });
        } elseif ($dispatch === 'not_dispatched') {
            $query->whereNull('agency_id')->whereNull('assigned_matchmaker_id');
        }
        $commercialOnly = $request->boolean('commercial_only');
        if ($commercialOnly) {
            $query->whereHas('profile', function ($q) {
                $q->where('heard_about_us', 'commercial_terrain')
                    ->whereNotNull('heard_about_reference')
                    ->where('heard_about_reference', '!=', '');
            });
        }

        if ($agencyIdFilter) {
            $assigneeIds = User::whereHas('roles', fn ($q) => $q->whereIn('name', ['matchmaker', 'manager']))
                ->where('agency_id', $agencyIdFilter)
                ->where('approval_status', 'approved')
                ->pluck('id');
            $query->where(function ($q) use ($agencyIdFilter, $assigneeIds) {
                $q->where('agency_id', $agencyIdFilter);
                if ($assigneeIds->isNotEmpty()) {
                    $q->orWhereIn('assigned_matchmaker_id', $assigneeIds);
                }
            });
        }

        if ($matchmakerIdFilter) {
            $query->where('assigned_matchmaker_id', $matchmakerIdFilter);
        }

        $search = ProspectListSearch::apply($query, $request->string('search')->toString());

        $prospects = $query
            ->orderByRaw('CASE WHEN agency_id IS NULL AND assigned_matchmaker_id IS NULL THEN 0 ELSE 1 END')
            ->orderBy('is_traite')
            ->orderBy('created_at', 'desc')
            ->paginate(10)
            ->withQueryString();
        $agencies = Agency::query()->get(['id','name','country','city']);
        $assignees = User::whereHas('roles', fn ($q) => $q->whereIn('name', ['matchmaker', 'manager']))
            ->where('approval_status', 'approved')
            ->whereNotNull('agency_id')
            ->with('agency')
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'agency_id']);
        $managers = $assignees->filter(fn (User $u) => $u->hasRole('manager'))->values();

        $managerIds = $managers->pluck('id')->all();

        $matchmakers = $assignees->filter(
            fn (User $u) => $u->hasRole('matchmaker') && ! in_array($u->id, $managerIds, true)
        )->values();

        $services = Schema::hasTable('services')
            ? Service::query()->get(['id', 'name'])
            : collect();
        $matrimonialPacks = Schema::hasTable('matrimonial_packs')
            ? MatrimonialPack::query()->get(['id', 'name', 'duration'])
            : collect();

        return Inertia::render('admin/prospects-dispatch', [
            'prospects' => $prospects,
            'agencies' => $agencies,
            'matchmakers' => $matchmakers,
            'managers' => $managers,
            'filterMatchmakers' => StatsService::getMatchmakerList(),
            'agency_id' => $agencyIdFilter,
            'matchmaker_id' => $matchmakerIdFilter,
            'statusFilter' => $statusFilter ?: 'active',
            'commercialOnly' => $commercialOnly,
            'search' => $search,
            'services' => $services,
            'matrimonialPacks' => $matrimonialPacks,
            'filters' => [ 'country' => $country ?: null, 'city' => $city ?: null, 'dispatch' => $dispatch ?: 'all' ],
        ]);
    }

    public function dispatchProspects(Request $request)
    {
        $validated = $request->validate([
            'prospect_ids' => ['required','array','min:1'],
            'prospect_ids.*' => ['required', 'integer', 'exists:users,id'],
            'dispatch_type' => ['required','string','in:agency,matchmaker'],
            'agency_id' => ['required_if:dispatch_type,agency','nullable','integer', 'exists:agencies,id'],
            'matchmaker_id' => ['required_if:dispatch_type,matchmaker','nullable','integer', 'exists:users,id'],
        ]);

        $updated = 0;
        $message = '';

        if ($validated['dispatch_type'] === 'agency') {
            $agency = Agency::findOrFail($validated['agency_id']);
            // Assign only prospects not yet dispatched (agency_id and assigned_matchmaker_id are null)
            $updated = User::whereIn('id', $validated['prospect_ids'])
                ->where('status', 'prospect')
                ->whereNull('agency_id')
                ->whereNull('assigned_matchmaker_id')
                ->update(['agency_id' => $agency->id]);
            $message = "{$updated} prospects dispatched to agency successfully.";
        } else {
            try {
                $matchmaker = User::findOrFail($validated['matchmaker_id']);
                
                // Ensure matchmaker is approved, has a role, and is linked to an agency
                if (! $matchmaker->hasAnyRole(['matchmaker', 'manager']) || $matchmaker->approval_status !== 'approved') {
                    return redirect()->back()->with('error', 'Selected matchmaker is not valid or not approved.');
                }
                
                if (!$matchmaker->agency_id) {
                    return redirect()->back()->with('error', 'Selected matchmaker must be linked to an agency to receive prospects.');
                }
                
                DB::transaction(function () use ($validated, $matchmaker, &$updated, &$message) {
                    // Assign prospects ONLY to the specific matchmaker (not to the entire agency)
                    // Set agency_id to NULL so other matchmakers in the same agency don't see it
                    // Single conditional update so only rows satisfying conditions at update time are updated (no TOCTOU)
                    $updated = User::whereIn('id', $validated['prospect_ids'])
                        ->where('status', 'prospect')
                        ->whereNull('agency_id')
                        ->whereNull('assigned_matchmaker_id')
                        ->update([
                            'assigned_matchmaker_id' => $matchmaker->id,
                            'agency_id' => null,
                        ]);
                    // Deferred (next maintenance pass): idsUpdated is derived after bulk update without
                    // row locks; assignment logging may miss or mis-attribute rows under concurrency.
                    $idsUpdated = User::whereIn('id', $validated['prospect_ids'])
                        ->where('assigned_matchmaker_id', $matchmaker->id)
                        ->pluck('id');
                    foreach ($idsUpdated as $userId) {
                        UserActivityService::log($userId, Auth::id(), 'matchmaker_assigned', "Prospect assigné à {$matchmaker->name} (marieuse).", []);
                        UserAssignment::recordAssignment($userId, $matchmaker->id, Auth::id(), 'initial');
                    }
                    $message = "{$updated} prospects dispatched to matchmaker successfully.";
                });
            } catch (\Exception $e) {
                return redirect()->back()->with('error', 'An error occurred while dispatching prospects. Please try again.');
            }
        }

        if ($updated === 0) {
            return redirect()->back()->with('warning', 'No prospects were dispatched. They might already be assigned.');
        }

        return redirect()->back()->with('success', $message);
    }

    public function managerTracking(Request $request)
    {
        $me = Auth::user();
        $roleName = null;
        if ($me) {
            $roleName = \Illuminate\Support\Facades\DB::table('model_has_roles')
                ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
                ->where('model_has_roles.model_id', $me->id)
                ->value('roles.name');
        }

        // Only managers can access this
        if ($roleName !== 'manager') {
            abort(403, 'Only managers can access assignment tracking.');
        }

        // Check approval status
        if ($me->approval_status !== 'approved') {
            abort(403, 'Your account is not validated yet.');
        }

        $status = $request->string('status')->toString(); // all|prospect|member|client|client_expire
        $query = User::role('user')
            ->whereIn('status', ['prospect','member','client','client_expire'])
            ->with([
                'profile', 
                'profile.matrimonialPack',
                'assignedMatchmaker', 
                'agency', 
                'validatedByManager',
                'bills',
                'subscriptions' => function($q) {
                    $q->orderBy('created_at', 'desc');
                },
                'subscriptions.matrimonialPack',
                'subscriptions.assignedMatchmaker'
            ]);

        // Manager: see all users that were validated when they were the manager in charge
        // This includes prospects, members, and clients from any agency where they were manager during validation
        $query->where('validated_by_manager_id', $me->id);

        if ($status !== 'all') {
            $query->where('status', $status);
        }

        // Filter: only users with commercial code
        $commercialOnly = $request->boolean('commercial_only');
        if ($commercialOnly) {
            $query->whereHas('profile', function ($q) {
                $q->where('heard_about_us', 'commercial_terrain')
                    ->whereNotNull('heard_about_reference')
                    ->where('heard_about_reference', '!=', '');
            });
        }

        $prospects = $query->orderBy('created_at', 'desc')->paginate(5)->withQueryString();

        // Add has_bill flag to each prospect
        $prospects->getCollection()->each(function($prospect) {
            $prospect->has_bill = $prospect->bills->where('status', '!=', 'paid')->isNotEmpty();
        });

        // Get all matchmakers from agencies where this manager has validated users
        $agencyIds = $prospects->getCollection()->pluck('agency_id')->filter()->unique()->toArray();
        $matchmakers = User::role('matchmaker')
            ->whereIn('agency_id', $agencyIds)
            ->where('approval_status', 'approved')
            ->get(['id', 'name', 'email']);

        return Inertia::render('admin/manager-tracking', [
            'prospects' => $prospects,
            'matchmakers' => $matchmakers,
            'status' => $status ?: 'all',
            'commercialOnly' => $commercialOnly,
        ]);
    }

    public function updateUserRole(Request $request, $id)
    {
        $validated = $request->validate([
            'roles' => ['required','array','min:1'],
            'roles.*' => ['in:admin,manager,matchmaker'],
        ]);

        $user = User::findOrFail($id);

        // Allow toggling admin, manager, matchmaker; require at least one
        $newRoles = array_values(array_unique(array_filter($validated['roles'])));
        // Only allow manager/matchmaker/admin in final set
        $finalRoles = array_values(array_intersect($newRoles, ['admin','manager','matchmaker']));
        if (empty($finalRoles)) {
            return redirect()->back()->with('error', 'At least one valid role must be selected.');
        }

        $user->syncRoles($finalRoles);

        return redirect()->back()->with('success', 'User roles updated successfully.');
    }

    public function createService(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:services,name',
        ]);

        Service::create(['name' => $request->name]);

        return redirect()->back()->with('success', 'Service created successfully.');
    }

    public function createSecteur(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:secteurs,name',
        ]);

        Secteur::create([
            'name' => $request->name,
        ]);

        return redirect()->back()->with('success', 'Secteur d\'activité créé avec succès.');
    }

    public function createMatrimonialPack(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'duration' => 'required|integer|min:1|max:120',
        ]);

        MatrimonialPack::create([
            'name' => $request->name,
            'duration' => $request->duration,
        ]);

        return redirect()->back()->with('success', 'Pack matrimonial créé avec succès.');
    }

    public function approveUser(Request $request, $id)
    {
        $user = User::findOrFail($id);
        
        $user->update([
            'approval_status' => 'approved',
            'approved_at' => now(),
            'approved_by' => Auth::id(),
        ]);

        StatsService::invalidateForMatchmaker(
            $user->id,
            $user->agency_id
        );

        return redirect()->back()->with('success', 'User approved successfully.');
    }

    public function rejectUser(Request $request, $id)
    {
        $user = User::findOrFail($id);
        
        $user->update([
            'approval_status' => 'rejected',
            'approved_by' => Auth::id(),
        ]);

        StatsService::invalidateForMatchmaker(
            $user->id,
            $user->agency_id
        );

        return redirect()->back()->with('success', 'User rejected successfully.');
    }

    public function createStaffForm()
    {
        return Inertia::render('admin/create-staff');
    }

    public function createStaff(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:users',
            'phone' => 'required|string|max:20',
            'city' => 'required|string|max:120',
            'gender' => 'required|in:male,female',
            'role' => 'required|string|in:manager,matchmaker',
            'agency_id' => 'required|exists:agencies,id',
            'profile_picture' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
            'identity_card_front' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
            'identity_card_back' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
            // Accept CIN, passport, or driver license identifiers.
            'cin' => ['required','string','max:20','regex:/^[A-Za-z0-9-]{5,20}$/'],
        ]);

        $password = Str::random(12);
        
        // Handle file uploads
        $profilePicturePath = null;
        if ($request->hasFile('profile_picture')) {
            $profilePicturePath = $request->file('profile_picture')->store('profile-pictures', 'public');
        }

        // Hash sensitive data (use deterministic HMAC-SHA256, not bcrypt)
        $identityCardFrontHash = null;
        $identityCardBackHash = null;

        $appKey = (string) config('app.key');
        if (str_starts_with($appKey, 'base64:')) {
            $decoded = base64_decode(substr($appKey, 7));
            if ($decoded !== false) {
                $appKey = $decoded;
            }
        }

        $identityCardFrontPath = null;
        $identityCardBackPath = null;

        if ($request->hasFile('identity_card_front')) {
            $frontFile = $request->file('identity_card_front');
            $frontContent = file_get_contents($frontFile->getRealPath());
            $identityCardFrontHash = hash_hmac('sha256', $frontContent, $appKey);
            $identityCardFrontPath = $frontFile->store('identity-cards', 'public');
        }

        if ($request->hasFile('identity_card_back')) {
            $backFile = $request->file('identity_card_back');
            $backContent = file_get_contents($backFile->getRealPath());
            $identityCardBackHash = hash_hmac('sha256', $backContent, $appKey);
            $identityCardBackPath = $backFile->store('identity-cards', 'public');
        }

        $cinHash = hash_hmac('sha256', (string) $request->cin, $appKey);
        
        // Check one-to-one agency-manager relationship
        if ($request->role === 'manager') {
            // Check if the agency is already assigned to another manager
            $existingManager = User::role('manager')
                ->where('agency_id', $request->agency_id)
                ->first();
                
            if ($existingManager) {
                return redirect()->back()->with('error', 'This agency is already assigned to another manager: ' . $existingManager->name);
            }
        }
        
        // For matchmakers: No restriction - multiple matchmakers can be assigned to the same agency
        // Matchmakers can be assigned to any agency (no validation needed)
        
        // Generate unique username
        $baseUsername = \Illuminate\Support\Str::slug($request->name);
        $username = $baseUsername;
        $counter = 1;
        
        while (User::where('username', $username)->exists()) {
            $username = $baseUsername . $counter;
            $counter++;
        }
        
        $user = User::create([
            'name' => $request->name,
            'username' => $username,
            'email' => $request->email,
            'phone' => $request->phone,
            'city' => $request->city,
            'gender' => $request->gender,
            'agency_id' => $request->agency_id,
            'profile_picture' => $profilePicturePath,
            'identity_card_front_hash' => $identityCardFrontHash,
            'identity_card_back_hash' => $identityCardBackHash,
            'identity_card_front_path' => $identityCardFrontPath,
            'identity_card_back_path' => $identityCardBackPath,
            'cin_hash' => $cinHash,
            'approval_status' => 'approved',
            'approved_at' => now(),
            'approved_by' => Auth::id(),
            'password' => Hash::make($password),
        ]);

        $user->assignRole($request->role);
        $user->profile()->create([]);

        // Send email with credentials via Mailable (uses .env mailer)
        Mail::to($user->email)->send(new StaffCredentialsMail(
            name: $user->name,
            email: $user->email,
            password: $password,
            role: $request->role,
        ));

        // Redirect back to previous page to avoid 500 and maintain context
        return redirect()->back()->with('success', 'Staff member created successfully. Credentials sent via email.');
    }

    public function agencies()
    {
        $agencies = Agency::orderBy('name')->get();
        
        // Add counts manually
        foreach ($agencies as $agency) {
            $agency->matchmakers_count = User::where('agency_id', $agency->id)
                ->whereHas('roles', function($query) {
                    $query->where('name', 'matchmaker');
                })
                ->where('approval_status', 'approved')
                ->count();
            
            $agency->managers_count = User::where('agency_id', $agency->id)
                ->whereHas('roles', function($query) {
                    $query->where('name', 'manager');
                })
                ->where('approval_status', 'approved')
                ->count();
        }

        return Inertia::render('admin/agencies', [
            'agencies' => $agencies,
        ]);
    }

    public function createAgency(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'country' => 'required|string|max:120',
            'city' => 'required|string|max:120',
            'address' => 'required|string',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
            'map' => 'nullable|string',
        ]);

        $imagePath = null;
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('agencies', 'public');
        }

        Agency::create([
            'name' => $request->name,
            'country' => $request->country,
            'city' => $request->city,
            'address' => $request->address,
            'image' => $imagePath,
            'map' => $request->map,
        ]);

        return redirect()->back()->with('success', 'Agency created successfully.');
    }

    public function updateAgency(Request $request, $id)
    {
        $agency = Agency::findOrFail($id);
        
        $request->validate([
            'name' => 'nullable|string|max:255',
            'country' => 'nullable|string|max:120',
            'city' => 'nullable|string|max:120',
            'address' => 'nullable|string',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
            'map' => 'nullable|string',
        ]);
        
        $updateData = [];

        // Get all input data - use all() to get everything, then filter
        $allInput = $request->all();
        
        
        // Update all fields that are in the request
        // Check if fields exist in the request (even if empty)
        $fieldsToCheck = ['name', 'country', 'city', 'address', 'map'];
        foreach ($fieldsToCheck as $field) {
            // Check if field exists in request (using array_key_exists for form data)
            if (array_key_exists($field, $allInput)) {
                $value = $request->input($field);
                // Convert empty strings to null, but keep actual values
                $updateData[$field] = ($value === '' || $value === null) ? null : $value;
            }
        }
        

        if ($request->hasFile('image')) {
            // Delete old image if exists
            if ($agency->image) {
                Storage::disk('public')->delete($agency->image);
            }
            $updateData['image'] = $request->file('image')->store('agencies', 'public');
        }

        // Always update if we have data (form always sends data when submitted)
        if (!empty($updateData) || $request->hasFile('image')) {
            $agency->update($updateData);
        }

        return redirect()->back()->with('success', 'Agency updated successfully.');
    }

    public function deleteAgency($id)
    {
        $agency = Agency::findOrFail($id);
        
        // Check if agency has users
        $usersCount = User::where('agency_id', $agency->id)->count();
        if ($usersCount > 0) {
            return redirect()->back()->with('error', 'Cannot delete agency. It has ' . $usersCount . ' user(s) assigned to it.');
        }

        // Delete image if exists
        if ($agency->image) {
            Storage::disk('public')->delete($agency->image);
        }

        $agency->delete();

        return redirect()->back()->with('success', 'Agency deleted successfully.');
    }

    public function updateUserAgency(Request $request, $id)
    {
        $request->validate([
            'agency_id' => 'required|exists:agencies,id',
        ]);


        $user = User::findOrFail($id);
        
        // Check if user is a manager
        if ($user->hasRole('manager')) {
            // Check if the agency is already assigned to another manager
            $existingManager = User::role('manager')
                ->where('agency_id', $request->agency_id)
                ->where('id', '!=', $user->id)
                ->first();
                
            if ($existingManager) {
                return redirect()->back()->with('error', 'This agency is already assigned to another manager: ' . $existingManager->name);
            }
        }
        
        // For matchmakers: No restriction - multiple matchmakers can be assigned to the same agency
        // Matchmakers can be assigned to any agency (no validation needed)

        $oldAgencyId = $user->agency_id;

        $user->update([
            'agency_id' => $request->agency_id,
        ]);

        StatsService::invalidateForMatchmaker($user->id, $oldAgencyId);
        StatsService::invalidateForMatchmaker($user->id, (int) $request->agency_id);

        return redirect()->back()->with('success', 'User agency updated successfully.');
    }

    public function reassignProspects(Request $request)
    {
        $validated = $request->validate([
            'prospect_ids' => ['required','array','min:1'],
            'prospect_ids.*' => ['required', 'integer', 'exists:users,id'],
            'reassign_type' => ['required','string','in:agency,matchmaker'],
            'agency_id' => ['required_if:reassign_type,agency','nullable','integer', 'exists:agencies,id'],
            'matchmaker_id' => ['required_if:reassign_type,matchmaker','nullable','integer', 'exists:users,id'],
        ]);

        $updated = 0;
        $message = '';

        try {
            if ($validated['reassign_type'] === 'agency') {
                $agency = Agency::findOrFail($validated['agency_id']);

                DB::transaction(function () use ($validated, $agency, &$updated, &$message) {
                    $affectedIds = User::whereIn('id', $validated['prospect_ids'])
                        ->where('status', 'prospect')
                        ->where(function ($q) {
                            $q->whereNotNull('agency_id')->orWhereNotNull('assigned_matchmaker_id');
                        })
                        ->lockForUpdate()
                        ->pluck('id');

                    // Reassign only prospects that are already dispatched (have agency_id OR assigned_matchmaker_id)
                    // Clear assigned_matchmaker_id to remove from old matchmaker's list
                    // Set agency_id to new agency to remove from old agency's list
                    $updated = User::whereIn('id', $validated['prospect_ids'])
                        ->where('status', 'prospect')
                        ->where(function ($q) {
                            $q->whereNotNull('agency_id')->orWhereNotNull('assigned_matchmaker_id');
                        })
                        ->update([
                            'agency_id' => $agency->id,
                            'assigned_matchmaker_id' => null,
                        ]);
                    foreach ($affectedIds as $userId) {
                        UserAssignment::recordUnassignment($userId, Auth::id());
                    }
                    $message = "{$updated} prospects reassigned to agency successfully.";
                });
            } else {
                $matchmaker = User::findOrFail($validated['matchmaker_id']);
                // Ensure matchmaker is approved and has a role
                if (! $matchmaker->hasAnyRole(['matchmaker', 'manager']) || $matchmaker->approval_status !== 'approved') {
                    return redirect()->back()->with('error', 'Selected matchmaker is not valid or not approved.');
                }
                
                if (!$matchmaker->agency_id) {
                    return redirect()->back()->with('error', 'Selected matchmaker must be linked to an agency to receive prospects.');
                }
                
                DB::transaction(function () use ($validated, $matchmaker, &$updated, &$message) {
                    // Reassign only prospects that are already dispatched (have agency_id OR assigned_matchmaker_id)
                    // Set assigned_matchmaker_id to new matchmaker to assign to new matchmaker
                    // Set agency_id to NULL to remove from old agency's list and ensure only new matchmaker sees it
                    // Single conditional update so only rows satisfying conditions at update time are updated (no TOCTOU)
                    $updated = User::whereIn('id', $validated['prospect_ids'])
                        ->where('status', 'prospect')
                        ->where(function ($q) {
                            $q->whereNotNull('agency_id')->orWhereNotNull('assigned_matchmaker_id');
                        })
                        ->update([
                            'assigned_matchmaker_id' => $matchmaker->id,
                            'agency_id' => null,
                        ]);
                    $idsUpdated = User::whereIn('id', $validated['prospect_ids'])
                        ->where('assigned_matchmaker_id', $matchmaker->id)
                        ->pluck('id');
                    foreach ($idsUpdated as $userId) {
                        UserActivityService::log($userId, Auth::id(), 'matchmaker_assigned', "Prospect réassigné à {$matchmaker->name} (marieuse).", []);
                        UserAssignment::recordAssignment($userId, $matchmaker->id, Auth::id(), 'reassign');
                    }
                    $message = "{$updated} prospects reassigned to matchmaker successfully.";
                });
            }

            if ($updated === 0) {
                return redirect()->back()->with('warning', 'No prospects were reassigned. They must already be dispatched (have an agency or matchmaker assigned).');
            }

            return redirect()->back()->with('success', $message);
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'An error occurred while reassigning prospects. Please try again.');
        }
    }

    public function managerProspectsDispatch(Request $request)
    {
        $me = Auth::user();
        $roleName = null;
        if ($me) {
            $roleName = \Illuminate\Support\Facades\DB::table('model_has_roles')
                ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
                ->where('model_has_roles.model_id', $me->id)
                ->value('roles.name');
        }

        // Only managers can access this
        if ($roleName !== 'manager') {
            abort(403, 'Only managers can access prospect dispatch.');
        }

        // Check approval status
        if ($me->approval_status !== 'approved') {
            abort(403, 'Your account is not validated yet.');
        }

        // Manager must have an agency
        if (!$me->agency_id) {
            abort(403, 'You must be linked to an agency to dispatch prospects.');
        }

        $statusFilter = $request->string('status_filter')->toString(); // active | rejected
        $query = User::role('user')
            ->where('status', 'prospect')
            ->with(['profile', 'agency', 'assignedMatchmaker']);

        $matchmakerIdFilter = null;
        if ($request->filled('matchmaker_id')) {
            $requestedMatchmakerId = (int) $request->integer('matchmaker_id');
            $matchmaker = User::query()
                ->where('id', $requestedMatchmakerId)
                ->where('agency_id', $me->agency_id)
                ->whereHas('roles', fn ($q) => $q->whereIn('name', ['matchmaker', 'manager']))
                ->where('approval_status', 'approved')
                ->first();
            if ($matchmaker) {
                $matchmakerIdFilter = $requestedMatchmakerId;
            }
        }

        if ($matchmakerIdFilter) {
            $query->where('assigned_matchmaker_id', $matchmakerIdFilter);
        } else {
            $query->where('agency_id', $me->agency_id)
                ->whereNull('assigned_matchmaker_id');
        }

        // Filter by rejection / traité status
        if ($statusFilter === 'rejected') {
            $query->whereNotNull('rejection_reason');
        } elseif ($statusFilter === 'rappeler') {
            $query->where('to_rappeler', true)->whereNotNull('rejection_reason');
        } elseif ($statusFilter === 'traite') {
            $query->where('is_traite', true)->whereNull('rejection_reason');
        } else {
            // Default to active (non-rejected) prospects
            $query->whereNull('rejection_reason');
        }

        $commercialOnly = $request->boolean('commercial_only');
        if ($commercialOnly) {
            $query->whereHas('profile', function ($q) {
                $q->where('heard_about_us', 'commercial_terrain')
                    ->whereNotNull('heard_about_reference')
                    ->where('heard_about_reference', '!=', '');
            });
        }

        $search = ProspectListSearch::apply($query, $request->string('search')->toString());

        $prospects = $query->orderBy('is_traite')
            ->orderBy('created_at', 'desc')
            ->paginate(5)
            ->withQueryString();

        // Get assignees from the manager's agency (matchmakers + manager self)
        $assignees = User::whereHas('roles', fn ($q) => $q->whereIn('name', ['matchmaker', 'manager']))
            ->where('agency_id', $me->agency_id)
            ->where('approval_status', 'approved')
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'agency_id']);
        $managers = $assignees->filter(fn (User $u) => $u->hasRole('manager'))->values();

        $managerIds = $managers->pluck('id')->all();

        $matchmakers = $assignees->filter(
            fn (User $u) => $u->hasRole('matchmaker') && ! in_array($u->id, $managerIds, true)
        )->values();

        return Inertia::render('manager/prospects-dispatch', [
            'prospects' => $prospects,
            'matchmakers' => $matchmakers,
            'managers' => $managers,
            'filterMatchmakers' => StatsService::getMatchmakerList((int) $me->agency_id),
            'matchmaker_id' => $matchmakerIdFilter,
            'statusFilter' => $statusFilter ?: 'active',
            'commercialOnly' => $commercialOnly,
            'search' => $search,
        ]);
    }

    public function managerDispatchProspects(Request $request)
    {
        $me = Auth::user();
        $roleName = null;
        if ($me) {
            $roleName = \Illuminate\Support\Facades\DB::table('model_has_roles')
                ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
                ->where('model_has_roles.model_id', $me->id)
                ->value('roles.name');
        }

        // Only managers can access this
        if ($roleName !== 'manager') {
            abort(403, 'Only managers can dispatch prospects.');
        }

        // Check approval status
        if ($me->approval_status !== 'approved') {
            abort(403, 'Your account is not validated yet.');
        }

        // Manager must have an agency
        if (!$me->agency_id) {
            abort(403, 'You must be linked to an agency to dispatch prospects.');
        }

        $validated = $request->validate([
            'prospect_ids' => ['required','array','min:1'],
            'prospect_ids.*' => ['required', 'integer', 'exists:users,id'],
            'matchmaker_id' => ['required','integer', 'exists:users,id'],
        ]);

        try {
            $matchmaker = User::findOrFail($validated['matchmaker_id']);
            
            // Ensure matchmaker is approved, has a role, and is linked to the same agency
            if (! $matchmaker->hasAnyRole(['matchmaker', 'manager']) || $matchmaker->approval_status !== 'approved') {
                return redirect()->back()->with('error', 'Selected matchmaker is not valid or not approved.');
            }
            
            if ($matchmaker->agency_id !== $me->agency_id) {
                return redirect()->back()->with('error', 'Selected matchmaker must be from your agency.');
            }
            
            DB::transaction(function () use ($validated, $matchmaker, $me, &$updated, &$message) {
                // Assign prospects ONLY to the specific matchmaker
                // Only prospects that are dispatched to manager's agency and not yet assigned to a matchmaker
                $updated = User::whereIn('id', $validated['prospect_ids'])
                    ->where('status', 'prospect')
                    ->where('agency_id', $me->agency_id) // Must be from manager's agency
                    ->whereNull('assigned_matchmaker_id') // Not yet assigned
                    ->update([
                        'assigned_matchmaker_id' => $matchmaker->id,
                        'agency_id' => null,
                    ]);
                $idsUpdated = User::whereIn('id', $validated['prospect_ids'])
                    ->where('assigned_matchmaker_id', $matchmaker->id)
                    ->pluck('id');
                foreach ($idsUpdated as $userId) {
                    UserAssignment::recordAssignment($userId, $matchmaker->id, Auth::id(), 'initial');
                }
            });

            $message = "{$updated} prospects dispatched to matchmaker successfully.";

            if ($updated === 0) {
                return redirect()->back()->with('warning', 'No prospects were dispatched. They might already be assigned or not belong to your agency.');
            }

            return redirect()->back()->with('success', $message);
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'An error occurred while dispatching prospects. Please try again.');
        }
    }

    /**
     * List all appointment requests for admin
     */
    public function appointmentRequests(Request $request)
    {
        $statusFilter = $request->string('status')->toString(); // pending, dispatched, converted, cancelled
        $treatmentStatusFilter = $request->string('treatment_status')->toString(); // pending, done
        $country = $request->string('country')->toString();
        $city = $request->string('city')->toString();
        $dispatch = $request->string('dispatch')->toString(); // all, dispatched, not_dispatched

        $query = AppointmentRequest::with(['assignedAgency', 'assignedMatchmaker', 'convertedToProspect']);

        // Filter by status
        if ($statusFilter && $statusFilter !== 'all') {
            $query->where('status', $statusFilter);
        }

        // Filter by treatment_status
        if ($treatmentStatusFilter && $treatmentStatusFilter !== 'all') {
            $query->where('treatment_status', $treatmentStatusFilter);
        }

        // Filter by country
        if ($country) {
            $query->where('country', $country);
        }

        // Filter by city
        if ($city) {
            $query->where('city', $city);
        }

        // Filter by dispatch status
        if ($dispatch === 'dispatched') {
            $query->where(function($q) {
                $q->whereNotNull('assigned_agency_id')->orWhereNotNull('assigned_matchmaker_id');
            });
        } elseif ($dispatch === 'not_dispatched') {
            $query->whereNull('assigned_agency_id')->whereNull('assigned_matchmaker_id');
        }

        $appointmentRequests = $query->orderBy('created_at', 'desc')->get();

        $agencies = Agency::all(['id', 'name', 'country', 'city']);
        $assignees = User::whereHas('roles', fn ($q) => $q->whereIn('name', ['matchmaker', 'manager']))
            ->where('approval_status', 'approved')
            ->whereNotNull('agency_id')
            ->with('agency')
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'agency_id']);
        $managers = $assignees->filter(fn (User $u) => $u->hasRole('manager'))->values();

        $managerIds = $managers->pluck('id')->all();

        $matchmakers = $assignees->filter(
            fn (User $u) => $u->hasRole('matchmaker') && ! in_array($u->id, $managerIds, true)
        )->values();

        return Inertia::render('admin/appointment-requests', [
            'appointmentRequests' => $appointmentRequests,
            'agencies' => $agencies,
            'matchmakers' => $matchmakers,
            'managers' => $managers,
            'filters' => [
                'status' => $statusFilter ?: 'all',
                'treatment_status' => $treatmentStatusFilter ?: 'all',
                'country' => $country ?: null,
                'city' => $city ?: null,
                'dispatch' => $dispatch ?: 'all',
            ],
        ]);
    }

    /**
     * Dispatch appointment requests to agency or matchmaker
     */
    public function dispatchAppointmentRequest(Request $request)
    {
        $validated = $request->validate([
            'appointment_request_ids' => ['required', 'array', 'min:1'],
            'appointment_request_ids.*' => ['required', 'integer', 'exists:appointment_requests,id'],
            'dispatch_type' => ['required', 'string', 'in:agency,matchmaker'],
            'agency_id' => ['required_if:dispatch_type,agency', 'nullable', 'integer', 'exists:agencies,id'],
            'matchmaker_id' => ['required_if:dispatch_type,matchmaker', 'nullable', 'integer', 'exists:users,id'],
        ]);

        $updated = 0;
        $message = '';

        if ($validated['dispatch_type'] === 'agency') {
            $agency = Agency::findOrFail($validated['agency_id']);
            $updated = AppointmentRequest::whereIn('id', $validated['appointment_request_ids'])
                ->where('status', 'pending')
                ->whereNull('assigned_agency_id')
                ->whereNull('assigned_matchmaker_id')
                ->update([
                    'status' => 'dispatched',
                    'assigned_agency_id' => $agency->id,
                ]);
            $message = "{$updated} appointment request(s) dispatched to agency successfully.";
        } else {
            try {
                $matchmaker = User::findOrFail($validated['matchmaker_id']);

                // Ensure matchmaker is approved, has a role, and is linked to an agency
                if (! $matchmaker->hasAnyRole(['matchmaker', 'manager']) || $matchmaker->approval_status !== 'approved') {
                    return redirect()->back()->with('error', 'Selected matchmaker is not valid or not approved.');
                }

                if (!$matchmaker->agency_id) {
                    return redirect()->back()->with('error', 'Selected matchmaker must be linked to an agency to receive appointment requests.');
                }

                // Store BOTH assigned_matchmaker_id AND assigned_agency_id
                $updated = AppointmentRequest::whereIn('id', $validated['appointment_request_ids'])
                    ->where('status', 'pending')
                    ->whereNull('assigned_agency_id')
                    ->whereNull('assigned_matchmaker_id')
                    ->update([
                        'status' => 'dispatched',
                        'assigned_matchmaker_id' => $matchmaker->id,
                        'assigned_agency_id' => $matchmaker->agency_id, // Store agency from matchmaker
                    ]);
                $message = "{$updated} appointment request(s) dispatched to matchmaker successfully.";
                if ($updated > 0) {
                    $requests = AppointmentRequest::whereIn('id', $validated['appointment_request_ids'])
                        ->where('assigned_matchmaker_id', $matchmaker->id)
                        ->get();
                    foreach ($requests as $appointmentRequest) {
                        Activity::record('rdv.scheduled', Auth::id(), $appointmentRequest, [
                            'preferred_date' => $appointmentRequest->preferred_date?->toIso8601String(),
                            'name' => $appointmentRequest->name,
                        ]);
                    }
                }
            } catch (\Exception $e) {
                return redirect()->back()->with('error', 'An error occurred while dispatching appointment requests. Please try again.');
            }
        }

        if ($updated === 0) {
            return redirect()->back()->with('warning', 'No appointment requests were dispatched. They might already be assigned.');
        }

        return redirect()->back()->with('success', $message);
    }

    /**
     * Reassign appointment requests to different agency or matchmaker
     * Only allows reassigning requests that are dispatched but not yet treated
     */
    public function reassignAppointmentRequest(Request $request)
    {
        $validated = $request->validate([
            'appointment_request_ids' => ['required', 'array', 'min:1'],
            'appointment_request_ids.*' => ['required', 'integer', 'exists:appointment_requests,id'],
            'reassign_type' => ['required', 'string', 'in:agency,matchmaker'],
            'agency_id' => ['required_if:reassign_type,agency', 'nullable', 'integer', 'exists:agencies,id'],
            'matchmaker_id' => ['required_if:reassign_type,matchmaker', 'nullable', 'integer', 'exists:users,id'],
        ]);

        $updated = 0;
        $message = '';

        try {
            if ($validated['reassign_type'] === 'agency') {
                $agency = Agency::findOrFail($validated['agency_id']);
                // Reassign only requests that are dispatched and not yet treated
                $updated = AppointmentRequest::whereIn('id', $validated['appointment_request_ids'])
                    ->where('status', 'dispatched')
                    ->where('treatment_status', 'pending')
                    ->update([
                        'assigned_agency_id' => $agency->id,
                        'assigned_matchmaker_id' => null, // Clear to remove from old matchmaker's list
                    ]);
                $message = "{$updated} appointment request(s) reassigned to agency successfully.";
            } else {
                $matchmaker = User::findOrFail($validated['matchmaker_id']);

                // Ensure matchmaker is approved, has a role, and is linked to an agency
                if (! $matchmaker->hasAnyRole(['matchmaker', 'manager']) || $matchmaker->approval_status !== 'approved') {
                    return redirect()->back()->with('error', 'Selected matchmaker is not valid or not approved.');
                }

                if (!$matchmaker->agency_id) {
                    return redirect()->back()->with('error', 'Selected matchmaker must be linked to an agency to receive appointment requests.');
                }

                // Reassign only requests that are dispatched and not yet treated
                // Set both assigned_matchmaker_id and assigned_agency_id (from matchmaker's agency)
                $updated = AppointmentRequest::whereIn('id', $validated['appointment_request_ids'])
                    ->where('status', 'dispatched')
                    ->where('treatment_status', 'pending')
                    ->update([
                        'assigned_matchmaker_id' => $matchmaker->id,
                        'assigned_agency_id' => $matchmaker->agency_id, // Store agency from matchmaker
                    ]);
                $message = "{$updated} appointment request(s) reassigned to matchmaker successfully.";
            }

            if ($updated === 0) {
                return redirect()->back()->with('warning', 'No appointment requests were reassigned. They must be dispatched and not yet treated.');
            }

            return redirect()->back()->with('success', $message);
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'An error occurred while reassigning appointment requests. Please try again.');
        }
    }

    /**
     * Convert appointment request to prospect
     */
    public function convertToProspect(Request $request, AppointmentRequest $appointmentRequest)
    {
        // Check if already converted
        if ($appointmentRequest->status === 'converted') {
            return redirect()->back()->with('warning', 'This appointment request has already been converted to a prospect.');
        }

        // Check if email already exists
        $existingUser = User::where('email', $appointmentRequest->email)->first();
        if ($existingUser) {
            return redirect()->back()->with('error', 'A user with this email already exists. Please use a different email or contact the existing user.');
        }

        // Create new user
        $user = User::create([
            'name' => $appointmentRequest->name,
            'email' => $appointmentRequest->email,
            'phone' => $appointmentRequest->phone,
            'city' => $appointmentRequest->city,
            'country' => $appointmentRequest->country,
            'password' => Hash::make(Str::random(16)), // Random password, will be reset
            'status' => 'prospect',
        ]);

        // Assign role
        $user->assignRole('user');

        DB::transaction(function () use ($appointmentRequest, $user) {
            // If appointment was dispatched, assign prospect to same agency/matchmaker
            if ($appointmentRequest->assigned_matchmaker_id) {
                $user->assigned_matchmaker_id = $appointmentRequest->assigned_matchmaker_id;
            }
            if ($appointmentRequest->assigned_agency_id) {
                $user->agency_id = $appointmentRequest->assigned_agency_id;
            }
            $user->save();

            if ($appointmentRequest->assigned_matchmaker_id) {
                UserAssignment::recordAssignment(
                    $user->id,
                    $appointmentRequest->assigned_matchmaker_id,
                    Auth::id(),
                    'initial'
                );
            }

            // Link appointment request to prospect
            $appointmentRequest->update([
                'status' => 'converted',
                'converted_to_prospect_id' => $user->id,
            ]);
        });

        UserActivityService::log($user->id, Auth::id(), 'rdv', 'Demande de rendez-vous convertie en prospect.', []);

        return redirect()->back()->with('success', 'Appointment request converted to prospect successfully.');
    }

    /**
     * List appointment requests for manager's agency
     * Only shows requests dispatched to matchmakers from manager's agency
     */
    public function managerAppointmentRequests(Request $request)
    {
        $me = Auth::user();
        $roleName = null;
        if ($me) {
            $roleName = \Illuminate\Support\Facades\DB::table('model_has_roles')
                ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
                ->where('model_has_roles.model_id', $me->id)
                ->value('roles.name');
        }

        // Only managers can access this
        if ($roleName !== 'manager') {
            abort(403, 'Only managers can access appointment requests.');
        }

        // Check approval status
        if ($me->approval_status !== 'approved') {
            abort(403, 'Your account is not validated yet.');
        }

        // Manager must have an agency
        if (!$me->agency_id) {
            abort(403, 'You must be linked to an agency to view appointment requests.');
        }

        $treatmentStatusFilter = $request->string('treatment_status')->toString(); // pending, done

        // Get all matchmaker IDs from manager's agency
        $matchmakerIds = User::role('matchmaker')
            ->where('agency_id', $me->agency_id)
            ->pluck('id');

        // Get assignees for dispatch dialog (matchmakers + manager self)
        $assignees = User::whereHas('roles', fn ($q) => $q->whereIn('name', ['matchmaker', 'manager']))
            ->where('agency_id', $me->agency_id)
            ->where('approval_status', 'approved')
            ->orderBy('name')
            ->get(['id', 'name', 'email']);
        $managers = $assignees->filter(fn (User $u) => $u->hasRole('manager'))->values();

        $managerIds = $managers->pluck('id')->all();

        $matchmakers = $assignees->filter(
            fn (User $u) => $u->hasRole('matchmaker') && ! in_array($u->id, $managerIds, true)
        )->values();

        // Include both matchmaker-assigned AND agency-only requests
        $query = AppointmentRequest::where(function($q) use ($matchmakerIds, $me) {
                $q->whereIn('assigned_matchmaker_id', $matchmakerIds)
                  ->orWhere(function($subQ) use ($me) {
                      $subQ->where('assigned_agency_id', $me->agency_id)
                            ->whereNull('assigned_matchmaker_id');
                  });
            })
            ->with(['assignedMatchmaker', 'assignedAgency']);

        // Filter by treatment_status
        if ($treatmentStatusFilter && $treatmentStatusFilter !== 'all') {
            $query->where('treatment_status', $treatmentStatusFilter);
        }

        $appointmentRequests = $query->orderBy('created_at', 'desc')->get();

        // Calculate statistics - include both matchmaker-assigned and agency-only requests
        $pendingCount = AppointmentRequest::where(function($q) use ($matchmakerIds, $me) {
                $q->whereIn('assigned_matchmaker_id', $matchmakerIds)
                  ->orWhere(function($subQ) use ($me) {
                      $subQ->where('assigned_agency_id', $me->agency_id)
                            ->whereNull('assigned_matchmaker_id');
                  });
            })
            ->where('treatment_status', 'pending')
            ->count();
        $doneCount = AppointmentRequest::where(function($q) use ($matchmakerIds, $me) {
                $q->whereIn('assigned_matchmaker_id', $matchmakerIds)
                  ->orWhere(function($subQ) use ($me) {
                      $subQ->where('assigned_agency_id', $me->agency_id)
                            ->whereNull('assigned_matchmaker_id');
                  });
            })
            ->where('treatment_status', 'done')
            ->count();

        return Inertia::render('manager/appointment-requests', [
            'appointmentRequests' => $appointmentRequests,
            'treatmentStatusFilter' => $treatmentStatusFilter ?: 'all',
            'matchmakers' => $matchmakers,
            'managers' => $managers,
            'statistics' => [
                'pending' => $pendingCount,
                'done' => $doneCount,
                'total' => $pendingCount + $doneCount,
            ],
        ]);
    }

    /**
     * Manager dispatch appointment requests to matchmakers in their agency
     * Only allows dispatching agency-only requests (not yet assigned to a matchmaker)
     */
    public function managerDispatchAppointmentRequest(Request $request)
    {
        $me = Auth::user();
        $roleName = null;
        if ($me) {
            $roleName = \Illuminate\Support\Facades\DB::table('model_has_roles')
                ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
                ->where('model_has_roles.model_id', $me->id)
                ->value('roles.name');
        }

        // Only managers can access this
        if ($roleName !== 'manager') {
            abort(403, 'Only managers can dispatch appointment requests.');
        }

        // Check approval status
        if ($me->approval_status !== 'approved') {
            abort(403, 'Your account is not validated yet.');
        }

        // Manager must have an agency
        if (!$me->agency_id) {
            abort(403, 'You must be linked to an agency to dispatch appointment requests.');
        }

        $validated = $request->validate([
            'appointment_request_ids' => ['required', 'array', 'min:1'],
            'appointment_request_ids.*' => ['required', 'integer', 'exists:appointment_requests,id'],
            'matchmaker_id' => ['required', 'integer', 'exists:users,id'],
        ]);

        try {
            $matchmaker = User::findOrFail($validated['matchmaker_id']);
            
            // Ensure matchmaker is approved, has a role, and is linked to the same agency
            if (! $matchmaker->hasAnyRole(['matchmaker', 'manager']) || $matchmaker->approval_status !== 'approved') {
                return redirect()->back()->with('error', 'Selected matchmaker is not valid or not approved.');
            }
            
            if ($matchmaker->agency_id !== $me->agency_id) {
                return redirect()->back()->with('error', 'Selected matchmaker must be from your agency.');
            }
            
            // Only dispatch agency-only requests (assigned to manager's agency but not to a matchmaker)
            // And only if not yet treated
            $updated = AppointmentRequest::whereIn('id', $validated['appointment_request_ids'])
                ->where('assigned_agency_id', $me->agency_id) // Must be from manager's agency
                ->whereNull('assigned_matchmaker_id') // Not yet assigned to a matchmaker
                ->where('treatment_status', 'pending') // Not yet treated
                ->update([
                    'assigned_matchmaker_id' => $matchmaker->id,
                    // Keep assigned_agency_id as is
                ]);
            
            $message = "{$updated} appointment request(s) dispatched to matchmaker successfully.";
            
            if ($updated === 0) {
                return redirect()->back()->with('warning', 'No appointment requests were dispatched. They might already be assigned to a matchmaker, not belong to your agency, or already treated.');
            }

            return redirect()->back()->with('success', $message);
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'An error occurred while dispatching appointment requests. Please try again.');
        }
    }
}