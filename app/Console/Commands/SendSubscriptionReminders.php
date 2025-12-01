<?php

namespace App\Console\Commands;

use App\Models\UserSubscription;
use App\Mail\SubscriptionReminderEmail;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class SendSubscriptionReminders extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'subscriptions:send-reminders {--days=7 : Number of days before expiration to send reminder}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send email reminders for subscriptions expiring soon';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $days = (int) $this->option('days');
        $this->info("Sending reminders for subscriptions expiring in the next {$days} days...");

        $today = Carbon::today();
        $targetDate = $today->copy()->addDays($days);

        // Find active subscriptions expiring in the specified number of days
        $subscriptions = UserSubscription::where('status', 'active')
            ->where('subscription_end', '>=', $today)
            ->where('subscription_end', '<=', $targetDate)
            ->with(['user', 'matrimonialPack', 'assignedMatchmaker'])
            ->get();

        if ($subscriptions->isEmpty()) {
            $this->info('No subscriptions found for reminders.');
            return 0;
        }

        $sent = 0;
        foreach ($subscriptions as $subscription) {
            try {
                $daysRemaining = $today->diffInDays($subscription->subscription_end, false);
                
                // Only send email if exactly the specified number of days remaining
                if ($daysRemaining == $days) {
                    Mail::to($subscription->user->email)->send(
                        new SubscriptionReminderEmail($subscription, $daysRemaining)
                    );
                    
                    $sent++;
                    $this->line("- Sent reminder to {$subscription->user->name} ({$subscription->user->email}) - {$daysRemaining} days remaining");
                }
            } catch (\Exception $e) {
                $this->error("Failed to send reminder to {$subscription->user->email}: " . $e->getMessage());
            }
        }

        $this->info("Reminders sent: {$sent}/{$subscriptions->count()}");
        return 0;
    }
}
