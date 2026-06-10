<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (! Schema::hasTable('propositions')) {
            return;
        }

        Schema::table('propositions', function (Blueprint $table) {
            if (! Schema::hasColumn('propositions', 'user_response')) {
                $table->string('user_response')->nullable()->after('status');
            }

            if (! Schema::hasColumn('propositions', 'user_comment')) {
                $table->text('user_comment')->nullable()->after('user_response');
            }
        });

        if (! Schema::hasColumn('propositions', 'user_response')) {
            return;
        }

        // Backfill per-recipient response from existing row data.
        DB::table('propositions')
            ->whereNotNull('responded_at')
            ->whereIn('status', ['interested', 'accepted'])
            ->update(['user_response' => 'interested']);

        DB::table('propositions')
            ->whereNotNull('responded_at')
            ->whereIn('status', ['not_interested', 'rejected'])
            ->update(['user_response' => 'not_interested']);

        DB::table('propositions')
            ->whereNotNull('responded_at')
            ->where('status', 'pending')
            ->update(['user_response' => 'interested']);

        if (Schema::hasColumn('propositions', 'user_comment')) {
            DB::table('propositions')
                ->whereNotNull('response_message')
                ->whereNull('user_comment')
                ->update(['user_comment' => DB::raw('response_message')]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (! Schema::hasTable('propositions')) {
            return;
        }

        Schema::table('propositions', function (Blueprint $table) {
            if (Schema::hasColumn('propositions', 'user_comment')) {
                $table->dropColumn('user_comment');
            }

            if (Schema::hasColumn('propositions', 'user_response')) {
                $table->dropColumn('user_response');
            }
        });
    }
};
