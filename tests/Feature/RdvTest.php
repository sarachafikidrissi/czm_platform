<?php

namespace Tests\Feature;

use App\Models\Proposition;
use App\Models\Rdv;
use App\Models\RdvFeedback;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class RdvTest extends TestCase
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

    protected function makeAcceptedPropositionPair(User $matchmaker, User $ref, User $comp): array
    {
        $refProp = Proposition::create([
            'matchmaker_id' => $matchmaker->id,
            'user_a_id' => $ref->id,
            'user_b_id' => $comp->id,
            'reference_user_id' => $ref->id,
            'compatible_user_id' => $comp->id,
            'recipient_user_id' => $ref->id,
            'message' => 'Test message',
            'status' => 'interested',
        ]);

        $compProp = Proposition::create([
            'matchmaker_id' => $matchmaker->id,
            'user_a_id' => $ref->id,
            'user_b_id' => $comp->id,
            'reference_user_id' => $ref->id,
            'compatible_user_id' => $comp->id,
            'recipient_user_id' => $comp->id,
            'message' => 'Test message',
            'status' => 'interested',
        ]);

        return [$refProp, $compProp];
    }

    // ──────────────────────────────────────────────
    // POST /staff/rdv — create
    // ──────────────────────────────────────────────

    public function test_create_rdv_succeeds_when_both_sides_accepted(): void
    {
        $mm = $this->makeUserWithRole('matchmaker');
        $ref = $this->makeUserWithRole('user', ['assigned_matchmaker_id' => $mm->id]);
        $comp = $this->makeUserWithRole('user', ['assigned_matchmaker_id' => $mm->id]);

        [$refProp] = $this->makeAcceptedPropositionPair($mm, $ref, $comp);

        $response = $this->actingAs($mm)->postJson(route('staff.rdv.store'), [
            'proposition_id' => $refProp->id,
            'share_phone' => false,
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('rdvs', [
            'matchmaker_id' => $mm->id,
            'reference_user_id' => $ref->id,
            'compatible_user_id' => $comp->id,
            'status' => 'en_cours',
        ]);
    }

    public function test_create_rdv_blocked_when_only_one_side_accepted(): void
    {
        $mm = $this->makeUserWithRole('matchmaker');
        $ref = $this->makeUserWithRole('user', ['assigned_matchmaker_id' => $mm->id]);
        $comp = $this->makeUserWithRole('user', ['assigned_matchmaker_id' => $mm->id]);

        // Only ref accepted
        $refProp = Proposition::create([
            'matchmaker_id' => $mm->id,
            'user_a_id' => $ref->id,
            'user_b_id' => $comp->id,
            'reference_user_id' => $ref->id,
            'compatible_user_id' => $comp->id,
            'recipient_user_id' => $ref->id,
            'message' => 'msg',
            'status' => 'interested',
        ]);

        // comp side still pending
        Proposition::create([
            'matchmaker_id' => $mm->id,
            'user_a_id' => $ref->id,
            'user_b_id' => $comp->id,
            'reference_user_id' => $ref->id,
            'compatible_user_id' => $comp->id,
            'recipient_user_id' => $comp->id,
            'message' => 'msg',
            'status' => 'pending',
        ]);

        $response = $this->actingAs($mm)->postJson(route('staff.rdv.store'), [
            'proposition_id' => $refProp->id,
        ]);

        $response->assertStatus(422)->assertJson([
            'message' => 'Les deux profils doivent avoir accepté la proposition.',
        ]);
    }

    public function test_create_rdv_blocked_when_rdv_already_exists(): void
    {
        $mm = $this->makeUserWithRole('matchmaker');
        $ref = $this->makeUserWithRole('user', ['assigned_matchmaker_id' => $mm->id]);
        $comp = $this->makeUserWithRole('user', ['assigned_matchmaker_id' => $mm->id]);

        [$refProp] = $this->makeAcceptedPropositionPair($mm, $ref, $comp);

        // Pre-existing RDV
        Rdv::create([
            'matchmaker_id' => $mm->id,
            'reference_user_id' => $ref->id,
            'compatible_user_id' => $comp->id,
            'proposition_id' => $refProp->id,
            'regle' => 'test',
            'share_phone' => false,
            'status' => 'en_cours',
        ]);

        $response = $this->actingAs($mm)->postJson(route('staff.rdv.store'), [
            'proposition_id' => $refProp->id,
        ]);

        $response->assertStatus(422)->assertJson([
            'message' => 'Un RDV existe déjà pour cette proposition.',
        ]);
    }

    public function test_create_rdv_blocked_when_not_the_creating_matchmaker(): void
    {
        $mm = $this->makeUserWithRole('matchmaker');
        $otherMm = $this->makeUserWithRole('matchmaker');
        $ref = $this->makeUserWithRole('user', ['assigned_matchmaker_id' => $mm->id]);
        $comp = $this->makeUserWithRole('user', ['assigned_matchmaker_id' => $mm->id]);

        [$refProp] = $this->makeAcceptedPropositionPair($mm, $ref, $comp);

        $response = $this->actingAs($otherMm)->postJson(route('staff.rdv.store'), [
            'proposition_id' => $refProp->id,
        ]);

        $response->assertStatus(403);
    }

    // ──────────────────────────────────────────────
    // POST /rdv/{rdv}/feedback
    // ──────────────────────────────────────────────

    public function test_user_participant_can_submit_feedback(): void
    {
        $mm = $this->makeUserWithRole('matchmaker');
        $ref = $this->makeUserWithRole('user', ['assigned_matchmaker_id' => $mm->id]);
        $comp = $this->makeUserWithRole('user', ['assigned_matchmaker_id' => $mm->id]);

        [$refProp] = $this->makeAcceptedPropositionPair($mm, $ref, $comp);

        $rdv = Rdv::create([
            'matchmaker_id' => $mm->id,
            'reference_user_id' => $ref->id,
            'compatible_user_id' => $comp->id,
            'proposition_id' => $refProp->id,
            'regle' => 'test',
            'share_phone' => false,
            'status' => 'en_cours',
        ]);

        $response = $this->actingAs($ref)->postJson(route('rdv.feedback.store', $rdv), [
            'author_role' => 'user',
            'avis' => 'liked',
            'feedback_message' => 'Great!',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('rdv_feedbacks', [
            'rdv_id' => $rdv->id,
            'author_id' => $ref->id,
            'avis' => 'liked',
        ]);
    }

    public function test_matchmaker_owner_can_submit_feedback(): void
    {
        $mm = $this->makeUserWithRole('matchmaker');
        $ref = $this->makeUserWithRole('user', ['assigned_matchmaker_id' => $mm->id]);
        $comp = $this->makeUserWithRole('user', ['assigned_matchmaker_id' => $mm->id]);

        [$refProp] = $this->makeAcceptedPropositionPair($mm, $ref, $comp);

        $rdv = Rdv::create([
            'matchmaker_id' => $mm->id,
            'reference_user_id' => $ref->id,
            'compatible_user_id' => $comp->id,
            'proposition_id' => $refProp->id,
            'regle' => 'test',
            'share_phone' => false,
            'status' => 'en_cours',
        ]);

        $response = $this->actingAs($mm)->postJson(route('rdv.feedback.store', $rdv), [
            'author_role' => 'matchmaker',
            'espace_de_rdv' => 'agence',
            'signe_de_rdv' => 'positif',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('rdv_feedbacks', [
            'rdv_id' => $rdv->id,
            'author_id' => $mm->id,
            'author_role' => 'matchmaker',
            'espace_de_rdv' => 'agence',
        ]);
    }

    public function test_duplicate_feedback_is_blocked(): void
    {
        $mm = $this->makeUserWithRole('matchmaker');
        $ref = $this->makeUserWithRole('user', ['assigned_matchmaker_id' => $mm->id]);
        $comp = $this->makeUserWithRole('user', ['assigned_matchmaker_id' => $mm->id]);

        [$refProp] = $this->makeAcceptedPropositionPair($mm, $ref, $comp);

        $rdv = Rdv::create([
            'matchmaker_id' => $mm->id,
            'reference_user_id' => $ref->id,
            'compatible_user_id' => $comp->id,
            'proposition_id' => $refProp->id,
            'regle' => 'test',
            'share_phone' => false,
            'status' => 'en_cours',
        ]);

        // First submission
        RdvFeedback::create([
            'rdv_id' => $rdv->id,
            'author_id' => $ref->id,
            'author_role' => 'user',
            'avis' => 'liked',
        ]);

        // Second attempt → 403 (addFeedback policy returns false)
        $response = $this->actingAs($ref)->postJson(route('rdv.feedback.store', $rdv), [
            'author_role' => 'user',
            'avis' => 'not_liked',
        ]);

        $response->assertStatus(403);
    }

    // ──────────────────────────────────────────────
    // GET /mes-rdvs (Inertia page, role:user)
    // ──────────────────────────────────────────────

    public function test_member_rdvs_page_returns_only_own_rdvs(): void
    {
        $mm = $this->makeUserWithRole('matchmaker');
        $ref = $this->makeUserWithRole('user', ['assigned_matchmaker_id' => $mm->id]);
        $comp = $this->makeUserWithRole('user', ['assigned_matchmaker_id' => $mm->id]);
        $other = $this->makeUserWithRole('user', ['assigned_matchmaker_id' => $mm->id]);

        [$refProp] = $this->makeAcceptedPropositionPair($mm, $ref, $comp);

        Rdv::create([
            'matchmaker_id' => $mm->id,
            'reference_user_id' => $ref->id,
            'compatible_user_id' => $comp->id,
            'proposition_id' => $refProp->id,
            'regle' => 'test',
            'share_phone' => false,
            'status' => 'en_cours',
        ]);

        // $other should NOT see this RDV
        $response = $this->actingAs($other)->get(route('mes-rdvs'));
        $response->assertStatus(200);
        $props = $response->viewData('page')['props'] ?? [];
        $this->assertCount(0, $props['rdvs'] ?? []);
    }

    // ──────────────────────────────────────────────
    // GET /staff/rdv (matchmaker list)
    // ──────────────────────────────────────────────

    public function test_matchmaker_rdvs_page_returns_only_own_rdvs(): void
    {
        $mm = $this->makeUserWithRole('matchmaker');
        $otherMm = $this->makeUserWithRole('matchmaker');
        $ref = $this->makeUserWithRole('user', ['assigned_matchmaker_id' => $mm->id]);
        $comp = $this->makeUserWithRole('user', ['assigned_matchmaker_id' => $mm->id]);

        [$refProp] = $this->makeAcceptedPropositionPair($mm, $ref, $comp);

        Rdv::create([
            'matchmaker_id' => $mm->id,
            'reference_user_id' => $ref->id,
            'compatible_user_id' => $comp->id,
            'proposition_id' => $refProp->id,
            'regle' => 'test',
            'share_phone' => false,
            'status' => 'en_cours',
        ]);

        $response = $this->actingAs($otherMm)->get(route('staff.rdv.matchmaker.list'));
        $response->assertStatus(200);
        $props = $response->viewData('page')['props'] ?? [];
        $this->assertCount(0, $props['rdvs'] ?? []);
    }

    // ──────────────────────────────────────────────
    // Phone visibility
    // ──────────────────────────────────────────────

    public function test_phone_hidden_when_share_phone_false(): void
    {
        $mm = $this->makeUserWithRole('matchmaker');
        $ref = $this->makeUserWithRole('user', ['assigned_matchmaker_id' => $mm->id, 'phone' => '0611111111']);
        $comp = $this->makeUserWithRole('user', ['assigned_matchmaker_id' => $mm->id, 'phone' => '0622222222']);

        [$refProp] = $this->makeAcceptedPropositionPair($mm, $ref, $comp);

        Rdv::create([
            'matchmaker_id' => $mm->id,
            'reference_user_id' => $ref->id,
            'compatible_user_id' => $comp->id,
            'proposition_id' => $refProp->id,
            'regle' => 'test',
            'share_phone' => false,
            'status' => 'en_cours',
        ]);

        $response = $this->actingAs($ref)->get(route('mes-rdvs'));
        $response->assertStatus(200);
        $props = $response->viewData('page')['props'] ?? [];
        $rdv = ($props['rdvs'] ?? [])[0] ?? null;
        $this->assertNull($rdv['other_profile_phone'] ?? null);
    }

    public function test_phone_visible_when_share_phone_true(): void
    {
        $mm = $this->makeUserWithRole('matchmaker');
        $ref = $this->makeUserWithRole('user', ['assigned_matchmaker_id' => $mm->id, 'phone' => '0611111111']);
        $comp = $this->makeUserWithRole('user', ['assigned_matchmaker_id' => $mm->id, 'phone' => '0622222222']);

        [$refProp] = $this->makeAcceptedPropositionPair($mm, $ref, $comp);

        Rdv::create([
            'matchmaker_id' => $mm->id,
            'reference_user_id' => $ref->id,
            'compatible_user_id' => $comp->id,
            'proposition_id' => $refProp->id,
            'regle' => 'test',
            'share_phone' => true,
            'status' => 'en_cours',
        ]);

        $response = $this->actingAs($ref)->get(route('mes-rdvs'));
        $response->assertStatus(200);
        $props = $response->viewData('page')['props'] ?? [];
        $rdv = ($props['rdvs'] ?? [])[0] ?? null;
        $this->assertSame('0622222222', $rdv['other_profile_phone'] ?? null);
    }

    // ──────────────────────────────────────────────
    // can_create_rdv flag
    // ──────────────────────────────────────────────

    public function test_can_create_rdv_false_when_rdv_already_exists(): void
    {
        $mm = $this->makeUserWithRole('matchmaker');
        $ref = $this->makeUserWithRole('user', ['assigned_matchmaker_id' => $mm->id]);
        $comp = $this->makeUserWithRole('user', ['assigned_matchmaker_id' => $mm->id]);

        [$refProp] = $this->makeAcceptedPropositionPair($mm, $ref, $comp);

        Rdv::create([
            'matchmaker_id' => $mm->id,
            'reference_user_id' => $ref->id,
            'compatible_user_id' => $comp->id,
            'proposition_id' => $refProp->id,
            'regle' => 'test',
            'share_phone' => false,
            'status' => 'en_cours',
        ]);

        // Check via propositions list page
        $response = $this->actingAs($mm)->get(route('staff.matchmaker.propositions'));
        $response->assertStatus(200);
        $props = $response->viewData('page')['props'] ?? [];
        $propositionsList = $props['propositions'] ?? [];
        $hasCanCreateTrue = collect($propositionsList)->contains('can_create_rdv', true);
        $this->assertFalse($hasCanCreateTrue);
    }
}
