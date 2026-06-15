<?php

namespace Tests\Unit;

use App\Http\Controllers\MatchmakerStatisticsController;
use App\Models\Agency;
use App\Models\MonthlyObjective;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use ReflectionMethod;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * Covers the role-aware realized "membres" branching in
 * MatchmakerStatisticsController::getObjectiveStatistics().
 *
 * Manager scope: validated_by_manager_id OR assigned_matchmaker_id (no status filter).
 * Matchmaker scope: assigned_matchmaker_id only, restricted to member/client/client_expire.
 *
 * The private method is invoked via reflection so the assertion targets the
 * branching logic directly, without the controller's sibling DATE_FORMAT queries
 * that are unsupported on the SQLite test driver.
 */
class MatchmakerStatisticsObjectivesTest extends TestCase
{
    use RefreshDatabase;

    private Agency $agency;
    private User $manager;
    private User $matchmaker;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['admin', 'manager', 'matchmaker', 'user'] as $role) {
            Role::findOrCreate($role, 'web');
        }

        $this->agency = Agency::create([
            'name' => 'Agence Test', 'country' => 'MA', 'city' => 'Casablanca', 'address' => '1 Rue Test',
        ]);

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
    }

    /** @test */
    public function manager_realized_membres_counts_validated_by_manager_and_directly_assigned(): void
    {
        $this->seedObjective($this->manager->id);

        // Counts: validated by the manager while unassigned to any matchmaker.
        $this->makeMember(['validated_by_manager_id' => $this->manager->id, 'status' => 'member']);
        // Counts: directly assigned to the manager.
        $this->makeMember(['assigned_matchmaker_id' => $this->manager->id, 'status' => 'client']);
        // Does NOT count: belongs to the matchmaker, not the manager.
        $this->makeMember(['assigned_matchmaker_id' => $this->matchmaker->id, 'status' => 'member']);
        // Does NOT count: approved under the manager but non-member status is excluded.
        $this->makeMember(['validated_by_manager_id' => $this->manager->id, 'status' => 'prospect']);

        $result = $this->getObjectiveStatistics($this->manager->id, true);

        $this->assertEquals(2, $result['realized_membres']);
    }

    /** @test */
    public function matchmaker_realized_membres_counts_only_assigned_with_member_statuses(): void
    {
        $this->seedObjective($this->matchmaker->id);

        // Counts: assigned to the matchmaker with member-like statuses.
        $this->makeMember(['assigned_matchmaker_id' => $this->matchmaker->id, 'status' => 'member']);
        $this->makeMember(['assigned_matchmaker_id' => $this->matchmaker->id, 'status' => 'client_expire']);
        // Does NOT count: prospect status is excluded for the matchmaker branch.
        $this->makeMember(['assigned_matchmaker_id' => $this->matchmaker->id, 'status' => 'prospect']);
        // Does NOT count: validated_by_manager_id is ignored for the matchmaker branch.
        $this->makeMember(['validated_by_manager_id' => $this->manager->id, 'status' => 'member']);

        $result = $this->getObjectiveStatistics($this->matchmaker->id, false);

        $this->assertEquals(2, $result['realized_membres']);
    }

    /** @test */
    public function matchmaker_branch_ignores_members_validated_by_manager(): void
    {
        // Same data set evaluated under each scope to prove the branches diverge:
        // a member validated by the manager but assigned to no matchmaker.
        $this->seedObjective($this->manager->id);
        $this->seedObjective($this->matchmaker->id);
        $this->makeMember(['validated_by_manager_id' => $this->manager->id, 'status' => 'member']);

        $managerResult = $this->getObjectiveStatistics($this->manager->id, true);
        $matchmakerResult = $this->getObjectiveStatistics($this->matchmaker->id, false);

        $this->assertEquals(1, $managerResult['realized_membres']);
        $this->assertEquals(0, $matchmakerResult['realized_membres']);
    }

    private function getObjectiveStatistics(int $userId, bool $isManager): array
    {
        $method = new ReflectionMethod(MatchmakerStatisticsController::class, 'getObjectiveStatistics');
        $method->setAccessible(true);

        return $method->invoke(
            new MatchmakerStatisticsController(),
            $userId,
            now()->month,
            now()->year,
            $isManager
        );
    }

    private function seedObjective(int $userId): void
    {
        MonthlyObjective::create([
            'user_id' => $userId,
            'month' => now()->month,
            'year' => now()->year,
            'target_ventes' => 0,
            'target_membres' => 10,
            'target_rdv' => 0,
            'target_match' => 0,
        ]);
    }

    private function makeMember(array $attributes): User
    {
        $member = User::factory()->create(array_merge([
            'agency_id' => $this->agency->id,
            'approved_at' => now(),
        ], $attributes));
        $member->assignRole('user');

        return $member;
    }
}
