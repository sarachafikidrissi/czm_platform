<?php

namespace Tests\Feature;

use App\Models\Agency;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class DashboardKpiStatsTest extends TestCase
{
    use RefreshDatabase;

    private Agency $agency;
    private Agency $otherAgency;
    private User $admin;
    private User $manager;
    private User $matchmaker;
    private User $matchmakerOtherAgency;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['admin', 'manager', 'matchmaker', 'user'] as $role) {
            Role::findOrCreate($role, 'web');
        }

        $this->agency = Agency::create([
            'name' => 'Agence Casablanca', 'country' => 'MA', 'city' => 'Casablanca', 'address' => '1 Rue',
        ]);
        $this->otherAgency = Agency::create([
            'name' => 'Agence Rabat', 'country' => 'MA', 'city' => 'Rabat', 'address' => '2 Rue',
        ]);

        $this->admin = User::factory()->create(['approval_status' => 'approved', 'phone' => '0600000001']);
        $this->admin->assignRole('admin');

        $this->manager = User::factory()->create([
            'approval_status' => 'approved',
            'agency_id' => $this->agency->id,
            'phone' => '0600000002',
        ]);
        $this->manager->assignRole('manager');

        $this->matchmaker = User::factory()->create([
            'approval_status' => 'approved',
            'agency_id' => $this->agency->id,
            'phone' => '0600000003',
        ]);
        $this->matchmaker->assignRole('matchmaker');

        $this->matchmakerOtherAgency = User::factory()->create([
            'approval_status' => 'approved',
            'agency_id' => $this->otherAgency->id,
            'phone' => '0600000004',
        ]);
        $this->matchmakerOtherAgency->assignRole('matchmaker');
    }

    // -------------------------------------------------------------------------
    // Role access — kpiStats is injected for the right roles
    // -------------------------------------------------------------------------

    public function test_matchmaker_dashboard_receives_kpi_stats(): void
    {
        $this->actingAs($this->matchmaker)
            ->get('/dashboard')
            ->assertInertia(fn(Assert $page) =>
                $page->has('kpiStats')
                     ->where('kpiStats.scope', 'personal')
            );
    }

    public function test_manager_dashboard_receives_kpi_stats_with_personal_and_agency(): void
    {
        $this->actingAs($this->manager)
            ->get('/dashboard')
            ->assertInertia(fn(Assert $page) =>
                $page->has('kpiStats')
                     ->has('kpiStats.personal')
                     ->has('kpiStats.agency')
            );
    }

    public function test_admin_dashboard_receives_kpi_stats_platform_scope(): void
    {
        $this->actingAs($this->admin)
            ->get('/dashboard')
            ->assertInertia(fn(Assert $page) =>
                $page->has('kpiStats')
                     ->where('kpiStats.scope', 'platform')
            );
    }

    // -------------------------------------------------------------------------
    // Admin cascade filter: agency only
    // -------------------------------------------------------------------------

    public function test_admin_filter_by_agency_returns_kpi_stats_for_agency(): void
    {
        $this->actingAs($this->admin)
            ->get('/dashboard?agency_id=' . $this->agency->id)
            ->assertInertia(fn(Assert $page) =>
                $page->has('kpiStats')
                     ->where('kpiStats.agencyId', $this->agency->id)
                     ->where('kpiStats.error', null)
            );
    }

    // -------------------------------------------------------------------------
    // Admin cascade filter: matchmaker only
    // -------------------------------------------------------------------------

    public function test_admin_filter_by_matchmaker_returns_individual_kpi_stats(): void
    {
        $this->actingAs($this->admin)
            ->get('/dashboard?matchmaker_id=' . $this->matchmaker->id)
            ->assertInertia(fn(Assert $page) =>
                $page->has('kpiStats')
                     ->where('kpiStats.matchmakerId', $this->matchmaker->id)
                     ->where('kpiStats.error', null)
            );
    }

    // -------------------------------------------------------------------------
    // Admin cascade filter: agency + matchmaker (valid combination)
    // -------------------------------------------------------------------------

    public function test_admin_filter_by_agency_and_matching_matchmaker_is_valid(): void
    {
        $this->actingAs($this->admin)
            ->get('/dashboard?agency_id=' . $this->agency->id . '&matchmaker_id=' . $this->matchmaker->id)
            ->assertInertia(fn(Assert $page) =>
                $page->has('kpiStats')
                     ->where('kpiStats.agencyId', $this->agency->id)
                     ->where('kpiStats.matchmakerId', $this->matchmaker->id)
                     ->where('kpiStats.error', null)
            );
    }

    // -------------------------------------------------------------------------
    // Admin cascade filter: agency + matchmaker from different agency → mismatch
    // -------------------------------------------------------------------------

    public function test_admin_filter_agency_matchmaker_mismatch_returns_error_prop(): void
    {
        // matchmakerOtherAgency belongs to otherAgency, not agency
        $this->actingAs($this->admin)
            ->get('/dashboard?agency_id=' . $this->agency->id . '&matchmaker_id=' . $this->matchmakerOtherAgency->id)
            ->assertInertia(fn(Assert $page) =>
                $page->has('kpiStats')
                     ->where('kpiStats.error', 'mismatch')
            );
    }

    // -------------------------------------------------------------------------
    // Month/year filtering
    // -------------------------------------------------------------------------

    public function test_future_month_is_clamped_to_current_month(): void
    {
        $currentMonth = now()->month;
        $currentYear  = now()->year;

        $this->actingAs($this->matchmaker)
            ->get('/dashboard?month=12&year=' . ($currentYear + 5))
            ->assertInertia(fn(Assert $page) =>
                $page->where('kpiStats.month', $currentMonth)
                     ->where('kpiStats.year', $currentYear)
            );
    }

    public function test_previous_month_is_accepted(): void
    {
        $prevMonth = now()->subMonth();

        $this->actingAs($this->matchmaker)
            ->get('/dashboard?month=' . $prevMonth->month . '&year=' . $prevMonth->year)
            ->assertInertia(fn(Assert $page) =>
                $page->where('kpiStats.month', $prevMonth->month)
                     ->where('kpiStats.year', $prevMonth->year)
            );
    }

    public function test_invalid_month_zero_is_clamped_to_january(): void
    {
        $this->actingAs($this->matchmaker)
            ->get('/dashboard?month=0&year=2020')
            ->assertInertia(fn(Assert $page) =>
                $page->where('kpiStats.month', 1)
                     ->where('kpiStats.year', 2020)
            );
    }

    public function test_invalid_month_thirteen_is_clamped_to_december(): void
    {
        $this->actingAs($this->matchmaker)
            ->get('/dashboard?month=13&year=2020')
            ->assertInertia(fn(Assert $page) =>
                $page->where('kpiStats.month', 12)
                     ->where('kpiStats.year', 2020)
            );
    }

    public function test_invalid_negative_month_does_not_error(): void
    {
        $this->actingAs($this->matchmaker)
            ->get('/dashboard?month=-5&year=2020')
            ->assertOk()
            ->assertInertia(fn(Assert $page) =>
                $page->where('kpiStats.month', 1)
                     ->where('kpiStats.year', 2020)
            );
    }
}
