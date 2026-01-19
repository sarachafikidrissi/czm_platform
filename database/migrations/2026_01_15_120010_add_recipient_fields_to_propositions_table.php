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
        if (!Schema::hasTable('propositions')) {
            return;
        }

        Schema::table('propositions', function (Blueprint $table) {
            if (!Schema::hasColumn('propositions', 'matchmaker_id')) {
                $table->foreignId('matchmaker_id')->nullable()->constrained('users')->cascadeOnDelete();
            }

            if (!Schema::hasColumn('propositions', 'reference_user_id')) {
                $table->foreignId('reference_user_id')->nullable()->constrained('users')->cascadeOnDelete();
            }

            if (!Schema::hasColumn('propositions', 'compatible_user_id')) {
                $table->foreignId('compatible_user_id')->nullable()->constrained('users')->cascadeOnDelete();
            }

            if (!Schema::hasColumn('propositions', 'recipient_user_id')) {
                $table->foreignId('recipient_user_id')->nullable()->constrained('users')->cascadeOnDelete();
                $table->index(['recipient_user_id', 'status']);
            }

            if (!Schema::hasColumn('propositions', 'message')) {
                $table->text('message')->nullable();
            }

            if (!Schema::hasColumn('propositions', 'status')) {
                $table->string('status')->nullable()->default('pending');
            }

            if (!Schema::hasColumn('propositions', 'response_message')) {
                $table->text('response_message')->nullable();
            }

            if (!Schema::hasColumn('propositions', 'responded_at')) {
                $table->timestamp('responded_at')->nullable();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasTable('propositions')) {
            return;
        }

        Schema::table('propositions', function (Blueprint $table) {
            if (Schema::hasColumn('propositions', 'recipient_user_id')) {
                $table->dropForeign(['recipient_user_id']);
                $table->dropIndex(['recipient_user_id', 'status']);
                $table->dropColumn('recipient_user_id');
            }
            if (Schema::hasColumn('propositions', 'compatible_user_id')) {
                $table->dropForeign(['compatible_user_id']);
                $table->dropColumn('compatible_user_id');
            }
            if (Schema::hasColumn('propositions', 'reference_user_id')) {
                $table->dropForeign(['reference_user_id']);
                $table->dropColumn('reference_user_id');
            }
            if (Schema::hasColumn('propositions', 'matchmaker_id')) {
                $table->dropForeign(['matchmaker_id']);
                $table->dropColumn('matchmaker_id');
            }
            if (Schema::hasColumn('propositions', 'message')) {
                $table->dropColumn('message');
            }
            if (Schema::hasColumn('propositions', 'status')) {
                $table->dropColumn('status');
            }
            if (Schema::hasColumn('propositions', 'response_message')) {
                $table->dropColumn('response_message');
            }
            if (Schema::hasColumn('propositions', 'responded_at')) {
                $table->dropColumn('responded_at');
            }
        });
    }
};

