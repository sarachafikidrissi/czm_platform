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
        Schema::create('profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete()->cascadeOnUpdate();
            $table->tinyInteger('current_step')->default(1);

            // Step 1: Personal Information
            $table->string('nom')->nullable();
            $table->string('prenom')->nullable();
            $table->date('date_naissance')->nullable();
            $table->string('niveau_etudes')->nullable();
            $table->string('situation_professionnelle')->nullable();
            $table->string('secteur')->nullable();
            $table->string('revenu')->nullable();
            $table->string('religion')->nullable();
            $table->string('heard_about_us')->nullable();

            // Step 2: Additional Information
            $table->string('etat_matrimonial')->nullable();
            $table->string('logement')->nullable();
            $table->integer('taille')->nullable();
            $table->integer('poids')->nullable();
            $table->text('etat_sante')->nullable();
            $table->string('fumeur')->nullable();
            $table->string('buveur')->nullable();
            $table->string('sport')->nullable();
            $table->string('motorise')->nullable();
            $table->text('loisirs')->nullable();

            // Step 3: Partner Preferences
            $table->integer('age_minimum')->nullable();
            $table->string('situation_matrimoniale_recherche')->nullable();
            $table->string('pays_recherche')->default('maroc');
            $table->json('villes_recherche')->nullable();
            $table->string('niveau_etudes_recherche')->nullable();
            $table->string('statut_emploi_recherche')->nullable();
            $table->string('revenu_minimum')->nullable();
            $table->string('religion_recherche')->nullable();

            // Step 4: Profile Picture
            $table->string('profile_picture_path')->nullable();
            $table->string('profile_picture_disk')->default('public');

            // Completion Status
            $table->boolean('is_completed')->default(false);
            $table->timestamp('completed_at')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('profiles');
    }
};
