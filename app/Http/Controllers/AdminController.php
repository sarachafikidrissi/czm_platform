<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Agency;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use App\Mail\StaffCredentialsMail;
use Illuminate\Support\Str;
use Inertia\Inertia;
use App\Models\Service;
use Illuminate\Validation\Rule;

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

        return Inertia::render('admin/dashboard', [
            'managers' => $managers,
            'matchmakers' => $matchmakers,
            'agencies' => $agencies,
            'services' => $services,
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
        $query = User::role('user')->where('status', 'prospect')->with('profile');
        if ($country) {
            $query->where('country', $country);
        }
        if ($city) {
            $query->where('city', $city);
        }
        if ($dispatch === 'dispatched') {
            $query->whereNotNull('agency_id');
        } elseif ($dispatch === 'not_dispatched') {
            $query->whereNull('agency_id');
        }
        $prospects = $query->get(['id','name','email','phone','country','city','agency_id','created_at']);
        $agencies = Agency::query()->get(['id','name','country','city']);

        return Inertia::render('admin/prospects-dispatch', [
            'prospects' => $prospects,
            'agencies' => $agencies,
            'filters' => [ 'country' => $country ?: null, 'city' => $city ?: null, 'dispatch' => $dispatch ?: 'all' ],
        ]);
    }

    public function dispatchProspects(Request $request)
    {
        $validated = $request->validate([
            'prospect_ids' => ['required','array','min:1'],
            'prospect_ids.*' => ['integer', 'exists:users,id'],
            'agency_id' => ['required','integer', Rule::exists('agencies','id')],
        ]);

        $agency = Agency::findOrFail($validated['agency_id']);
        // Assign only prospects not yet dispatched (agency_id is null)
        $updated = User::whereIn('id', $validated['prospect_ids'])
            ->where('status', 'prospect')
            ->whereNull('agency_id')
            ->update(['agency_id' => $agency->id]);

        if ($updated === 0) {
            return redirect()->back()->with('warning', 'No prospects were dispatched. They might already be assigned.');
        }

        return redirect()->back()->with('success', "{$updated} prospects dispatched successfully.");
    }

    public function updateUserRole(Request $request, $id)
    {
        $validated = $request->validate([
            'roles' => ['required','array','min:1'],
            'roles.*' => [Rule::in(['admin','manager','matchmaker'])],
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
        
        $user = User::create([
            'name' => $request->name,
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

    public function updateUserAgency(Request $request, $id)
    {
        $request->validate([
            'agency_id' => 'required|exists:agencies,id',
        ]);

        $user = User::findOrFail($id);
        $user->update([
            'agency_id' => $request->agency_id,
        ]);

        return redirect()->back()->with('success', 'User agency updated successfully.');
    }
}