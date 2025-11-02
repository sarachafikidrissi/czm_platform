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
        // First, modify enum to temporarily include both old and new values
        DB::statement("ALTER TABLE users MODIFY COLUMN status ENUM('prospect', 'member', 'client', 'Client expiré', 'client_expire') DEFAULT 'prospect'");
        
        // Then, convert any existing 'Client expiré' to 'client_expire' using raw SQL
        DB::statement("UPDATE users SET status = 'client_expire' WHERE status = 'Client expiré'");
        
        // Finally, modify enum to only include 'client_expire' (remove 'Client expiré')
        DB::statement("ALTER TABLE users MODIFY COLUMN status ENUM('prospect', 'member', 'client', 'client_expire') DEFAULT 'prospect'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert to enum without client_expire
        DB::statement("ALTER TABLE users MODIFY COLUMN status ENUM('prospect', 'member', 'client') DEFAULT 'prospect'");
    }
};
