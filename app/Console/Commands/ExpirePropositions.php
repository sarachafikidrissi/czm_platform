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
            }
        });

        $this->info("Expired {$expired} proposition(s).");

        return self::SUCCESS;
    }
}
