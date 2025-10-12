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
        Schema::create('bills', function (Blueprint $table) {
            $table->id();
            $table->string('bill_number')->unique();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('profile_id')->constrained()->onDelete('cascade');
            $table->foreignId('matchmaker_id')->constrained('users')->onDelete('cascade');
            $table->string('order_number')->unique();
            $table->date('bill_date');
            $table->date('due_date');
            $table->enum('status', ['paid', 'unpaid'])->default('unpaid');
            $table->decimal('amount', 10, 2);
            $table->decimal('tax_rate', 5, 2)->default(15.00);
            $table->decimal('tax_amount', 10, 2);
            $table->decimal('total_amount', 10, 2);
            $table->string('currency', 3)->default('MAD');
            $table->string('payment_method');
            $table->string('pack_name');
            $table->decimal('pack_price', 10, 2);
            $table->json('pack_advantages')->nullable();
            $table->text('notes')->nullable();
            $table->boolean('email_sent')->default(false);
            $table->timestamp('email_sent_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bills');
    }
};
