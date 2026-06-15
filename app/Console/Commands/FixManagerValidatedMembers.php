<?php

// One-time fix for members validated by a
// manager before Option A was implemented.
// Run once, then this command can be removed.
// Safe to re-run — WHERE clause is idempotent.

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

class FixManagerValidatedMembers extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:fix-manager-validated-members';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'One-time fix: set assigned_matchmaker_id = validated_by_manager_id for members a manager validated while unassigned.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        // Idempotent: once fixed, assigned_matchmaker_id is non-null and the row
        // no longer matches this WHERE clause, so re-running is a no-op.
        $users = User::whereNotNull('validated_by_manager_id')
            ->whereNull('assigned_matchmaker_id')
            ->get();

        $this->info("Found {$users->count()} member(s) to fix.");

        $fixed = 0;

        foreach ($users as $user) {
            $managerId = $user->validated_by_manager_id;

            // Intentionally NOT calling UserAssignment::recordAssignment():
            // the assignment happened in the past and recordAssignment() stamps
            // assigned_at = now(), which would corrupt the assignment history.
            User::withoutTimestamps(
                fn () => $user->update(['assigned_matchmaker_id' => $managerId])
            );

            $this->info("Fixed user #{$user->id} ({$user->name}): assigned_matchmaker_id <- validated_by_manager_id ({$managerId}).");

            $fixed++;
        }

        $this->info("Fixed {$fixed} member(s). assigned_matchmaker_id now set from validated_by_manager_id.");

        return Command::SUCCESS;
    }
}
