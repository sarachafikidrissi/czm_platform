<?php

namespace Tests\Unit;

use App\Models\User;
use App\Support\UsernameGenerator;
use Tests\TestCase;

class UsernameGeneratorTest extends TestCase
{

    public function test_slug_is_taken_from_the_name(): void
    {
        $this->assertSame('sara-alami', UsernameGenerator::fromName('Sara Alami', 'sara@example.com'));
    }

    public function test_non_latin_name_falls_back_to_the_email(): void
    {
        $this->assertSame('fatima', UsernameGenerator::fromName('***', 'fatima@example.com'));
    }

    public function test_duplicate_names_get_a_numeric_suffix(): void
    {
        User::factory()->create([
            'name' => 'Sara Alami',
            'username' => 'sara-alami',
            'email' => 'one@example.com',
        ]);

        $this->assertSame('sara-alami1', UsernameGenerator::fromName('Sara Alami', 'two@example.com'));
    }
}
