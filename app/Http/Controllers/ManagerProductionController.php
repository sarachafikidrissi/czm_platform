<?php

namespace App\Http\Controllers;

use App\Models\Bill;
use App\Models\MonthlyObjective;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ManagerProductionController extends Controller
{
    public function index(Request $request)
    {
        $me = Auth::user();
        $roleName = null;
        if ($me) {
            $roleName = DB::table('model_has_roles')
                ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
                ->where('model_has_roles.model_id', $me->id)
                ->value('roles.name');
        }

        if ($roleName !== 'manager') {
            abort(403, 'Unauthorized access.');
        }

        $month = $request->integer('month', now()->month);
        $year = $request->integer('year', now()->year);

        $objective = MonthlyObjective::where('role_type', 'manager')
            ->whereNull('user_id')
            ->where('month', $month)
            ->where('year', $year)
            ->first();

        $startDate = Carbon::create($year, $month, 1)->startOfMonth();
        $endDate = Carbon::create($year, $month, 1)->endOfMonth();

        // Manager personal productivity:
        // - Ventes: bills created by manager (stored in bills.matchmaker_id)
        // - Membres: users validated by this manager
        $ventes = Bill::where('matchmaker_id', $me->id)
            ->where('status', 'paid')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->sum('total_amount');

        $membres = User::role('user')
            ->whereIn('status', ['member', 'client', 'client_expire'])
            ->where('validated_by_manager_id', $me->id)
            ->whereBetween('approved_at', [$startDate, $endDate])
            ->count();

        $realized = [
            'ventes' => (float) ($ventes ?? 0),
            'membres' => (int) $membres,
            'rdv' => 0,
            'match' => 0,
        ];

        $progress = [
            'ventes' => ($objective && (float) $objective->target_ventes > 0)
                ? min(100, ($realized['ventes'] / (float) $objective->target_ventes) * 100)
                : 0,
            'membres' => ($objective && (int) $objective->target_membres > 0)
                ? min(100, ($realized['membres'] / (int) $objective->target_membres) * 100)
                : 0,
            'rdv' => ($objective && (int) $objective->target_rdv > 0)
                ? min(100, ($realized['rdv'] / (int) $objective->target_rdv) * 100)
                : 0,
            'match' => ($objective && (int) $objective->target_match > 0)
                ? min(100, ($realized['match'] / (int) $objective->target_match) * 100)
                : 0,
        ];

        $commission = [
            'ventes' => [
                'eligible' => $progress['ventes'] >= 50,
                'amount' => $progress['ventes'] >= 50 ? $realized['ventes'] * 0.10 : 0,
            ],
            'membres' => [
                'eligible' => $progress['membres'] >= 50,
                'amount' => 0,
            ],
            'rdv' => [
                'eligible' => $progress['rdv'] >= 50,
                'amount' => 0,
            ],
            'match' => [
                'eligible' => $progress['match'] >= 50,
                'amount' => 0,
            ],
        ];

        return Inertia::render('manager/my-production', [
            'objective' => $objective,
            'realized' => $realized,
            'progress' => $progress,
            'commission' => $commission,
            'month' => $month,
            'year' => $year,
            'currentUser' => [
                'id' => $me->id,
                'name' => $me->name,
                'role' => $roleName,
            ],
        ]);
    }
}

