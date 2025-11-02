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
        // Modify enum to include 'Client expiré'
        DB::statement("ALTER TABLE users MODIFY COLUMN status ENUM('prospect', 'member', 'client', 'Client expiré') DEFAULT 'prospect'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert to original enum values
        DB::statement("ALTER TABLE users MODIFY COLUMN status ENUM('prospect', 'member', 'client') DEFAULT 'prospect'");
    }
};
