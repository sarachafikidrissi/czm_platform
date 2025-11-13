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
            $table->json('etat_matrimonial_temp')->nullable()->after('etat_matrimonial');
        });
        
        // Convert data: convert strings to JSON arrays
        $profiles = \DB::table('profiles')->whereNotNull('etat_matrimonial')->where('etat_matrimonial', '!=', '')->get();
        foreach ($profiles as $profile) {
            $value = $profile->etat_matrimonial;
            $jsonValue = json_encode([$value]);
            
            \DB::table('profiles')->where('id', $profile->id)->update(['etat_matrimonial_temp' => $jsonValue]);
        }
        
        Schema::table('profiles', function (Blueprint $table) {
            // Drop the string column
            $table->dropColumn('etat_matrimonial');
            // Rename temp column
            $table->renameColumn('etat_matrimonial_temp', 'etat_matrimonial');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('profiles', function (Blueprint $table) {
            // Add a temporary string column
            $table->string('etat_matrimonial_temp')->nullable()->after('etat_matrimonial');
        });
        
        // Convert JSON arrays back to strings (take first element)
        $profiles = \DB::table('profiles')->whereNotNull('etat_matrimonial')->get();
        
        foreach ($profiles as $profile) {
            $decoded = json_decode($profile->etat_matrimonial, true);
            if (is_array($decoded) && count($decoded) > 0) {
                \DB::table('profiles')->where('id', $profile->id)->update(['etat_matrimonial_temp' => $decoded[0]]);
            }
        }
        
        Schema::table('profiles', function (Blueprint $table) {
            // Drop the JSON column
            $table->dropColumn('etat_matrimonial');
            // Rename temp column
            $table->renameColumn('etat_matrimonial_temp', 'etat_matrimonial');
        });
    }
};
