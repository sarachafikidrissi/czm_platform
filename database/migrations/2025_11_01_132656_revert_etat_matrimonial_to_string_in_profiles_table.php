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
            // Add a temporary string column
            $table->string('etat_matrimonial_temp')->nullable()->after('etat_matrimonial');
        });
        
        // Convert data: try to extract from JSON if valid, otherwise keep as string
        $profiles = \DB::table('profiles')->whereNotNull('etat_matrimonial')->get();
        foreach ($profiles as $profile) {
            $value = $profile->etat_matrimonial;
            $stringValue = null;
            
            // Try to decode as JSON
            if (is_string($value)) {
                $decoded = json_decode($value, true);
                if (json_last_error() === JSON_ERROR_NONE && is_array($decoded) && count($decoded) > 0) {
                    // It's valid JSON array, take first element
                    $stringValue = $decoded[0];
                } elseif (json_last_error() === JSON_ERROR_NONE && is_string($decoded)) {
                    // It's valid JSON string
                    $stringValue = $decoded;
                } else {
                    // Not valid JSON, use as string
                    $stringValue = $value;
                }
            } else {
                $stringValue = $value;
            }
            
            \DB::table('profiles')->where('id', $profile->id)->update(['etat_matrimonial_temp' => $stringValue]);
        }
        
        Schema::table('profiles', function (Blueprint $table) {
            // Drop the JSON column
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
            // Add a temporary JSON column
            $table->json('etat_matrimonial_temp')->nullable()->after('etat_matrimonial');
        });
        
        // Convert strings back to JSON arrays
        $profiles = \DB::table('profiles')->whereNotNull('etat_matrimonial')->get();
        
        foreach ($profiles as $profile) {
            $value = json_encode([$profile->etat_matrimonial]);
            \DB::table('profiles')->where('id', $profile->id)->update(['etat_matrimonial_temp' => $value]);
        }
        
        Schema::table('profiles', function (Blueprint $table) {
            // Drop the string column
            $table->dropColumn('etat_matrimonial');
            // Rename temp column
            $table->renameColumn('etat_matrimonial_temp', 'etat_matrimonial');
        });
    }
};
