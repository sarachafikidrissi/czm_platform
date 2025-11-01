<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('profiles', function (Blueprint $table) {
            // New fields for Step 1
            $table->string('origine')->nullable()->after('religion');
            $table->string('ville_residence')->nullable()->after('origine');
            $table->string('ville_origine')->nullable()->after('ville_residence');
            $table->string('pays_origine')->nullable()->after('ville_origine');
            
            
            // New field for Step 3
            $table->text('profil_recherche_description')->nullable()->after('religion_recherche');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('profiles', function (Blueprint $table) {
            $table->dropColumn([
                'origine',
                'ville_residence',
                'ville_origine',
                'pays_origine',
                'profil_recherche_description',
            ]);
        });
    }
};
