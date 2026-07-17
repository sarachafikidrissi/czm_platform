<?php

namespace App\Services;

use App\Models\Bill;
use App\Models\UserSubscription;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Schema;

/**
 * Links bills to subscriptions for display. No bill_id FK on user_subscriptions yet —
 * uses paid-bill order pairing as fallback until FK is added and backfilled.
 */
class BillSubscriptionLinkService
{
    /**
     * @param  Collection<int, Bill>  $bills
     * @param  Collection<int, UserSubscription>  $subscriptions
     * @return array<int, UserSubscription>
     */
    public function buildBillToSubscriptionMap(Collection $bills, Collection $subscriptions): array
    {
        if ($this->hasBillIdColumn()) {
            return $this->buildBillToSubscriptionMapByForeignKey($subscriptions);
        }

        return $this->buildBillToSubscriptionMapByPaidBillOrder($bills, $subscriptions);
    }

    /**
     * @param  Collection<int, Bill>  $paidBills
     * @param  Collection<int, UserSubscription>  $subscriptions
     */
    public function findBillForSubscription(
        UserSubscription $subscription,
        Collection $paidBills,
        Collection $subscriptions,
    ): ?Bill {
        if ($this->hasBillIdColumn() && $subscription->bill_id) {
            return $paidBills->firstWhere('id', $subscription->bill_id)
                ?? Bill::query()->find($subscription->bill_id);
        }

        $sortedSubs = $subscriptions->sortBy('created_at')->values();
        $sortedPaidBills = $paidBills->sortBy('created_at')->values();
        $index = $sortedSubs->search(fn (UserSubscription $s) => (int) $s->id === (int) $subscription->id);

        if ($index === false) {
            return null;
        }

        return $sortedPaidBills[$index] ?? null;
    }

    protected function hasBillIdColumn(): bool
    {
        return Schema::hasColumn('user_subscriptions', 'bill_id');
    }

    /**
     * @return array<int, UserSubscription>
     */
    protected function buildBillToSubscriptionMapByForeignKey(Collection $subscriptions): array
    {
        $map = [];
        foreach ($subscriptions as $subscription) {
            if ($subscription->bill_id) {
                $map[(int) $subscription->bill_id] = $subscription;
            }
        }

        return $map;
    }

    /**
     * Pair nth paid bill (by created_at) with nth subscription — legacy fallback until bill_id is backfilled.
     *
     * @param  Collection<int, Bill>  $bills
     * @param  Collection<int, UserSubscription>  $subscriptions
     * @return array<int, UserSubscription>
     */
    protected function buildBillToSubscriptionMapByPaidBillOrder(Collection $bills, Collection $subscriptions): array
    {
        $paidBills = $bills
            ->filter(fn (Bill $bill) => $bill->status === 'paid')
            ->sortBy('created_at')
            ->values();
        $sortedSubs = $subscriptions->sortBy('created_at')->values();
        $map = [];
        $count = min($paidBills->count(), $sortedSubs->count());

        for ($i = 0; $i < $count; $i++) {
            $map[(int) $paidBills[$i]->id] = $sortedSubs[$i];
        }

        return $map;
    }
}
