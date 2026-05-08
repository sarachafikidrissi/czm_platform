<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (! Schema::hasTable('propositions') || ! Schema::hasColumn('propositions', 'status')) {
            return;
        }

        if (DB::getDriverName() === 'mysql') {
            DB::statement(
                "ALTER TABLE propositions MODIFY COLUMN status ENUM('pending','accepted','rejected','interested','not_interested','expired','cancelled','closed') NOT NULL DEFAULT 'pending'"
            );
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (! Schema::hasTable('propositions') || ! Schema::hasColumn('propositions', 'status')) {
            return;
        }

        if (DB::getDriverName() === 'mysql') {
            DB::statement("UPDATE propositions SET status = 'interested' WHERE status = 'closed'");
            DB::statement(
                "ALTER TABLE propositions MODIFY COLUMN status ENUM('pending','accepted','rejected','interested','not_interested','expired','cancelled') NOT NULL DEFAULT 'pending'"
            );
        }
    }
};
