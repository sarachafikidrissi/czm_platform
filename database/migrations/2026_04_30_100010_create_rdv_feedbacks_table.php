<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('rdv_feedbacks')) {
            return;
        }

        Schema::create('rdv_feedbacks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rdv_id')->constrained('rdvs')->cascadeOnDelete();
            $table->foreignId('author_id')->constrained('users')->cascadeOnDelete();
            $table->string('author_role'); // 'user' | 'matchmaker'
            $table->string('avis')->nullable(); // 'liked' | 'not_liked'
            $table->text('feedback_message')->nullable();
            $table->string('espace_de_rdv')->nullable(); // 'agence' | 'espace_public' | 'autre'
            $table->string('espace_autre_detail')->nullable();
            $table->string('signe_de_rdv')->nullable(); // 'positif' | 'negatif'
            $table->text('avis_matchmaker')->nullable();
            $table->text('evaluation_de_rdv')->nullable();
            $table->timestamps();

            $table->unique(['rdv_id', 'author_id']);
            $table->index('rdv_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rdv_feedbacks');
    }
};
