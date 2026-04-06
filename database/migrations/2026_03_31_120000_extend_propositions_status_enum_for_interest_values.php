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

        // Some environments have an ENUM status column that does not allow
        // interested / not_interested. Extend it for proposition responses.
        if (DB::getDriverName() === 'mysql') {
            DB::statement(
                "ALTER TABLE propositions MODIFY COLUMN status ENUM('pending','accepted','rejected','interested','not_interested','expired') NOT NULL DEFAULT 'pending'"
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
            DB::statement("UPDATE propositions SET status = 'accepted' WHERE status = 'interested'");
            DB::statement("UPDATE propositions SET status = 'rejected' WHERE status = 'not_interested'");
            DB::statement(
                "ALTER TABLE propositions MODIFY COLUMN status ENUM('pending','accepted','rejected','expired') NOT NULL DEFAULT 'pending'"
            );
        }
    }
};
