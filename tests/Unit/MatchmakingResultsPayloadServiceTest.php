<?php

namespace Tests\Unit;

use App\Models\Profile;
use App\Models\Proposition;
use App\Models\PropositionRequest;
use App\Models\User;
use App\Services\MatchmakingResultsPayloadService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class MatchmakingResultsPayloadServiceTest extends TestCase
{
    use RefreshDatabase;

    protected function makeMatchmaker(): User
    {
        Role::findOrCreate('matchmaker', 'web');
        $mm = User::factory()->create([
            'email_verified_at' => now(),
            'approval_status' => 'approved',
        ]);
        $mm->assignRole('matchmaker');

        return $mm;
    }

    protected function makeClientFor(User $mm): User
    {
        Role::findOrCreate('user', 'web');
        $user = User::factory()->create([
            'assigned_matchmaker_id' => $mm->id,
            'gender' => 'male',
            'status' => 'client',
            'email_verified_at' => now(),
            'approval_status' => 'approved',
        ]);
        $user->assignRole('user');
        Profile::query()->create([
            'user_id' => $user->id,
            'is_completed' => true,
            'account_status' => 'active',
            'current_step' => 1,
        ]);
        $user->load('profile');

        return $user;
    }

    public function test_format_includes_action_fields_and_can_cancel_when_recipient_is_assigned_to_actor(): void
    {
        $mmA = $this->makeMatchmaker();
        $mmB = $this->makeMatchmaker();
        $ref = $this->makeClientFor($mmA);
        $comp = $this->makeClientFor($mmB);

        $comp->load('assignedMatchmaker');

        PropositionRequest::create([
            'reference_user_id' => $ref->id,
            'compatible_user_id' => $comp->id,
            'from_matchmaker_id' => $mmA->id,
            'to_matchmaker_id' => $mmB->id,
            'message' => 'ok',
            'status' => 'accepted',
            'responded_at' => now(),
        ]);

        $pendingToComp = Proposition::create([
            'matchmaker_id' => $mmA->id,
            'user_a_id' => $ref->id,
            'user_b_id' => $comp->id,
            'reference_user_id' => $ref->id,
            'compatible_user_id' => $comp->id,
            'recipient_user_id' => $comp->id,
            'message' => 'hello',
            'status' => 'pending',
        ]);

        $matches = [[
            'user' => $comp,
            'profile' => $comp->profile,
            'score' => 80.5,
            'scoreDetails' => [],
            'completeness' => 90,
        ]];

        $rows = MatchmakingResultsPayloadService::formatMatchesForMatchmaker($matches, $mmB, $ref->id);

        $this->assertCount(1, $rows);
        $row = $rows[0];
        $this->assertTrue($row['isAssignedToMe']);
        $this->assertSame('accepted', $row['proposition_request_status']);
        $this->assertTrue($row['can_propose_from_request']);
        $this->assertTrue($row['has_active_proposition']);
        $this->assertTrue($row['can_cancel']);
        $this->assertSame($pendingToComp->id, $row['cancellable_proposition']['id']);
        $this->assertSame($pendingToComp->id, $row['pending_response_proposition']['id']);
        $this->assertIsArray($row['proposition']);
        $this->assertTrue($row['proposition']['exists']);
        $this->assertSame($pendingToComp->id, $row['proposition']['proposition_id']);
    }

    public function test_format_sets_can_cancel_false_when_actor_is_not_assigned_to_any_party(): void
    {
        $mmA = $this->makeMatchmaker();
        $mmB = $this->makeMatchmaker();
        $mmC = $this->makeMatchmaker();
        $ref = $this->makeClientFor($mmA);
        $comp = $this->makeClientFor($mmB);
        $comp->load('assignedMatchmaker');

        Proposition::create([
            'matchmaker_id' => $mmA->id,
            'user_a_id' => $ref->id,
            'user_b_id' => $comp->id,
            'reference_user_id' => $ref->id,
            'compatible_user_id' => $comp->id,
            'recipient_user_id' => $comp->id,
            'message' => 'hello',
            'status' => 'pending',
        ]);

        $matches = [[
            'user' => $comp,
            'profile' => $comp->profile,
            'score' => 70,
            'scoreDetails' => [],
            'completeness' => 80,
        ]];

        $rows = MatchmakingResultsPayloadService::formatMatchesForMatchmaker($matches, $mmC, $ref->id);
        $this->assertFalse($rows[0]['can_cancel']);
        $this->assertNull($rows[0]['cancellable_proposition']);
        $this->assertNull($rows[0]['pending_response_proposition']);
    }
}
