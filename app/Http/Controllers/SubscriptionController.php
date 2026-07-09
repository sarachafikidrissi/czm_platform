<?php

namespace App\Http\Controllers;

use App\Models\Bill;
use App\Models\User;
use App\Models\UserSubscription;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class SubscriptionController extends Controller
{
    use AuthorizesRequests;

    protected function mapSubscription(UserSubscription $subscription, bool $includeNotes = false): array
    {
        $subscription->load([
            'matrimonialPack:id,name,duration',
            'assignedMatchmaker:id,name,email,phone,username,agency_id',
            'assignedMatchmaker.agency:id,name',
            'user:id,name,username',
        ]);

        $payload = [
            'id' => $subscription->id,
            'user_id' => $subscription->user_id,
            'matrimonial_pack_id' => $subscription->matrimonial_pack_id,
            'subscription_start' => $subscription->subscription_start,
            'subscription_end' => $subscription->subscription_end,
            'duration_months' => $subscription->duration_months,
            'pack_price' => $subscription->pack_price,
            'pack_advantages' => $subscription->pack_advantages,
            'payment_mode' => $subscription->payment_mode,
            'status' => $subscription->status,
            'is_active' => $subscription->is_active,
            'is_expired' => $subscription->is_expired,
            'days_remaining' => $subscription->days_remaining,
            'matrimonial_pack' => $subscription->matrimonialPack,
            'assigned_matchmaker' => $subscription->assignedMatchmaker ? [
                'id' => $subscription->assignedMatchmaker->id,
                'name' => $subscription->assignedMatchmaker->name,
                'email' => $subscription->assignedMatchmaker->email,
                'phone' => $subscription->assignedMatchmaker->phone,
                'username' => $subscription->assignedMatchmaker->username,
                'agency' => $subscription->assignedMatchmaker->agency,
            ] : null,
            'member' => $subscription->user ? [
                'id' => $subscription->user->id,
                'name' => $subscription->user->name,
                'username' => $subscription->user->username,
            ] : null,
        ];

        if ($includeNotes) {
            $payload['notes'] = $subscription->notes;
        }

        $linkedBill = Bill::query()
            ->where('user_id', $subscription->user_id)
            ->where('status', 'paid')
            ->where('created_at', '<=', $subscription->created_at)
            ->orderByDesc('created_at')
            ->first(['id', 'order_number', 'bill_number']);

        if ($linkedBill) {
            $payload['bill_id'] = $linkedBill->id;
            $payload['bill_order_number'] = $linkedBill->order_number;
        }

        $agencyId = $subscription->assignedMatchmaker?->agency_id;
        if ($agencyId) {
            $manager = User::query()
                ->whereHas('roles', fn ($q) => $q->where('name', 'manager'))
                ->where('agency_id', $agencyId)
                ->where('approval_status', 'approved')
                ->select('id', 'name', 'username')
                ->first();
            if ($manager) {
                $payload['agency_manager'] = [
                    'id' => $manager->id,
                    'name' => $manager->name,
                    'username' => $manager->username,
                ];
            }
        }

        return $payload;
    }

    /**
     * GET /staff/subscriptions/{subscription}
     */
    public function show(UserSubscription $subscription)
    {
        $me = Auth::user();
        if (! $me) {
            abort(403, 'Unauthorized.');
        }

        $this->authorize('view', $subscription);

        $viewerRole = $me->roles->first()?->name ?? 'user';
        $isStaffViewer = $me->hasAnyRole(['matchmaker', 'manager', 'admin']);

        return Inertia::render('subscription-show', [
            'subscription' => $this->mapSubscription($subscription, $isStaffViewer),
            'viewerRole' => $viewerRole,
            'backUrl' => $isStaffViewer
                ? ($subscription->user?->username ? "/profile/{$subscription->user->username}" : '/staff/bills')
                : '/user/subscription',
        ]);
    }
}
