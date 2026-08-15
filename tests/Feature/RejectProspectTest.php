<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class RejectProspectTest extends TestCase
{
    use RefreshDatabase;

    private User $matchmaker;

    private User $prospect;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['admin', 'manager', 'matchmaker', 'user'] as $role) {
            Role::findOrCreate($role, 'web');
        }

        $this->matchmaker = User::factory()->create([
            'approval_status' => 'approved',
        ]);
        $this->matchmaker->assignRole('matchmaker');

        $this->prospect = User::factory()->create([
            'status' => 'prospect',
            'assigned_matchmaker_id' => $this->matchmaker->id,
        ]);
        $this->prospect->assignRole('user');
    }

    public function test_assigned_matchmaker_can_reject_prospect(): void
    {
        $this->actingAs($this->matchmaker)
            ->from(route('staff.prospects'))
            ->post(route('staff.prospects.reject', $this->prospect->id), [
                'rejection_reason' => 'Profil incomplet',
            ])
            ->assertRedirect(route('staff.prospects'))
            ->assertSessionHas('success');

        $this->prospect->refresh();
        $this->assertSame('Profil incomplet', $this->prospect->rejection_reason);
        $this->assertSame($this->matchmaker->id, $this->prospect->rejected_by);
        $this->assertNotNull($this->prospect->rejected_at);
    }

    public function test_second_rejection_returns_already_rejected_without_overwriting(): void
    {
        $this->actingAs($this->matchmaker)
            ->post(route('staff.prospects.reject', $this->prospect->id), [
                'rejection_reason' => 'Profil incomplet',
            ])
            ->assertRedirect()
            ->assertSessionHas('success');

        $firstRejectedAt = $this->prospect->fresh()->rejected_at;

        $this->actingAs($this->matchmaker)
            ->from(route('staff.prospects'))
            ->post(route('staff.prospects.reject', $this->prospect->id), [
                'rejection_reason' => 'Hors critères',
            ])
            ->assertRedirect(route('staff.prospects'))
            ->assertSessionHas('error', 'Ce prospect a déjà été rejeté.');

        $this->prospect->refresh();
        $this->assertSame('Profil incomplet', $this->prospect->rejection_reason);
        $this->assertSame($this->matchmaker->id, $this->prospect->rejected_by);
        $this->assertEquals($firstRejectedAt, $this->prospect->rejected_at);
    }

    public function test_unassigned_matchmaker_is_forbidden_even_if_prospect_already_rejected(): void
    {
        $this->prospect->update([
            'rejection_reason' => 'Déjà rejeté',
            'rejected_by' => $this->matchmaker->id,
            'rejected_at' => now(),
        ]);

        $otherMatchmaker = User::factory()->create([
            'approval_status' => 'approved',
        ]);
        $otherMatchmaker->assignRole('matchmaker');

        $this->actingAs($otherMatchmaker)
            ->post(route('staff.prospects.reject', $this->prospect->id), [
                'rejection_reason' => 'Should not leak already-rejected',
            ])
            ->assertForbidden();

        $this->prospect->refresh();
        $this->assertSame('Déjà rejeté', $this->prospect->rejection_reason);
        $this->assertSame($this->matchmaker->id, $this->prospect->rejected_by);
    }

    public function test_cannot_reject_non_prospect_after_authorization(): void
    {
        $this->prospect->update(['status' => 'member']);

        $this->actingAs($this->matchmaker)
            ->from(route('staff.prospects'))
            ->post(route('staff.prospects.reject', $this->prospect->id), [
                'rejection_reason' => 'Should fail',
            ])
            ->assertRedirect(route('staff.prospects'))
            ->assertSessionHas('error', 'Seuls les prospects peuvent être rejetés.');

        $this->assertDatabaseHas('users', [
            'id' => $this->prospect->id,
            'status' => 'member',
            'rejection_reason' => null,
        ]);
    }
}
