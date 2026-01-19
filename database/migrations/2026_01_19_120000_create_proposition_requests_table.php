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
        Schema::create('proposition_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reference_user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('compatible_user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('from_matchmaker_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('to_matchmaker_id')->constrained('users')->onDelete('cascade');
            $table->text('message');
            $table->enum('status', ['pending', 'accepted', 'rejected'])->default('pending');
            $table->text('response_message')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->boolean('share_phone')->default(false);
            $table->enum('organizer', ['vous', 'moi'])->nullable();
            $table->timestamp('responded_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('proposition_requests');
    }
};

