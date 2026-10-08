<?php

namespace Tests\Feature\Auth;

use Spatie\Permission\Models\Role;
use Tests\TestCase;

class RegistrationTest extends TestCase
{

    public function test_registration_screen_can_be_rendered()
    {
        $response = $this->get('/register');

        $response->assertStatus(200);
    }

    public function test_new_users_can_register()
    {
        Role::findOrCreate('user', 'web');

        $response = $this->post('/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'phone' => '+212600000000',
            'gender' => 'male',
            'country' => 'MA',
            'city' => 'Casablanca',
            'condition' => true,
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect(route('dashboard', absolute: false));
    }
}
