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
        // MySQL-only MODIFY COLUMN syntax is replaced with the portable Schema builder
        // so this migration can run under both MySQL (production) and SQLite (test suite).
        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE bills MODIFY COLUMN tax_rate DECIMAL(5,2) DEFAULT 20.00');
        } else {
            Schema::table('bills', function (Blueprint $table) {
                $table->decimal('tax_rate', 5, 2)->default(20.00)->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE bills MODIFY COLUMN tax_rate DECIMAL(5,2) DEFAULT 15.00');
        } else {
            Schema::table('bills', function (Blueprint $table) {
                $table->decimal('tax_rate', 5, 2)->default(15.00)->change();
            });
        }
    }
};
