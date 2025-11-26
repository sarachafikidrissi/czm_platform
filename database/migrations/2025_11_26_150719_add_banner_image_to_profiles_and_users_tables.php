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
            $table->string('banner_image_path')->nullable()->after('profile_picture_path');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->string('banner_image_path')->nullable()->after('profile_picture');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('profiles', function (Blueprint $table) {
            $table->dropColumn('banner_image_path');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('banner_image_path');
        });
    }
};
