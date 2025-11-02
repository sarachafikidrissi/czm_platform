<?php

namespace App\Console\Commands;

use App\Models\UserSubscription;
use App\Models\User;
use App\Mail\SubscriptionReminderEmail;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

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
            ->with(['user', 'matrimonialPack', 'assignedMatchmaker'])
            ->get();

        if ($expiredSubscriptions->count() > 0) {
            $this->warn("Found {$expiredSubscriptions->count()} expired subscriptions:");
            
            foreach ($expiredSubscriptions as $subscription) {
                // Update subscription status to expired
                $subscription->update(['status' => 'expired']);
                
                // Update user status: if client, change to client_expire
                $user = $subscription->user;
                if ($user && $user->status === 'client') {
                    $user->update(['status' => 'client_expire']);
                    $this->line("- User {$user->name} (ID: {$user->id}) - Pack: {$subscription->matrimonialPack->name} - Expired: {$subscription->subscription_end->format('Y-m-d')} - Status changed to 'client_expire'");
                    
                    // Send expiration email
                    try {
                        $daysRemaining = Carbon::today()->diffInDays($subscription->subscription_end, false);
                        Mail::to($user->email)->send(
                            new SubscriptionReminderEmail($subscription, $daysRemaining)
                        );
                        $this->line("  ✓ Expiration email sent to {$user->email}");
                    } catch (\Exception $e) {
                        $this->error("  ✗ Failed to send email to {$user->email}: " . $e->getMessage());
                    }
                } else {
                    $this->line("- User {$subscription->user->name} (ID: {$subscription->user_id}) - Pack: {$subscription->matrimonialPack->name} - Expired: {$subscription->subscription_end->format('Y-m-d')}");
                }
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