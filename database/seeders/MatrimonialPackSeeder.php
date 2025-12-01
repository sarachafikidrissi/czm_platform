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
                'duration' => 6,
            ],
            [
                'name' => 'Pack Silver',
                'duration' => 6,
            ],
            [
                'name' => 'Pack Gold',
                'duration' => 12,
            ],
            [
                'name' => 'Pack Diamond',
                'duration' => 12,
            ],
        ];

        foreach ($packs as $pack) {
            MatrimonialPack::create($pack);
        }
    }
}
