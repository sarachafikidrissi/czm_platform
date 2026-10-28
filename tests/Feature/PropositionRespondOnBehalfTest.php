<?php

namespace Tests\Feature;

use App\Models\Agency;
use App\Models\Proposition;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use RuntimeException;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * The proposition's creator answers for both profiles at any time, while they still follow one of them;
 * any other matchmaker answers only for the profile assigned to them.
 */
class PropositionRespondOnBehalfTest extends TestCase
{
    use RefreshDatabase;

    private User $matchmakerA;

    private User $matchmakerB;

    private User $profileA;

    private User $profileB;

    private string $pairId;

    protected function beforeRefreshingDatabase()
    {
        $connection = config('database.default');
        if ($connection !== 'sqlite' || config("database.connections.{$connection}.database") !== ':memory:') {
            throw new RuntimeException('PropositionRespondOnBehalfTest only runs on the in-memory SQLite database.');
        }
    }

    protected function setUp(): void
    {
        parent::setUp();

        $this->matchmakerA = $this->makeUserWithRole('matchmaker');
        $this->matchmakerB = $this->makeUserWithRole('matchmaker');
        $this->profileA = $this->makeUserWithRole('user', ['assigned_matchmaker_id' => $this->matchmakerA->id, 'gender' => 'male']);
        $this->profileB = $this->makeUserWithRole('user', ['assigned_matchmaker_id' => $this->matchmakerB->id, 'gender' => 'female']);
        $this->pairId = (string) \Illuminate\Support\Str::uuid();
    }

    protected function makeUserWithRole(string $role, array $overrides = []): User
    {
        Role::findOrCreate($role, 'web');

        $user = User::factory()->create(array_merge([
            'name' => fake()->unique()->name(),
            'email' => fake()->unique()->safeEmail(),
            'phone' => '0600000000',
            'password' => 'password',
            'email_verified_at' => now(),
            'approval_status' => 'approved',
            'status' => 'client',
            'condition' => true,
        ], $overrides));
        $user->assignRole($role);

        return $user;
    }

    /** One row per recipient of the same pair (A = reference, B = compatible). */
    private function pairRow(User $recipient, array $overrides = []): Proposition
    {
        return Proposition::create(array_merge([
            'matchmaker_id' => $this->matchmakerA->id,
            'pair_id' => $this->pairId,
            'user_a_id' => $this->profileA->id,
            'user_b_id' => $this->profileB->id,
            'reference_user_id' => $this->profileA->id,
            'compatible_user_id' => $this->profileB->id,
            'recipient_user_id' => $recipient->id,
            'message' => 'Proposition',
            'status' => 'pending',
        ], $overrides));
    }

    public function test_creator_answers_for_the_other_matchmakers_profile(): void
    {
        $this->pairRow($this->profileA);
        $rowB = $this->pairRow($this->profileB);

        $this->actingAs($this->matchmakerA)
            ->postJson(route('propositions.respond', $rowB), ['status' => 'accepted'])
            ->assertOk();

        $this->assertNotNull($rowB->fresh()->responded_at);
        $this->assertDatabaseHas('user_activities', [
            'user_id' => $this->profileB->id,
            'performed_by' => $this->matchmakerA->id,
            'type' => 'proposition_accepted',
        ]);
    }

    public function test_creator_can_replace_the_other_profiles_answer_at_any_time(): void
    {
        $this->pairRow($this->profileA);
        $rowB = $this->pairRow($this->profileB, ['responded_at' => now(), 'user_response' => 'interested']);

        $this->actingAs($this->matchmakerA)
            ->postJson(route('propositions.respond', $rowB), ['status' => 'rejected', 'response_message' => 'Non'])
            ->assertOk();

        $this->assertSame('not_interested', $rowB->fresh()->user_response);
    }

    public function test_non_creator_answers_only_for_their_own_profile(): void
    {
        $rowA = $this->pairRow($this->profileA);
        $rowB = $this->pairRow($this->profileB);

        // Matchmaker B follows profile B but did not create the proposition.
        $this->actingAs($this->matchmakerB)
            ->postJson(route('propositions.respond', $rowA), ['status' => 'accepted'])
            ->assertForbidden();

        $this->actingAs($this->matchmakerB)
            ->postJson(route('propositions.respond', $rowB), ['status' => 'accepted'])
            ->assertOk();

        $this->assertNull($rowA->fresh()->responded_at);
    }

    public function test_creator_loses_the_right_after_a_transfer_and_the_new_matchmaker_takes_over(): void
    {
        $rowA = $this->pairRow($this->profileA);
        $rowB = $this->pairRow($this->profileB);
        $newMatchmaker = $this->makeUserWithRole('matchmaker');
        $this->profileA->update(['assigned_matchmaker_id' => $newMatchmaker->id]);

        // The creator no longer follows either profile.
        $this->actingAs($this->matchmakerA)
            ->postJson(route('propositions.respond', $rowB), ['status' => 'accepted'])
            ->assertForbidden();
        $this->actingAs($this->matchmakerA)
            ->postJson(route('propositions.respond', $rowA), ['status' => 'accepted'])
            ->assertForbidden();

        // The new matchmaker answers for their profile only (not the creator).
        $this->actingAs($newMatchmaker)
            ->postJson(route('propositions.respond', $rowA), ['status' => 'accepted'])
            ->assertOk();
        $this->actingAs($newMatchmaker)
            ->postJson(route('propositions.respond', $rowB), ['status' => 'accepted'])
            ->assertForbidden();
    }

    public function test_unlinked_matchmaker_and_agency_manager_cannot_answer(): void
    {
        $agency = Agency::create(['name' => 'Agence', 'country' => 'MA', 'city' => 'Casablanca', 'address' => '1 Rue']);
        $this->matchmakerA->update(['agency_id' => $agency->id]);
        $manager = $this->makeUserWithRole('manager', ['agency_id' => $agency->id]);
        $unrelated = $this->makeUserWithRole('matchmaker');

        $rowB = $this->pairRow($this->profileB);

        $this->actingAs($unrelated)
            ->postJson(route('propositions.respond', $rowB), ['status' => 'accepted'])
            ->assertForbidden();

        // The manager can see the agency's proposition but is not assigned to any of its profiles.
        $this->actingAs($manager)
            ->postJson(route('propositions.respond', $rowB), ['status' => 'accepted'])
            ->assertForbidden();
    }

    public function test_manager_who_created_the_proposition_answers_for_both(): void
    {
        $manager = $this->makeUserWithRole('manager');
        $this->profileA->update(['assigned_matchmaker_id' => $manager->id]);

        $rowA = $this->pairRow($this->profileA, ['matchmaker_id' => $manager->id]);
        $rowB = $this->pairRow($this->profileB, ['matchmaker_id' => $manager->id]);

        $this->actingAs($manager)
            ->postJson(route('propositions.respond', $rowA), ['status' => 'accepted'])
            ->assertOk();

        $this->actingAs($manager)
            ->postJson(route('propositions.respond', $rowB), ['status' => 'accepted'])
            ->assertOk();
    }

    private function profileFor(User $viewer, User $member)
    {
        return $this->actingAs($viewer)->get(route('profile.show', ['username' => $member->username]));
    }

    public function test_profile_offers_answer_button_for_the_pending_proposition(): void
    {
        $this->pairRow($this->profileA);
        $rowB = $this->pairRow($this->profileB);

        // Linked matchmaker (A) on the other matchmaker's profile: allowed, main button.
        $this->profileFor($this->matchmakerA, $this->profileB)
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('profileAbilities.pending_proposition_id', $rowB->id)
                ->where('profileAbilities.actions.repondreProposition.allowed', true)
                ->where('profileAbilities.main', 'repondreProposition')
            );

        // Not linked: visible but disabled with a reason.
        $this->profileFor($this->makeUserWithRole('matchmaker'), $this->profileB)
            ->assertInertia(fn (Assert $page) => $page
                ->where('profileAbilities.actions.repondreProposition.visible', true)
                ->where('profileAbilities.actions.repondreProposition.allowed', false)
            );

        // Once answered, the button is gone.
        $this->actingAs($this->matchmakerA)
            ->postJson(route('propositions.respond', $rowB), ['status' => 'accepted'])
            ->assertOk();
        $this->profileFor($this->matchmakerA, $this->profileB)
            ->assertInertia(fn (Assert $page) => $page
                ->where('profileAbilities.pending_proposition_id', null)
                ->where('profileAbilities.actions.repondreProposition.visible', false)
            );
    }

    public function test_status_pills_link_to_proposition_and_rdv_details_when_allowed(): void
    {
        $rowA = $this->pairRow($this->profileA, ['status' => 'interested']);
        $rdv = \App\Models\Rdv::create([
            'matchmaker_id' => $this->matchmakerA->id,
            'reference_user_id' => $this->profileA->id,
            'compatible_user_id' => $this->profileB->id,
            'proposition_id' => $rowA->id,
            'regle' => 'test',
            'share_phone' => false,
            'status' => 'reussi',
        ]);

        $this->profileFor($this->matchmakerA, $this->profileA)
            ->assertInertia(fn (Assert $page) => $page
                ->where('profileAbilities.status_links.proposition.status', 'interested')
                ->where('profileAbilities.status_links.proposition.url', route('staff.staff.propositions.show', $rowA->id))
                ->where('profileAbilities.status_links.rdv.status', 'reussi')
                ->where('profileAbilities.status_links.rdv.url', route('staff.rdv.show', $rdv->id))
            );

        // A matchmaker who cannot open the proposition or the RDV does not see their status.
        $this->profileFor($this->makeUserWithRole('matchmaker'), $this->profileA)
            ->assertInertia(fn (Assert $page) => $page
                ->where('profileAbilities.status_links.proposition', null)
                ->where('profileAbilities.status_links.rdv', null)
            );
    }

    private function acceptedPair(): array
    {
        $accepted = ['status' => 'interested', 'user_response' => 'interested', 'responded_at' => now()];

        return [$this->pairRow($this->profileA, $accepted), $this->pairRow($this->profileB, $accepted)];
    }

    public function test_propositions_tab_lists_the_profile_propositions_with_creator_and_link_rules(): void
    {
        [, $rowB] = $this->acceptedPair();

        // Creator, following profile A: one entry for the pair, with its details link.
        $this->actingAs($this->matchmakerA)
            ->getJson(route('staff.users.propositions-history', $this->profileA))
            ->assertOk()
            ->assertJsonCount(1, 'propositions')
            ->assertJsonPath('propositions.0.created_by_me', true)
            ->assertJsonPath('propositions.0.counterpart.id', $this->profileB->id)
            ->assertJsonPath('propositions.0.url', route('staff.staff.propositions.show', $rowB->id));

        // Matchmaker B follows profile B: sees it, with the creator's name, but no link.
        $this->actingAs($this->matchmakerB)
            ->getJson(route('staff.users.propositions-history', $this->profileB))
            ->assertOk()
            ->assertJsonPath('propositions.0.created_by_me', false)
            ->assertJsonPath('propositions.0.creator.name', $this->matchmakerA->name)
            ->assertJsonPath('propositions.0.url', null);

        // Someone who does not follow the profile cannot list it.
        $this->actingAs($this->matchmakerB)
            ->getJson(route('staff.users.propositions-history', $this->profileA))
            ->assertForbidden();
    }

    public function test_rdv_tab_lists_the_profile_rdvs(): void
    {
        [$rowA] = $this->acceptedPair();
        $rdv = \App\Models\Rdv::create([
            'matchmaker_id' => $this->matchmakerA->id,
            'reference_user_id' => $this->profileA->id,
            'compatible_user_id' => $this->profileB->id,
            'proposition_id' => $rowA->id,
            'regle' => 'test',
            'share_phone' => false,
            'status' => 'en_cours',
        ]);

        $this->actingAs($this->matchmakerA)
            ->getJson(route('staff.users.rdvs-history', $this->profileA))
            ->assertOk()
            ->assertJsonCount(1, 'rdvs')
            ->assertJsonPath('rdvs.0.status', 'en_cours')
            ->assertJsonPath('rdvs.0.has_feedback', false)
            ->assertJsonPath('rdvs.0.url', route('staff.rdv.show', $rdv->id));

        $this->actingAs($this->matchmakerB)
            ->getJson(route('staff.users.rdvs-history', $this->profileB))
            ->assertOk()
            ->assertJsonPath('rdvs.0.creator.name', $this->matchmakerA->name)
            ->assertJsonPath('rdvs.0.url', null);
    }

    public function test_creator_gets_create_rdv_on_both_profiles_once_both_accepted(): void
    {
        $this->acceptedPair();

        foreach ([$this->profileA, $this->profileB] as $profile) {
            $this->profileFor($this->matchmakerA, $profile)
                ->assertInertia(fn (Assert $page) => $page
                    ->where('profileAbilities.actions.creerRdv.allowed', true)
                    ->where('profileAbilities.main', 'creerRdv')
                    ->has('profileAbilities.rdv_creation.proposition_id')
                );
        }

        // Not the creator: no button.
        $this->profileFor($this->matchmakerB, $this->profileB)
            ->assertInertia(fn (Assert $page) => $page
                ->where('profileAbilities.actions.creerRdv.visible', false)
                ->where('profileAbilities.rdv_creation', null)
            );
    }

    public function test_no_create_rdv_while_the_proposition_is_still_pending(): void
    {
        $this->pairRow($this->profileA);
        $this->pairRow($this->profileB);

        $this->profileFor($this->matchmakerA, $this->profileB)
            ->assertInertia(fn (Assert $page) => $page->where('profileAbilities.actions.creerRdv.visible', false));
    }

    public function test_single_recipient_yes_stays_pending_until_the_other_member_also_accepts(): void
    {
        // Proposition sent to one profile only (no pair), both profiles followed by matchmaker A.
        $other = $this->makeUserWithRole('user', ['assigned_matchmaker_id' => $this->matchmakerA->id, 'gender' => 'female']);
        $single = Proposition::create([
            'matchmaker_id' => $this->matchmakerA->id,
            'reference_user_id' => $this->profileA->id, 'compatible_user_id' => $other->id,
            'recipient_user_id' => $this->profileA->id,
            'user_a_id' => $this->profileA->id, 'user_b_id' => $other->id,
            'message' => 'Proposition', 'status' => 'pending',
        ]);

        // The only recipient says yes: answer recorded, but still waiting for the other member.
        $this->actingAs($this->profileA)
            ->postJson(route('propositions.respond', $single), ['status' => 'accepted'])
            ->assertOk();
        $single->refresh();
        $this->assertSame(Proposition::STATUS_PENDING, $single->status);
        $this->assertSame(Proposition::STATUS_INTERESTED, $single->user_response);
        $this->assertNotNull($single->responded_at);

        // Counted as "en attente" on the dashboard and shown as pending on the profile.
        $stats = app(\App\Services\StatsService::class)->compute($this->matchmakerA, now()->month, now()->year, 'personal', null, null);
        $this->assertSame(1, $stats['propositions']['new_this_month']);
        $this->profileFor($this->matchmakerA, $this->profileA)
            ->assertInertia(fn (Assert $page) => $page->where('profileAbilities.status_links.proposition.status', 'pending'));

        // "Envoyer au profil restant", then the other member also says yes: accepted for both.
        $this->actingAs($this->matchmakerA)->postJson(route('staff.propositions.send-to-other'), [
            'reference_user_id' => $this->profileA->id,
            'compatible_user_id' => $other->id,
            'recipient_user_id' => $other->id,
            'message' => 'Pour vous aussi',
        ])->assertOk();
        $second = Proposition::where('recipient_user_id', $other->id)->firstOrFail();

        $this->actingAs($other)
            ->postJson(route('propositions.respond', $second), ['status' => 'accepted'])
            ->assertOk();
        $this->assertSame(Proposition::STATUS_INTERESTED, $single->fresh()->status);
        $this->assertSame(Proposition::STATUS_INTERESTED, $second->fresh()->status);
    }

    public function test_single_recipient_no_still_ends_the_proposition(): void
    {
        $other = $this->makeUserWithRole('user', ['assigned_matchmaker_id' => $this->matchmakerA->id, 'gender' => 'female']);
        $single = Proposition::create([
            'matchmaker_id' => $this->matchmakerA->id,
            'reference_user_id' => $this->profileA->id, 'compatible_user_id' => $other->id,
            'recipient_user_id' => $this->profileA->id,
            'user_a_id' => $this->profileA->id, 'user_b_id' => $other->id,
            'message' => 'Proposition', 'status' => 'pending',
        ]);

        $this->actingAs($this->profileA)
            ->postJson(route('propositions.respond', $single), ['status' => 'rejected', 'response_message' => 'Non merci'])
            ->assertOk();

        $this->assertSame(Proposition::STATUS_NOT_INTERESTED, $single->fresh()->status);
    }

    public function test_proposition_status_is_only_shown_to_whoever_may_open_the_proposition(): void
    {
        $this->pairRow($this->profileA, ['status' => 'interested']);
        $this->pairRow($this->profileB, ['status' => 'interested']);

        // Creator (matchmaker A), even on the other matchmaker's profile: sees it.
        $this->profileFor($this->matchmakerA, $this->profileB)
            ->assertInertia(fn (Assert $page) => $page
                ->where('memberPropositionVisible', true)
                ->where('profileAbilities.status_links.proposition.status', 'interested')
            );

        // Matchmaker B follows profile B but did not create it: status hidden (data kept for the matchmaking tab).
        $this->profileFor($this->matchmakerB, $this->profileB)
            ->assertInertia(fn (Assert $page) => $page
                ->where('memberPropositionVisible', false)
                ->where('profileAbilities.status_links.proposition', null)
                ->where('memberProposition.exists', true)
            );

        // Matchmaker B on matchmaker A's profile: not even sent.
        $this->profileFor($this->matchmakerB, $this->profileA)
            ->assertInertia(fn (Assert $page) => $page
                ->where('memberPropositionVisible', false)
                ->where('memberProposition', null)
                ->where('latestMemberProposition', null)
                ->where('profileAbilities.status_links.proposition', null)
            );
    }

    public function test_a_refused_proposition_cannot_be_cancelled(): void
    {
        $refused = ['status' => 'not_interested', 'user_response' => 'not_interested', 'responded_at' => now()];
        $rowA = $this->pairRow($this->profileA, ['status' => 'not_interested', 'user_response' => 'interested', 'responded_at' => now()]);
        $this->pairRow($this->profileB, $refused);

        // No "Annuler" button on the proposition page...
        $this->actingAs($this->matchmakerA)
            ->get(route('staff.staff.propositions.show', $rowA))
            ->assertInertia(fn (Assert $page) => $page->where('proposition.can_cancel', false));

        // ...and the server refuses it.
        $this->actingAs($this->matchmakerA)
            ->patchJson(route('staff.propositions.cancel', $rowA))
            ->assertStatus(422);
        $this->assertSame('not_interested', $rowA->fresh()->status);
    }

    public function test_propositions_list_can_be_filtered_on_refused(): void
    {
        $this->pairRow($this->profileA, ['status' => 'not_interested', 'user_response' => 'not_interested', 'responded_at' => now()]);
        $this->pairRow($this->profileB, ['status' => 'not_interested']);

        $otherMember = $this->makeUserWithRole('user', ['assigned_matchmaker_id' => $this->matchmakerA->id]);
        Proposition::create([
            'matchmaker_id' => $this->matchmakerA->id,
            'reference_user_id' => $otherMember->id, 'compatible_user_id' => $this->profileB->id,
            'recipient_user_id' => $otherMember->id,
            'user_a_id' => $otherMember->id, 'user_b_id' => $this->profileB->id,
            'message' => 'P', 'status' => 'pending',
        ]);

        $this->actingAs($this->matchmakerA)
            ->get('/staff/matchmaker/propositions?status=rejected')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('entries', 1)
                ->where('entries.0.aggregate_status', 'rejected'));
    }

    public function test_rdv_status_is_only_shown_to_whoever_may_open_the_rdv(): void
    {
        [$rowA] = [$this->pairRow($this->profileA, ['status' => 'closed']), $this->pairRow($this->profileB, ['status' => 'closed'])];
        \App\Models\Rdv::create([
            'matchmaker_id' => $this->matchmakerA->id,
            'reference_user_id' => $this->profileA->id, 'compatible_user_id' => $this->profileB->id,
            'proposition_id' => $rowA->id, 'regle' => 'test', 'share_phone' => false, 'status' => 'reussi',
        ]);

        // Organiser (A), even on B's member: sees it.
        $this->profileFor($this->matchmakerA, $this->profileB)
            ->assertInertia(fn (Assert $page) => $page
                ->where('memberRdvVisible', true)
                ->where('profileAbilities.status_links.rdv.status', 'reussi'));

        // B follows profile B but did not organise it: hidden (data kept for the matchmaking tab).
        $this->profileFor($this->matchmakerB, $this->profileB)
            ->assertInertia(fn (Assert $page) => $page
                ->where('memberRdvVisible', false)
                ->where('profileAbilities.status_links.rdv', null)
                ->where('memberRdv.exists', true));

        // B on A's member: not even sent.
        $this->profileFor($this->matchmakerB, $this->profileA)
            ->assertInertia(fn (Assert $page) => $page
                ->where('memberRdvVisible', false)
                ->where('memberRdv', null)
                ->where('profileAbilities.status_links.rdv', null));
    }

    public function test_proposition_page_is_for_the_creator_only(): void
    {
        $rowA = $this->pairRow($this->profileA);
        $this->pairRow($this->profileB);

        $this->actingAs($this->matchmakerA)
            ->get(route('staff.staff.propositions.show', $rowA))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('proposition.recipients.'.$this->profileA->id.'.can_update_response', true)
                ->where('proposition.recipients.'.$this->profileB->id.'.can_update_response', true)
            );

        // Matchmaker B (not the creator) cannot open the proposition page.
        $this->actingAs($this->matchmakerB)
            ->get(route('staff.staff.propositions.show', $rowA))
            ->assertForbidden();

        // Same on the profile header: B sees the answer button disabled on profile A.
        $this->profileFor($this->matchmakerB, $this->profileA)
            ->assertInertia(fn (Assert $page) => $page
                ->where('profileAbilities.actions.repondreProposition.visible', true)
                ->where('profileAbilities.actions.repondreProposition.allowed', false)
            );
    }
}
