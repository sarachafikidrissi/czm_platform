<?php

namespace App\Http\Controllers;

use App\Services\ObjectiveCommissionCalculator;
use App\Services\ObjectiveMetricsService;
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

        $realized = ObjectiveMetricsService::calculateRealizedForManager((int) $me->id, $month, $year);

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
