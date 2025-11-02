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
        Schema::table('profiles', function (Blueprint $table) {
            $table->enum('account_status', ['active', 'desactivated'])->default('active')->after('completed_at');
            $table->text('activation_reason')->nullable()->after('account_status');
            $table->text('deactivation_reason')->nullable()->after('activation_reason');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('profiles', function (Blueprint $table) {
            $table->dropColumn(['account_status', 'activation_reason', 'deactivation_reason']);
        });
    }
};
