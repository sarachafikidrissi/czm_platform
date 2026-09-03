<?php

namespace Tests\Feature;

use App\Models\Agency;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ProfileMultiRoleWriteAccessTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['admin', 'manager', 'matchmaker', 'user'] as $role) {
            Role::findOrCreate($role, 'web');
        }
    }

    public function test_admin_and_matchmaker_roles_grant_write_access_regardless_of_role_order(): void
    {
        $agency = Agency::create([
            'name' => 'Test Agency',
            'country' => 'MA',
            'city' => 'Casablanca',
            'address' => '1 Rue Test',
        ]);

        $member = User::factory()->create([
            'username' => 'multi-role-member',
            'status' => 'member',
            'agency_id' => $agency->id,
        ]);
        $member->assignRole('user');

        $matchmakerFirst = User::factory()->create([
            'approval_status' => 'approved',
            'agency_id' => $agency->id,
        ]);
        $matchmakerFirst->assignRole('matchmaker');
        $matchmakerFirst->assignRole('admin');

        $this->actingAs($matchmakerFirst)
            ->get(route('profile.show', ['username' => $member->username]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('evaluationAccessLevel', 'write')
            );

        $adminFirst = User::factory()->create([
            'approval_status' => 'approved',
            'agency_id' => $agency->id,
        ]);
        $adminFirst->syncRoles(['admin', 'matchmaker']);

        $this->actingAs($adminFirst)
            ->get(route('profile.show', ['username' => $member->username]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('evaluationAccessLevel', 'write')
            );
    }
}
