<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_assignments', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('matchmaker_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('assigned_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('assigned_at');
            $table->timestamp('unassigned_at')->nullable();
            $table->string('reason')->nullable();
            $table->timestamps();

            // Fast "current assignment" lookup: WHERE user_id = ? AND unassigned_at IS NULL
            $table->index(['user_id', 'unassigned_at']);

            // Fast monthly KPI queries: WHERE matchmaker_id IN (?) AND assigned_at BETWEEN ? AND ?
            $table->index(['matchmaker_id', 'assigned_at', 'unassigned_at']);
        });

        // Backfill from existing users.assigned_matchmaker_id (database-agnostic)
        // Known issue (production): backfill is not idempotent if re-run; migration already
        // applied in production — do not alter this logic without a new forward migration.
        $now = now()->toDateTimeString();
        DB::table('users')
            ->whereNotNull('assigned_matchmaker_id')
            ->orderBy('id')
            ->chunk(500, function ($users) use ($now) {
                $rows = $users->map(fn ($u) => [
                    'user_id'       => $u->id,
                    'matchmaker_id' => $u->assigned_matchmaker_id,
                    'assigned_by'   => null,
                    'assigned_at'   => ($u->updated_at > $u->created_at) ? $u->updated_at : $u->created_at,
                    'unassigned_at' => null,
                    'reason'        => 'initial',
                    'created_at'    => $now,
                    'updated_at'    => $now,
                ])->all();
                DB::table('user_assignments')->insert($rows);
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_assignments');
    }
};
