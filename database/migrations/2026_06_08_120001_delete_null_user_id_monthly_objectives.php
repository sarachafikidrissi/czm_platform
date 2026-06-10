<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * One-time cleanup: remove legacy agency-default and role-default rows.
 *
 * DO NOT run automatically in production without review.
 * After deploying, run manually:
 *   php artisan migrate --path=database/migrations/2026_06_08_120001_delete_null_user_id_monthly_objectives.php
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('monthly_objectives')->whereNull('user_id')->delete();
    }

    public function down(): void
    {
        // Irreversible — legacy rows cannot be restored.
    }
};
