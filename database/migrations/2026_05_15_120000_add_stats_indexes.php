<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->index(['assigned_matchmaker_id', 'status', 'created_at'], 'users_stats_idx');
        });

        Schema::table('propositions', function (Blueprint $table) {
            $table->index(['matchmaker_id', 'status', 'created_at'], 'propositions_stats_idx');
        });

        Schema::table('rdvs', function (Blueprint $table) {
            $table->index(['matchmaker_id', 'status', 'created_at'], 'rdvs_stats_idx');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex('users_stats_idx');
        });

        Schema::table('propositions', function (Blueprint $table) {
            $table->dropIndex('propositions_stats_idx');
        });

        Schema::table('rdvs', function (Blueprint $table) {
            $table->dropIndex('rdvs_stats_idx');
        });
    }
};
