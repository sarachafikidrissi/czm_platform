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
        foreach (['monthly_objectives_role_type_month_year_unique', 'monthly_objectives_user_role_month_year_unique'] as $idx) {
            try {
                Schema::table('monthly_objectives', fn (Blueprint $t) => $t->dropUnique($idx));
            } catch (\Exception $e) {
                // Index didn't exist
            }
        }

        Schema::table('monthly_objectives', function (Blueprint $table) {
            $table->unique(['user_id', 'role_type', 'month', 'year'], 'monthly_objectives_user_role_month_year_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        try {
            Schema::table('monthly_objectives', fn (Blueprint $t) => $t->dropUnique('monthly_objectives_user_role_month_year_unique'));
        } catch (\Exception $e) {
        }

        Schema::table('monthly_objectives', function (Blueprint $table) {
            $table->unique(['role_type', 'month', 'year'], 'monthly_objectives_role_type_month_year_unique');
        });
    }
};
