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
            $table->enum('approval_status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->string('agency')->nullable()->after('approval_status');
            $table->foreignId('assigned_matchmaker_id')->nullable()->after('agency');
            $table->timestamp('approved_at')->nullable()->after('assigned_matchmaker_id');
            $table->foreignId('approved_by')->nullable()->after('approved_at');
            
            $table->foreign('assigned_matchmaker_id')->references('id')->on('users')->onDelete('set null');
            $table->foreign('approved_by')->references('id')->on('users')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['assigned_matchmaker_id']);
            $table->dropForeign(['approved_by']);
            $table->dropColumn([
                'approval_status',
                'agency',
                'assigned_matchmaker_id',
                'approved_at',
                'approved_by'
            ]);
        });
    }
};