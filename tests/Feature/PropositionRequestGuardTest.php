<?php

namespace Tests\Feature;

use App\Models\Profile;
use App\Models\Proposition;
use App\Models\PropositionRequest;
use App\Models\Rdv;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use RuntimeException;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * A proposition request cannot be sent while the profiles are engaged (active proposition, RDV)
 * or while the matchmaker already has an open request for that profile; accepting a request
 * is refused while either profile has an active proposition.
 */
class PropositionRequestGuardTest extends TestCase
{
    use RefreshDatabase;

    private User $matchmakerA;

    private User $matchmakerB;

    private User $myMember;

    private User $myOtherMember;

    private User $theirMember;

    protected function beforeRefreshingDatabase()
    {
        $connection = config('database.default');
        if ($connection !== 'sqlite' || config("database.connections.{$connection}.database") !== ':memory:') {
            throw new RuntimeException('PropositionRequestGuardTest only runs on the in-memory SQLite database.');
        }
    }

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['admin', 'manager', 'matchmaker', 'user'] as $role) {
            Role::findOrCreate($role, 'web');
        }

        $this->matchmakerA = $this->staff();
        $this->matchmakerB = $this->staff();
        $this->myMember = $this->member($this->matchmakerA, 'male');
        $this->myOtherMember = $this->member($this->matchmakerA, 'male');
        $this->theirMember = $this->member($this->matchmakerB, 'female');
    }

    private function staff(): User
    {
        $user = User::factory()->create(['approval_status' => 'approved']);
        $user->assignRole('matchmaker');

        return $user;
    }

    private function member(User $matchmaker, string $gender): User
    {
        $user = User::factory()->create([
            'status' => 'member',
            'gender' => $gender,
            'assigned_matchmaker_id' => $matchmaker->id,
        ]);
        $user->assignRole('user');
        Profile::create(['user_id' => $user->id, 'account_status' => 'active'])
            ->forceFill(['is_completed' => true])->save();

        return $user;
    }

    private function sendRequest(User $reference, User $compatible)
    {
        return $this->actingAs($this->matchmakerA)->postJson(route('staff.proposition-requests.store'), [
            'reference_user_id' => $reference->id,
            'compatible_user_id' => $compatible->id,
            'message' => 'Bonjour',
        ]);
    }

    private function activeProposition(User $reference, User $compatible, string $status = 'interested'): Proposition
    {
        return Proposition::create([
            'matchmaker_id' => $this->matchmakerA->id,
            'reference_user_id' => $reference->id,
            'compatible_user_id' => $compatible->id,
            'recipient_user_id' => $compatible->id,
            'user_a_id' => $reference->id,
            'user_b_id' => $compatible->id,
            'message' => 'Proposition',
            'status' => $status,
        ]);
    }

    public function test_reported_scenario_request_accepted_proposition_accepted_then_new_requests_are_refused(): void
    {
        // 1. Request sent, then accepted by the other matchmaker.
        $this->sendRequest($this->myMember, $this->theirMember)->assertOk();
        $request = PropositionRequest::firstOrFail();
        $request->update(['status' => 'accepted', 'responded_at' => now()->subMinute()]);

        // Accepted but proposition not sent yet: still an open request for that profile.
        $this->sendRequest($this->myOtherMember, $this->theirMember)
            ->assertStatus(422)->assertJsonPath('error', 'open_request');

        // 2. Proposition sent and accepted by both profiles (still active, not closed).
        $proposition = $this->activeProposition($this->myMember, $this->theirMember);

        // Same pair, same profile with another member, and my engaged member with someone else: all refused.
        $this->sendRequest($this->myMember, $this->theirMember)
            ->assertStatus(422)->assertJsonPath('error', 'compatible_active');
        $this->sendRequest($this->myOtherMember, $this->theirMember)
            ->assertStatus(422)->assertJsonPath('error', 'compatible_active');
        $anotherOfTheirs = $this->member($this->matchmakerB, 'female');
        $this->sendRequest($this->myMember, $anotherOfTheirs)
            ->assertStatus(422)->assertJsonPath('error', 'reference_active');

        // The profile page shows the action disabled with the reason.
        $this->actingAs($this->matchmakerA)
            ->get(route('profile.show', ['username' => $this->theirMember->username]))
            ->assertInertia(fn (Assert $page) => $page
                ->where('profileAbilities.actions.demander.visible', true)
                ->where('profileAbilities.actions.demander.allowed', false)
            );

        // 3. Once the proposition is closed, a new request is possible again.
        $proposition->update(['status' => 'closed']);
        $this->sendRequest($this->myOtherMember, $this->theirMember)->assertOk();
    }

    public function test_pending_request_blocks_a_second_request_for_the_same_profile(): void
    {
        $this->sendRequest($this->myMember, $this->theirMember)->assertOk();

        $this->sendRequest($this->myOtherMember, $this->theirMember)
            ->assertStatus(422)->assertJsonPath('error', 'open_request');

        $this->actingAs($this->matchmakerA)
            ->get(route('profile.show', ['username' => $this->theirMember->username]))
            ->assertInertia(fn (Assert $page) => $page
                ->where('profileAbilities.request_pending', true)
                ->where('profileAbilities.actions.demander.allowed', false)
            );
    }

    public function test_engaged_member_is_greyed_out_in_the_modal(): void
    {
        $other = $this->member($this->matchmakerB, 'female');
        $this->activeProposition($this->myMember, $other);

        $results = $this->actingAs($this->matchmakerA)
            ->getJson(route('staff.proposition-requests.eligible-references', ['user' => $this->theirMember->id, 'q' => $this->myMember->name]))
            ->assertOk()
            ->json('results');

        $this->assertSame('reference_active', collect($results)->firstWhere('id', $this->myMember->id)['blocked_reason']);
    }

    private function profileOf(User $user)
    {
        return $this->actingAs($this->matchmakerA)->get(route('profile.show', ['username' => $user->username]));
    }

    public function test_header_shows_request_status_with_counterpart_link_on_both_profiles(): void
    {
        $this->sendRequest($this->myMember, $this->theirMember)->assertOk();
        $request = PropositionRequest::firstOrFail();

        // Pending: line on their profile, no Proposer.
        $this->profileOf($this->theirMember)->assertInertia(fn (Assert $page) => $page
            ->where('profileAbilities.request_links.0.status', 'pending')
            ->where('profileAbilities.request_links.0.can_propose', false)
            ->where('profileAbilities.request_links.0.counterpart.username', $this->myMember->username)
        );

        // Accepted: Proposer on their profile (main button) and on my member's profile.
        $request->update(['status' => 'accepted', 'responded_at' => now()->subMinute()]);

        $this->profileOf($this->theirMember)->assertInertia(fn (Assert $page) => $page
            ->where('profileAbilities.request_links.0.status', 'accepted')
            ->where('profileAbilities.request_links.0.can_propose', true)
            ->where('profileAbilities.main', 'proposerDemande')
        );
        $this->profileOf($this->myMember)->assertInertia(fn (Assert $page) => $page
            ->where('profileAbilities.request_links.0.can_propose', true)
            ->where('profileAbilities.request_links.0.counterpart.username', $this->theirMember->username)
        );

        // Proposer sends through the usual endpoint; afterwards the button disappears.
        $this->actingAs($this->matchmakerA)->postJson('/staff/propositions', [
            'reference_user_id' => $this->myMember->id,
            'compatible_user_id' => $this->theirMember->id,
            'message' => 'Je vous propose ce profil.',
            'send_to_reference' => true,
            'send_to_compatible' => true,
        ])->assertOk();

        $this->profileOf($this->theirMember)->assertInertia(fn (Assert $page) => $page
            ->where('profileAbilities.request_links.0.status', 'accepted')
            ->where('profileAbilities.request_links.0.can_propose', false)
            ->where('profileAbilities.actions.proposerDemande.visible', false)
        );
    }

    public function test_rejected_request_shows_declined_and_allows_a_new_request(): void
    {
        $this->sendRequest($this->myMember, $this->theirMember)->assertOk();
        PropositionRequest::firstOrFail()->update(['status' => 'rejected', 'responded_at' => now()]);

        $this->profileOf($this->theirMember)->assertInertia(fn (Assert $page) => $page
            ->where('profileAbilities.request_links.0.status', 'rejected')
            ->where('profileAbilities.actions.demander.allowed', true)
        );
    }

    public function test_received_request_is_shown_on_both_profiles_and_answered_from_the_profile(): void
    {
        $this->sendRequest($this->myMember, $this->theirMember)->assertOk();
        $request = PropositionRequest::firstOrFail();

        // Matchmaker B (receiver) sees it on their own profile and on the requester's profile.
        foreach ([[$this->theirMember, $this->myMember], [$this->myMember, $this->theirMember]] as [$viewed, $counterpart]) {
            $this->actingAs($this->matchmakerB)
                ->get(route('profile.show', ['username' => $viewed->username]))
                ->assertInertia(fn (Assert $page) => $page
                    ->where('profileAbilities.request_links.0.direction', 'received')
                    ->where('profileAbilities.request_links.0.can_respond', true)
                    ->where('profileAbilities.request_links.0.can_accept', true)
                    ->where('profileAbilities.request_links.0.from_matchmaker.id', $this->matchmakerA->id)
                    ->where('profileAbilities.request_links.0.counterpart.username', $counterpart->username)
                );
        }

        // Answer from the profile (same endpoint as the "Demandes reçues" page).
        $this->actingAs($this->matchmakerB)
            ->from(route('profile.show', ['username' => $this->theirMember->username]))
            ->post(route('staff.proposition-requests.respond', $request), ['status' => 'accepted', 'organizer' => 'moi'])
            ->assertRedirect(route('profile.show', ['username' => $this->theirMember->username]));

        $this->assertSame('accepted', $request->fresh()->status);
        $this->actingAs($this->matchmakerB)
            ->get(route('profile.show', ['username' => $this->theirMember->username]))
            ->assertInertia(fn (Assert $page) => $page
                ->where('profileAbilities.request_links.0.status', 'accepted')
                ->where('profileAbilities.request_links.0.can_respond', false)
            );
    }

    public function test_blocked_accept_is_explained_on_the_profile_and_the_requests_page(): void
    {
        $this->sendRequest($this->myMember, $this->theirMember)->assertOk();
        $this->activeProposition($this->theirMember, $this->member($this->matchmakerB, 'male'));

        $this->actingAs($this->matchmakerB)
            ->get(route('profile.show', ['username' => $this->theirMember->username]))
            ->assertInertia(fn (Assert $page) => $page
                ->where('profileAbilities.request_links.0.can_respond', true)
                ->where('profileAbilities.request_links.0.can_accept', false)
                ->where('profileAbilities.request_links.0.accept_block_reason', 'active_proposition')
            );

        $this->actingAs($this->matchmakerB)
            ->get(route('staff.matchmaker.proposition-requests', ['type' => 'received']))
            ->assertInertia(fn (Assert $page) => $page
                ->where('receivedRequests.0.can_accept', false)
                ->where('receivedRequests.0.accept_block_reason', 'active_proposition')
                // That proposition was created by matchmaker A: B cannot close it.
                ->where('receivedRequests.0.compatible_user_proposition_can_cancel', false)
            );
    }

    public function test_requests_page_still_lists_an_acceptable_request(): void
    {
        $this->sendRequest($this->myMember, $this->theirMember)->assertOk();

        $this->actingAs($this->matchmakerB)
            ->get(route('staff.matchmaker.proposition-requests', ['type' => 'received']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('matchmaker/proposition-requests')
                ->has('receivedRequests', 1)
                ->where('receivedRequests.0.can_accept', true)
                ->where('receivedRequests.0.accept_block_reason', null)
            );
    }

    public function test_only_the_receiving_matchmaker_can_answer(): void
    {
        $this->sendRequest($this->myMember, $this->theirMember)->assertOk();
        $request = PropositionRequest::firstOrFail();
        $outsider = $this->staff();

        $this->actingAs($outsider)
            ->post(route('staff.proposition-requests.respond', $request), ['status' => 'accepted', 'organizer' => 'moi'])
            ->assertForbidden();
        $this->assertSame('pending', $request->fresh()->status);
    }

    public function test_accepted_request_no_longer_blocks_once_proposing_has_become_impossible(): void
    {
        // 1. Request accepted, proposition not sent yet.
        $this->sendRequest($this->myMember, $this->theirMember)->assertOk();
        $request = PropositionRequest::firstOrFail();
        $request->update(['status' => 'accepted', 'responded_at' => now()->subMinute()]);
        $this->assertTrue(PropositionRequest::hasOpenRequestFor($this->matchmakerA->id, $this->theirMember->id));

        // 2. My member gets a successful RDV elsewhere: the proposition can no longer be sent.
        $rdv = Rdv::create([
            'matchmaker_id' => $this->matchmakerA->id,
            'reference_user_id' => $this->myMember->id,
            'compatible_user_id' => $this->member($this->matchmakerB, 'female')->id,
            'regle' => 'test', 'share_phone' => false, 'status' => Rdv::STATUS_REUSSI,
        ]);

        // 3. The accepted request no longer counts as open: no dead "Proposer", and a new request is possible.
        $this->assertFalse(PropositionRequest::hasOpenRequestFor($this->matchmakerA->id, $this->theirMember->id));
        $this->profileOf($this->theirMember)->assertInertia(fn (Assert $page) => $page
            ->where('profileAbilities.request_links.0.status', 'accepted')
            ->where('profileAbilities.request_links.0.can_propose', false)
            ->where('profileAbilities.actions.proposerDemande.visible', false)
            ->where('profileAbilities.actions.demander.allowed', true)
        );
        $this->sendRequest($this->myOtherMember, $this->theirMember)->assertOk();

        // 4. If the block goes away (RDV failed), the accepted request is usable again.
        PropositionRequest::where('reference_user_id', $this->myOtherMember->id)->delete();
        $rdv->update(['status' => Rdv::STATUS_ECHEC]);
        $this->assertTrue(PropositionRequest::hasOpenRequestFor($this->matchmakerA->id, $this->theirMember->id));
    }

    public function test_accepted_request_is_not_open_while_the_other_profile_has_an_active_proposition(): void
    {
        $this->sendRequest($this->myMember, $this->theirMember)->assertOk();
        PropositionRequest::firstOrFail()->update(['status' => 'accepted', 'responded_at' => now()->subMinute()]);

        $this->activeProposition($this->theirMember, $this->member($this->matchmakerB, 'male'));

        $this->assertFalse(PropositionRequest::hasOpenRequestFor($this->matchmakerA->id, $this->theirMember->id));
    }

    public function test_accepting_a_request_is_refused_while_a_profile_has_an_active_proposition(): void
    {
        $request = PropositionRequest::create([
            'reference_user_id' => $this->myMember->id,
            'compatible_user_id' => $this->theirMember->id,
            'from_matchmaker_id' => $this->matchmakerA->id,
            'to_matchmaker_id' => $this->matchmakerB->id,
            'message' => 'Bonjour',
            'status' => 'pending',
        ]);
        $this->activeProposition($this->theirMember, $this->member($this->matchmakerB, 'male'));

        $this->actingAs($this->matchmakerB)
            ->post(route('staff.proposition-requests.respond', $request), ['status' => 'accepted', 'organizer' => 'moi'])
            ->assertSessionHasErrors('accept');

        $this->assertSame('pending', $request->fresh()->status);
    }
}
