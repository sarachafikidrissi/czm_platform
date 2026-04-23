<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (! Schema::hasTable('propositions')) {
            return;
        }

        if (! Schema::hasColumn('propositions', 'cancelled_at')) {
            Schema::table('propositions', function (Blueprint $table) {
                $table->timestamp('cancelled_at')->nullable()->after('responded_at');
            });
        }

        if (DB::getDriverName() === 'mysql' && Schema::hasColumn('propositions', 'status')) {
            DB::statement(
                "ALTER TABLE propositions MODIFY COLUMN status ENUM('pending','accepted','rejected','interested','not_interested','expired','cancelled') NOT NULL DEFAULT 'pending'"
            );
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (! Schema::hasTable('propositions')) {
            return;
        }

        if (DB::getDriverName() === 'mysql' && Schema::hasColumn('propositions', 'status')) {
            DB::statement("UPDATE propositions SET status = 'not_interested' WHERE status = 'cancelled'");
            DB::statement(
                "ALTER TABLE propositions MODIFY COLUMN status ENUM('pending','accepted','rejected','interested','not_interested','expired') NOT NULL DEFAULT 'pending'"
            );
        }

        if (Schema::hasColumn('propositions', 'cancelled_at')) {
            Schema::table('propositions', function (Blueprint $table) {
                $table->dropColumn('cancelled_at');
            });
        }
    }
};
