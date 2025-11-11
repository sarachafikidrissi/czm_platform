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
        // Check if role_type column already exists
        if (!Schema::hasColumn('monthly_objectives', 'role_type')) {
            // Drop foreign key constraint
            Schema::table('monthly_objectives', function (Blueprint $table) {
                $table->dropForeign(['user_id']);
            });
            
            // Drop the unique constraint
            Schema::table('monthly_objectives', function (Blueprint $table) {
                $table->dropUnique(['user_id', 'month', 'year']);
            });
            
            // Add role_type column
            Schema::table('monthly_objectives', function (Blueprint $table) {
                $table->string('role_type')->nullable()->after('user_id');
            });
            
            // Re-add the foreign key constraint
            Schema::table('monthly_objectives', function (Blueprint $table) {
                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            });
        }
        
        // Add new unique constraint (drop old one if exists)
        if (Schema::hasColumn('monthly_objectives', 'role_type')) {
            try {
                DB::statement('ALTER TABLE monthly_objectives DROP INDEX monthly_objectives_role_type_month_year_unique');
            } catch (\Exception $e) {
                // Index doesn't exist, that's fine
            }
            
            DB::statement('ALTER TABLE monthly_objectives ADD UNIQUE KEY monthly_objectives_role_type_month_year_unique (role_type, month, year)');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop foreign key
        Schema::table('monthly_objectives', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
        });
        
        // Drop new unique constraint
        Schema::table('monthly_objectives', function (Blueprint $table) {
            $table->dropUnique('monthly_objectives_role_type_month_year_unique');
            $table->dropColumn('role_type');
        });
        
        // Restore old unique constraint
        Schema::table('monthly_objectives', function (Blueprint $table) {
            $table->unique(['user_id', 'month', 'year']);
        });
        
        // Re-add foreign key
        Schema::table('monthly_objectives', function (Blueprint $table) {
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });
    }
};
