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
        Schema::table('matchmaker_notes', function (Blueprint $table) {
            $table->enum('contact_type', ['distance', 'presentiel'])->nullable()->after('content');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('matchmaker_notes', function (Blueprint $table) {
            $table->dropColumn('contact_type');
        });
    }
};
