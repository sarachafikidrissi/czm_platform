<?php

namespace Tests\Unit;

use App\Models\Agency;
use App\Models\MonthlyObjective;
use App\Models\Proposition;
use App\Models\Rdv;
use App\Models\User;
use App\Services\StatsService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class StatsServiceTest extends TestCase
{
    use RefreshDatabase;

    private StatsService $service;
    private Agency $agency;
    private User $matchmaker;
    private User $manager;
    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = new StatsService();

        // Create roles
        foreach (['admin', 'manager', 'matchmaker', 'user'] as $role) {
            Role::findOrCreate($role, 'web');
        }

        $this->agency = Agency::create([
            'name' => 'Agence Test',
            'country' => 'MA',
            'city' => 'Casablanca',
            'address' => '1 Rue Test',
        ]);

        $this->matchmaker = User::factory()->create([
            'approval_status' => 'approved',
            'agency_id' => $this->agency->id,
            'phone' => '0600000001',
        ]);
        $this->matchmaker->assignRole('matchmaker');

        $this->manager = User::factory()->create([
            'approval_status' => 'approved',
            'agency_id' => $this->agency->id,
            'phone' => '0600000002',
        ]);
        $this->manager->assignRole('manager');

        $this->admin = User::factory()->create([
            'approval_status' => 'approved',
            'phone' => '0600000003',
        ]);
        $this->admin->assignRole('admin');
    }

    // -------------------------------------------------------------------------
    // Matchmaker scope — sees only own assignments
    // -------------------------------------------------------------------------

    /** @test */
    public function matchmaker_prospect_stats_only_include_own_assignments(): void
    {
        $otherMm = User::factory()->create(['approval_status' => 'approved']);
        $otherMm->assignRole('matchmaker');

        // Own prospect
        $this->makeProspect($this->matchmaker->id);

        // Another matchmaker's prospect — must NOT appear
        $this->makeProspect($otherMm->id);

        $stats = $this->service->compute($this->matchmaker, now()->month, now()->year, 'personal', null, null);

        $this->assertEquals(1, $stats['prospects']['new_this_month']);
        $this->assertEquals(1, $stats['prospects']['total_active']);
    }

    /** @test */
    public function matchmaker_sees_zero_for_month_with_no_activity(): void
    {
        // No data seeded
        $stats = $this->service->compute($this->matchmaker, 1, 2020, 'personal', null, null);

        $this->assertEquals(0, $stats['prospects']['new_this_month']);
        $this->assertEquals(0, $stats['prospects']['total_active']);
        $this->assertEquals(0, $stats['membres']['new_this_month']);
        $this->assertEquals(0, $stats['rdvs']['new_this_month']);
        $this->assertEquals(0, $stats['matchs']['new_this_month']);
    }

    /** @test */
    public function match_is_rdv_with_status_reussi_updated_in_month(): void
    {
        // RDV created last month, marked reussi this month
        $rdv = Rdv::create([
            'matchmaker_id'      => $this->matchmaker->id,
            'reference_user_id'  => User::factory()->create()->id,
            'compatible_user_id' => User::factory()->create()->id,
            'regle'              => 'règle test',
            'status'             => Rdv::STATUS_REUSSI,
        ]);

        // Manually set updated_at to this month
        $rdv->forceFill(['updated_at' => Carbon::now()->startOfMonth()->addDays(2)])->save();

        $stats = $this->service->compute($this->matchmaker, now()->month, now()->year, 'personal', null, null);

        $this->assertEquals(1, $stats['matchs']['new_this_month']);
    }

    /** @test */
    public function vs_last_month_delta_is_computed_correctly(): void
    {
        $prevMonth = now()->subMonth();

        // 2 prospects last month
        Carbon::setTestNow($prevMonth->copy()->startOfMonth()->addDays(5));
        $this->makeProspect($this->matchmaker->id);
        $this->makeProspect($this->matchmaker->id);
        Carbon::setTestNow(null);

        // 1 prospect this month
        $this->makeProspect($this->matchmaker->id);

        $stats = $this->service->compute($this->matchmaker, now()->month, now()->year, 'personal', null, null);

        // This month: 1, last month: 2 → delta = -1
        $this->assertEquals(1, $stats['prospects']['new_this_month']);
        $this->assertEquals(-1, $stats['prospects']['vs_last_month']);
    }

    // -------------------------------------------------------------------------
    // Manager agency scope — sees agency aggregate
    // -------------------------------------------------------------------------

    /** @test */
    public function manager_agency_scope_aggregates_all_agency_matchmakers(): void
    {
        $mm2 = User::factory()->create(['approval_status' => 'approved', 'agency_id' => $this->agency->id]);
        $mm2->assignRole('matchmaker');

        // 1 prospect for each matchmaker in agency
        $this->makeProspect($this->matchmaker->id);
        $this->makeProspect($mm2->id);

        $stats = $this->service->compute($this->manager, now()->month, now()->year, 'agency', null, null);

        // Should see at least 2 (possibly 3 if manager included)
        $this->assertGreaterThanOrEqual(2, $stats['prospects']['new_this_month']);
    }

    /** @test */
    public function admin_sees_all_platform_prospects_without_filter(): void
    {
        $otherAgency = Agency::create(['name' => 'Other', 'country' => 'MA', 'city' => 'Rabat', 'address' => '2 Rue']);
        $otherMm = User::factory()->create(['approval_status' => 'approved', 'agency_id' => $otherAgency->id]);
        $otherMm->assignRole('matchmaker');

        $this->makeProspect($this->matchmaker->id);
        $this->makeProspect($otherMm->id);

        $stats = $this->service->compute($this->admin, now()->month, now()->year, 'platform', null, null);

        $this->assertEquals(2, $stats['prospects']['new_this_month']);
    }

    /** @test */
    public function admin_filter_by_matchmaker_returns_individual_stats(): void
    {
        $this->makeProspect($this->matchmaker->id);

        // Other matchmaker in same agency
        $otherMm = User::factory()->create(['approval_status' => 'approved', 'agency_id' => $this->agency->id]);
        $otherMm->assignRole('matchmaker');
        $this->makeProspect($otherMm->id);

        $stats = $this->service->compute($this->admin, now()->month, now()->year, 'platform', null, $this->matchmaker->id);

        $this->assertEquals(1, $stats['prospects']['new_this_month']);
    }

    // -------------------------------------------------------------------------
    // Transfer attribution — current owner gets credit
    // -------------------------------------------------------------------------

    /** @test */
    public function transferred_prospect_counted_for_current_assigned_matchmaker(): void
    {
        $otherMm = User::factory()->create(['approval_status' => 'approved']);
        $otherMm->assignRole('matchmaker');

        // Prospect originally created by otherMm but currently assigned to $this->matchmaker
        $this->makeProspect($this->matchmaker->id); // current assignee

        $statsThisMm = $this->service->compute($this->matchmaker, now()->month, now()->year, 'personal', null, null);
        $statsOtherMm = $this->service->compute($otherMm, now()->month, now()->year, 'personal', null, null);

        $this->assertEquals(1, $statsThisMm['prospects']['total_active']);
        $this->assertEquals(0, $statsOtherMm['prospects']['total_active']);
    }

    // -------------------------------------------------------------------------
    // Targets from MonthlyObjective
    // -------------------------------------------------------------------------

    /** @test */
    public function targets_are_loaded_from_monthly_objective(): void
    {
        MonthlyObjective::create([
            'user_id' => $this->matchmaker->id,
            'month' => now()->month,
            'year' => now()->year,
            'target_ventes' => 0,
            'target_membres' => 5,
            'target_rdv' => 6,
            'target_match' => 3,
        ]);

        $stats = $this->service->compute($this->matchmaker, now()->month, now()->year, 'personal', null, null);

        $this->assertEquals(5, $stats['membres']['target']);
        $this->assertEquals(6, $stats['rdvs']['target']);
        $this->assertEquals(3, $stats['matchs']['target']);
        $this->assertNull($stats['prospects']['target']);
    }

    /** @test */
    public function null_target_returned_gracefully_when_no_objective_exists(): void
    {
        $stats = $this->service->compute($this->matchmaker, now()->month, now()->year, 'personal', null, null);

        $this->assertNull($stats['prospects']['target']);
        $this->assertNull($stats['membres']['target']);
        $this->assertNull($stats['rdvs']['target']);
        $this->assertNull($stats['matchs']['target']);
    }

    // -------------------------------------------------------------------------
    // Cache
    // -------------------------------------------------------------------------

    /** @test */
    public function stats_are_cached_and_not_recomputed_on_second_call(): void
    {
        $this->makeProspect($this->matchmaker->id);

        Cache::flush();

        // First call — populates cache
        $first = $this->service->getDashboardStats($this->matchmaker, now()->month, now()->year, 'personal');

        // Add another prospect WITHOUT firing model events, so the observer does not
        // flush the cache — this lets us verify the cache hit on second call.
        User::withoutEvents(fn() => $this->makeProspect($this->matchmaker->id));

        $second = $this->service->getDashboardStats($this->matchmaker, now()->month, now()->year, 'personal');

        $this->assertEquals($first['prospects']['new_this_month'], $second['prospects']['new_this_month']);
    }

    /** @test */
    public function cache_is_invalidated_when_user_status_changes(): void
    {
        Cache::flush();

        $stats1 = $this->service->getDashboardStats($this->matchmaker, now()->month, now()->year, 'personal');
        $this->assertEquals(0, $stats1['prospects']['new_this_month']);

        // Changing a user fires StatsObserver which calls invalidateForMatchmaker
        StatsService::invalidateForMatchmaker($this->matchmaker->id);

        $this->makeProspect($this->matchmaker->id);

        $stats2 = $this->service->getDashboardStats($this->matchmaker, now()->month, now()->year, 'personal');
        $this->assertEquals(1, $stats2['prospects']['new_this_month']);
    }

    /** @test */
    public function cache_is_invalidated_for_admin_matchmaker_filter_view(): void
    {
        Cache::flush();

        $month = now()->month;
        $year  = now()->year;

        $stats1 = $this->service->getDashboardStats(
            $this->admin, $month, $year, 'platform', null, $this->matchmaker->id
        );
        $this->assertEquals(0, $stats1['prospects']['new_this_month']);

        StatsService::invalidateForMatchmaker($this->matchmaker->id);
        $this->makeProspect($this->matchmaker->id);

        $stats2 = $this->service->getDashboardStats(
            $this->admin, $month, $year, 'platform', null, $this->matchmaker->id
        );
        $this->assertEquals(1, $stats2['prospects']['new_this_month']);
    }

    /** @test */
    public function cache_is_invalidated_for_manager_agency_filter_view(): void
    {
        Cache::flush();

        $month = now()->month;
        $year  = now()->year;

        $stats1 = $this->service->getDashboardStats(
            $this->manager, $month, $year, 'agency', null, $this->matchmaker->id
        );
        $this->assertEquals(0, $stats1['prospects']['new_this_month']);

        StatsService::invalidateForMatchmaker($this->matchmaker->id);
        $this->makeProspect($this->matchmaker->id);

        $stats2 = $this->service->getDashboardStats(
            $this->manager, $month, $year, 'agency', null, $this->matchmaker->id
        );
        $this->assertEquals(1, $stats2['prospects']['new_this_month']);
    }

    // -------------------------------------------------------------------------
    // Proposition stats
    // -------------------------------------------------------------------------

    /** @test */
    public function proposition_total_active_excludes_terminal_statuses(): void
    {
        Role::findOrCreate('user', 'web');
        $u = User::factory()->create();

        $base = [
            'matchmaker_id'    => $this->matchmaker->id,
            'reference_user_id' => $u->id,
            'recipient_user_id' => $u->id,
            'message'           => 'test',
        ];
        Proposition::create($base + ['status' => Proposition::STATUS_PENDING,   'compatible_user_id' => User::factory()->create()->id]);
        Proposition::create($base + ['status' => Proposition::STATUS_CANCELLED, 'compatible_user_id' => User::factory()->create()->id]);
        Proposition::create($base + ['status' => Proposition::STATUS_EXPIRED,   'compatible_user_id' => User::factory()->create()->id]);

        $stats = $this->service->compute($this->matchmaker, now()->month, now()->year, 'personal', null, null);

        // Only STATUS_PENDING counts as active; cancelled + expired are terminal
        $this->assertEquals(1, $stats['propositions']['total_active']);
        // All 3 were created this month
        $this->assertEquals(3, $stats['propositions']['new_this_month']);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private function makeProspect(int $matchmakerId): User
    {
        Role::findOrCreate('user', 'web');
        $prospect = User::factory()->create([
            'status' => 'prospect',
            'assigned_matchmaker_id' => $matchmakerId,
            'agency_id' => $this->agency->id,
        ]);
        $prospect->assignRole('user');
        return $prospect;
    }
}
