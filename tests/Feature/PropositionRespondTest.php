<?php

namespace Tests\Feature;

use App\Models\Proposition;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class PropositionRespondTest extends TestCase
{
    use RefreshDatabase;

    protected function makeUserWithRole(string $role, array $overrides = []): User
    {
        Role::findOrCreate($role, 'web');

        $defaults = [
            'name' => fake()->unique()->name(),
            'email' => fake()->unique()->safeEmail(),
            'phone' => '0600000000',
            'password' => 'password',
            'email_verified_at' => now(),
            'approval_status' => 'approved',
            'status' => 'client',
            'condition' => true,
        ];

        $user = User::factory()->create(array_merge($defaults, $overrides));
        $user->assignRole($role);

        return $user;
    }

    public function test_assigned_matchmaker_can_update_an_already_answered_proposition(): void
    {
        $assignedMatchmaker = $this->makeUserWithRole('matchmaker');
        $recipient = $this->makeUserWithRole('user', [
            'assigned_matchmaker_id' => $assignedMatchmaker->id,
        ]);
        $otherUser = $this->makeUserWithRole('user');

        $proposition = Proposition::create([
            'matchmaker_id' => $assignedMatchmaker->id,
            'user_a_id' => $recipient->id,
            'user_b_id' => $otherUser->id,
            'reference_user_id' => $recipient->id,
            'compatible_user_id' => $otherUser->id,
            'recipient_user_id' => $recipient->id,
            'message' => 'Initial proposition',
            'status' => 'interested',
            'response_message' => 'Initial answer',
            'responded_at' => now()->subDay(),
        ]);

        $response = $this->actingAs($assignedMatchmaker)->post(route('propositions.respond', $proposition), [
            'status' => 'rejected',
            'response_message' => 'Updated by matchmaker',
        ]);

        $response->assertOk()->assertJson([
            'message' => 'Response saved.',
            'status' => 'not_interested',
        ]);

        $this->assertDatabaseHas('propositions', [
            'id' => $proposition->id,
            'status' => 'not_interested',
            'response_message' => 'Updated by matchmaker',
        ]);
    }

    public function test_recipient_cannot_update_an_already_answered_proposition(): void
    {
        $assignedMatchmaker = $this->makeUserWithRole('matchmaker');
        $recipient = $this->makeUserWithRole('user', [
            'assigned_matchmaker_id' => $assignedMatchmaker->id,
        ]);
        $otherUser = $this->makeUserWithRole('user');

        $proposition = Proposition::create([
            'matchmaker_id' => $assignedMatchmaker->id,
            'user_a_id' => $recipient->id,
            'user_b_id' => $otherUser->id,
            'reference_user_id' => $recipient->id,
            'compatible_user_id' => $otherUser->id,
            'recipient_user_id' => $recipient->id,
            'message' => 'Initial proposition',
            'status' => 'interested',
            'response_message' => 'Already answered',
            'responded_at' => now()->subDay(),
        ]);

        $response = $this->actingAs($recipient)->post(route('propositions.respond', $proposition), [
            'status' => 'rejected',
            'response_message' => 'Should not be allowed',
        ]);

        $response->assertStatus(422)->assertJson([
            'message' => 'Proposition already responded.',
        ]);
    }

    public function test_unrelated_matchmaker_cannot_update_proposition_response(): void
    {
        $assignedMatchmaker = $this->makeUserWithRole('matchmaker');
        $unrelatedMatchmaker = $this->makeUserWithRole('matchmaker');
        $recipient = $this->makeUserWithRole('user', [
            'assigned_matchmaker_id' => $assignedMatchmaker->id,
        ]);
        $otherUser = $this->makeUserWithRole('user');

        $proposition = Proposition::create([
            'matchmaker_id' => $assignedMatchmaker->id,
            'user_a_id' => $recipient->id,
            'user_b_id' => $otherUser->id,
            'reference_user_id' => $recipient->id,
            'compatible_user_id' => $otherUser->id,
            'recipient_user_id' => $recipient->id,
            'message' => 'Initial proposition',
            'status' => 'not_interested',
            'response_message' => 'Already answered',
            'responded_at' => now()->subDay(),
        ]);

        $response = $this->actingAs($unrelatedMatchmaker)->post(route('propositions.respond', $proposition), [
            'status' => 'accepted',
        ]);

        $response->assertForbidden();
    }

    public function test_propositions_list_exposes_can_update_response_for_assigned_matchmaker(): void
    {
        $assignedMatchmaker = $this->makeUserWithRole('matchmaker');
        $recipient = $this->makeUserWithRole('user', [
            'assigned_matchmaker_id' => $assignedMatchmaker->id,
        ]);
        $otherUser = $this->makeUserWithRole('user');

        Proposition::create([
            'matchmaker_id' => $assignedMatchmaker->id,
            'user_a_id' => $recipient->id,
            'user_b_id' => $otherUser->id,
            'reference_user_id' => $recipient->id,
            'compatible_user_id' => $otherUser->id,
            'recipient_user_id' => $recipient->id,
            'message' => 'Initial proposition',
            'status' => 'interested',
            'response_message' => 'Already answered',
            'responded_at' => now()->subDay(),
        ]);

        $response = $this->actingAs($assignedMatchmaker)->get('/staff/matchmaker/propositions', [
            'X-Inertia' => 'true',
            'X-Requested-With' => 'XMLHttpRequest',
        ]);

        $response->assertOk();
        $response->assertJsonPath('props.propositions.0.can_update_response', true);
    }

    public function test_assigned_matchmaker_sees_proposition_created_by_another_matchmaker(): void
    {
        $assignedMatchmaker = $this->makeUserWithRole('matchmaker');
        $authorMatchmaker = $this->makeUserWithRole('matchmaker');
        $recipient = $this->makeUserWithRole('user', [
            'assigned_matchmaker_id' => $assignedMatchmaker->id,
        ]);
        $otherUser = $this->makeUserWithRole('user');

        $proposition = Proposition::create([
            'matchmaker_id' => $authorMatchmaker->id,
            'user_a_id' => $recipient->id,
            'user_b_id' => $otherUser->id,
            'reference_user_id' => $recipient->id,
            'compatible_user_id' => $otherUser->id,
            'recipient_user_id' => $recipient->id,
            'message' => 'Created by another matchmaker',
            'status' => 'interested',
            'response_message' => 'Already answered',
            'responded_at' => now()->subDay(),
        ]);

        $response = $this->actingAs($assignedMatchmaker)->get('/staff/matchmaker/propositions', [
            'X-Inertia' => 'true',
            'X-Requested-With' => 'XMLHttpRequest',
        ]);

        $response->assertOk();
        $response->assertJsonPath('props.propositions.0.id', $proposition->id);
        $response->assertJsonPath('props.propositions.0.can_update_response', true);
    }
}
