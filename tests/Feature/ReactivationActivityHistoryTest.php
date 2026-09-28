<?php

namespace Tests\Feature;

use App\Models\Profile;
use App\Models\ReactivationRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ReactivationActivityHistoryTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['admin', 'manager', 'matchmaker', 'user'] as $role) {
            Role::findOrCreate($role, 'web');
        }
    }

    public function test_approving_reactivation_request_logs_account_activation(): void
    {
        $admin = User::factory()->create(['approval_status' => 'approved']);
        $admin->assignRole('admin');

        $member = User::factory()->create([
            'status' => 'member',
            'approval_status' => 'approved',
        ]);
        $member->assignRole('user');
        Profile::create([
            'user_id' => $member->id,
            'account_status' => 'desactivated',
            'deactivation_reason' => 'Absent',
        ]);

        $reactivationRequest = ReactivationRequest::create([
            'user_id' => $member->id,
            'reason' => 'Je souhaite revenir',
            'status' => 'pending',
        ]);

        $this->actingAs($admin)
            ->post(route('admin.reactivation-requests.approve', $reactivationRequest->id), [
                'review_notes' => 'Dossier repris',
            ])
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertSame('active', $member->fresh()->profile->account_status);
        $this->assertDatabaseHas('user_activities', [
            'user_id' => $member->id,
            'performed_by' => $admin->id,
            'type' => 'status_change',
            'description' => 'Compte activé. Dossier repris',
        ]);
    }

    public function test_reactivating_rejected_prospect_logs_status_change(): void
    {
        $matchmaker = User::factory()->create(['approval_status' => 'approved']);
        $matchmaker->assignRole('matchmaker');

        $prospect = User::factory()->create([
            'status' => 'prospect',
            'assigned_matchmaker_id' => $matchmaker->id,
            'rejection_reason' => 'Hors critères',
            'rejected_by' => $matchmaker->id,
            'rejected_at' => now(),
        ]);
        $prospect->assignRole('user');

        $this->actingAs($matchmaker)
            ->post(route('staff.prospects.accept', $prospect->id), [
                'acceptance_reason' => 'Profil complété',
            ])
            ->assertRedirect()
            ->assertSessionHas('success');

        $prospect->refresh();
        $this->assertNull($prospect->rejection_reason);

        $this->assertDatabaseHas('user_activities', [
            'user_id' => $prospect->id,
            'performed_by' => $matchmaker->id,
            'type' => 'status_change',
            'description' => 'Prospect réactivé. Profil complété',
        ]);
    }
}
