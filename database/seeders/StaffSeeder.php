<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class StaffSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create Admin User
        $admin = User::create(
            [
                'name' => 'System Administrator',
                'email' => 'admin@matrimony.com',
                'password' => Hash::make('admin123'),
                'phone' => '+212600000001',
                'gender' => 'male',
                'country' => 'Morocco',
                'city' => 'Casablanca',
                'condition' => true,
                'email_verified_at' => now(),
            ]
        );
        $admin->assignRole('admin');

        // Create Manager User
        $manager = User::create(
            ['email' => 'manager@matrimony.com',
            
                'name' => 'Site Manager',
                'password' => Hash::make('manager123'),
                'phone' => '+212600000002',
                'gender' => 'female',
                'country' => 'Morocco',
                'city' => 'Rabat',
                'condition' => true,
                'email_verified_at' => now(),
            ]
        );
        $manager->assignRole('manager');

        // Create Matchmaker User
        $matchmaker = User::create(
            ['email' => 'matchmaker@matrimony.com',
            
                'name' => 'Professional Matchmaker',
                'password' => Hash::make('matchmaker123'),
                'phone' => '+212600000003',
                'gender' => 'female',
                'country' => 'Morocco',
                'city' => 'Marrakech',
                'condition' => true,
                'email_verified_at' => now(),
            ]
        );
        $matchmaker->assignRole('matchmaker');

    }
}
