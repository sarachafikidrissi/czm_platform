<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('matchmaker_evaluations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('author_id')->constrained('users')->onDelete('cascade');
            $table->enum('status', ['prospect', 'member', 'client'])->nullable();
            $table->text('appearance')->nullable();
            $table->text('communication')->nullable();
            $table->text('seriousness')->nullable();
            $table->text('emotional_psychological')->nullable();
            $table->text('values_principles')->nullable();
            $table->text('social_compatibility')->nullable();
            $table->text('qualities')->nullable();
            $table->text('defects')->nullable();
            $table->enum('recommendation', ['ready', 'accompany', 'not_ready'])->nullable();
            $table->text('remarks')->nullable();
            $table->text('feedback_behavior')->nullable();
            $table->text('feedback_partner_impression')->nullable();
            $table->text('feedback_pos_neg')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('matchmaker_evaluations');
    }
};


