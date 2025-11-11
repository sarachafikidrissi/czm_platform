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
        // Drop the old unique constraint
        try {
            DB::statement('ALTER TABLE monthly_objectives DROP INDEX monthly_objectives_role_type_month_year_unique');
        } catch (\Exception $e) {
            // Index doesn't exist, that's fine
        }
        
        // Add new unique constraint: user_id + role_type + month + year
        // This allows each user to have one objective per role type per month/year
        try {
            DB::statement('ALTER TABLE monthly_objectives DROP INDEX monthly_objectives_user_role_month_year_unique');
        } catch (\Exception $e) {
            // Index doesn't exist, that's fine
        }
        
        DB::statement('ALTER TABLE monthly_objectives ADD UNIQUE KEY monthly_objectives_user_role_month_year_unique (user_id, role_type, month, year)');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop the new unique constraint
        try {
            DB::statement('ALTER TABLE monthly_objectives DROP INDEX monthly_objectives_user_role_month_year_unique');
        } catch (\Exception $e) {
            // Index doesn't exist, that's fine
        }
        
        // Restore old unique constraint
        DB::statement('ALTER TABLE monthly_objectives ADD UNIQUE KEY monthly_objectives_role_type_month_year_unique (role_type, month, year)');
    }
};
