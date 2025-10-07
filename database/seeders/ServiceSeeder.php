<?php

namespace Database\Seeders;

use App\Models\Service;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class ServiceSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Service::insert([
            [
                "name" => "Matchmaking"
            ],
            [
                "name" => "Le coaching matrimonial"
            ],
            [
                "name" => "Le conseil conjugal"
            ],
            [
                "name" => "L’étiquette de protocole"
            ],
            [
                "name" => "Conseil juridique"
            ],
            [
                "name" => "CZM Wedding preparation"
            ]
        ]);
    }
}
