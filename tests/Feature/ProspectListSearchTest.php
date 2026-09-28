<?php

namespace Tests\Feature;

use App\Models\Agency;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ProspectListSearchTest extends TestCase
{
    use RefreshDatabase;

    private Agency $agency;

    private User $matchmaker;

    private User $admin;

    private User $manager;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['admin', 'manager', 'matchmaker', 'user'] as $role) {
            Role::findOrCreate($role, 'web');
        }

        $this->agency = Agency::create([
            'name' => 'Test Agency',
            'country' => 'MA',
            'city' => 'Casablanca',
            'address' => '1 Rue Test',
        ]);

        $this->matchmaker = User::factory()->create([
            'approval_status' => 'approved',
            'agency_id' => $this->agency->id,
        ]);
        $this->matchmaker->assignRole('matchmaker');

        $this->manager = User::factory()->create([
            'approval_status' => 'approved',
            'agency_id' => $this->agency->id,
        ]);
        $this->manager->assignRole('manager');

        $this->admin = User::factory()->create([
            'approval_status' => 'approved',
        ]);
        $this->admin->assignRole('admin');
    }

    /**
     * Seed enough assigned active prospects so $target lands on page 2 (per_page=5).
     */
    private function seedAssignedProspectsWithPageTwoTarget(): User
    {
        $older = now()->subDays(10);

        for ($i = 0; $i < 5; $i++) {
            $prospect = User::factory()->create([
                'name' => "PageOne Prospect {$i}",
                'status' => 'prospect',
                'assigned_matchmaker_id' => $this->matchmaker->id,
                'agency_id' => $this->agency->id,
                'rejection_reason' => null,
                'is_traite' => false,
                'created_at' => $older->copy()->addSeconds($i),
                'updated_at' => $older->copy()->addSeconds($i),
            ]);
            $prospect->assignRole('user');
        }

        $target = User::factory()->create([
            'name' => 'UniquePageTwoTarget',
            'email' => 'unique-page-two@example.com',
            'username' => 'unique_page_two',
            'status' => 'prospect',
            'assigned_matchmaker_id' => $this->matchmaker->id,
            'agency_id' => $this->agency->id,
            'rejection_reason' => null,
            'is_traite' => false,
            'created_at' => $older->copy()->subDay(),
            'updated_at' => $older->copy()->subDay(),
        ]);
        $target->assignRole('user');

        return $target;
    }

    public function test_agency_prospects_search_finds_record_beyond_first_page(): void
    {
        $target = $this->seedAssignedProspectsWithPageTwoTarget();

        $this->actingAs($this->matchmaker)
            ->get(route('staff.agency-prospects', ['search' => 'UniquePageTwoTarget']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('matchmaker/agency-prospects')
                ->where('search', 'UniquePageTwoTarget')
                ->has('prospects.data', 1)
                ->where('prospects.data.0.id', $target->id)
                ->where('prospects.data.0.name', 'UniquePageTwoTarget')
            );
    }

    public function test_agency_prospects_search_with_no_match_returns_empty_page(): void
    {
        $this->seedAssignedProspectsWithPageTwoTarget();

        $this->actingAs($this->matchmaker)
            ->get(route('staff.agency-prospects', ['search' => 'zzzz-no-such-prospect']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('matchmaker/agency-prospects')
                ->where('search', 'zzzz-no-such-prospect')
                ->has('prospects.data', 0)
                ->where('prospects.total', 0)
            );
    }

    public function test_agency_prospects_search_and_status_filter_combine_with_and_logic(): void
    {
        $target = $this->seedAssignedProspectsWithPageTwoTarget();
        $target->update([
            'rejection_reason' => 'Hors critères',
            'rejected_by' => $this->matchmaker->id,
            'rejected_at' => now(),
        ]);

        // Active (default) + search for rejected target → empty
        $this->actingAs($this->matchmaker)
            ->get(route('staff.agency-prospects', ['search' => 'UniquePageTwoTarget']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('prospects.data', 0)
            );

        // Rejected + search → found
        $this->actingAs($this->matchmaker)
            ->get(route('staff.agency-prospects', [
                'search' => 'UniquePageTwoTarget',
                'status_filter' => 'rejected',
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('prospects.data', 1)
                ->where('prospects.data.0.id', $target->id)
            );
    }

    public function test_matchmaker_rejected_list_includes_prospects_rejected_by_someone_else(): void
    {
        $prospect = User::factory()->create([
            'name' => 'Rejected By Admin',
            'status' => 'prospect',
            'assigned_matchmaker_id' => $this->matchmaker->id,
            'agency_id' => $this->agency->id,
            'rejection_reason' => 'test',
            'rejected_by' => $this->admin->id,
            'rejected_at' => now(),
        ]);
        $prospect->assignRole('user');

        $this->actingAs($this->matchmaker)
            ->get(route('staff.agency-prospects', ['status_filter' => 'rejected']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('prospects.data', 1)
                ->where('prospects.data.0.id', $prospect->id)
            );
    }


    public function test_admin_prospects_search_finds_record_beyond_first_page(): void
    {
        $older = now()->subDays(10);

        for ($i = 0; $i < 10; $i++) {
            $prospect = User::factory()->create([
                'name' => "AdminPageOne {$i}",
                'status' => 'prospect',
                'rejection_reason' => null,
                'is_traite' => false,
                'created_at' => $older->copy()->addSeconds($i),
                'updated_at' => $older->copy()->addSeconds($i),
            ]);
            $prospect->assignRole('user');
        }

        $target = User::factory()->create([
            'name' => 'AdminUniqueTarget',
            'status' => 'prospect',
            'rejection_reason' => null,
            'is_traite' => false,
            'created_at' => $older->copy()->subDay(),
            'updated_at' => $older->copy()->subDay(),
        ]);
        $target->assignRole('user');

        $this->actingAs($this->admin)
            ->get(route('admin.prospects', ['search' => 'AdminUniqueTarget']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/prospects-dispatch')
                ->where('search', 'AdminUniqueTarget')
                ->has('prospects.data', 1)
                ->where('prospects.data.0.id', $target->id)
            );
    }

    public function test_manager_prospects_dispatch_search_finds_record_beyond_first_page(): void
    {
        $older = now()->subDays(10);

        for ($i = 0; $i < 5; $i++) {
            $prospect = User::factory()->create([
                'name' => "ManagerPageOne {$i}",
                'status' => 'prospect',
                'agency_id' => $this->agency->id,
                'assigned_matchmaker_id' => null,
                'rejection_reason' => null,
                'is_traite' => false,
                'created_at' => $older->copy()->addSeconds($i),
                'updated_at' => $older->copy()->addSeconds($i),
            ]);
            $prospect->assignRole('user');
        }

        $target = User::factory()->create([
            'name' => 'ManagerUniqueTarget',
            'status' => 'prospect',
            'agency_id' => $this->agency->id,
            'assigned_matchmaker_id' => null,
            'rejection_reason' => null,
            'is_traite' => false,
            'created_at' => $older->copy()->subDay(),
            'updated_at' => $older->copy()->subDay(),
        ]);
        $target->assignRole('user');

        $this->actingAs($this->manager)
            ->get(route('manager.prospects-dispatch', ['search' => 'ManagerUniqueTarget']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('manager/prospects-dispatch')
                ->where('search', 'ManagerUniqueTarget')
                ->has('prospects.data', 1)
                ->where('prospects.data.0.id', $target->id)
            );
    }

    public function test_validated_prospects_search_finds_record_beyond_first_page(): void
    {
        $older = now()->subDays(10);

        for ($i = 0; $i < 5; $i++) {
            $member = User::factory()->create([
                'name' => "ValidatedPageOne {$i}",
                'status' => 'member',
                'assigned_matchmaker_id' => $this->matchmaker->id,
                'agency_id' => $this->agency->id,
                'created_at' => $older->copy()->addSeconds($i),
                'updated_at' => $older->copy()->addSeconds($i),
            ]);
            $member->assignRole('user');
        }

        $target = User::factory()->create([
            'name' => 'ValidatedUniqueTarget',
            'status' => 'member',
            'assigned_matchmaker_id' => $this->matchmaker->id,
            'agency_id' => $this->agency->id,
            'created_at' => $older->copy()->subDay(),
            'updated_at' => $older->copy()->subDay(),
        ]);
        $target->assignRole('user');

        $this->actingAs($this->matchmaker)
            ->get(route('staff.prospects.validated', ['search' => 'ValidatedUniqueTarget']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('matchmaker/validated-prospects')
                ->where('search', 'ValidatedUniqueTarget')
                ->has('prospects.data', 1)
                ->where('prospects.data.0.id', $target->id)
            );
    }

    public function test_validated_prospects_search_and_status_filter_combine_with_and_logic(): void
    {
        $member = User::factory()->create([
            'name' => 'ComboSearchMember',
            'status' => 'member',
            'assigned_matchmaker_id' => $this->matchmaker->id,
            'agency_id' => $this->agency->id,
        ]);
        $member->assignRole('user');

        $client = User::factory()->create([
            'name' => 'ComboSearchClient',
            'status' => 'client',
            'assigned_matchmaker_id' => $this->matchmaker->id,
            'agency_id' => $this->agency->id,
        ]);
        $client->assignRole('user');

        $this->actingAs($this->matchmaker)
            ->get(route('staff.prospects.validated', [
                'search' => 'ComboSearch',
                'status' => 'client',
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('prospects.data', 1)
                ->where('prospects.data.0.id', $client->id)
            );
    }

    public function test_search_treats_percent_as_literal_character(): void
    {
        $literal = User::factory()->create([
            'name' => 'Literal100%Match',
            'status' => 'prospect',
            'assigned_matchmaker_id' => $this->matchmaker->id,
            'agency_id' => $this->agency->id,
            'rejection_reason' => null,
            'is_traite' => false,
        ]);
        $literal->assignRole('user');

        $broader = User::factory()->create([
            'name' => 'Literal100XMatch',
            'status' => 'prospect',
            'assigned_matchmaker_id' => $this->matchmaker->id,
            'agency_id' => $this->agency->id,
            'rejection_reason' => null,
            'is_traite' => false,
        ]);
        $broader->assignRole('user');

        $this->actingAs($this->matchmaker)
            ->get(route('staff.agency-prospects', ['search' => '100%']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('search', '100%')
                ->has('prospects.data', 1)
                ->where('prospects.data.0.id', $literal->id)
            );
    }

    public function test_search_treats_underscore_as_literal_character(): void
    {
        $literal = User::factory()->create([
            'name' => 'test_user',
            'status' => 'prospect',
            'assigned_matchmaker_id' => $this->matchmaker->id,
            'agency_id' => $this->agency->id,
            'rejection_reason' => null,
            'is_traite' => false,
        ]);
        $literal->assignRole('user');

        $broader = User::factory()->create([
            'name' => 'testXuser',
            'status' => 'prospect',
            'assigned_matchmaker_id' => $this->matchmaker->id,
            'agency_id' => $this->agency->id,
            'rejection_reason' => null,
            'is_traite' => false,
        ]);
        $broader->assignRole('user');

        $this->actingAs($this->matchmaker)
            ->get(route('staff.agency-prospects', ['search' => 'test_user']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('search', 'test_user')
                ->has('prospects.data', 1)
                ->where('prospects.data.0.id', $literal->id)
            );
    }

    public function test_search_without_special_characters_still_works(): void
    {
        $target = $this->seedAssignedProspectsWithPageTwoTarget();

        $this->actingAs($this->matchmaker)
            ->get(route('staff.agency-prospects', ['search' => 'UniquePageTwoTarget']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('search', 'UniquePageTwoTarget')
                ->has('prospects.data', 1)
                ->where('prospects.data.0.id', $target->id)
            );
    }
}
