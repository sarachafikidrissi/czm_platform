<?php

namespace Tests\Feature;

use App\Models\Agency;
use App\Models\MatrimonialPack;
use App\Models\Profile;
use App\Models\User;
use App\Models\UserActivity;
use App\Models\UserAssignment;
use App\Models\UserSubscription;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AccountActivationReassignmentTest extends TestCase
{

    private Agency $agency;

    private User $originalMatchmaker;

    private User $activatingMatchmaker;

    private User $member;

    private MatrimonialPack $pack;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['admin', 'manager', 'matchmaker', 'user'] as $role) {
            Role::findOrCreate($role, 'web');
        }

        $this->agency = Agency::create([
            'name' => 'Agence Test',
            'country' => 'MA',
            'city' => 'Casablanca',
            'address' => '1 Rue Test',
        ]);

        $this->originalMatchmaker = User::factory()->create([
            'approval_status' => 'approved',
            'agency_id' => $this->agency->id,
        ]);
        $this->originalMatchmaker->assignRole('matchmaker');

        $this->activatingMatchmaker = User::factory()->create([
            'approval_status' => 'approved',
            'agency_id' => $this->agency->id,
        ]);
        $this->activatingMatchmaker->assignRole('matchmaker');

        $this->member = User::factory()->create([
            'username' => 'member-test-user',
            'status' => 'member',
            'assigned_matchmaker_id' => $this->originalMatchmaker->id,
            'agency_id' => $this->agency->id,
        ]);
        $this->member->assignRole('user');

        $this->pack = MatrimonialPack::create([
            'name' => 'Pack Test',
            'duration' => 6,
        ]);

        Profile::create([
            'user_id' => $this->member->id,
            'account_status' => 'desactivated',
            'deactivation_reason' => 'Test deactivation',
        ]);
    }

    public function test_search_includes_desactivated_account_status(): void
    {
        $this->actingAs($this->activatingMatchmaker)
            ->getJson(route('staff.search', ['q' => $this->member->name]))
            ->assertOk()
            ->assertJsonFragment([
                'id' => $this->member->id,
                'account_status' => 'desactivated',
            ]);
    }

    public function test_non_assigned_matchmaker_can_activate_and_reassign_member(): void
    {
        $subscription = UserSubscription::create([
            'user_id' => $this->member->id,
            'matrimonial_pack_id' => $this->pack->id,
            'assigned_matchmaker_id' => $this->originalMatchmaker->id,
            'subscription_start' => now()->toDateString(),
            'subscription_end' => now()->addMonths(6)->toDateString(),
            'duration_months' => 6,
            'pack_price' => 1000,
            'pack_advantages' => ['Support'],
            'payment_mode' => 'Virement',
            'status' => 'active',
        ]);

        $this->actingAs($this->activatingMatchmaker)
            ->post(route('staff.users.activate', $this->member->id), [
                'reason' => 'Reprise du dossier',
            ])
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->member->refresh();
        $this->assertSame('active', $this->member->profile->account_status);
        $this->assertSame($this->activatingMatchmaker->id, $this->member->assigned_matchmaker_id);
        $this->assertSame($this->agency->id, $this->member->agency_id);

        $subscription->refresh();
        $this->assertSame($this->activatingMatchmaker->id, $subscription->assigned_matchmaker_id);

        $this->assertDatabaseHas('user_assignments', [
            'user_id' => $this->member->id,
            'matchmaker_id' => $this->activatingMatchmaker->id,
            'reason' => 'activation_reassign',
            'unassigned_at' => null,
        ]);
    }

    public function test_activation_logs_status_change_and_matchmaker_reassignment_in_activity_history(): void
    {
        $this->actingAs($this->activatingMatchmaker)
            ->post(route('staff.users.activate', $this->member->id), [
                'reason' => 'Reprise du dossier',
            ])
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertDatabaseHas('user_activities', [
            'user_id' => $this->member->id,
            'performed_by' => $this->activatingMatchmaker->id,
            'type' => 'status_change',
            'description' => 'Compte activé. Reprise du dossier',
        ]);

        $this->assertDatabaseHas('user_activities', [
            'user_id' => $this->member->id,
            'performed_by' => $this->activatingMatchmaker->id,
            'type' => 'matchmaker_assigned',
            'description' => "Membre réassigné à {$this->activatingMatchmaker->name} (activation).",
        ]);

        $reassignmentActivity = UserActivity::where('user_id', $this->member->id)
            ->where('type', 'matchmaker_assigned')
            ->first();

        $this->assertSame($this->originalMatchmaker->id, $reassignmentActivity->metadata['previous_matchmaker_id']);
        $this->assertSame($this->activatingMatchmaker->id, $reassignmentActivity->metadata['new_matchmaker_id']);
        $this->assertSame($this->agency->id, $reassignmentActivity->metadata['agency_id']);
    }

    public function test_manager_assigned_via_activation_gets_write_access_on_profile(): void
    {
        $manager = User::factory()->create([
            'approval_status' => 'approved',
            'agency_id' => $this->agency->id,
        ]);
        $manager->assignRole('manager');

        $this->actingAs($manager)
            ->post(route('staff.users.activate', $this->member->id), [
                'reason' => 'Reprise manager',
            ])
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->member->refresh();
        $this->assertSame($manager->id, $this->member->assigned_matchmaker_id);

        $this->actingAs($manager)
            ->get(route('profile.show', $this->member->username))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('user/profile')
                ->where('evaluationAccessLevel', 'write')
                ->where('user.assigned_matchmaker_id', $manager->id)
            );
    }

    public function test_matchmaker_cannot_activate_already_active_member(): void
    {
        Profile::where('user_id', $this->member->id)->update([
            'account_status' => 'active',
        ]);

        $subscription = UserSubscription::create([
            'user_id' => $this->member->id,
            'matrimonial_pack_id' => $this->pack->id,
            'assigned_matchmaker_id' => $this->originalMatchmaker->id,
            'subscription_start' => now()->toDateString(),
            'subscription_end' => now()->addMonths(6)->toDateString(),
            'duration_months' => 6,
            'pack_price' => 1000,
            'pack_advantages' => ['Support'],
            'payment_mode' => 'Virement',
            'status' => 'active',
        ]);

        $this->actingAs($this->activatingMatchmaker)
            ->from(route('profile.show', $this->member->username))
            ->post(route('staff.users.activate', $this->member->id), [
                'reason' => 'Should not reassign an active account',
            ])
            ->assertRedirect(route('profile.show', $this->member->username))
            ->assertSessionHas('error');

        $this->member->refresh();
        $this->assertSame('active', $this->member->profile->account_status);
        $this->assertSame($this->originalMatchmaker->id, $this->member->assigned_matchmaker_id);

        $subscription->refresh();
        $this->assertSame($this->originalMatchmaker->id, $subscription->assigned_matchmaker_id);

        $this->assertDatabaseMissing('user_assignments', [
            'user_id' => $this->member->id,
            'reason' => 'activation_reassign',
        ]);

        $this->assertDatabaseMissing('user_activities', [
            'user_id' => $this->member->id,
            'type' => 'status_change',
        ]);

        $this->assertDatabaseMissing('user_activities', [
            'user_id' => $this->member->id,
            'type' => 'matchmaker_assigned',
        ]);
    }

    public function test_search_staff_includes_account_status_without_missing_profile(): void
    {
        $this->activatingMatchmaker->profile()->create([
            'account_status' => 'active',
        ]);

        $this->actingAs($this->activatingMatchmaker)
            ->getJson(route('staff.search', ['q' => $this->activatingMatchmaker->name]))
            ->assertOk()
            ->assertJsonFragment([
                'id' => $this->activatingMatchmaker->id,
                'account_status' => 'active',
            ]);
    }

    public function test_assigned_matchmaker_can_deactivate_member_without_profile(): void
    {
        $memberWithoutProfile = User::factory()->create([
            'status' => 'member',
            'assigned_matchmaker_id' => $this->originalMatchmaker->id,
            'agency_id' => $this->agency->id,
        ]);
        $memberWithoutProfile->assignRole('user');

        $this->assertDatabaseMissing('profiles', [
            'user_id' => $memberWithoutProfile->id,
        ]);

        $this->actingAs($this->originalMatchmaker)
            ->post(route('staff.users.deactivate', $memberWithoutProfile->id), [
                'reason' => 'Absent',
            ])
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertDatabaseHas('profiles', [
            'user_id' => $memberWithoutProfile->id,
            'account_status' => 'desactivated',
            'deactivation_reason' => 'Absent',
        ]);
    }

    public function test_non_assigned_matchmaker_cannot_deactivate_member(): void
    {
        Profile::where('user_id', $this->member->id)->update([
            'account_status' => 'active',
        ]);

        $this->actingAs($this->activatingMatchmaker)
            ->post(route('staff.users.deactivate', $this->member->id), [
                'reason' => 'Should fail',
            ])
            ->assertForbidden();

        $this->assertDatabaseHas('profiles', [
            'user_id' => $this->member->id,
            'account_status' => 'active',
        ]);
    }
}
