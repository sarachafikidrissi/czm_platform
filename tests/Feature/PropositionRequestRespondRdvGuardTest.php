<?php

namespace Tests\Feature;

use App\Http\Controllers\PropositionRequestController;
use App\Models\PropositionRequest;
use App\Models\Rdv;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class PropositionRequestRespondRdvGuardTest extends TestCase
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

    public function test_accept_blocked_when_assigned_profile_has_en_cours_rdv(): void
    {
        $mmSender = $this->makeUserWithRole('matchmaker');
        $mmReceiver = $this->makeUserWithRole('matchmaker');
        $referenceUser = $this->makeUserWithRole('user', ['assigned_matchmaker_id' => $mmSender->id]);
        $compatibleUser = $this->makeUserWithRole('user', ['assigned_matchmaker_id' => $mmReceiver->id]);
        $other = $this->makeUserWithRole('user');

        Rdv::create([
            'matchmaker_id' => $mmReceiver->id,
            'reference_user_id' => $other->id,
            'compatible_user_id' => $compatibleUser->id,
            'proposition_id' => null,
            'regle' => 'test',
            'message' => null,
            'share_phone' => false,
            'status' => Rdv::STATUS_EN_COURS,
        ]);

        $request = PropositionRequest::create([
            'reference_user_id' => $referenceUser->id,
            'compatible_user_id' => $compatibleUser->id,
            'from_matchmaker_id' => $mmSender->id,
            'to_matchmaker_id' => $mmReceiver->id,
            'message' => 'Please accept',
            'status' => 'pending',
        ]);

        $response = $this->actingAs($mmReceiver)->postJson(route('staff.proposition-requests.respond', $request), [
            'status' => 'accepted',
            'organizer' => 'vous',
            'share_phone' => false,
            'response_message' => null,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['accept']);

        $this->assertSame(
            PropositionRequestController::MESSAGE_ACCEPT_BLOCKED_RDV_IN_PROGRESS,
            $response->json('errors.accept.0')
        );

        $this->assertDatabaseHas('proposition_requests', [
            'id' => $request->id,
            'status' => 'pending',
        ]);
    }

    public function test_accept_succeeds_when_no_en_cours_rdv_on_assigned_profile(): void
    {
        $mmSender = $this->makeUserWithRole('matchmaker');
        $mmReceiver = $this->makeUserWithRole('matchmaker');
        $referenceUser = $this->makeUserWithRole('user', ['assigned_matchmaker_id' => $mmSender->id]);
        $compatibleUser = $this->makeUserWithRole('user', ['assigned_matchmaker_id' => $mmReceiver->id]);

        $request = PropositionRequest::create([
            'reference_user_id' => $referenceUser->id,
            'compatible_user_id' => $compatibleUser->id,
            'from_matchmaker_id' => $mmSender->id,
            'to_matchmaker_id' => $mmReceiver->id,
            'message' => 'Please accept',
            'status' => 'pending',
        ]);

        $response = $this->actingAs($mmReceiver)->post(route('staff.proposition-requests.respond', $request), [
            'status' => 'accepted',
            'organizer' => 'vous',
            'share_phone' => false,
            'response_message' => null,
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('proposition_requests', [
            'id' => $request->id,
            'status' => 'accepted',
        ]);
    }

    public function test_reject_succeeds_when_assigned_profile_has_en_cours_rdv(): void
    {
        $mmSender = $this->makeUserWithRole('matchmaker');
        $mmReceiver = $this->makeUserWithRole('matchmaker');
        $referenceUser = $this->makeUserWithRole('user', ['assigned_matchmaker_id' => $mmSender->id]);
        $compatibleUser = $this->makeUserWithRole('user', ['assigned_matchmaker_id' => $mmReceiver->id]);
        $other = $this->makeUserWithRole('user');

        Rdv::create([
            'matchmaker_id' => $mmReceiver->id,
            'reference_user_id' => $other->id,
            'compatible_user_id' => $compatibleUser->id,
            'proposition_id' => null,
            'regle' => 'test',
            'message' => null,
            'share_phone' => false,
            'status' => Rdv::STATUS_EN_COURS,
        ]);

        $request = PropositionRequest::create([
            'reference_user_id' => $referenceUser->id,
            'compatible_user_id' => $compatibleUser->id,
            'from_matchmaker_id' => $mmSender->id,
            'to_matchmaker_id' => $mmReceiver->id,
            'message' => 'Please accept',
            'status' => 'pending',
        ]);

        $response = $this->actingAs($mmReceiver)->post(route('staff.proposition-requests.respond', $request), [
            'status' => 'rejected',
            'rejection_reason' => 'Not available',
            'share_phone' => false,
            'response_message' => null,
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('proposition_requests', [
            'id' => $request->id,
            'status' => 'rejected',
        ]);
    }
}
