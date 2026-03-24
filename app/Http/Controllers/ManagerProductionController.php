<?php

namespace App\Http\Controllers;

use App\Models\Bill;
use App\Models\User;
use App\Services\ObjectiveCommissionCalculator;
use App\Services\ObjectiveMetricsService;
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

        $objective = ObjectiveMetricsService::resolveManagerPersonalObjective((int) $me->id, $month, $year);

        $startDate = Carbon::create($year, $month, 1)->startOfMonth();
        $endDate = Carbon::create($year, $month, 1)->endOfMonth();

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

        $progress = ObjectiveCommissionCalculator::calculateProgress($objective, $realized);

        $commission = $me->agency_id
            ? ObjectiveCommissionCalculator::forManagerDashboard((int) $me->id, (int) $me->agency_id, $month, $year)
            : ObjectiveCommissionCalculator::none($progress);

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
