<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Agency;
use App\Models\MatrimonialPack;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
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
        
        // Filter by rejection status
        if ($statusFilter === 'rejected') {
            $query->whereNotNull('rejection_reason');
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
            $query->where(function($q) {
                $q->whereNotNull('agency_id')->orWhereNotNull('assigned_matchmaker_id');
            });
        } elseif ($dispatch === 'not_dispatched') {
            $query->whereNull('agency_id')->whereNull('assigned_matchmaker_id');
        }
        $prospects = $query->with('profile')->get(['id','name','email','username','phone','country','city','status','agency_id','assigned_matchmaker_id','rejection_reason','rejected_by','rejected_at','created_at']);
        $agencies = Agency::query()->get(['id','name','country','city']);
        $matchmakers = User::role('matchmaker')
            ->where('approval_status', 'approved')
            ->whereNotNull('agency_id')
            ->get(['id','name','email','agency_id']);

        return Inertia::render('admin/prospects-dispatch', [
            'prospects' => $prospects,
            'agencies' => $agencies,
            'matchmakers' => $matchmakers,
            'statusFilter' => $statusFilter ?: 'active',
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
                if (!$matchmaker->hasRole('matchmaker') || $matchmaker->approval_status !== 'approved') {
                    return redirect()->back()->with('error', 'Selected matchmaker is not valid or not approved.');
                }
                
                if (!$matchmaker->agency_id) {
                    return redirect()->back()->with('error', 'Selected matchmaker must be linked to an agency to receive prospects.');
                }
                
                // Assign prospects ONLY to the specific matchmaker (not to the entire agency)
                // Set agency_id to NULL so other matchmakers in the same agency don't see it
                $updated = User::whereIn('id', $validated['prospect_ids'])
                    ->where('status', 'prospect')
                    ->whereNull('agency_id')
                    ->whereNull('assigned_matchmaker_id')
                    ->update([
                        'assigned_matchmaker_id' => $matchmaker->id,
                        'agency_id' => null  // Set to null so only this specific matchmaker sees it
                    ]);
                $message = "{$updated} prospects dispatched to matchmaker successfully.";
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

        $prospects = $query->get();

        // Add has_bill flag to each prospect
        $prospects->each(function($prospect) {
            $prospect->has_bill = $prospect->bills->where('status', '!=', 'paid')->isNotEmpty();
        });

        // Get all matchmakers from agencies where this manager has validated users
        $agencyIds = $prospects->pluck('agency_id')->filter()->unique()->toArray();
        $matchmakers = User::role('matchmaker')
            ->whereIn('agency_id', $agencyIds)
            ->where('approval_status', 'approved')
            ->get(['id', 'name', 'email']);

        return Inertia::render('admin/manager-tracking', [
            'prospects' => $prospects,
            'matchmakers' => $matchmakers,
            'status' => $status ?: 'all',
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
            'duration' => 'required|string|max:255',
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

        return redirect()->back()->with('success', 'User approved successfully.');
    }

    public function rejectUser(Request $request, $id)
    {
        $user = User::findOrFail($id);
        
        $user->update([
            'approval_status' => 'rejected',
            'approved_by' => Auth::id(),
        ]);

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
            // Moroccan CIN: 1-2 letters followed by 4-6 digits (common patterns); adjust if needed
            'cin' => ['required','string','max:20','regex:/^[A-Za-z]{1,2}\d{4,6}$/'],
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

        $user->update([
            'agency_id' => $request->agency_id,
        ]);

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
                // Reassign only prospects that are already dispatched (have agency_id OR assigned_matchmaker_id)
                // Clear assigned_matchmaker_id to remove from old matchmaker's list
                // Set agency_id to new agency to remove from old agency's list
                $updated = User::whereIn('id', $validated['prospect_ids'])
                    ->where('status', 'prospect')
                    ->where(function($q) {
                        $q->whereNotNull('agency_id')->orWhereNotNull('assigned_matchmaker_id');
                    })
                    ->update([
                        'agency_id' => $agency->id,
                        'assigned_matchmaker_id' => null  // Clear to remove from old matchmaker's list
                    ]);
                $message = "{$updated} prospects reassigned to agency successfully.";
            } else {
                $matchmaker = User::findOrFail($validated['matchmaker_id']);
                // Ensure matchmaker is approved and has a role
                if (!$matchmaker->hasRole('matchmaker') || $matchmaker->approval_status !== 'approved') {
                    return redirect()->back()->with('error', 'Selected matchmaker is not valid or not approved.');
                }
                
                if (!$matchmaker->agency_id) {
                    return redirect()->back()->with('error', 'Selected matchmaker must be linked to an agency to receive prospects.');
                }
                
                // Reassign only prospects that are already dispatched (have agency_id OR assigned_matchmaker_id)
                // Set assigned_matchmaker_id to new matchmaker to assign to new matchmaker
                // Set agency_id to NULL to remove from old agency's list and ensure only new matchmaker sees it
                $updated = User::whereIn('id', $validated['prospect_ids'])
                    ->where('status', 'prospect')
                    ->where(function($q) {
                        $q->whereNotNull('agency_id')->orWhereNotNull('assigned_matchmaker_id');
                    })
                    ->update([
                        'assigned_matchmaker_id' => $matchmaker->id,
                        'agency_id' => null  // Clear to remove from old agency's list and ensure only this matchmaker sees it
                    ]);
                $message = "{$updated} prospects reassigned to matchmaker successfully.";
            }

            if ($updated === 0) {
                return redirect()->back()->with('warning', 'No prospects were reassigned. They must already be dispatched (have an agency or matchmaker assigned).');
            }

            return redirect()->back()->with('success', $message);
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'An error occurred while reassigning prospects. Please try again.');
        }
    }
}