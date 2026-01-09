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
        Schema::create('appointment_requests', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email');
            $table->string('phone');
            $table->string('city')->nullable();
            $table->string('country')->nullable();
            $table->text('reason'); // reason for appointment
            $table->dateTime('preferred_date')->nullable();
            $table->text('message')->nullable(); // additional notes
            $table->enum('status', ['pending', 'dispatched', 'converted', 'cancelled'])->default('pending');
            $table->enum('treatment_status', ['pending', 'done'])->default('pending');
            $table->foreignId('assigned_agency_id')->nullable()->constrained('agencies')->onDelete('set null');
            $table->foreignId('assigned_matchmaker_id')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('converted_to_prospect_id')->nullable()->constrained('users')->onDelete('set null');
            $table->dateTime('done_at')->nullable();
            $table->foreignId('done_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();

            // Add indexes for better query performance
            $table->index('status');
            $table->index('treatment_status');
            $table->index('assigned_agency_id');
            $table->index('assigned_matchmaker_id');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('appointment_requests');
    }
};
