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
        // Update default tax_rate to 20.00
        DB::statement("ALTER TABLE bills MODIFY COLUMN tax_rate DECIMAL(5,2) DEFAULT 20.00");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert to 15.00
        DB::statement("ALTER TABLE bills MODIFY COLUMN tax_rate DECIMAL(5,2) DEFAULT 15.00");
    }
};
