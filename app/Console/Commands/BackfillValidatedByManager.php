<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

class BackfillValidatedByManager extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'users:backfill-validated-by-manager';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Backfill validated_by_manager_id for existing validated users that are missing this field';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $users = User::role('user')
            ->whereIn('status', ['member', 'client', 'client_expire'])
            ->whereNotNull('approved_at')
            ->whereNull('validated_by_manager_id')
            ->with('approvedBy', 'agency')
            ->get();

        $this->info("Found {$users->count()} users to backfill");

        $updated = 0;
        $skipped = 0;

        foreach ($users as $user) {
            $managerId = null;
            
            // If approved_by exists, check the approver's agency
            if ($user->approvedBy) {
                $approver = $user->approvedBy;
                $approverRole = $approver->getRoleNames()->first();
                
                if ($approverRole === 'matchmaker' && $approver->agency_id) {
                    // Find manager of matchmaker's agency
                    $manager = User::role('manager')
                        ->where('agency_id', $approver->agency_id)
                        ->where('approval_status', 'approved')
                        ->first();
                    if ($manager) {
                        $managerId = $manager->id;
                    }
                } elseif ($approverRole === 'manager') {
                    // If a manager approved, use their ID
                    $managerId = $approver->id;
                }
            }
            
            // Fallback: use prospect's agency if available
            if (!$managerId && $user->agency_id) {
                $manager = User::role('manager')
                    ->where('agency_id', $user->agency_id)
                    ->where('approval_status', 'approved')
                    ->first();
                if ($manager) {
                    $managerId = $manager->id;
                }
            }
            
            if ($managerId) {
                $user->update(['validated_by_manager_id' => $managerId]);
                $this->info("Updated user {$user->id} with manager {$managerId}");
                $updated++;
            } else {
                $this->warn("Could not find manager for user {$user->id} (approved by: {$user->approved_by}, agency: {$user->agency_id})");
                $skipped++;
            }
        }

        $this->info("Backfill complete: {$updated} updated, {$skipped} skipped");
        
        return Command::SUCCESS;
    }
}

