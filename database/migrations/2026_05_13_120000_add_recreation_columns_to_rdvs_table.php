<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rdvs', function (Blueprint $table) {
            if (! Schema::hasColumn('rdvs', 'motif_de_recreation')) {
                $table->text('motif_de_recreation')->nullable()->after('message');
            }
            if (! Schema::hasColumn('rdvs', 'is_recreation')) {
                $table->boolean('is_recreation')->nullable()->default(false)->after('motif_de_recreation');
            }
        });
    }

    public function down(): void
    {
        Schema::table('rdvs', function (Blueprint $table) {
            if (Schema::hasColumn('rdvs', 'is_recreation')) {
                $table->dropColumn('is_recreation');
            }
            if (Schema::hasColumn('rdvs', 'motif_de_recreation')) {
                $table->dropColumn('motif_de_recreation');
            }
        });
    }
};
