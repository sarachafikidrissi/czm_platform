<?php

namespace Tests\Feature;

use App\Models\Agency;
use App\Models\Bill;
use App\Models\Profile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use RuntimeException;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class UserProfileActionPolicyTest extends TestCase
{
    use RefreshDatabase;

    private Agency $agency;

    private User $owner;

    private User $otherMatchmaker;

    private User $manager;

    private User $member;

    /**
     * Refuse to migrate anything but the in-memory SQLite test database.
     */
    protected function beforeRefreshingDatabase()
    {
        $connection = config('database.default');
        $database = config("database.connections.{$connection}.database");

        if ($connection !== 'sqlite' || $database !== ':memory:') {
            throw new RuntimeException('UserProfileActionPolicyTest only runs on the in-memory SQLite database.');
        }
    }

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

        $this->owner = $this->staff('matchmaker', 'Fatima Zahra');
        $this->otherMatchmaker = $this->staff('matchmaker', 'Meryem Alaoui');
        $this->manager = $this->staff('manager', 'Manager Agence');

        $this->member = User::factory()->create([
            'username' => 'policy-member',
            'status' => 'member',
            'assigned_matchmaker_id' => $this->owner->id,
            'agency_id' => $this->agency->id,
        ]);
        $this->member->assignRole('user');
        Profile::create(['user_id' => $this->member->id, 'account_status' => 'active']);
    }

    private function staff(string $role, string $name): User
    {
        $user = User::factory()->create([
            'name' => $name,
            'approval_status' => 'approved',
            'agency_id' => $this->agency->id,
        ]);
        $user->assignRole($role);

        return $user;
    }

    private function createBill(string $status = 'unpaid'): Bill
    {
        return Bill::create([
            'bill_number' => 'FAC-TEST-'.fake()->unique()->numerify('###'),
            'user_id' => $this->member->id,
            'profile_id' => $this->member->profile->id,
            'matchmaker_id' => $this->owner->id,
            'order_number' => 'CMD-TEST-'.fake()->unique()->numerify('###'),
            'bill_date' => now()->toDateString(),
            'due_date' => now()->addMonth()->toDateString(),
            'status' => $status,
            'amount' => 1000,
            'tax_rate' => 20,
            'tax_amount' => 200,
            'total_amount' => 1200,
            'currency' => 'MAD',
            'payment_method' => 'Virement',
            'pack_name' => 'Pack Test',
            'pack_price' => 1000,
            'pack_advantages' => ['Accompagnement personnalisé'],
        ]);
    }

    private function profilePage(User $viewer)
    {
        return $this->actingAs($viewer)->get(route('profile.show', ['username' => $this->member->username]));
    }

    public function test_owner_sees_bills_and_allowed_actions(): void
    {
        $this->createBill();

        $this->profilePage($this->owner)
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('bills', 1)
                ->where('profileAbilities.relationship', 'owner')
                ->where('profileAbilities.main', 'marquerClient')
                ->where('profileAbilities.actions.marquerClient.allowed', true)
                ->where('profileAbilities.actions.transferer.allowed', true)
                ->where('profileAbilities.actions.creerFacture.visible', false)
                ->where('profileStats.bills.unpaid', 1)
            );
    }

    public function test_non_owner_matchmaker_cannot_see_bills_and_gets_disabled_actions_with_reason(): void
    {
        $this->createBill();

        $this->profilePage($this->otherMatchmaker)
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('bills', 0)
                ->has('subscriptions', 0)
                ->where('matchmakingResults', null)
                ->where('profileAbilities.relationship', 'other')
                ->where('profileAbilities.owner.name', 'Fatima Zahra')
                ->where('profileAbilities.main', 'demander')
                ->where('profileAbilities.actions.demander.allowed', true)
                ->where('profileAbilities.actions.marquerClient.visible', true)
                ->where('profileAbilities.actions.marquerClient.allowed', false)
                ->where('profileAbilities.actions.marquerClient.reason', 'Suivi par Fatima Zahra')
                ->where('profileAbilities.actions.transferer.allowed', false)
                ->where('profileAbilities.actions.desactiver.allowed', false)
                ->where('profileStats', null)
            );
    }

    public function test_manager_keeps_bill_access(): void
    {
        $this->createBill();

        $this->profilePage($this->manager)
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('bills', 1)
                ->where('profileAbilities.actions.desactiver.allowed', true)
            );
    }

    public function test_rejected_prospect_offers_reactivation_with_takeover_effect_to_any_matchmaker(): void
    {
        $this->member->update(['status' => 'prospect', 'rejection_reason' => 'Injoignable']);

        $this->profilePage($this->otherMatchmaker)
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('profileAbilities.main', 'reactiver')
                ->where('profileAbilities.actions.reactiver.allowed', true)
                ->where('profileAbilities.actions.reactiver.effects', ['assigns_to_me'])
            );
    }

    public function test_deactivated_account_offers_activation_as_main_action(): void
    {
        $this->member->profile->update(['account_status' => 'desactivated']);

        $this->profilePage($this->otherMatchmaker)
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('profileAbilities.main', 'activer')
                ->where('profileAbilities.actions.activer.allowed', true)
                ->where('profileAbilities.actions.desactiver.visible', false)
            );
    }

    public function test_unassigned_member_reason_asks_to_take_charge_first(): void
    {
        $this->member->update(['assigned_matchmaker_id' => null]);

        $this->profilePage($this->otherMatchmaker)
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('profileAbilities.relationship', 'unassigned')
                ->where('profileAbilities.actions.creerFacture.reason', "Prenez d'abord en charge ce profil")
            );
    }

    public function test_matchmaking_results_page_is_restricted_to_the_owner_matchmaker(): void
    {
        $this->actingAs($this->otherMatchmaker)
            ->get(route('staff.match.results', ['userAId' => $this->member->id]))
            ->assertForbidden();

        $this->actingAs($this->otherMatchmaker)
            ->postJson(route('staff.match.filters.update', ['userAId' => $this->member->id]), [])
            ->assertForbidden();
    }

    public function test_endpoints_refuse_non_owner_matchmaker_like_the_profile_buttons(): void
    {
        $this->actingAs($this->otherMatchmaker)
            ->post(route('staff.users.deactivate', ['user' => $this->member->id]), ['reason' => 'Test motif'])
            ->assertForbidden();

        $this->actingAs($this->otherMatchmaker)
            ->post(route('staff.transfer-requests.create'), [
                'user_id' => $this->member->id,
                'to_matchmaker_id' => $this->otherMatchmaker->id,
            ])
            ->assertForbidden();

        $this->actingAs($this->otherMatchmaker)
            ->get(route('staff.prospects.profile.edit', ['user' => $this->member->id]))
            ->assertForbidden();

        $this->actingAs($this->otherMatchmaker)
            ->get(route('staff.prospects.subscription', ['user' => $this->member->id]))
            ->assertForbidden();

        $this->assertSame('active', DB::table('profiles')->where('user_id', $this->member->id)->value('account_status'));
    }

    public function test_prospect_profile_gets_no_matchmaking_results(): void
    {
        $this->member->update(['status' => 'prospect']);
        $this->member->profile->forceFill(['is_completed' => true])->save();

        $this->profilePage($this->owner)
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('matchmakingResults', null));
    }

    public function test_results_page_shows_prospect_notice_instead_of_matches(): void
    {
        $this->member->update(['status' => 'prospect']);

        $this->actingAs($this->owner)
            ->get(route('staff.match.results', ['userAId' => $this->member->id]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('matchmaker/matchmaking-prospect-notice')
                ->where('userA.username', $this->member->username)
            );

        $this->actingAs($this->owner)
            ->postJson(route('staff.match.filters.update', ['userAId' => $this->member->id]), [])
            ->assertStatus(422)
            ->assertJsonPath('error', 'prospect_not_validated');
    }

    public function test_member_profile_still_gets_matchmaking_results(): void
    {
        $this->member->profile->forceFill(['is_completed' => true])->save();

        $this->profilePage($this->owner)
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('matchmakingResults', []));
    }

    private function myEligibleMember(string $name = 'Karim Benjelloun', array $overrides = []): User
    {
        $mine = User::factory()->create(array_merge([
            'name' => $name,
            'status' => 'member',
            'gender' => 'male',
            'assigned_matchmaker_id' => $this->otherMatchmaker->id,
            'agency_id' => $this->agency->id,
        ], $overrides));
        $mine->assignRole('user');
        Profile::create(['user_id' => $mine->id, 'account_status' => 'active'])
            ->forceFill(['is_completed' => true])->save();

        return $mine;
    }

    public function test_owner_does_not_get_the_request_action(): void
    {
        $this->profilePage($this->owner)
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('profileAbilities.actions.demander.visible', false)
            );
    }

    public function test_search_finds_any_of_my_members_and_explains_who_cannot_be_chosen(): void
    {
        $this->member->update(['gender' => 'female']);

        $eligible = $this->myEligibleMember('Karim Eligible');
        $prospect = $this->myEligibleMember('Karim Prospect', ['status' => 'prospect']);
        $sameGender = $this->myEligibleMember('Karim SameGender', ['gender' => 'female']);
        $deactivated = $this->myEligibleMember('Karim Deactivated');
        $deactivated->profile->update(['account_status' => 'desactivated']);
        $incomplete = $this->myEligibleMember('Karim Incomplete');
        $incomplete->profile->forceFill(['is_completed' => false])->save();
        $this->myEligibleMember('Karim NotMine', ['assigned_matchmaker_id' => $this->owner->id]);

        $response = $this->actingAs($this->otherMatchmaker)
            ->getJson(route('staff.proposition-requests.eligible-references', ['user' => $this->member->id, 'q' => 'karim']))
            ->assertOk()
            ->assertJsonPath('owner.name', 'Fatima Zahra')
            ->assertJsonCount(5, 'results');

        $reasons = collect($response->json('results'))->pluck('blocked_reason', 'id');
        $this->assertNull($reasons[$eligible->id]);
        $this->assertSame('prospect', $reasons[$prospect->id]);
        $this->assertSame('same_gender', $reasons[$sameGender->id]);
        $this->assertSame('deactivated', $reasons[$deactivated->id]);
        $this->assertSame('incomplete', $reasons[$incomplete->id]);
    }

    public function test_suggestions_only_contain_my_eligible_members(): void
    {
        $this->member->update(['gender' => 'female']);
        $this->member->profile->forceFill(['is_completed' => true])->save();

        $mine = $this->myEligibleMember('Karim Mine');
        $this->myEligibleMember('Karim Prospect', ['status' => 'prospect']);
        $this->myEligibleMember('Karim NotMine', ['assigned_matchmaker_id' => $this->owner->id]);

        $suggestions = $this->actingAs($this->otherMatchmaker)
            ->getJson(route('staff.proposition-requests.eligible-references', ['user' => $this->member->id]))
            ->assertOk()
            ->assertJsonPath('results', null)
            ->json('suggestions');

        $this->assertSame([$mine->id], array_column($suggestions, 'id'));
        $this->assertNotNull($suggestions[0]['score']);
    }

    public function test_store_refuses_a_reference_that_does_not_meet_the_conditions(): void
    {
        $this->member->update(['gender' => 'female']);
        $prospect = $this->myEligibleMember('Karim Prospect', ['status' => 'prospect']);

        $this->actingAs($this->otherMatchmaker)
            ->postJson(route('staff.proposition-requests.store'), [
                'reference_user_id' => $prospect->id,
                'compatible_user_id' => $this->member->id,
                'message' => 'Bonjour',
            ])
            ->assertStatus(422)
            ->assertJsonPath('error', 'reference_not_eligible');
    }

    public function test_owner_cannot_list_references_for_their_own_member(): void
    {
        $this->actingAs($this->owner)
            ->getJson(route('staff.proposition-requests.eligible-references', ['user' => $this->member->id]))
            ->assertForbidden();
    }

    public function test_request_from_profile_is_sent_then_marked_pending_and_duplicate_refused(): void
    {
        $this->member->update(['gender' => 'female']);
        $mine = $this->myEligibleMember();

        $payload = [
            'reference_user_id' => $mine->id,
            'compatible_user_id' => $this->member->id,
            'message' => 'Bonjour, je pense que ce profil correspond.',
        ];

        $this->actingAs($this->otherMatchmaker)
            ->postJson(route('staff.proposition-requests.store'), $payload)
            ->assertOk();

        $this->actingAs($this->otherMatchmaker)
            ->postJson(route('staff.proposition-requests.store'), $payload)
            ->assertStatus(422);

        $this->actingAs($this->otherMatchmaker)
            ->getJson(route('staff.proposition-requests.eligible-references', ['user' => $this->member->id, 'q' => 'Karim']))
            ->assertJsonPath('results.0.pending', true);

        $this->profilePage($this->otherMatchmaker)
            ->assertInertia(fn (Assert $page) => $page->where('profileAbilities.request_pending', true));
    }

    public function test_expired_client_can_be_chosen_suggested_and_requested(): void
    {
        $this->member->update(['gender' => 'female']);
        $this->member->profile->forceFill(['is_completed' => true])->save();
        $expired = $this->myEligibleMember('Karim Expired', ['status' => 'client_expire']);

        // Search: selectable.
        $this->actingAs($this->otherMatchmaker)
            ->getJson(route('staff.proposition-requests.eligible-references', ['user' => $this->member->id, 'q' => 'Karim']))
            ->assertOk()
            ->assertJsonPath('results.0.id', $expired->id)
            ->assertJsonPath('results.0.blocked_reason', null);

        // Engine: appears as a compatible suggestion.
        $suggestions = $this->actingAs($this->otherMatchmaker)
            ->getJson(route('staff.proposition-requests.eligible-references', ['user' => $this->member->id]))
            ->json('suggestions');
        $this->assertSame([$expired->id], array_column($suggestions, 'id'));

        // Sending: accepted by the server.
        $this->actingAs($this->otherMatchmaker)
            ->postJson(route('staff.proposition-requests.store'), [
                'reference_user_id' => $expired->id,
                'compatible_user_id' => $this->member->id,
                'message' => 'Bonjour',
            ])
            ->assertOk();
    }

    public function test_request_action_is_offered_on_someone_elses_expired_client(): void
    {
        $this->member->update(['status' => 'client_expire']);

        $this->profilePage($this->otherMatchmaker)
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('profileAbilities.actions.demander.allowed', true)
                ->where('profileAbilities.main', 'demander')
            );
    }

    private function countRoleLookups(callable $request): int
    {
        DB::flushQueryLog();
        DB::enableQueryLog();
        $request();
        $count = collect(DB::getQueryLog())
            ->filter(fn ($q) => str_contains($q['query'], 'model_has_roles') && str_contains($q['query'], '"roles"."name"'))
            ->count();
        DB::disableQueryLog();

        return $count;
    }

    public function test_profile_view_looks_up_the_viewer_role_once_per_request(): void
    {
        $lookups = $this->countRoleLookups(fn () => $this->profilePage($this->otherMatchmaker)->assertOk());
        $this->assertSame(1, $lookups); // was 9 before the per-request cache
    }

    public function test_a_role_change_is_seen_on_the_next_request(): void
    {
        $this->profilePage($this->otherMatchmaker)
            ->assertInertia(fn (Assert $page) => $page->where('profileAbilities.actions.desactiver.allowed', false));

        // Becomes admin: next request uses the new role (no cache kept between requests).
        $this->otherMatchmaker->syncRoles(['admin']);
        $this->profilePage($this->otherMatchmaker->fresh())
            ->assertInertia(fn (Assert $page) => $page->where('profileAbilities.actions.desactiver.allowed', true));
    }

    public function test_staff_who_also_have_the_user_role_can_open_a_deactivated_profile_to_activate_it(): void
    {
        // Real staff accounts also carry the "user" role (given at registration).
        $this->owner->assignRole('user');
        $this->otherMatchmaker->assignRole('user');
        $this->member->profile->update(['account_status' => 'desactivated']);

        foreach ([$this->owner, $this->otherMatchmaker] as $staff) {
            $this->profilePage($staff)
                ->assertOk()
                ->assertInertia(fn (Assert $page) => $page
                    ->where('profileAbilities.main', 'activer')
                    ->where('profileAbilities.actions.activer.allowed', true));
        }
    }

    public function test_a_member_still_cannot_open_a_deactivated_profile(): void
    {
        $this->member->profile->update(['account_status' => 'desactivated']);
        $visitor = User::factory()->create(['status' => 'member']);
        $visitor->assignRole('user');
        Profile::create(['user_id' => $visitor->id, 'account_status' => 'active']);

        $this->actingAs($visitor)
            ->get(route('profile.show', ['username' => $this->member->username]))
            ->assertRedirect(route('dashboard'))
            ->assertSessionHas('error', 'Ce profil n\'est pas accessible.');
    }

    public function test_owner_can_still_use_the_same_endpoints(): void
    {
        $this->actingAs($this->owner)
            ->post(route('staff.users.deactivate', ['user' => $this->member->id]), ['reason' => 'Pause demandée'])
            ->assertRedirect();

        $this->assertSame('desactivated', DB::table('profiles')->where('user_id', $this->member->id)->value('account_status'));
    }

    private function prospectPage(User $viewer, ?User $assigned, bool $completed)
    {
        $prospect = User::factory()->create([
            'status' => 'prospect',
            'assigned_matchmaker_id' => $assigned?->id,
            'agency_id' => $this->agency->id,
        ]);
        $prospect->assignRole('user');
        Profile::create(['user_id' => $prospect->id, 'account_status' => 'active'])->forceFill(['is_completed' => $completed])->save();

        return $this->actingAs($viewer)->get(route('profile.show', ['username' => $prospect->username]));
    }

    public function test_an_incomplete_prospect_shows_complete_profile_as_main_action(): void
    {
        $this->prospectPage($this->owner, $this->owner, false)
            ->assertInertia(fn (Assert $page) => $page
                ->where('profileAbilities.main', 'completerProfil')
                ->where('profileAbilities.actions.completerProfil.allowed', true)
                ->where('profileAbilities.actions.validerProspect.visible', false)
                ->where('validationServices', []));
    }

    public function test_a_complete_prospect_shows_validate_to_its_matchmaker_only(): void
    {
        $this->prospectPage($this->owner, $this->owner, true)
            ->assertInertia(fn (Assert $page) => $page
                ->where('profileAbilities.main', 'validerProspect')
                ->where('profileAbilities.actions.validerProspect.allowed', true)
                ->where('profileAbilities.actions.completerProfil.visible', false)
                ->has('validationPacks'));

        $this->prospectPage($this->otherMatchmaker, $this->owner, true)
            ->assertInertia(fn (Assert $page) => $page
                ->where('profileAbilities.actions.validerProspect.allowed', false)
                ->where('validationServices', []));

        // Not assigned yet: nobody can validate (the controller requires a matchmaker first).
        $admin = $this->staff('admin', 'Admin');
        $this->prospectPage($admin, null, true)
            ->assertInertia(fn (Assert $page) => $page->where('profileAbilities.actions.validerProspect.allowed', false));
    }

    public function test_a_member_has_neither_prospect_action(): void
    {
        $this->profilePage($this->owner)
            ->assertInertia(fn (Assert $page) => $page
                ->where('profileAbilities.actions.completerProfil.visible', false)
                ->where('profileAbilities.actions.validerProspect.visible', false));
    }
}
