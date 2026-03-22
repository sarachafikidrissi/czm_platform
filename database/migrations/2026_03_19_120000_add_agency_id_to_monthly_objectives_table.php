<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Adds per-agency objectives (role_type = agency) and replaces the unique key
     * so rows are distinguished by agency_id when set.
     */
    public function up(): void
    {
        try {
            DB::statement('ALTER TABLE monthly_objectives DROP INDEX monthly_objectives_user_role_month_year_unique');
        } catch (\Exception $e) {
            // Index name may differ
        }

        Schema::table('monthly_objectives', function (Blueprint $table) {
            if (! Schema::hasColumn('monthly_objectives', 'agency_id')) {
                $table->foreignId('agency_id')
                    ->nullable()
                    ->after('user_id')
                    ->constrained('agencies')
                    ->nullOnDelete();
            }
        });

        try {
            DB::statement('ALTER TABLE monthly_objectives ADD UNIQUE KEY monthly_objectives_scope_unique (user_id, role_type, agency_id, month, year)');
        } catch (\Exception $e) {
            // If duplicate data exists, migration may fail — clean data first
            throw $e;
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        try {
            DB::statement('ALTER TABLE monthly_objectives DROP INDEX monthly_objectives_scope_unique');
        } catch (\Exception $e) {
        }

        Schema::table('monthly_objectives', function (Blueprint $table) {
            if (Schema::hasColumn('monthly_objectives', 'agency_id')) {
                $table->dropForeign(['agency_id']);
                $table->dropColumn('agency_id');
            }
        });

        DB::statement('ALTER TABLE monthly_objectives ADD UNIQUE KEY monthly_objectives_user_role_month_year_unique (user_id, role_type, month, year)');
    }
};
