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
            $table->string('veil')->nullable()->after('hijab_choice');
            $table->string('specific_veil_wish')->nullable()->after('veil');
            $table->string('niqab_acceptance')->nullable()->after('specific_veil_wish');
            $table->string('polygamy')->nullable()->after('niqab_acceptance');
            $table->string('foreign_marriage')->nullable()->after('polygamy');
            $table->string('work_after_marriage')->nullable()->after('foreign_marriage');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('profiles', function (Blueprint $table) {
            $table->dropColumn([
                'veil',
                'specific_veil_wish',
                'niqab_acceptance',
                'polygamy',
                'foreign_marriage',
                'work_after_marriage'
            ]);
        });
    }
};
