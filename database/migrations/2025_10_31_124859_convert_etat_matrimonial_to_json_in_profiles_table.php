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
            // Convert existing string values to JSON arrays before changing column type
            $profiles = \DB::table('profiles')->whereNotNull('situation_matrimoniale_recherche')->where('situation_matrimoniale_recherche', '!=', '')->get();
            
            foreach ($profiles as $profile) {
                // Convert string to JSON array
                $value = json_encode([$profile->situation_matrimoniale_recherche]);
                \DB::table('profiles')->where('id', $profile->id)->update(['situation_matrimoniale_recherche' => $value]);
            }
            
            // Now change the column type to JSON
            $table->json('situation_matrimoniale_recherche')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('profiles', function (Blueprint $table) {
            // Convert JSON arrays back to strings (take first element)
            $profiles = \DB::table('profiles')->whereNotNull('situation_matrimoniale_recherche')->get();
            
            foreach ($profiles as $profile) {
                $decoded = json_decode($profile->situation_matrimoniale_recherche, true);
                if (is_array($decoded) && count($decoded) > 0) {
                    \DB::table('profiles')->where('id', $profile->id)->update(['situation_matrimoniale_recherche' => $decoded[0]]);
                }
            }
            
            // Now change back to string
            $table->string('situation_matrimoniale_recherche')->nullable()->change();
        });
    }
};
