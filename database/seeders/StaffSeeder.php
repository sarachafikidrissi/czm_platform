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
                'password' => Hash::make('admin@matrimony.com'),
                'phone' => '+212600000001',
                'gender' => 'male',
                'country' => 'Morocco',
                'city' => 'Casablanca',
                'username' => 'admin',
                'condition' => true,
                'email_verified_at' => now(),
                'approval_status' => 'approved',
            ]
        );
        $admin->assignRole('admin');

        // Create Manager User
        $manager = User::create(
            [
                'email' => 'manager@matrimony.com',
                'name' => 'Site Manager',
                'password' => Hash::make('manager@matrimony.com'),
                'phone' => '+212600000002',
                'gender' => 'female',
                'country' => 'Morocco',
                'city' => 'Rabat',
                'username' => 'manager',
                'condition' => true,
                'email_verified_at' => now(),
                'approval_status' => 'approved',
            ]
        );
        $manager->assignRole('manager');

        // Create Matchmaker User
        $matchmakera = User::create(
            [
                'email' => 'matchmakera@matrimony.com',
                'name' => 'Matchmaker A',
                'password' => Hash::make('matchmakera@matrimony.com'),
                'phone' => '+212600000003',
                'gender' => 'female',
                'country' => 'Morocco',
                'city' => 'Marrakech',
                'username' => 'matchmaker A',
                'condition' => true,
                'email_verified_at' => now(),
                'approval_status' => 'approved',
            ]
        );
        $matchmakera->assignRole('matchmaker');
        $matchmakerb = User::create(
            [
                'email' => 'matchmakerb@matrimony.com',
                'name' => 'Matchmaker B',
                'password' => Hash::make('matchmakerb@matrimony.com'),
                'phone' => '+212600000004',
                'gender' => 'female',
                'country' => 'Morocco',
                'city' => 'Marrakech',
                'username' => 'matchmaker B',
                'condition' => true,
                'email_verified_at' => now(),
                'approval_status' => 'approved',
            ]
        );
        $matchmakerb->assignRole('matchmaker');

    }
}
