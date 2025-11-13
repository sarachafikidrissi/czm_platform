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
            // Add a temporary JSON column
            $table->json('pays_recherche_temp')->nullable()->after('pays_recherche');
        });
        
        // Convert data: convert strings to JSON arrays
        $profiles = \DB::table('profiles')->whereNotNull('pays_recherche')->get();
        foreach ($profiles as $profile) {
            $value = $profile->pays_recherche;
            $jsonValue = json_encode([$value]);
            
            \DB::table('profiles')->where('id', $profile->id)->update(['pays_recherche_temp' => $jsonValue]);
        }
        
        Schema::table('profiles', function (Blueprint $table) {
            // Drop the string column
            $table->dropColumn('pays_recherche');
            // Rename temp column
            $table->renameColumn('pays_recherche_temp', 'pays_recherche');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('profiles', function (Blueprint $table) {
            // Add a temporary string column
            $table->string('pays_recherche_temp')->nullable()->after('pays_recherche');
        });
        
        // Convert JSON arrays back to strings (take first element)
        $profiles = \DB::table('profiles')->whereNotNull('pays_recherche')->get();
        
        foreach ($profiles as $profile) {
            $decoded = json_decode($profile->pays_recherche, true);
            if (is_array($decoded) && count($decoded) > 0) {
                \DB::table('profiles')->where('id', $profile->id)->update(['pays_recherche_temp' => $decoded[0]]);
            }
        }
        
        Schema::table('profiles', function (Blueprint $table) {
            // Drop the JSON column
            $table->dropColumn('pays_recherche');
            // Rename temp column
            $table->renameColumn('pays_recherche_temp', 'pays_recherche');
        });
    }
};
