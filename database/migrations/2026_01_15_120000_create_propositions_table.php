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
        if (Schema::hasTable('propositions')) {
            return;
        }

        Schema::create('propositions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('matchmaker_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('reference_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('compatible_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('recipient_user_id')->constrained('users')->cascadeOnDelete();
            $table->text('message');
            $table->string('status')->default('pending');
            $table->text('response_message')->nullable();
            $table->timestamp('responded_at')->nullable();
            $table->timestamps();

            $table->index(['recipient_user_id', 'status']);
            $table->index(['matchmaker_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('propositions');
    }
};

