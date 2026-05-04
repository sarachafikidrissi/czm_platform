<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('rdvs')) {
            return;
        }

        Schema::create('rdvs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('matchmaker_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('reference_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('compatible_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('proposition_id')->nullable()->constrained('propositions')->nullOnDelete();
            $table->text('regle');
            $table->text('message')->nullable();
            $table->boolean('share_phone')->default(false);
            $table->string('status')->default('en_cours'); // en_cours, reussi, echec
            $table->timestamps();

            $table->index(['matchmaker_id', 'status']);
            $table->index('reference_user_id');
            $table->index('compatible_user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rdvs');
    }
};
