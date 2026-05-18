<?php

namespace App\Observers;

use App\Services\StatsService;

/**
 * Invalidates cached KPI stats when any stat-relevant model event fires.
 * Register this observer for User, Proposition, and Rdv in AppServiceProvider.
 */
class StatsObserver
{
    public function created($model): void
    {
        $this->invalidate($model);
    }

    public function updated($model): void
    {
        $this->invalidate($model);
    }

    public function deleted($model): void
    {
        $this->invalidate($model);
    }

    private function invalidate($model): void
    {
        $matchmakerId = $model->assigned_matchmaker_id   // User
            ?? $model->matchmaker_id                     // Proposition / Rdv
            ?? null;

        if ($matchmakerId) {
            StatsService::invalidateForMatchmaker((int) $matchmakerId);
        }
    }
}
