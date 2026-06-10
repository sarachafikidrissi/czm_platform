<?php

namespace Tests\Feature;

use App\Models\Agency;
use App\Models\MonthlyObjective;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ObjectiveStoreTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Agency $agencyA;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['admin', 'matchmaker', 'manager'] as $role) {
            Role::findOrCreate($role, 'web');
        }

        $this->admin = User::factory()->create(['approval_status' => 'approved']);
        $this->admin->assignRole('admin');

        $this->agencyA = Agency::create([
            'name' => 'Agency A',
            'country' => 'MA',
            'city' => 'Casablanca',
            'address' => '1 Test St',
        ]);
    }

    /** @test */
    public function store_with_user_ids_creates_one_per_user_row_per_selected_user(): void
    {
        $mmA = $this->createMatchmaker($this->agencyA->id);
        $mmB = $this->createMatchmaker($this->agencyA->id);

        $payload = [
            'month' => 7,
            'year' => 2026,
            'target_ventes' => 75,
            'target_membres' => 8,
            'target_rdv' => 0,
            'target_match' => 0,
            'user_ids' => [$mmA->id, $mmB->id],
        ];

        $this->actingAs($this->admin)
            ->post(route('objectives.store'), $payload)
            ->assertRedirect();

        $this->assertDatabaseHas('monthly_objectives', [
            'user_id' => $mmA->id,
            'role_type' => 'matchmaker',
            'month' => 7,
            'year' => 2026,
            'target_ventes' => '75.00',
            'target_membres' => 8,
        ]);

        $this->assertDatabaseHas('monthly_objectives', [
            'user_id' => $mmB->id,
            'role_type' => 'matchmaker',
            'month' => 7,
            'year' => 2026,
            'target_ventes' => '75.00',
            'target_membres' => 8,
        ]);

        $this->assertDatabaseMissing('monthly_objectives', [
            'user_id' => null,
            'month' => 7,
            'year' => 2026,
        ]);
    }

    /** @test */
    public function store_without_user_ids_returns_validation_error(): void
    {
        $this->actingAs($this->admin)
            ->post(route('objectives.store'), [
                'month' => 8,
                'year' => 2026,
                'target_ventes' => 10,
                'target_membres' => 1,
                'target_rdv' => 0,
                'target_match' => 0,
                'user_ids' => [],
            ])
            ->assertSessionHasErrors('user_ids');
    }

    /** @test */
    public function update_sets_target_ventes_and_updated_by(): void
    {
        $mm = $this->createMatchmaker($this->agencyA->id);

        $objective = MonthlyObjective::create([
            'role_type' => 'matchmaker',
            'user_id' => $mm->id,
            'agency_id' => null,
            'month' => 9,
            'year' => 2026,
            'target_ventes' => 50,
            'target_membres' => 5,
            'target_rdv' => 0,
            'target_match' => 0,
        ]);

        $this->actingAs($this->admin)
            ->put(route('objectives.update', $objective), [
                'target_ventes' => 120,
                'target_membres' => 12,
                'target_rdv' => 1,
                'target_match' => 2,
            ])
            ->assertRedirect();

        $objective->refresh();

        $this->assertEquals('120.00', $objective->target_ventes);
        $this->assertEquals(12, $objective->target_membres);
        $this->assertEquals($this->admin->id, $objective->updated_by);
    }

    private function createMatchmaker(int $agencyId): User
    {
        $mm = User::factory()->create([
            'approval_status' => 'approved',
            'agency_id' => $agencyId,
        ]);
        $mm->assignRole('matchmaker');

        return $mm;
    }
}
