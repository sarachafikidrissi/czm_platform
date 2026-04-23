<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('propositions')) {
            return;
        }

        if (! Schema::hasColumn('propositions', 'pair_id')) {
            Schema::table('propositions', function (Blueprint $table) {
                $table->uuid('pair_id')->nullable()->after('matchmaker_id');
                $table->index('pair_id');
            });
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('propositions') || ! Schema::hasColumn('propositions', 'pair_id')) {
            return;
        }

        Schema::table('propositions', function (Blueprint $table) {
            $table->dropIndex(['pair_id']);
            $table->dropColumn('pair_id');
        });
    }
};
