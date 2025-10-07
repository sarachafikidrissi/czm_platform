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
            $table->boolean('has_children')->nullable()->after('etat_matrimonial');
            $table->unsignedInteger('children_count')->nullable()->after('has_children');
            $table->enum('children_guardian', ['mother','father'])->nullable()->after('children_count');
            $table->enum('hijab_choice', ['voile','non_voile','niqab','idea_niqab','idea_hijab'])->nullable()->after('religion');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('profiles', function (Blueprint $table) {
            $table->dropColumn(['has_children','children_count','children_guardian','hijab_choice']);
        });
    }
};


