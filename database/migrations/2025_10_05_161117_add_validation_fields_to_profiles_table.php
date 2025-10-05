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
            $table->string('cin')->nullable()->unique()->after('current_step');
            $table->string('identity_card_front_path')->nullable()->after('cin');
            $table->string('identity_card_back_path')->nullable()->after('identity_card_front_path');
            $table->text('notes')->nullable()->after('identity_card_back_path');
            $table->text('recommendations')->nullable()->after('notes');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('profiles', function (Blueprint $table) {
            $table->dropColumn([
                'cin',
                'identity_card_front_path',
                'identity_card_back_path',
                'notes',
                'recommendations',
            ]);
        });
    }
};
