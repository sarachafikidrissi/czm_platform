<?php

namespace Tests\Feature;

use App\Models\MatrimonialPack;
use App\Models\Profile;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ValidateProspectTest extends TestCase
{
    use RefreshDatabase;

    private User $matchmaker;

    private User $manager;

    private User $admin;

    private Service $service;

    private MatrimonialPack $pack;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['admin', 'manager', 'matchmaker', 'user'] as $role) {
            Role::findOrCreate($role, 'web');
        }

        $this->matchmaker = User::factory()->create(['approval_status' => 'approved']);
        $this->matchmaker->assignRole('matchmaker');

        $this->manager = User::factory()->create(['approval_status' => 'approved']);
        $this->manager->assignRole('manager');

        $this->admin = User::factory()->create(['approval_status' => 'approved']);
        $this->admin->assignRole('admin');

        $this->service = Service::create(['name' => 'Service Test Validate']);
        $this->pack = MatrimonialPack::create([
            'name' => 'Pack Test Validate',
            'duration' => 6,
        ]);
    }

    public function test_unassigned_prospect_cannot_be_validated_by_matchmaker(): void
    {
        $prospect = $this->makeUnassignedProspect();

        $this->actingAs($this->matchmaker)
            ->postJson(route('staff.prospects.validate', $prospect->id), $this->validPayload())
            ->assertStatus(422)
            ->assertJson([
                'message' => 'Ce prospect doit d\'abord être affecté à un conseiller avant de pouvoir être validé.',
            ]);

        $this->assertProspectUnchanged($prospect);
    }

    public function test_unassigned_prospect_cannot_be_validated_by_manager(): void
    {
        $prospect = $this->makeUnassignedProspect();

        $this->actingAs($this->manager)
            ->postJson(route('staff.prospects.validate', $prospect->id), $this->validPayload())
            ->assertStatus(422)
            ->assertJson([
                'message' => 'Ce prospect doit d\'abord être affecté à un conseiller avant de pouvoir être validé.',
            ]);

        $this->assertProspectUnchanged($prospect);
    }

    public function test_unassigned_prospect_cannot_be_validated_by_admin(): void
    {
        $prospect = $this->makeUnassignedProspect();

        $this->actingAs($this->admin)
            ->postJson(route('staff.prospects.validate', $prospect->id), $this->validPayload())
            ->assertStatus(422)
            ->assertJson([
                'message' => 'Ce prospect doit d\'abord être affecté à un conseiller avant de pouvoir être validé.',
            ]);

        $this->assertProspectUnchanged($prospect);
    }

    public function test_admin_validation_preserves_assigned_matchmaker_and_validated_by_manager(): void
    {
        $prospect = $this->makeAssignedProspect([
            'assigned_matchmaker_id' => $this->matchmaker->id,
            'validated_by_manager_id' => $this->manager->id,
        ]);
        $this->attachReadyProfile($prospect);

        $this->actingAs($this->admin)
            ->post(route('staff.prospects.validate', $prospect->id), $this->validPayload())
            ->assertRedirect();

        $prospect->refresh();
        $this->assertSame('member', $prospect->status);
        $this->assertSame($this->matchmaker->id, $prospect->assigned_matchmaker_id);
        $this->assertSame($this->manager->id, $prospect->validated_by_manager_id);
    }

    public function test_assigned_matchmaker_can_validate_prospect(): void
    {
        $prospect = $this->makeAssignedProspect([
            'assigned_matchmaker_id' => $this->matchmaker->id,
        ]);
        $this->attachReadyProfile($prospect);

        $this->actingAs($this->matchmaker)
            ->post(route('staff.prospects.validate', $prospect->id), $this->validPayload())
            ->assertRedirect();

        $prospect->refresh();
        $this->assertSame('member', $prospect->status);
        $this->assertSame($this->matchmaker->id, $prospect->assigned_matchmaker_id);
    }

    public function test_manager_can_validate_prospect_assigned_to_them(): void
    {
        $prospect = $this->makeAssignedProspect([
            'assigned_matchmaker_id' => $this->manager->id,
        ]);
        $this->attachReadyProfile($prospect);

        $this->actingAs($this->manager)
            ->post(route('staff.prospects.validate', $prospect->id), $this->validPayload())
            ->assertRedirect();

        $prospect->refresh();
        $this->assertSame('member', $prospect->status);
        $this->assertSame($this->manager->id, $prospect->assigned_matchmaker_id);
        $this->assertSame($this->manager->id, $prospect->validated_by_manager_id);
    }

    private function makeUnassignedProspect(): User
    {
        $prospect = User::factory()->create([
            'status' => 'prospect',
            'assigned_matchmaker_id' => null,
        ]);
        $prospect->assignRole('user');

        return $prospect;
    }

    private function makeAssignedProspect(array $overrides = []): User
    {
        $prospect = User::factory()->create(array_merge([
            'status' => 'prospect',
            'assigned_matchmaker_id' => $this->matchmaker->id,
        ], $overrides));
        $prospect->assignRole('user');

        return $prospect;
    }

    private function attachReadyProfile(User $prospect): Profile
    {
        return Profile::create([
            'user_id' => $prospect->id,
            'cin' => Crypt::encryptString('AB12345'),
            'document_type' => 'cin',
            'identity_card_front_path' => 'identity-cards/test-front.jpg',
            'identity_card_front_hash' => 'testhash',
        ]);
    }

    private function validPayload(): array
    {
        return [
            'document_type' => 'cin',
            'service_id' => $this->service->id,
            'matrimonial_pack_id' => $this->pack->id,
            'pack_price' => 1000,
            'pack_advantages' => ['Suivi et accompagnement personnalisé'],
            'payment_mode' => 'Virement',
            'notes' => 'OK',
        ];
    }

    private function assertProspectUnchanged(User $prospect): void
    {
        $prospect->refresh();
        $this->assertSame('prospect', $prospect->status);
        $this->assertNull($prospect->assigned_matchmaker_id);
    }
}
