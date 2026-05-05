<?php

namespace Tests\Feature;

use App\Models\Proposition;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class PropositionPairSyncRespondTest extends TestCase
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

    /**
     * @return array{0: User, 1: User, 2: User, 3: Proposition, 4: Proposition, 5: string}
     */
    protected function createPairedPropositions(): array
    {
        $mm = $this->makeUserWithRole('matchmaker');
        $ref = $this->makeUserWithRole('user', ['assigned_matchmaker_id' => $mm->id]);
        $comp = $this->makeUserWithRole('user', ['assigned_matchmaker_id' => $mm->id]);
        $pairId = (string) Str::uuid();

        $pRef = Proposition::create([
            'matchmaker_id' => $mm->id,
            'pair_id' => $pairId,
            'user_a_id' => $ref->id,
            'user_b_id' => $comp->id,
            'reference_user_id' => $ref->id,
            'compatible_user_id' => $comp->id,
            'recipient_user_id' => $ref->id,
            'message' => 'Hello both',
            'status' => 'pending',
        ]);

        $pComp = Proposition::create([
            'matchmaker_id' => $mm->id,
            'pair_id' => $pairId,
            'user_a_id' => $ref->id,
            'user_b_id' => $comp->id,
            'reference_user_id' => $ref->id,
            'compatible_user_id' => $comp->id,
            'recipient_user_id' => $comp->id,
            'message' => 'Hello both',
            'status' => 'pending',
        ]);

        return [$mm, $ref, $comp, $pRef, $pComp, $pairId];
    }

    public function test_first_recipient_accept_keeps_both_rows_pending_until_second_accepts(): void
    {
        [, $ref, $comp, $pRef, $pComp] = $this->createPairedPropositions();

        $this->actingAs($ref)->postJson(route('propositions.respond', $pRef), [
            'status' => 'accepted',
        ])->assertOk()->assertJsonPath('status', 'pending');

        $pRef->refresh();
        $pComp->refresh();

        $this->assertSame('pending', $pRef->status);
        $this->assertSame('pending', $pComp->status);
        $this->assertSame('interested', $pRef->user_response);
        $this->assertNull($pComp->user_response);
        $this->assertNotNull($pRef->responded_at);
        $this->assertNull($pComp->responded_at);
    }

    public function test_second_recipient_accept_sets_both_rows_interested(): void
    {
        [, $ref, $comp, $pRef, $pComp] = $this->createPairedPropositions();

        $this->actingAs($ref)->postJson(route('propositions.respond', $pRef), [
            'status' => 'accepted',
        ])->assertOk();

        $this->actingAs($comp)->postJson(route('propositions.respond', $pComp), [
            'status' => 'accepted',
        ])->assertOk()->assertJsonPath('status', 'interested');

        $pRef->refresh();
        $pComp->refresh();

        $this->assertSame('interested', $pRef->status);
        $this->assertSame('interested', $pComp->status);
        $this->assertSame('interested', $pRef->user_response);
        $this->assertSame('interested', $pComp->user_response);
    }

    public function test_one_reject_sets_both_rows_not_interested(): void
    {
        [, $ref, , $pRef, $pComp] = $this->createPairedPropositions();

        $this->actingAs($ref)->postJson(route('propositions.respond', $pRef), [
            'status' => 'rejected',
            'response_message' => 'No thanks',
        ])->assertOk()->assertJsonPath('status', 'not_interested');

        $pRef->refresh();
        $pComp->refresh();

        $this->assertSame('not_interested', $pRef->status);
        $this->assertSame('not_interested', $pComp->status);
        $this->assertSame('not_interested', $pRef->user_response);
        $this->assertNull($pComp->user_response);
    }

    public function test_mixed_accept_then_reject_sets_both_not_interested(): void
    {
        [, $ref, $comp, $pRef, $pComp] = $this->createPairedPropositions();

        $this->actingAs($ref)->postJson(route('propositions.respond', $pRef), [
            'status' => 'accepted',
        ])->assertOk();

        $this->actingAs($comp)->postJson(route('propositions.respond', $pComp), [
            'status' => 'rejected',
            'response_message' => 'Not for me',
        ])->assertOk()->assertJsonPath('status', 'not_interested');

        $pRef->refresh();
        $pComp->refresh();

        $this->assertSame('not_interested', $pRef->status);
        $this->assertSame('not_interested', $pComp->status);
        $this->assertSame('interested', $pRef->user_response);
        $this->assertSame('not_interested', $pComp->user_response);
    }
}
