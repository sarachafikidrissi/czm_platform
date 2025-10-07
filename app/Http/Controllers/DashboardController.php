<?php

namespace App\Http\Controllers;

use App\Models\Agency;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Show the application dashboard.
     */
    public function index(): Response
    {
        $user = Auth::user();
        $role = null;
        if ($user) {
            $role = DB::table('model_has_roles')
                ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
                ->where('model_has_roles.model_id', $user->id)
                ->value('roles.name');
        }

        $agencies = $role === 'admin' ? Agency::all() : [];
        $stats = null;
        if ($role === 'admin') {
            $totalUsers = User::count();
            $pendingCount = User::where('approval_status', 'pending')->count();
            $approvedManagers = User::role('manager')->where('approval_status', 'approved')->count();
            $approvedMatchmakers = User::role('matchmaker')->where('approval_status', 'approved')->count();
            $stats = [
                'totalUsers' => $totalUsers,
                'pending' => $pendingCount,
                'approvedManagers' => $approvedManagers,
                'approvedMatchmakers' => $approvedMatchmakers,
            ];
        }

        return Inertia::render('dashboard', [
            'role' => $role,
            'agencies' => $agencies,
            'stats' => $stats,
        ]);
    }
}


