<?php

namespace Tests\Feature;

use App\Http\Controllers\PropositionController;
use App\Models\Proposition;
use App\Models\PropositionRequest;
use App\Models\User;
use App\Models\UserActivity;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class PropositionActiveAndCancelTest extends TestCase
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

    public function test_store_blocked_when_recipient_has_active_pending_proposition(): void
    {
        $mm1 = $this->makeUserWithRole('matchmaker');
        $mm2 = $this->makeUserWithRole('matchmaker');
        $recipient = $this->makeUserWithRole('user', ['assigned_matchmaker_id' => $mm1->id]);
        $other = $this->makeUserWithRole('user');

        Proposition::create([
            'matchmaker_id' => $mm2->id,
            'user_a_id' => $recipient->id,
            'user_b_id' => $other->id,
            'reference_user_id' => $recipient->id,
            'compatible_user_id' => $other->id,
            'recipient_user_id' => $recipient->id,
            'message' => 'Existing',
            'status' => 'pending',
        ]);

        $response = $this->actingAs($mm1)->postJson(route('staff.propositions.store'), [
            'reference_user_id' => $recipient->id,
            'compatible_user_id' => $other->id,
            'message' => 'New proposition text here.',
            'send_to_reference' => true,
            'send_to_compatible' => false,
        ]);

        $response->assertStatus(422)->assertJson([
            'message' => PropositionController::MESSAGE_RECIPIENT_HAS_ACTIVE_PROPOSITION,
        ]);
    }

    public function test_store_succeeds_after_prior_proposition_cancelled(): void
    {
        $mm = $this->makeUserWithRole('matchmaker');
        $recipient = $this->makeUserWithRole('user', ['assigned_matchmaker_id' => $mm->id]);
        $other = $this->makeUserWithRole('user');

        $existing = Proposition::create([
            'matchmaker_id' => $mm->id,
            'user_a_id' => $recipient->id,
            'user_b_id' => $other->id,
            'reference_user_id' => $recipient->id,
            'compatible_user_id' => $other->id,
            'recipient_user_id' => $recipient->id,
            'message' => 'Old',
            'status' => Proposition::STATUS_CANCELLED,
            'cancelled_at' => now(),
        ]);

        $response = $this->actingAs($mm)->postJson(route('staff.propositions.store'), [
            'reference_user_id' => $recipient->id,
            'compatible_user_id' => $other->id,
            'message' => 'New proposition text here.',
            'send_to_reference' => true,
            'send_to_compatible' => false,
        ]);

        $response->assertOk();
        $this->assertGreaterThan($existing->id, Proposition::query()->max('id'));
    }

    public function test_assigned_matchmaker_can_cancel_pending_proposition(): void
    {
        $mm = $this->makeUserWithRole('matchmaker');
        $recipient = $this->makeUserWithRole('user', ['assigned_matchmaker_id' => $mm->id]);
        $other = $this->makeUserWithRole('user');

        $proposition = Proposition::create([
            'matchmaker_id' => $mm->id,
            'user_a_id' => $recipient->id,
            'user_b_id' => $other->id,
            'reference_user_id' => $recipient->id,
            'compatible_user_id' => $other->id,
            'recipient_user_id' => $recipient->id,
            'message' => 'Test',
            'status' => 'pending',
        ]);

        $response = $this->actingAs($mm)->patchJson(route('staff.propositions.cancel', $proposition));

        $response->assertOk()
            ->assertJsonPath('proposition.status', Proposition::STATUS_CANCELLED)
            ->assertJsonPath('pair_was_cancelled', false);
        $response->assertJsonPath('cancelled_proposition_ids', [$proposition->id]);
        $this->assertDatabaseHas('propositions', [
            'id' => $proposition->id,
            'status' => Proposition::STATUS_CANCELLED,
        ]);
        $this->assertNotNull($proposition->fresh()->cancelled_at);
        $this->assertDatabaseHas('user_activities', [
            'user_id' => $recipient->id,
            'type' => UserActivity::TYPE_PROPOSITION_CANCELLED,
        ]);
    }

    public function test_assigned_matchmaker_can_cancel_interested_proposition(): void
    {
        $mm = $this->makeUserWithRole('matchmaker');
        $recipient = $this->makeUserWithRole('user', ['assigned_matchmaker_id' => $mm->id]);
        $other = $this->makeUserWithRole('user');

        $proposition = Proposition::create([
            'matchmaker_id' => $mm->id,
            'user_a_id' => $recipient->id,
            'user_b_id' => $other->id,
            'reference_user_id' => $recipient->id,
            'compatible_user_id' => $other->id,
            'recipient_user_id' => $recipient->id,
            'message' => 'Test',
            'status' => 'interested',
            'responded_at' => now(),
        ]);

        $response = $this->actingAs($mm)->patchJson(route('staff.propositions.cancel', $proposition));

        $response->assertOk()
            ->assertJsonPath('proposition.status', Proposition::STATUS_CANCELLED)
            ->assertJsonPath('pair_was_cancelled', false);
        $this->assertDatabaseHas('user_activities', [
            'user_id' => $recipient->id,
            'type' => UserActivity::TYPE_PROPOSITION_CANCELLED,
        ]);
    }

    public function test_cancel_with_pair_id_cascades_to_sibling_row(): void
    {
        $mm = $this->makeUserWithRole('matchmaker');
        $recipient = $this->makeUserWithRole('user', ['assigned_matchmaker_id' => $mm->id]);
        $other = $this->makeUserWithRole('user', ['assigned_matchmaker_id' => $mm->id]);

        $pairId = (string) Str::uuid();
        $p1 = Proposition::create([
            'matchmaker_id' => $mm->id,
            'pair_id' => $pairId,
            'user_a_id' => $recipient->id,
            'user_b_id' => $other->id,
            'reference_user_id' => $recipient->id,
            'compatible_user_id' => $other->id,
            'recipient_user_id' => $recipient->id,
            'message' => 'Test',
            'status' => 'pending',
        ]);
        $p2 = Proposition::create([
            'matchmaker_id' => $mm->id,
            'pair_id' => $pairId,
            'user_a_id' => $recipient->id,
            'user_b_id' => $other->id,
            'reference_user_id' => $recipient->id,
            'compatible_user_id' => $other->id,
            'recipient_user_id' => $other->id,
            'message' => 'Test',
            'status' => 'pending',
        ]);

        $response = $this->actingAs($mm)->patchJson(route('staff.propositions.cancel', $p1));

        $response->assertOk()
            ->assertJsonPath('pair_was_cancelled', true);
        $ids = $response->json('cancelled_proposition_ids');
        $this->assertEqualsCanonicalizing([$p1->id, $p2->id], $ids);
        $this->assertSame(Proposition::STATUS_CANCELLED, $p1->fresh()->status);
        $this->assertSame(Proposition::STATUS_CANCELLED, $p2->fresh()->status);
    }

    public function test_other_matchmakers_recipient_can_cancel_and_cascade_pair(): void
    {
        $mmSender = $this->makeUserWithRole('matchmaker');
        $mmA = $this->makeUserWithRole('matchmaker');
        $mmB = $this->makeUserWithRole('matchmaker');
        $refUser = $this->makeUserWithRole('user', ['assigned_matchmaker_id' => $mmA->id]);
        $compUser = $this->makeUserWithRole('user', ['assigned_matchmaker_id' => $mmB->id]);

        $pairId = (string) Str::uuid();
        $pRef = Proposition::create([
            'matchmaker_id' => $mmSender->id,
            'pair_id' => $pairId,
            'user_a_id' => $refUser->id,
            'user_b_id' => $compUser->id,
            'reference_user_id' => $refUser->id,
            'compatible_user_id' => $compUser->id,
            'recipient_user_id' => $refUser->id,
            'message' => 'Test',
            'status' => 'pending',
        ]);
        $pComp = Proposition::create([
            'matchmaker_id' => $mmSender->id,
            'pair_id' => $pairId,
            'user_a_id' => $refUser->id,
            'user_b_id' => $compUser->id,
            'reference_user_id' => $refUser->id,
            'compatible_user_id' => $compUser->id,
            'recipient_user_id' => $compUser->id,
            'message' => 'Test',
            'status' => 'pending',
        ]);

        $this->actingAs($mmA)->patchJson(route('staff.propositions.cancel', $pRef))->assertOk()
            ->assertJsonPath('pair_was_cancelled', true);
        $this->assertSame(Proposition::STATUS_CANCELLED, $pRef->fresh()->status);
        $this->assertSame(Proposition::STATUS_CANCELLED, $pComp->fresh()->status);

        $pairId2 = (string) Str::uuid();
        $pRef2 = Proposition::create([
            'matchmaker_id' => $mmSender->id,
            'pair_id' => $pairId2,
            'user_a_id' => $refUser->id,
            'user_b_id' => $compUser->id,
            'reference_user_id' => $refUser->id,
            'compatible_user_id' => $compUser->id,
            'recipient_user_id' => $refUser->id,
            'message' => 'Again',
            'status' => 'pending',
        ]);
        $pComp2 = Proposition::create([
            'matchmaker_id' => $mmSender->id,
            'pair_id' => $pairId2,
            'user_a_id' => $refUser->id,
            'user_b_id' => $compUser->id,
            'reference_user_id' => $refUser->id,
            'compatible_user_id' => $compUser->id,
            'recipient_user_id' => $compUser->id,
            'message' => 'Again',
            'status' => 'pending',
        ]);

        $this->actingAs($mmB)->patchJson(route('staff.propositions.cancel', $pComp2))->assertOk()
            ->assertJsonPath('pair_was_cancelled', true);
        $this->assertSame(Proposition::STATUS_CANCELLED, $pRef2->fresh()->status);
        $this->assertSame(Proposition::STATUS_CANCELLED, $pComp2->fresh()->status);
    }

    public function test_cancel_pair_no_active_sibling_is_noop(): void
    {
        $mm = $this->makeUserWithRole('matchmaker');
        $recipient = $this->makeUserWithRole('user', ['assigned_matchmaker_id' => $mm->id]);
        $other = $this->makeUserWithRole('user', ['assigned_matchmaker_id' => $mm->id]);

        $pairId = (string) Str::uuid();
        Proposition::create([
            'matchmaker_id' => $mm->id,
            'pair_id' => $pairId,
            'user_a_id' => $recipient->id,
            'user_b_id' => $other->id,
            'reference_user_id' => $recipient->id,
            'compatible_user_id' => $other->id,
            'recipient_user_id' => $other->id,
            'message' => 'Test',
            'status' => Proposition::STATUS_CANCELLED,
            'cancelled_at' => now(),
        ]);
        $active = Proposition::create([
            'matchmaker_id' => $mm->id,
            'pair_id' => $pairId,
            'user_a_id' => $recipient->id,
            'user_b_id' => $other->id,
            'reference_user_id' => $recipient->id,
            'compatible_user_id' => $other->id,
            'recipient_user_id' => $recipient->id,
            'message' => 'Test',
            'status' => 'pending',
        ]);

        $response = $this->actingAs($mm)->patchJson(route('staff.propositions.cancel', $active));

        $response->assertOk()->assertJsonPath('pair_was_cancelled', false);
        $this->assertSame(Proposition::STATUS_CANCELLED, $active->fresh()->status);
    }

    public function test_store_dual_recipient_blocked_when_either_profile_has_active_proposition(): void
    {
        $mm = $this->makeUserWithRole('matchmaker');
        $ref = $this->makeUserWithRole('user', ['assigned_matchmaker_id' => $mm->id]);
        $comp = $this->makeUserWithRole('user', ['assigned_matchmaker_id' => $mm->id]);
        $third = $this->makeUserWithRole('user');

        Proposition::create([
            'matchmaker_id' => $mm->id,
            'user_a_id' => $ref->id,
            'user_b_id' => $third->id,
            'reference_user_id' => $ref->id,
            'compatible_user_id' => $third->id,
            'recipient_user_id' => $ref->id,
            'message' => 'Other match',
            'status' => 'pending',
        ]);

        $response = $this->actingAs($mm)->postJson(route('staff.propositions.store'), [
            'reference_user_id' => $ref->id,
            'compatible_user_id' => $comp->id,
            'message' => 'Dual send',
            'send_to_reference' => true,
            'send_to_compatible' => true,
        ]);

        $response->assertStatus(422)->assertJson([
            'message' => PropositionController::MESSAGE_RECIPIENT_HAS_ACTIVE_PROPOSITION,
        ]);
    }

    public function test_unrelated_matchmaker_cannot_cancel(): void
    {
        $assigned = $this->makeUserWithRole('matchmaker');
        $otherMm = $this->makeUserWithRole('matchmaker');
        $recipient = $this->makeUserWithRole('user', ['assigned_matchmaker_id' => $assigned->id]);
        $other = $this->makeUserWithRole('user');

        $proposition = Proposition::create([
            'matchmaker_id' => $assigned->id,
            'user_a_id' => $recipient->id,
            'user_b_id' => $other->id,
            'reference_user_id' => $recipient->id,
            'compatible_user_id' => $other->id,
            'recipient_user_id' => $recipient->id,
            'message' => 'Test',
            'status' => 'pending',
        ]);

        $this->actingAs($otherMm)->patchJson(route('staff.propositions.cancel', $proposition))
            ->assertForbidden();
    }

    public function test_client_cannot_cancel(): void
    {
        $mm = $this->makeUserWithRole('matchmaker');
        $recipient = $this->makeUserWithRole('user', ['assigned_matchmaker_id' => $mm->id]);
        $other = $this->makeUserWithRole('user');

        $proposition = Proposition::create([
            'matchmaker_id' => $mm->id,
            'user_a_id' => $recipient->id,
            'user_b_id' => $other->id,
            'reference_user_id' => $recipient->id,
            'compatible_user_id' => $other->id,
            'recipient_user_id' => $recipient->id,
            'message' => 'Test',
            'status' => 'pending',
        ]);

        $this->actingAs($recipient)->patchJson(route('staff.propositions.cancel', $proposition))
            ->assertForbidden();
    }

    public function test_cannot_cancel_already_cancelled_proposition(): void
    {
        $mm = $this->makeUserWithRole('matchmaker');
        $recipient = $this->makeUserWithRole('user', ['assigned_matchmaker_id' => $mm->id]);
        $other = $this->makeUserWithRole('user');

        $proposition = Proposition::create([
            'matchmaker_id' => $mm->id,
            'user_a_id' => $recipient->id,
            'user_b_id' => $other->id,
            'reference_user_id' => $recipient->id,
            'compatible_user_id' => $other->id,
            'recipient_user_id' => $recipient->id,
            'message' => 'Test',
            'status' => Proposition::STATUS_CANCELLED,
            'cancelled_at' => now(),
        ]);

        $this->actingAs($mm)->patchJson(route('staff.propositions.cancel', $proposition))
            ->assertStatus(422)
            ->assertJson([
                'message' => PropositionController::MESSAGE_CANCEL_INVALID_STATE,
            ]);
    }

    public function test_store_succeeds_after_prior_not_interested_even_when_refusal_is_after_accepted_request(): void
    {
        $mmA = $this->makeUserWithRole('matchmaker');
        $mmB = $this->makeUserWithRole('matchmaker');
        $ref = $this->makeUserWithRole('user', ['assigned_matchmaker_id' => $mmA->id]);
        $comp = $this->makeUserWithRole('user', ['assigned_matchmaker_id' => $mmB->id]);

        PropositionRequest::create([
            'reference_user_id' => $ref->id,
            'compatible_user_id' => $comp->id,
            'from_matchmaker_id' => $mmA->id,
            'to_matchmaker_id' => $mmB->id,
            'message' => 'Please allow',
            'status' => 'accepted',
            'responded_at' => now()->subDays(10),
        ]);

        Proposition::create([
            'matchmaker_id' => $mmA->id,
            'user_a_id' => $ref->id,
            'user_b_id' => $comp->id,
            'reference_user_id' => $ref->id,
            'compatible_user_id' => $comp->id,
            'recipient_user_id' => $comp->id,
            'message' => 'First',
            'status' => 'not_interested',
            'responded_at' => now()->subDay(),
        ]);

        $response = $this->actingAs($mmA)->postJson(route('staff.propositions.store'), [
            'reference_user_id' => $ref->id,
            'compatible_user_id' => $comp->id,
            'message' => 'Second attempt',
            'send_to_reference' => false,
            'send_to_compatible' => true,
        ]);

        $response->assertOk()
            ->assertJsonPath('message', 'Proposition sent.');
    }

    public function test_store_succeeds_after_prior_rejected_status_with_accepted_request(): void
    {
        $mmA = $this->makeUserWithRole('matchmaker');
        $mmB = $this->makeUserWithRole('matchmaker');
        $ref = $this->makeUserWithRole('user', ['assigned_matchmaker_id' => $mmA->id]);
        $comp = $this->makeUserWithRole('user', ['assigned_matchmaker_id' => $mmB->id]);

        PropositionRequest::create([
            'reference_user_id' => $ref->id,
            'compatible_user_id' => $comp->id,
            'from_matchmaker_id' => $mmA->id,
            'to_matchmaker_id' => $mmB->id,
            'message' => 'Please allow',
            'status' => 'accepted',
            'responded_at' => now()->subDays(5),
        ]);

        Proposition::create([
            'matchmaker_id' => $mmA->id,
            'user_a_id' => $ref->id,
            'user_b_id' => $comp->id,
            'reference_user_id' => $ref->id,
            'compatible_user_id' => $comp->id,
            'recipient_user_id' => $comp->id,
            'message' => 'First',
            'status' => 'rejected',
            'responded_at' => now()->subHours(2),
        ]);

        $response = $this->actingAs($mmA)->postJson(route('staff.propositions.store'), [
            'reference_user_id' => $ref->id,
            'compatible_user_id' => $comp->id,
            'message' => 'Retry',
            'send_to_reference' => false,
            'send_to_compatible' => true,
        ]);

        $response->assertOk()
            ->assertJsonPath('message', 'Proposition sent.');
    }

    public function test_store_blocked_when_recipient_has_active_interested_proposition(): void
    {
        $mmA = $this->makeUserWithRole('matchmaker');
        $mmB = $this->makeUserWithRole('matchmaker');
        $ref = $this->makeUserWithRole('user', ['assigned_matchmaker_id' => $mmA->id]);
        $comp = $this->makeUserWithRole('user', ['assigned_matchmaker_id' => $mmB->id]);

        PropositionRequest::create([
            'reference_user_id' => $ref->id,
            'compatible_user_id' => $comp->id,
            'from_matchmaker_id' => $mmA->id,
            'to_matchmaker_id' => $mmB->id,
            'message' => 'Please allow',
            'status' => 'accepted',
            'responded_at' => now(),
        ]);

        Proposition::create([
            'matchmaker_id' => $mmB->id,
            'user_a_id' => $comp->id,
            'user_b_id' => $ref->id,
            'reference_user_id' => $comp->id,
            'compatible_user_id' => $ref->id,
            'recipient_user_id' => $comp->id,
            'message' => 'Other pair',
            'status' => 'interested',
            'responded_at' => now(),
        ]);

        $this->actingAs($mmA)->postJson(route('staff.propositions.store'), [
            'reference_user_id' => $ref->id,
            'compatible_user_id' => $comp->id,
            'message' => 'Should fail',
            'send_to_reference' => false,
            'send_to_compatible' => true,
        ])
            ->assertStatus(422)
            ->assertJson([
                'message' => PropositionController::MESSAGE_RECIPIENT_HAS_ACTIVE_PROPOSITION,
            ]);
    }

    public function test_send_to_other_succeeds_after_prior_refusal_on_same_recipient(): void
    {
        $mmA = $this->makeUserWithRole('matchmaker');
        $mmB = $this->makeUserWithRole('matchmaker');
        $ref = $this->makeUserWithRole('user', ['assigned_matchmaker_id' => $mmA->id]);
        $comp = $this->makeUserWithRole('user', ['assigned_matchmaker_id' => $mmB->id]);

        PropositionRequest::create([
            'reference_user_id' => $ref->id,
            'compatible_user_id' => $comp->id,
            'from_matchmaker_id' => $mmA->id,
            'to_matchmaker_id' => $mmB->id,
            'message' => 'Please allow',
            'status' => 'accepted',
            'responded_at' => now()->subWeek(),
        ]);

        Proposition::create([
            'matchmaker_id' => $mmA->id,
            'user_a_id' => $ref->id,
            'user_b_id' => $comp->id,
            'reference_user_id' => $ref->id,
            'compatible_user_id' => $comp->id,
            'recipient_user_id' => $comp->id,
            'message' => 'Prior',
            'status' => 'not_interested',
            'responded_at' => now()->subDay(),
        ]);

        $response = $this->actingAs($mmA)->postJson(route('staff.propositions.send-to-other'), [
            'reference_user_id' => $ref->id,
            'compatible_user_id' => $comp->id,
            'recipient_user_id' => $comp->id,
            'message' => 'Staged retry',
        ]);

        $response->assertOk()
            ->assertJsonPath('message', 'Proposition sent.');
        $this->assertDatabaseHas('propositions', [
            'matchmaker_id' => $mmA->id,
            'reference_user_id' => $ref->id,
            'compatible_user_id' => $comp->id,
            'recipient_user_id' => $comp->id,
            'status' => 'pending',
        ]);
    }

    public function test_staff_propositions_list_includes_can_cancel_and_is_active(): void
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
            'message' => 'Pending',
            'status' => 'pending',
        ]);

        $response = $this->actingAs($assignedMatchmaker)->get('/staff/matchmaker/propositions', [
            'X-Inertia' => 'true',
            'X-Requested-With' => 'XMLHttpRequest',
        ]);

        $response->assertOk();
        $response->assertJsonPath('props.propositions.0.is_active', true);
        $response->assertJsonPath('props.propositions.0.can_cancel', true);
    }
}
