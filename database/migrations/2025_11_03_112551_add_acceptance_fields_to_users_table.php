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
        Schema::table('users', function (Blueprint $table) {
            $table->text('acceptance_reason')->nullable()->after('rejected_at');
            $table->foreignId('accepted_by')->nullable()->after('acceptance_reason');
            $table->timestamp('accepted_at')->nullable()->after('accepted_by');
            $table->foreign('accepted_by')->references('id')->on('users')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['accepted_by']);
            $table->dropColumn(['acceptance_reason', 'accepted_by', 'accepted_at']);
        });
    }
};
