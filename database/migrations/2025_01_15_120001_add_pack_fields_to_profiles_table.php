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
            $table->foreignId('matrimonial_pack_id')->nullable()->after('service_id')->constrained('matrimonial_packs')->onDelete('set null');
            $table->decimal('pack_price', 10, 2)->nullable()->after('matrimonial_pack_id');
            $table->json('pack_advantages')->nullable()->after('pack_price');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('profiles', function (Blueprint $table) {
            $table->dropForeign(['matrimonial_pack_id']);
            $table->dropColumn(['matrimonial_pack_id', 'pack_price', 'pack_advantages']);
        });
    }
};
