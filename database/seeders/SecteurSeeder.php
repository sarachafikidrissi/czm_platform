<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Secteur;

class SecteurSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $secteurs = [
            'Agriculture',
            'Artisanat',
            'Assurance',
            'Automobile',
            'Banque',
            'Bâtiment / Travaux Publics',
            'Commerce / Distribution',
            'Communication / Publicité',
            'Culture / Loisirs / Sport',
            'Défense / Sécurité',
            'Éducation / Enseignement',
            'Énergie / Environnement',
            'Finance / Audit / Comptabilité',
            'Immobilier',
            'Industrie',
            'Informatique / Télécoms',
            'Juridique',
            'Logistique / Transport',
            'Médias / Journalisme',
            'Mode / Luxe / Beauté',
            'Recherche / Sciences',
            'Restauration / Hôtellerie / Tourisme',
            'Santé / Social',
            'Services aux entreprises',
            'Textile / Habillement / Cuir',
        ];

        foreach ($secteurs as $name) {
            Secteur::firstOrCreate(['name' => $name]);
        }
    }
}
