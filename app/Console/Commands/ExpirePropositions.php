<?php

namespace App\Console\Commands;

use App\Models\Proposition;
use App\Services\UserActivityService;
use Carbon\Carbon;
use Illuminate\Console\Command;

class ExpirePropositions extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'propositions:expire';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Set pending propositions to expired after 7 days (based on created_at)';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $cutoff = Carbon::now()->subDays(7);

        $query = Proposition::query()
            ->where('status', 'pending')
            ->where('created_at', '<', $cutoff);

        $count = (clone $query)->count();

        if ($count === 0) {
            $this->info('No pending propositions to expire.');

            return self::SUCCESS;
        }

        $this->info("Expiring {$count} proposition(s)...");

        $expired = 0;

        $query->orderBy('id')->chunkById(100, function ($propositions) use (&$expired) {
            foreach ($propositions as $proposition) {
                $proposition->update(['status' => 'expired']);
                UserActivityService::log(
                    (int) $proposition->recipient_user_id,
                    null,
                    'proposition_expired',
                    'Proposition expirée (délai dépassé).',
                    [
                        'proposition_id' => $proposition->id,
                        'previous_status' => 'pending',
                        'new_status' => 'expired',
                        'source' => 'auto',
                    ]
                );
                $expired++;

                if ($proposition->pair_id) {
                    $siblings = Proposition::query()
                        ->where('pair_id', $proposition->pair_id)
                        ->where('id', '!=', $proposition->id)
                        ->where('status', 'pending')
                        ->get();

                    foreach ($siblings as $sibling) {
                        $sibling->update(['status' => 'expired']);
                        UserActivityService::log(
                            (int) $sibling->recipient_user_id,
                            null,
                            'proposition_expired',
                            'Proposition expirée (délai dépassé).',
                            [
                                'proposition_id' => $sibling->id,
                                'previous_status' => 'pending',
                                'new_status' => 'expired',
                                'source' => 'auto',
                                'paired_expiry' => true,
                            ]
                        );
                        $expired++;
                    }
                }
            }
        });

        $this->info("Expired {$expired} proposition(s).");

        return self::SUCCESS;
    }
}
