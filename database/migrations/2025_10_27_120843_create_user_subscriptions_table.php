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
        Schema::create('user_subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('matrimonial_pack_id')->constrained()->onDelete('cascade');
            $table->foreignId('assigned_matchmaker_id')->nullable()->constrained('users')->onDelete('set null');
            $table->date('subscription_start');
            $table->date('subscription_end');
            $table->integer('duration_months');
            $table->decimal('pack_price', 10, 2);
            $table->json('pack_advantages')->nullable();
            $table->string('payment_mode');
            $table->enum('status', ['active', 'expired', 'cancelled'])->default('active');
            $table->text('notes')->nullable();
            $table->timestamps();
            
            // Indexes for better performance
            $table->index(['user_id', 'status']);
            $table->index(['subscription_start', 'subscription_end']);
            $table->index('assigned_matchmaker_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_subscriptions');
    }
};