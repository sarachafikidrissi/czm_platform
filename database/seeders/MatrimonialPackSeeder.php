<?php

namespace Database\Seeders;

use App\Models\MatrimonialPack;
use Illuminate\Database\Seeder;

class MatrimonialPackSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $packs = [
            [
                'name' => 'Pack Bronze',
                'duration' => '6 mois',
            ],
            [
                'name' => 'Pack Silver',
                'duration' => '6 mois dont 1 mois intensif',
            ],
            [
                'name' => 'Pack Gold',
                'duration' => '12 mois dont 2 mois intensifs',
            ],
            [
                'name' => 'Pack Diamond',
                'duration' => '12 mois dont 3 mois intensifs',
            ],
        ];

        foreach ($packs as $pack) {
            MatrimonialPack::create($pack);
        }
    }
}
