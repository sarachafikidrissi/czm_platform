<?php

namespace Tests\Feature;

use App\Models\Agency;
use App\Models\Profile;
use App\Models\User;
use App\Services\MatchmakingResultsPayloadService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use RuntimeException;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * Matchmaking results: each card says who follows the profile and in which agency,
 * and the profile tab gets what the "Filtres de recherche" drawer needs.
 */
class MatchmakingResultsBrowsingTest extends TestCase
{
    use RefreshDatabase;

    private Agency $casa;

    private Agency $rabat;

    private User $owner;

    private User $otherMm;

    protected function beforeRefreshingDatabase()
    {
        $connection = config('database.default');
        if ($connection !== 'sqlite' || config("database.connections.{$connection}.database") !== ':memory:') {
            throw new RuntimeException('MatchmakingResultsBrowsingTest only runs on the in-memory SQLite database.');
        }
    }

    protected function setUp(): void
    {
        parent::setUp();
        foreach (['admin', 'manager', 'matchmaker', 'user'] as $role) {
            Role::findOrCreate($role, 'web');
        }
        $this->casa = Agency::create(['name' => 'Agence Casa', 'country' => 'MA', 'city' => 'Casablanca', 'address' => '1 Rue']);
        $this->rabat = Agency::create(['name' => 'Agence Rabat', 'country' => 'MA', 'city' => 'Rabat', 'address' => '2 Rue']);
        $this->owner = $this->staff('matchmaker', $this->casa);
        $this->otherMm = $this->staff('matchmaker', $this->rabat);
    }

    private function staff(string $role, Agency $agency): User
    {
        $user = User::factory()->create(['approval_status' => 'approved', 'agency_id' => $agency->id]);
        $user->assignRole($role);

        return $user;
    }

    private function member(?User $matchmaker, ?Agency $agency = null): User
    {
        $user = User::factory()->create([
            'status' => 'member',
            'assigned_matchmaker_id' => $matchmaker?->id,
            'agency_id' => $agency?->id,
        ]);
        $user->assignRole('user');
        Profile::create(['user_id' => $user->id, 'account_status' => 'active'])->forceFill(['is_completed' => true])->save();

        return $user->load('assignedMatchmaker');
    }

    public function test_assignment_info_gives_the_matchmaker_and_the_agency(): void
    {
        $withOwnAgency = $this->member($this->otherMm, $this->casa);   // profile agency wins
        $viaMatchmaker = $this->member($this->otherMm);                // falls back to the matchmaker's agency
        $mine = $this->member($this->owner);
        $unassigned = $this->member(null);

        $info = MatchmakingResultsPayloadService::assignmentInfo(
            array_map(fn ($u) => ['user' => $u], [$withOwnAgency, $viaMatchmaker, $mine, $unassigned]),
            $this->owner,
        );

        $this->assertSame(['id' => $this->casa->id, 'name' => 'Agence Casa'], $info[$withOwnAgency->id]['agency']);
        $this->assertSame($this->otherMm->id, $info[$withOwnAgency->id]['assigned_matchmaker']['id']);
        $this->assertFalse($info[$withOwnAgency->id]['isAssignedToMe']);

        $this->assertSame(['id' => $this->rabat->id, 'name' => 'Agence Rabat'], $info[$viaMatchmaker->id]['agency']);

        $this->assertTrue($info[$mine->id]['isAssignedToMe']);
        $this->assertSame('Agence Casa', $info[$mine->id]['agency']['name']);

        $this->assertNull($info[$unassigned->id]['assigned_matchmaker']);
        $this->assertNull($info[$unassigned->id]['agency']);
    }

    public function test_profile_tab_gets_the_filters_drawer_only_for_who_may_filter(): void
    {
        $member = $this->member($this->owner, $this->casa);

        $this->actingAs($this->owner)
            ->get(route('profile.show', ['username' => $member->username]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('canFilterMatchmaking', true)
                ->has('matchmakingAppliedFilters'));

        // Another agency's matchmaker cannot use the filters endpoint, so no drawer.
        $this->actingAs($this->otherMm)
            ->get(route('profile.show', ['username' => $member->username]))
            ->assertInertia(fn (Assert $page) => $page->where('canFilterMatchmaking', false));
    }

    public function test_filters_list_every_agency_and_every_matchmaker(): void
    {
        $empty = Agency::create(['name' => 'Agence Tanger', 'country' => 'MA', 'city' => 'Tanger', 'address' => '3 Rue']);
        $manager = $this->staff('manager', $empty);
        $pending = User::factory()->create(['approval_status' => 'pending', 'agency_id' => $empty->id]);
        $pending->assignRole('matchmaker');
        $member = $this->member($this->owner, $this->casa);

        $this->actingAs($this->owner)
            ->get(route('profile.show', ['username' => $member->username]))
            ->assertInertia(fn (Assert $page) => $page
                ->where('resultFilterOptions.agencies', collect([$this->casa, $this->rabat, $empty])
                    ->map(fn ($a) => ['id' => $a->id, 'name' => $a->name])->all())
                ->where('resultFilterOptions.matchmakers', fn ($list) => collect($list)->pluck('id')->sort()->values()->all()
                    === collect([$this->owner->id, $this->otherMm->id, $manager->id])->sort()->values()->all()));

        $this->actingAs($this->owner)
            ->get(route('staff.match.results', ['userAId' => $member->id]))
            ->assertInertia(fn (Assert $page) => $page->has('resultFilterOptions.agencies', 3)->has('resultFilterOptions.matchmakers', 3));
    }

    private function person(string $name, string $gender, ?User $matchmaker, array $attributes = [], array $profile = []): User
    {
        $user = User::factory()->create(array_merge([
            'name' => $name, 'gender' => $gender, 'status' => 'member', 'assigned_matchmaker_id' => $matchmaker?->id,
        ], $attributes));
        $user->assignRole('user');
        Profile::create(['user_id' => $user->id, 'account_status' => $profile['account_status'] ?? 'active'])
            ->forceFill(['is_completed' => $profile['is_completed'] ?? true])->save();

        return $user;
    }

    private function searchFor(User $viewer, User $userA, array $params)
    {
        return $this->actingAs($viewer)->getJson(route('staff.match.search.profiles', ['userAId' => $userA->id] + $params));
    }

    public function test_search_covers_the_whole_base_and_flags_profiles_that_cannot_be_proposed(): void
    {
        $userA = $this->person('Salma Idrissi', 'female', $this->owner);
        $member = $this->person('Youssef Amrani', 'male', $this->otherMm, ['agency_id' => $this->rabat->id]);
        $prospect = $this->person('Youssef Prospect', 'male', $this->owner, ['status' => 'prospect']);
        $rejected = $this->person('Youssef Rejete', 'male', null, ['status' => 'prospect', 'rejection_reason' => 'Injoignable']);
        $deactivated = $this->person('Youssef Off', 'male', $this->owner, [], ['account_status' => 'desactivated']);
        $incomplete = $this->person('Youssef Partiel', 'male', $this->owner, [], ['is_completed' => false]);
        $this->person('Youssra Same', 'female', $this->owner);                          // same gender: never listed
        $staff = User::factory()->create(['name' => 'Youssef Staff', 'gender' => 'male']); // staff with the user role
        $staff->assignRole('user');
        $staff->assignRole('matchmaker');

        $response = $this->searchFor($this->owner, $userA, ['q' => 'yous'])->assertOk()->assertJsonPath('total', 5);
        $rows = collect($response->json('data'))->keyBy('user.id');

        $this->assertNull($rows[$member->id]['restriction']);
        $this->assertArrayHasKey('score', $rows[$member->id]);
        $this->assertSame('Agence Rabat', $rows[$member->id]['agency']['name']);
        $this->assertSame('prospect', $rows[$prospect->id]['restriction']['code']);
        $this->assertSame('rejected', $rows[$rejected->id]['restriction']['code']);
        $this->assertSame('deactivated', $rows[$deactivated->id]['restriction']['code']);
        $this->assertSame('incomplete', $rows[$incomplete->id]['restriction']['code']);
        foreach ([$prospect, $rejected, $deactivated, $incomplete] as $flagged) {
            $this->assertFalse($rows[$flagged->id]['can_propose']);
            $this->assertFalse($rows[$flagged->id]['can_propose_from_request']);
        }
    }

    public function test_search_by_agency_or_matchmaker_alone_and_pages_of_six(): void
    {
        $userA = $this->person('Salma Idrissi', 'female', $this->owner);
        $inRabat = $this->person('Omar Rabat', 'male', null, ['agency_id' => $this->rabat->id]);
        $viaMatchmaker = $this->person('Omar Via', 'male', $this->otherMm); // agency from its matchmaker
        $this->person('Omar Casa', 'male', $this->owner, ['agency_id' => $this->casa->id]);
        for ($i = 1; $i <= 7; $i++) {
            $this->person("Karim {$i}", 'male', null);
        }

        $ids = collect($this->searchFor($this->owner, $userA, ['agency' => $this->rabat->id])->assertOk()->json('data'))->pluck('user.id')->sort()->values()->all();
        $this->assertSame(collect([$inRabat->id, $viaMatchmaker->id])->sort()->values()->all(), $ids);

        $this->searchFor($this->owner, $userA, ['matchmaker' => $this->otherMm->id])->assertJsonPath('total', 1)->assertJsonPath('data.0.user.id', $viaMatchmaker->id);

        $this->searchFor($this->owner, $userA, ['matchmaker' => 'unassigned'])
            ->assertJsonPath('total', 8)->assertJsonPath('last_page', 2)->assertJsonCount(6, 'data');
        $this->searchFor($this->owner, $userA, ['matchmaker' => 'unassigned', 'page' => 2])->assertJsonCount(2, 'data');
    }

    public function test_search_needs_criteria_and_the_right_to_see_the_results(): void
    {
        $userA = $this->person('Salma Idrissi', 'female', $this->owner);

        $this->searchFor($this->owner, $userA, ['q' => 'a'])->assertStatus(422)->assertJsonPath('error', 'criteria_required');
        $this->searchFor($this->otherMm, $userA, ['q' => 'omar'])->assertForbidden();
    }

    public function test_a_flagged_profile_cannot_receive_a_proposition_or_a_request(): void
    {
        $userA = $this->person('Salma Idrissi', 'female', $this->owner);
        $prospect = $this->person('Youssef Prospect', 'male', $this->owner, ['status' => 'prospect']);
        $othersDeactivated = $this->person('Youssef Off', 'male', $this->otherMm, [], ['account_status' => 'desactivated']);

        $this->actingAs($this->owner)->postJson(route('staff.propositions.store'), [
            'reference_user_id' => $userA->id, 'compatible_user_id' => $prospect->id, 'message' => 'Bonjour', 'send_to_compatible' => true,
        ])->assertStatus(422)->assertJsonPath('error', 'compatible_not_eligible');

        $this->actingAs($this->owner)->postJson(route('staff.proposition-requests.store'), [
            'reference_user_id' => $userA->id, 'compatible_user_id' => $othersDeactivated->id, 'message' => 'Bonjour',
        ])->assertStatus(422)->assertJsonPath('error', 'compatible_not_eligible');
    }

    public function test_search_route_names_are_unique_and_the_results_error_path_redirects(): void
    {
        $this->assertSame(url('/staff/match/search'), route('staff.match.search'));
        $this->assertSame(url('/staff/match/search/5'), route('staff.match.search.profiles', ['userAId' => 5]));

        // findMatches() throws for an incomplete profile: the page must redirect, not fail.
        $incomplete = $this->person('Salma Partiel', 'female', $this->owner, [], ['is_completed' => false]);
        $this->actingAs($this->owner)
            ->get(route('staff.match.results', ['userAId' => $incomplete->id]))
            ->assertRedirect(route('staff.match.search'));
    }

    public function test_match_cards_never_carry_identity_document_fields(): void
    {
        $userA = $this->person('Salma Idrissi', 'female', $this->owner);
        $other = $this->person('Youssef Amrani', 'male', $this->otherMm);
        $other->profile->forceFill([
            'cin' => 'secret', 'cin_hash' => 'hash', 'identity_card_front_path' => 'identity-cards/x.jpg', 'identity_card_front_hash' => 'h',
            'ville_residence' => 'Rabat',
        ])->save();

        $row = $this->searchFor($this->owner, $userA, ['q' => 'youssef'])->assertOk()->json('data.0.profile');
        $this->assertSame('Rabat', $row['ville_residence']);
        foreach (MatchmakingResultsPayloadService::SENSITIVE_PROFILE_FIELDS as $field) {
            $this->assertArrayNotHasKey($field, $row);
        }

        // The model itself is untouched (hiding is applied to a copy).
        $this->assertSame('identity-cards/x.jpg', $other->profile->fresh()->identity_card_front_path);
    }
}
