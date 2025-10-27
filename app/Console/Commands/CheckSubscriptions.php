<?php

namespace App\Console\Commands;

use App\Models\UserSubscription;
use Carbon\Carbon;
use Illuminate\Console\Command;

class CheckSubscriptions extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'subscriptions:check';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check and update subscription statuses';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Checking subscription statuses...');

        // Find expired subscriptions
        $expiredSubscriptions = UserSubscription::where('status', 'active')
            ->where('subscription_end', '<', Carbon::now())
            ->get();

        if ($expiredSubscriptions->count() > 0) {
            $this->warn("Found {$expiredSubscriptions->count()} expired subscriptions:");
            
            foreach ($expiredSubscriptions as $subscription) {
                $subscription->update(['status' => 'expired']);
                $this->line("- User {$subscription->user->name} (ID: {$subscription->user_id}) - Pack: {$subscription->matrimonialPack->name} - Expired: {$subscription->subscription_end->format('Y-m-d')}");
            }
        } else {
            $this->info('No expired subscriptions found.');
        }

        // Show active subscriptions
        $activeSubscriptions = UserSubscription::where('status', 'active')
            ->where('subscription_end', '>=', Carbon::now())
            ->get();

        $this->info("Active subscriptions: {$activeSubscriptions->count()}");

        // Show upcoming expirations (next 30 days)
        $upcomingExpirations = UserSubscription::where('status', 'active')
            ->where('subscription_end', '>=', Carbon::now())
            ->where('subscription_end', '<=', Carbon::now()->addDays(30))
            ->get();

        if ($upcomingExpirations->count() > 0) {
            $this->warn("Subscriptions expiring in the next 30 days:");
            foreach ($upcomingExpirations as $subscription) {
                $daysLeft = Carbon::now()->diffInDays($subscription->subscription_end);
                $this->line("- User {$subscription->user->name} (ID: {$subscription->user_id}) - Pack: {$subscription->matrimonialPack->name} - Expires in {$daysLeft} days");
            }
        }

        $this->info('Subscription check completed.');
    }
}