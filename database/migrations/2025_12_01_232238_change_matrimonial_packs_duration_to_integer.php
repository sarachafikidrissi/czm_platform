<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // First, extract numbers from existing duration strings and update them
        $packs = DB::table('matrimonial_packs')->get();
        foreach ($packs as $pack) {
            if (preg_match('/(\d+)\s*mois/', $pack->duration, $matches)) {
                DB::table('matrimonial_packs')
                    ->where('id', $pack->id)
                    ->update(['duration' => (int)$matches[1]]);
            } else {
                // Default to 6 if parsing fails
                DB::table('matrimonial_packs')
                    ->where('id', $pack->id)
                    ->update(['duration' => 6]);
            }
        }

        // Change column type from string to integer
        Schema::table('matrimonial_packs', function (Blueprint $table) {
            $table->integer('duration')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Convert integers back to strings with "mois" suffix
        $packs = DB::table('matrimonial_packs')->get();
        foreach ($packs as $pack) {
            DB::table('matrimonial_packs')
                ->where('id', $pack->id)
                ->update(['duration' => $pack->duration . ' mois']);
        }

        Schema::table('matrimonial_packs', function (Blueprint $table) {
            $table->string('duration')->change();
        });
    }
};
