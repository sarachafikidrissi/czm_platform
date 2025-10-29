<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Agency;

class AgencySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $agencies = [
            [
                'name' => 'Agence Matrimoniale Casablanca',
                'country' => 'Morocco',
                'city' => 'Casablanca',
                'address' => 'Avenue Mohammed V, Casablanca 20000, Morocco',
                'image' => null,
                'map' => 'https://maps.google.com/?q=Casablanca,Morocco'
            ],
            [
                'name' => 'Centre de Mariage Rabat',
                'country' => 'Morocco',
                'city' => 'Rabat',
                'address' => 'Rue Allal Ben Abdellah, Rabat 10000, Morocco',
                'image' => null,
                'map' => 'https://maps.google.com/?q=Rabat,Morocco'
            ],
            [
                'name' => 'Agence Conjugale Marrakech',
                'country' => 'Morocco',
                'city' => 'Marrakech',
                'address' => 'Place Jemaa el-Fnaa, Marrakech 40000, Morocco',
                'image' => null,
                'map' => 'https://maps.google.com/?q=Marrakech,Morocco'
            ],
            [
                'name' => 'Institut Matrimonial Fès',
                'country' => 'Morocco',
                'city' => 'Fès',
                'address' => 'Boulevard Mohammed V, Fès 30000, Morocco',
                'image' => null,
                'map' => 'https://maps.google.com/?q=Fès,Morocco'
            ],
            [
                'name' => 'Centre de Rencontres Agadir',
                'country' => 'Morocco',
                'city' => 'Agadir',
                'address' => 'Avenue Hassan II, Agadir 80000, Morocco',
                'image' => null,
                'map' => 'https://maps.google.com/?q=Agadir,Morocco'
            ],
            [
                'name' => 'Agence Matrimoniale Tanger',
                'country' => 'Morocco',
                'city' => 'Tanger',
                'address' => 'Avenue Mohammed VI, Tanger 90000, Morocco',
                'image' => null,
                'map' => 'https://maps.google.com/?q=Tanger,Morocco'
            ],
            [
                'name' => 'Centre de Mariage Meknès',
                'country' => 'Morocco',
                'city' => 'Meknès',
                'address' => 'Place El Hedim, Meknès 50000, Morocco',
                'image' => null,
                'map' => 'https://maps.google.com/?q=Meknès,Morocco'
            ],
            [
                'name' => 'Institut Conjugal Oujda',
                'country' => 'Morocco',
                'city' => 'Oujda',
                'address' => 'Boulevard Mohammed V, Oujda 60000, Morocco',
                'image' => null,
                'map' => 'https://maps.google.com/?q=Oujda,Morocco'
            ],
            [
                'name' => 'Agence de Rencontres Tétouan',
                'country' => 'Morocco',
                'city' => 'Tétouan',
                'address' => 'Avenue Hassan II, Tétouan 93000, Morocco',
                'image' => null,
                'map' => 'https://maps.google.com/?q=Tétouan,Morocco'
            ],
            [
                'name' => 'Centre Matrimonial Salé',
                'country' => 'Morocco',
                'city' => 'Salé',
                'address' => 'Avenue Mohammed V, Salé 11000, Morocco',
                'image' => null,
                'map' => 'https://maps.google.com/?q=Salé,Morocco'
            ]
        ];

        foreach ($agencies as $agency) {
            Agency::create($agency);
        }
    }
}