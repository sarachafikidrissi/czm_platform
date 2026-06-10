<?php

namespace Tests\Unit;

use App\Models\Agency;
use App\Models\MonthlyObjective;
use App\Models\User;
use App\Services\ObjectiveMetricsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ObjectiveMetricsServiceTest extends TestCase
{
    use RefreshDatabase;

    private Agency $agency;
    private User $manager;
    private int $month;
    private int $year;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['admin', 'manager', 'matchmaker', 'user'] as $role) {
            Role::findOrCreate($role, 'web');
        }

        $this->month = 6;
        $this->year = 2026;

        $this->agency = Agency::create([
            'name' => 'Agence A',
            'country' => 'MA',
            'city' => 'Casablanca',
            'address' => '1 Rue Test',
        ]);

        $this->manager = User::factory()->create([
            'approval_status' => 'approved',
            'agency_id' => $this->agency->id,
            'phone' => '0600000001',
        ]);
        $this->manager->assignRole('manager');
    }

    /** @test */
    public function resolveObjectiveForUser_returns_null_when_no_row_exists(): void
    {
        $mm = $this->createMatchmaker($this->agency->id);

        $resolved = ObjectiveMetricsService::resolveObjectiveForUser(
            (int) $mm->id,
            $this->month,
            $this->year
        );

        $this->assertNull($resolved);
    }

    /** @test */
    public function resolveObjectiveForUser_returns_per_user_row_when_set(): void
    {
        $mm = $this->createMatchmaker($this->agency->id);

        MonthlyObjective::create([
            'role_type' => 'matchmaker',
            'user_id' => $mm->id,
            'agency_id' => null,
            'month' => $this->month,
            'year' => $this->year,
            'target_ventes' => 3000,
            'target_membres' => 6,
            'target_rdv' => 0,
            'target_match' => 0,
        ]);

        $resolved = ObjectiveMetricsService::resolveObjectiveForUser(
            (int) $mm->id,
            $this->month,
            $this->year
        );

        $this->assertNotNull($resolved);
        $this->assertEquals(3000, (float) $resolved->target_ventes);
        $this->assertEquals(6, (int) $resolved->target_membres);
    }

    /** @test */
    public function resolveManagerPersonalObjective_returns_null_without_per_user_row(): void
    {
        $resolved = ObjectiveMetricsService::resolveManagerPersonalObjective(
            (int) $this->manager->id,
            $this->month,
            $this->year
        );

        $this->assertNull($resolved);
    }

    /** @test */
    public function resolveManagerPersonalObjective_returns_per_user_row_when_set(): void
    {
        MonthlyObjective::create([
            'role_type' => 'manager',
            'user_id' => $this->manager->id,
            'agency_id' => null,
            'month' => $this->month,
            'year' => $this->year,
            'target_ventes' => 8000,
            'target_membres' => 20,
            'target_rdv' => 0,
            'target_match' => 0,
        ]);

        $resolved = ObjectiveMetricsService::resolveManagerPersonalObjective(
            (int) $this->manager->id,
            $this->month,
            $this->year
        );

        $this->assertNotNull($resolved);
        $this->assertEquals(8000, (float) $resolved->target_ventes);
        $this->assertEquals(20, (int) $resolved->target_membres);
    }

    /** @test */
    public function sumObjectivesForAgency_sums_only_per_user_rows(): void
    {
        $mm1 = $this->createMatchmaker($this->agency->id);
        $mm2 = $this->createMatchmaker($this->agency->id);

        MonthlyObjective::create([
            'role_type' => 'matchmaker',
            'user_id' => $mm1->id,
            'month' => $this->month,
            'year' => $this->year,
            'target_ventes' => 100,
            'target_membres' => 10,
            'target_rdv' => 0,
            'target_match' => 0,
        ]);

        MonthlyObjective::create([
            'role_type' => 'manager',
            'user_id' => $this->manager->id,
            'month' => $this->month,
            'year' => $this->year,
            'target_ventes' => 5000,
            'target_membres' => 10,
            'target_rdv' => 0,
            'target_match' => 0,
        ]);

        $sum = ObjectiveMetricsService::sumObjectivesForAgency(
            (int) $this->agency->id,
            $this->month,
            $this->year
        );

        $this->assertNotNull($sum);
        $this->assertEquals('aggregated', $sum->role_type);
        // mm1: 100/10, manager: 5000/10; mm2 has no objective and is skipped
        $this->assertEquals(5100.0, (float) $sum->target_ventes);
        $this->assertEquals(20, (int) $sum->target_membres);
    }

    /** @test */
    public function sumObjectivesForPlatform_sums_all_producers_with_per_user_rows_only(): void
    {
        $agencyB = Agency::create([
            'name' => 'Agence B',
            'country' => 'MA',
            'city' => 'Rabat',
            'address' => '2 Rue Test',
        ]);

        $mmA = $this->createMatchmaker($this->agency->id);
        $mmB = $this->createMatchmaker($agencyB->id);

        MonthlyObjective::create([
            'role_type' => 'matchmaker',
            'user_id' => $mmA->id,
            'month' => $this->month,
            'year' => $this->year,
            'target_ventes' => 100,
            'target_membres' => 1,
            'target_rdv' => 0,
            'target_match' => 0,
        ]);

        MonthlyObjective::create([
            'role_type' => 'matchmaker',
            'user_id' => $mmB->id,
            'month' => $this->month,
            'year' => $this->year,
            'target_ventes' => 200,
            'target_membres' => 2,
            'target_rdv' => 0,
            'target_match' => 0,
        ]);

        $sum = ObjectiveMetricsService::sumObjectivesForPlatform($this->month, $this->year);

        $this->assertNotNull($sum);
        // mmA: 100/1, mmB: 200/2; manager has no row and is skipped
        $this->assertEquals(300.0, (float) $sum->target_ventes);
        $this->assertEquals(3, (int) $sum->target_membres);
        $this->assertNull($sum->agency_id);
    }

    /** @test */
    public function sumObjectivesForAgency_returns_null_when_no_targets(): void
    {
        $this->createMatchmaker($this->agency->id);

        $sum = ObjectiveMetricsService::sumObjectivesForAgency(
            (int) $this->agency->id,
            $this->month,
            $this->year
        );

        $this->assertNull($sum);
    }

    private function createMatchmaker(int $agencyId): User
    {
        $mm = User::factory()->create([
            'approval_status' => 'approved',
            'agency_id' => $agencyId,
            'phone' => '06'.random_int(10000000, 99999999),
        ]);
        $mm->assignRole('matchmaker');

        return $mm;
    }
}
