<?php

namespace App\Console\Commands;

use App\Models\UserSubscription;
use App\Models\User;
use App\Mail\SubscriptionReminderEmail;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class TestSubscriptionExpiration extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'subscriptions:test-expiration {user_id? : User ID to test with} {--expire-now : Set subscription to expire today for testing}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Test subscription expiration and email sending for testing purposes';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $userId = $this->argument('user_id');
        $expireNow = $this->option('expire-now');

        if ($userId) {
            // Test with specific user
            $user = User::find($userId);
            
            if (!$user) {
                $this->error("User with ID {$userId} not found.");
                return 1;
            }

            $subscription = UserSubscription::where('user_id', $userId)
                ->where('status', 'active')
                ->latest()
                ->first();

            if (!$subscription) {
                $this->error("No active subscription found for user {$user->name} (ID: {$userId}).");
                return 1;
            }

            $this->info("Testing with User: {$user->name} (ID: {$user->id})");
            $this->info("Current status: {$user->status}");
            $this->info("Subscription end date: {$subscription->subscription_end->format('Y-m-d')}");
            $this->info("Subscription status: {$subscription->status}");

            if ($expireNow) {
                // Set subscription to expire today for testing
                $subscription->update([
                    'subscription_end' => Carbon::today()
                ]);
                $this->warn("Subscription end date set to today for testing.");
            }

            // Now test the expiration
            $this->newLine();
            $this->info("=== Testing Subscription Expiration ===");
            $this->call('subscriptions:check');

            // Check if status changed
            $user->refresh();
            if ($user->status === 'Client expiré') {
                $this->info("✓ SUCCESS: User status changed to 'Client expiré'");
            } else {
                $this->warn("User status is still: {$user->status}");
            }

            // Test email sending
            $this->newLine();
            $this->info("=== Testing Email Reminder ===");
            $subscription->refresh();
            
            if ($subscription->subscription_end <= Carbon::today()) {
                // Send expiration email
                try {
                    $daysRemaining = Carbon::today()->diffInDays($subscription->subscription_end, false);
                    Mail::to($user->email)->send(
                        new SubscriptionReminderEmail($subscription, $daysRemaining)
                    );
                    $this->info("✓ Email sent successfully to {$user->email}");
                    $this->info("  Days remaining: {$daysRemaining}");
                } catch (\Exception $e) {
                    $this->error("Failed to send email: " . $e->getMessage());
                }
            } else {
                // Test reminder for upcoming expiration
                $this->call('subscriptions:send-reminders', ['--days' => 30]);
            }

        } else {
            // Show all active subscriptions that could be tested
            $this->info("=== Active Subscriptions ===");
            $subscriptions = UserSubscription::where('status', 'active')
                ->with(['user', 'matrimonialPack'])
                ->get();

            if ($subscriptions->isEmpty()) {
                $this->warn("No active subscriptions found.");
                return 0;
            }

            $this->table(
                ['ID', 'User', 'User Status', 'Pack', 'End Date', 'Days Left'],
                $subscriptions->map(function ($sub) {
                    $daysLeft = Carbon::now()->diffInDays($sub->subscription_end, false);
                    return [
                        $sub->id,
                        $sub->user->name,
                        $sub->user->status,
                        $sub->matrimonialPack->name ?? 'N/A',
                        $sub->subscription_end->format('Y-m-d'),
                        $daysLeft
                    ];
                })
            );

            $this->newLine();
            $this->info("To test expiration, use:");
            $this->line("  php artisan subscriptions:test-expiration {user_id} --expire-now");
            $this->newLine();
            $this->info("Or to send reminders:");
            $this->line("  php artisan subscriptions:send-reminders --days=7");
        }

        return 0;
    }
}
