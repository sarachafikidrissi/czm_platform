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
        // First, convert any existing 'client_expire' to 'client' before removing the enum value
        DB::table('users')
            ->where('status', 'client_expire')
            ->update(['status' => 'client']);
        
        // Also handle 'matched' status if it exists (in case the matched status migration ran)
        DB::table('users')
            ->where('status', 'matched')
            ->update(['status' => 'member']);
        
        // Also handle any other potential statuses that might exist
        // Get current enum values to see what we're working with
        $currentStatuses = ['prospect', 'member', 'client', 'client_expire', 'matched', 'en_rdv', 'en_attente_de_reponse_de_proposition'];
        $targetStatuses = ['prospect', 'member', 'client'];
        
        // Convert any status not in target list to 'member'
        foreach ($currentStatuses as $status) {
            if (!in_array($status, $targetStatuses)) {
                $count = DB::table('users')->where('status', $status)->count();
                if ($count > 0) {
                    DB::table('users')
                        ->where('status', $status)
                        ->update(['status' => 'member']);
                }
            }
        }
        
        // Then, revert to enum without client_expire and matched
        DB::statement("ALTER TABLE users MODIFY COLUMN status ENUM('prospect', 'member', 'client') DEFAULT 'prospect'");
    }
};
