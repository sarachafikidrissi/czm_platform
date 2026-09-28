<?php

namespace Tests\Feature;

use App\Models\Agency;
use App\Models\User;
use App\Models\UserAssignment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class UntreatedProspectCountTest extends TestCase
{
    use RefreshDatabase;

    private Agency $agency;

    private Agency $otherAgency;

    private User $matchmaker;

    private User $otherMatchmaker;

    private User $manager;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['admin', 'manager', 'matchmaker', 'user'] as $role) {
            Role::findOrCreate($role, 'web');
        }

        $this->agency = Agency::create([
            'name' => 'Agency One',
            'country' => 'MA',
            'city' => 'Casablanca',
            'address' => '1 Rue Test',
        ]);

        $this->otherAgency = Agency::create([
            'name' => 'Agency Two',
            'country' => 'MA',
            'city' => 'Rabat',
            'address' => '2 Rue Test',
        ]);

        $this->matchmaker = User::factory()->create([
            'name' => 'Matchmaker One',
            'approval_status' => 'approved',
            'agency_id' => $this->agency->id,
        ]);
        $this->matchmaker->assignRole('matchmaker');

        $this->otherMatchmaker = User::factory()->create([
            'name' => 'Matchmaker Two',
            'approval_status' => 'approved',
            'agency_id' => $this->agency->id,
        ]);
        $this->otherMatchmaker->assignRole('matchmaker');

        $this->manager = User::factory()->create([
            'name' => 'Manager One',
            'approval_status' => 'approved',
            'agency_id' => $this->agency->id,
        ]);
        $this->manager->assignRole('manager');

        $this->admin = User::factory()->create([
            'name' => 'Admin One',
            'approval_status' => 'approved',
        ]);
        $this->admin->assignRole('admin');
    }

    private function createProspect(array $overrides = []): User
    {
        $prospect = User::factory()->create(array_merge([
            'status' => 'prospect',
            'rejection_reason' => null,
            'is_traite' => false,
        ], $overrides));
        $prospect->assignRole('user');

        return $prospect;
    }

    public function test_matchmaker_sees_only_own_untreated_count(): void
    {
        $this->createProspect([
            'assigned_matchmaker_id' => $this->matchmaker->id,
            'is_traite' => false,
        ]);
        $this->createProspect([
            'assigned_matchmaker_id' => $this->matchmaker->id,
            'is_traite' => true,
        ]);
        $this->createProspect([
            'assigned_matchmaker_id' => $this->matchmaker->id,
            'rejection_reason' => 'hors cible',
            'is_traite' => false,
        ]);
        $this->createProspect([
            'assigned_matchmaker_id' => $this->otherMatchmaker->id,
            'is_traite' => false,
        ]);

        $this->actingAs($this->matchmaker)
            ->get(route('staff.agency-prospects'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('matchmaker/agency-prospects')
                ->where('untreatedCount', 1)
                ->where('untreatedSummary.count', 1)
                ->where('untreatedByStaff', [])
            );
    }

    public function test_manager_personal_scope_counts_own_untreated_only(): void
    {
        $this->createProspect([
            'assigned_matchmaker_id' => $this->manager->id,
            'is_traite' => false,
        ]);
        $this->createProspect([
            'assigned_matchmaker_id' => $this->matchmaker->id,
            'is_traite' => false,
        ]);

        $this->actingAs($this->manager)
            ->get(route('staff.agency-prospects', ['scope' => 'mine']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('matchmaker/agency-prospects')
                ->where('scope', 'mine')
                ->where('untreatedCount', 1)
                ->where('untreatedByStaff', [])
            );
    }

    public function test_manager_agency_scope_counts_staff_breakdown(): void
    {
        $this->createProspect([
            'assigned_matchmaker_id' => $this->matchmaker->id,
            'agency_id' => null,
            'is_traite' => false,
        ]);
        $this->createProspect([
            'assigned_matchmaker_id' => $this->matchmaker->id,
            'agency_id' => null,
            'is_traite' => true,
        ]);
        $this->createProspect([
            'assigned_matchmaker_id' => $this->otherMatchmaker->id,
            'agency_id' => null,
            'is_traite' => false,
        ]);
        $this->createProspect([
            'assigned_matchmaker_id' => null,
            'agency_id' => $this->agency->id,
            'is_traite' => false,
        ]);

        $this->actingAs($this->manager)
            ->get(route('staff.agency-prospects'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('matchmaker/agency-prospects')
                ->where('scope', 'agency')
                ->where('untreatedCount', 3)
                ->where('untreatedUnassigned', 1)
                ->where('untreatedByStaff', function ($staff) {
                    $byId = collect($staff)->keyBy('id');

                    return count($staff) === 3
                        && (int) $byId[$this->matchmaker->id]['count'] === 1
                        && (int) $byId[$this->otherMatchmaker->id]['count'] === 1
                        && (int) $byId[$this->manager->id]['count'] === 0;
                })
            );
    }

    public function test_manager_agency_filter_by_matchmaker_narrows_untreated_count(): void
    {
        $this->createProspect([
            'assigned_matchmaker_id' => $this->matchmaker->id,
            'is_traite' => false,
        ]);
        $this->createProspect([
            'assigned_matchmaker_id' => $this->otherMatchmaker->id,
            'is_traite' => false,
        ]);

        $this->actingAs($this->manager)
            ->get(route('staff.agency-prospects', ['matchmaker_id' => $this->matchmaker->id]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('matchmaker/agency-prospects')
                ->where('untreatedCount', 1)
                ->where('matchmaker_id', $this->matchmaker->id)
                ->has('prospects.data', 1)
            );
    }

    public function test_admin_counts_all_agencies_and_staff(): void
    {
        $otherAgencyMatchmaker = User::factory()->create([
            'name' => 'Matchmaker Other Agency',
            'approval_status' => 'approved',
            'agency_id' => $this->otherAgency->id,
        ]);
        $otherAgencyMatchmaker->assignRole('matchmaker');

        $this->createProspect([
            'assigned_matchmaker_id' => $this->matchmaker->id,
            'agency_id' => null,
            'is_traite' => false,
        ]);
        $this->createProspect([
            'assigned_matchmaker_id' => $otherAgencyMatchmaker->id,
            'agency_id' => null,
            'is_traite' => false,
        ]);
        $this->createProspect([
            'assigned_matchmaker_id' => null,
            'agency_id' => $this->agency->id,
            'is_traite' => false,
        ]);
        $this->createProspect([
            'assigned_matchmaker_id' => null,
            'agency_id' => null,
            'is_traite' => false,
        ]);
        $this->createProspect([
            'assigned_matchmaker_id' => $this->matchmaker->id,
            'is_traite' => true,
        ]);

        $this->actingAs($this->admin)
            ->get(route('admin.prospects'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/prospects-dispatch')
                ->where('untreatedCount', 4)
                ->where('untreatedUnassigned', 1)
                ->where('untreatedByAgency', function ($agencies) {
                    $byName = collect($agencies)->keyBy('name');

                    return (int) $byName['Agency One']['count'] === 2
                        && (int) $byName['Agency Two']['count'] === 1;
                })
                ->where('untreatedByStaff', function ($staff) {
                    $byId = collect($staff)->keyBy('id');

                    return (int) $byId[$this->matchmaker->id]['count'] === 1;
                })
            );
    }

    public function test_admin_agency_filter_narrows_untreated_count(): void
    {
        $otherAgencyMatchmaker = User::factory()->create([
            'approval_status' => 'approved',
            'agency_id' => $this->otherAgency->id,
        ]);
        $otherAgencyMatchmaker->assignRole('matchmaker');

        $this->createProspect([
            'assigned_matchmaker_id' => $this->matchmaker->id,
            'is_traite' => false,
        ]);
        $this->createProspect([
            'assigned_matchmaker_id' => $otherAgencyMatchmaker->id,
            'is_traite' => false,
        ]);

        $this->actingAs($this->admin)
            ->get(route('admin.prospects', ['agency_id' => $this->agency->id]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/prospects-dispatch')
                ->where('untreatedCount', 1)
                ->where('untreatedSummary.count', 1)
                ->where('agency_id', $this->agency->id)
            );
    }

    public function test_untreated_summary_uses_created_at_when_unassigned(): void
    {
        $this->createProspect([
            'assigned_matchmaker_id' => $this->matchmaker->id,
            'is_traite' => false,
            'created_at' => now()->subDays(6),
            'updated_at' => now()->subDays(6),
        ]);
        $this->createProspect([
            'assigned_matchmaker_id' => $this->matchmaker->id,
            'is_traite' => false,
            'created_at' => now()->subHours(12),
            'updated_at' => now()->subHours(12),
        ]);

        $this->actingAs($this->matchmaker)
            ->get(route('staff.agency-prospects'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('untreatedSummary.count', 2)
                ->where('untreatedSummary.oldest_days', 6)
                ->where('untreatedSummary.overdue_48h_count', 1)
            );
    }

    public function test_untreated_summary_uses_assignment_date_over_created_at(): void
    {
        $prospect = $this->createProspect([
            'assigned_matchmaker_id' => $this->matchmaker->id,
            'is_traite' => false,
            'created_at' => now()->subDays(10),
            'updated_at' => now()->subDays(10),
        ]);

        UserAssignment::create([
            'user_id' => $prospect->id,
            'matchmaker_id' => $this->matchmaker->id,
            'assigned_at' => now()->subDay(),
            'unassigned_at' => null,
            'reason' => 'initial',
        ]);

        $this->actingAs($this->matchmaker)
            ->get(route('staff.agency-prospects'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('untreatedSummary.count', 1)
                ->where('untreatedSummary.oldest_days', 1)
                ->where('untreatedSummary.overdue_48h_count', 0)
            );
    }

    public function test_non_traite_status_filter_returns_only_untreated_prospects(): void
    {
        $untreated = $this->createProspect([
            'assigned_matchmaker_id' => $this->matchmaker->id,
            'is_traite' => false,
        ]);
        $this->createProspect([
            'assigned_matchmaker_id' => $this->matchmaker->id,
            'is_traite' => true,
        ]);

        $this->actingAs($this->matchmaker)
            ->get(route('staff.agency-prospects', ['status_filter' => 'non_traite']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('statusFilter', 'non_traite')
                ->has('prospects.data', 1)
                ->where('prospects.data.0.id', $untreated->id)
            );
    }

    public function test_admin_non_traite_filter_and_summary_respect_agency_filter(): void
    {
        $this->createProspect([
            'assigned_matchmaker_id' => $this->matchmaker->id,
            'is_traite' => false,
            'created_at' => now()->subDays(3),
        ]);
        $this->createProspect([
            'assigned_matchmaker_id' => $this->matchmaker->id,
            'is_traite' => true,
        ]);

        $this->actingAs($this->admin)
            ->get(route('admin.prospects', [
                'agency_id' => $this->agency->id,
                'status_filter' => 'non_traite',
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/prospects-dispatch')
                ->where('statusFilter', 'non_traite')
                ->has('prospects.data', 1)
                ->where('untreatedSummary.count', 1)
                ->where('untreatedSummary.oldest_days', 3)
            );
    }
}
