<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use App\Mail\StaffCredentialsMail;
use Illuminate\Support\Str;
use Inertia\Inertia;

class AdminController extends Controller
{
    public function index()
    {
        $managers = User::role('manager')->with('approvedBy')->get();
        $matchmakers = User::role('matchmaker')->with('approvedBy')->get();
        
        return Inertia::render('admin/dashboard', [
            'managers' => $managers,
            'matchmakers' => $matchmakers,
        ]);
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
            'role' => 'required|string|in:manager,matchmaker',
            'agency' => 'required|string|max:255',
        ]);

        $password = Str::random(12);
        
        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'phone' => $request->phone,
            'agency' => $request->agency,
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

        return redirect()->back()->with('success', 'Staff member created successfully. Credentials sent via email.');
    }
}