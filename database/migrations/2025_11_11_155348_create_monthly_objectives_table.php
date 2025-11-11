<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('monthly_objectives', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('cascade');
            $table->integer('month'); // 1-12
            $table->integer('year'); // e.g., 2025
            $table->decimal('target_ventes', 10, 2)->default(0);
            $table->integer('target_membres')->default(0);
            $table->integer('target_rdv')->default(0);
            $table->integer('target_match')->default(0);
            $table->boolean('commission_paid')->default(false);
            $table->timestamp('commission_paid_at')->nullable();
            $table->foreignId('commission_paid_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
            
            // Unique constraint: one objective per user per month/year
            $table->unique(['user_id', 'month', 'year']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('monthly_objectives');
    }
};
