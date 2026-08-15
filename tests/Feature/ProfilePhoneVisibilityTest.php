<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ProfilePhoneVisibilityTest extends TestCase
{
    use RefreshDatabase;

    protected function makeUserWithRole(string $role, array $overrides = []): User
    {
        Role::findOrCreate($role, 'web');

        $defaults = [
            'name' => fake()->unique()->name(),
            'username' => fake()->unique()->userName(),
            'email' => fake()->unique()->safeEmail(),
            'phone' => '0612345678',
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

    public function test_member_sees_own_phone_on_profile(): void
    {
        $member = $this->makeUserWithRole('user', ['phone' => '0611111111']);

        $this->actingAs($member)
            ->get(route('profile.show', $member->username))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('user/profile')
                ->where('user.phone', '0611111111')
            );
    }

    public function test_assigned_matchmaker_sees_member_phone(): void
    {
        $matchmaker = $this->makeUserWithRole('matchmaker');
        $member = $this->makeUserWithRole('user', [
            'phone' => '0622222222',
            'assigned_matchmaker_id' => $matchmaker->id,
        ]);

        $this->actingAs($matchmaker)
            ->get(route('profile.show', $member->username))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('user/profile')
                ->where('user.phone', '0622222222')
            );
    }

    public function test_admin_sees_member_phone(): void
    {
        $admin = $this->makeUserWithRole('admin');
        $member = $this->makeUserWithRole('user', ['phone' => '0633333333']);

        $this->actingAs($admin)
            ->get(route('profile.show', $member->username))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('user/profile')
                ->where('user.phone', '0633333333')
            );
    }

    public function test_validating_manager_sees_member_phone(): void
    {
        $manager = $this->makeUserWithRole('manager');
        $member = $this->makeUserWithRole('user', [
            'phone' => '0644444444',
            'validated_by_manager_id' => $manager->id,
        ]);

        $this->actingAs($manager)
            ->get(route('profile.show', $member->username))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('user/profile')
                ->where('user.phone', '0644444444')
            );
    }

    public function test_other_member_does_not_see_phone(): void
    {
        $member = $this->makeUserWithRole('user', ['phone' => '0655555555']);
        $other = $this->makeUserWithRole('user', ['phone' => '0666666666']);

        $this->actingAs($other)
            ->get(route('profile.show', $member->username))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('user/profile')
                ->missing('user.phone')
            );
    }

    public function test_unassigned_matchmaker_does_not_see_phone(): void
    {
        $assigned = $this->makeUserWithRole('matchmaker');
        $otherMatchmaker = $this->makeUserWithRole('matchmaker');
        $member = $this->makeUserWithRole('user', [
            'phone' => '0677777777',
            'assigned_matchmaker_id' => $assigned->id,
        ]);

        $this->actingAs($otherMatchmaker)
            ->get(route('profile.show', $member->username))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('user/profile')
                ->missing('user.phone')
            );
    }

    public function test_agency_manager_sees_member_phone_via_assigned_matchmaker_agency(): void
    {
        $agency = \App\Models\Agency::create([
            'name' => 'Agency Phone Test',
            'country' => 'MA',
            'city' => 'Casablanca',
            'address' => '1 Test St',
        ]);
        $manager = $this->makeUserWithRole('manager', ['agency_id' => $agency->id]);
        $matchmaker = $this->makeUserWithRole('matchmaker', ['agency_id' => $agency->id]);
        $member = $this->makeUserWithRole('user', [
            'phone' => '0699999999',
            'agency_id' => null,
            'assigned_matchmaker_id' => $matchmaker->id,
            'validated_by_manager_id' => null,
        ]);

        $this->actingAs($manager)
            ->get(route('profile.show', $member->username))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('user/profile')
                ->where('user.phone', '0699999999')
                ->where('agencyManager.id', $manager->id)
                ->where('agencyManager.name', $manager->name)
            );
    }

    public function test_staff_profile_phone_remains_visible_to_members(): void
    {
        $matchmaker = $this->makeUserWithRole('matchmaker', ['phone' => '0688888888']);
        $member = $this->makeUserWithRole('user');

        $this->actingAs($member)
            ->get(route('profile.show', $matchmaker->username))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('user/profile')
                ->where('user.phone', '0688888888')
            );
    }
}
