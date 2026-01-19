<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('proposition_requests', function (Blueprint $table) {
            if (!Schema::hasColumn('proposition_requests', 'reference_user_id')) {
                $table->foreignId('reference_user_id')->nullable()->after('id')->constrained('users')->onDelete('cascade');
            }
            if (!Schema::hasColumn('proposition_requests', 'compatible_user_id')) {
                $table->foreignId('compatible_user_id')->nullable()->after('reference_user_id')->constrained('users')->onDelete('cascade');
            }
            if (!Schema::hasColumn('proposition_requests', 'response_message')) {
                $table->text('response_message')->nullable()->after('message');
            }
            if (!Schema::hasColumn('proposition_requests', 'share_phone')) {
                $table->boolean('share_phone')->default(false)->after('rejection_reason');
            }
            if (!Schema::hasColumn('proposition_requests', 'organizer')) {
                $table->enum('organizer', ['vous', 'moi'])->nullable()->after('share_phone');
            }
            if (!Schema::hasColumn('proposition_requests', 'responded_at')) {
                $table->timestamp('responded_at')->nullable()->after('organizer');
            }
        });

        if (Schema::hasColumn('proposition_requests', 'user_a_id') && Schema::hasColumn('proposition_requests', 'user_b_id')) {
            DB::table('proposition_requests')
                ->whereNull('reference_user_id')
                ->update(['reference_user_id' => DB::raw('user_a_id')]);

            DB::table('proposition_requests')
                ->whereNull('compatible_user_id')
                ->update(['compatible_user_id' => DB::raw('user_b_id')]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('proposition_requests', function (Blueprint $table) {
            if (Schema::hasColumn('proposition_requests', 'reference_user_id')) {
                $table->dropForeign(['reference_user_id']);
                $table->dropColumn('reference_user_id');
            }
            if (Schema::hasColumn('proposition_requests', 'compatible_user_id')) {
                $table->dropForeign(['compatible_user_id']);
                $table->dropColumn('compatible_user_id');
            }
            if (Schema::hasColumn('proposition_requests', 'response_message')) {
                $table->dropColumn('response_message');
            }
            if (Schema::hasColumn('proposition_requests', 'share_phone')) {
                $table->dropColumn('share_phone');
            }
            if (Schema::hasColumn('proposition_requests', 'organizer')) {
                $table->dropColumn('organizer');
            }
            if (Schema::hasColumn('proposition_requests', 'responded_at')) {
                $table->dropColumn('responded_at');
            }
        });
    }
};

