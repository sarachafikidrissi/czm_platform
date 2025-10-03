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
            // Add foreign key for agency relationship
            $table->foreignId('agency_id')->nullable()->after('agency');
            $table->foreign('agency_id')->references('id')->on('agencies')->onDelete('set null');
            
            // Add profile picture field
            $table->string('profile_picture')->nullable()->after('agency_id');
            
            // Add identity card fields (hashed for security)
            $table->text('identity_card_front_hash')->nullable()->after('profile_picture');
            $table->text('identity_card_back_hash')->nullable()->after('identity_card_front_hash');
            $table->text('cin_hash')->nullable()->after('identity_card_back_hash');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['agency_id']);
            $table->dropColumn([
                'agency_id',
                'profile_picture',
                'identity_card_front_hash',
                'identity_card_back_hash',
                'cin_hash'
            ]);
        });
    }
};
