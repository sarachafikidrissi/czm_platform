<?php

namespace App\Http\Controllers;

use App\Models\Bill;
use App\Models\User;
use App\Models\UserSubscription;
use App\Mail\BillEmail;
use App\Services\BillSubscriptionLinkService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;
use Barryvdh\DomPDF\Facade\Pdf;

class BillController extends Controller
{
    use AuthorizesRequests;

    protected function mapBillRow(Bill $bill): array
    {
        return [
            'id' => $bill->id,
            'bill_number' => $bill->bill_number,
            'order_number' => $bill->order_number,
            'bill_date' => $bill->bill_date,
            'due_date' => $bill->due_date,
            'status' => $bill->status,
            'amount' => $bill->amount,
            'tax_rate' => $bill->tax_rate,
            'tax_amount' => $bill->tax_amount,
            'total_amount' => $bill->total_amount,
            'currency' => $bill->currency,
            'payment_method' => $bill->payment_method,
            'pack_name' => $bill->pack_name,
            'pack_price' => $bill->pack_price,
            'pack_advantages' => $bill->pack_advantages,
            'email_sent' => $bill->email_sent,
            'email_sent_at' => $bill->email_sent_at,
            'created_at' => $bill->created_at,
            'user_id' => $bill->user_id,
            'matchmaker' => $this->mapMatchmakerPayload($bill->matchmaker, null),
            'user' => $bill->user ? [
                'id' => $bill->user->id,
                'name' => $bill->user->name,
                'email' => $bill->user->email,
                'phone' => $bill->user->phone,
                'city' => $bill->user->city,
                'country' => $bill->user->country,
                'username' => $bill->user->username,
            ] : null,
        ];
    }

    protected function mapBillDetail(Bill $bill, User $viewer): array
    {
        $bill->load([
            'user:id,name,email,phone,city,country,username,assigned_matchmaker_id',
            'matchmaker:id,name,email,phone,username,agency_id',
            'matchmaker.agency:id,name',
            'profile:id,user_id,matrimonial_pack_id',
            'profile.matrimonialPack:id,name,duration',
        ]);

        $agencyManager = $this->resolveAgencyManager($bill->matchmaker?->agency_id);
        $linkService = app(BillSubscriptionLinkService::class);
        $subscriptionMap = $linkService->buildBillToSubscriptionMap(
            $bill->user->bills()->orderBy('created_at')->get(['id', 'created_at', 'status']),
            $bill->user->subscriptions()->orderBy('created_at')->get(),
        );
        $linkedSubscription = $subscriptionMap[$bill->id] ?? null;
        if ($linkedSubscription && ! $linkedSubscription->relationLoaded('matrimonialPack')) {
            $linkedSubscription->load('matrimonialPack:id,name,duration');
        }

        $isOverdue = $this->computeIsOverdue($bill);

        $row = array_merge($this->mapBillRow($bill), [
            'notes' => $bill->notes,
            'is_overdue' => $isOverdue,
            'can_download' => $viewer->can('view', $bill),
            'can_resend_email' => $viewer->can('resendEmail', $bill),
            'can_mark_paid' => $viewer->can('markPaid', $bill),
            'member_user_id' => $bill->user_id,
        ]);

        $row['matchmaker'] = $this->mapMatchmakerPayload($bill->matchmaker, $agencyManager);
        $row['agency_manager'] = $agencyManager
            ? $this->mapStaffContact($agencyManager)
            : null;
        $row['duration_months'] = $linkedSubscription?->duration_months
            ?? $bill->profile?->matrimonialPack?->duration;
        $row['subscription'] = $this->mapSubscriptionSummary($linkedSubscription);

        return $row;
    }

    protected function computeIsOverdue(Bill $bill): bool
    {
        return $bill->status !== 'paid'
            && $bill->due_date
            && $bill->due_date->lt(now()->startOfDay());
    }

    protected function resolveAgencyManager(?int $agencyId): ?User
    {
        if (! $agencyId) {
            return null;
        }

        return User::query()
            ->whereHas('roles', fn ($q) => $q->where('name', 'manager'))
            ->where('agency_id', $agencyId)
            ->where('approval_status', 'approved')
            ->select('id', 'name', 'username', 'email', 'phone')
            ->first();
    }

    /**
     * @param  array<int>  $agencyIds
     * @return array<int, User>
     */
    protected function resolveAgencyManagers(array $agencyIds): array
    {
        if ($agencyIds === []) {
            return [];
        }

        return User::query()
            ->whereHas('roles', fn ($q) => $q->where('name', 'manager'))
            ->whereIn('agency_id', $agencyIds)
            ->where('approval_status', 'approved')
            ->select('id', 'name', 'username', 'email', 'phone', 'agency_id')
            ->get()
            ->keyBy('agency_id')
            ->all();
    }

    protected function mapStaffContact(?User $user): ?array
    {
        if (! $user) {
            return null;
        }

        return [
            'id' => $user->id,
            'name' => $user->name,
            'username' => $user->username,
            'email' => $user->email,
            'phone' => $user->phone,
        ];
    }

    protected function mapMatchmakerPayload(?User $matchmaker, ?User $agencyManager): ?array
    {
        if (! $matchmaker) {
            return null;
        }

        return [
            'id' => $matchmaker->id,
            'name' => $matchmaker->name,
            'username' => $matchmaker->username,
            'email' => $matchmaker->email,
            'phone' => $matchmaker->phone,
            'agency' => $matchmaker->agency ? [
                'id' => $matchmaker->agency->id,
                'name' => $matchmaker->agency->name,
            ] : null,
            'agency_manager' => $agencyManager
                ? $this->mapStaffContact($agencyManager)
                : null,
        ];
    }

    protected function mapSubscriptionSummary(?UserSubscription $subscription): ?array
    {
        if (! $subscription) {
            return null;
        }

        return [
            'id' => $subscription->id,
            'status' => $subscription->status,
            'subscription_start' => $subscription->subscription_start,
            'subscription_end' => $subscription->subscription_end,
            'duration_months' => $subscription->duration_months,
            'days_remaining' => $subscription->days_remaining,
            'is_expired' => $subscription->is_expired,
            'is_active' => $subscription->is_active,
        ];
    }

    protected function mapBillListRow(
        Bill $bill,
        ?UserSubscription $subscription,
        ?User $agencyManager,
    ): array {
        $row = $this->mapBillRow($bill);
        $row['is_overdue'] = $this->computeIsOverdue($bill);
        $row['matchmaker'] = $this->mapMatchmakerPayload($bill->matchmaker, $agencyManager);
        $row['agency_manager'] = $agencyManager
            ? $this->mapStaffContact($agencyManager)
            : null;
        $row['duration_months'] = $subscription?->duration_months
            ?? $bill->profile?->matrimonialPack?->duration;
        $row['subscription'] = $this->mapSubscriptionSummary($subscription);

        return $row;
    }

    public function index(Request $request)
    {
        $user = Auth::user();
        $paginated = $user->bills()
            ->with([
                'matchmaker:id,name,email,phone,username,agency_id',
                'matchmaker.agency:id,name',
                'profile:id,user_id,matrimonial_pack_id',
                'profile.matrimonialPack:id,name,duration',
                'user:id,name,email,phone,city,country,username',
            ])
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        $linkService = app(BillSubscriptionLinkService::class);
        $allBills = $user->bills()->orderBy('created_at')->get(['id', 'created_at', 'status']);
        $allSubscriptions = $user->subscriptions()->orderBy('created_at')->get();
        $subscriptionMap = $linkService->buildBillToSubscriptionMap($allBills, $allSubscriptions);

        $agencyIds = $paginated->getCollection()
            ->pluck('matchmaker.agency_id')
            ->filter()
            ->unique()
            ->values()
            ->all();
        $agencyManagers = $this->resolveAgencyManagers($agencyIds);

        $bills = $paginated->getCollection()
            ->map(function (Bill $bill) use ($subscriptionMap, $agencyManagers) {
                $agencyManager = $agencyManagers[$bill->matchmaker?->agency_id] ?? null;
                $subscription = $subscriptionMap[$bill->id] ?? null;

                return $this->mapBillListRow($bill, $subscription, $agencyManager);
            })
            ->values();

        return Inertia::render('mes-commandes', [
            'bills' => $bills,
            'pagination' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'total' => $paginated->total(),
            ],
        ]);
    }

    /**
     * Staff slim bills list.
     * GET /staff/bills
     */
    public function staffIndex(Request $request)
    {
        $me = Auth::user();
        if (! $me || ! $me->hasAnyRole(['matchmaker', 'manager', 'admin'])) {
            abort(403, 'Unauthorized.');
        }

        if (in_array($me->roles->first()?->name ?? '', ['manager', 'matchmaker'], true)) {
            if ($me->approval_status !== 'approved') {
                abort(403, 'Your account is not validated yet.');
            }
        }

        $query = Bill::query()
            ->with([
                'user:id,name,username,assigned_matchmaker_id,agency_id',
                'matchmaker:id,name',
            ])
            ->orderByDesc('created_at');

        if ($me->hasRole('admin')) {
            // all bills
        } elseif ($me->hasRole('matchmaker')) {
            $query->whereHas('user', fn ($q) => $q->where('assigned_matchmaker_id', $me->id));
        } elseif ($me->hasRole('manager')) {
            if ($me->agency_id === null) {
                $query->whereHas('user', fn ($q) => $q->where('assigned_matchmaker_id', $me->id));
            } else {
                $query->whereHas('user', function ($q) use ($me) {
                    $q->where('agency_id', $me->agency_id)
                        ->orWhere('assigned_matchmaker_id', $me->id);
                });
            }
        }

        $paginated = $query->paginate(10);
        $bills = $paginated->getCollection()
            ->map(fn (Bill $bill) => array_merge($this->mapBillRow($bill), [
                'member_name' => $bill->user?->name,
                'member_username' => $bill->user?->username,
            ]))
            ->values();

        return Inertia::render('matchmaker/bills-list', [
            'bills' => $bills,
            'pagination' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'total' => $paginated->total(),
            ],
        ]);
    }

    /**
     * GET /mes-commandes/{bill} | GET /staff/bills/{bill}
     */
    public function show(Bill $bill)
    {
        $me = Auth::user();
        if (! $me) {
            abort(403, 'Unauthorized.');
        }

        $this->authorize('view', $bill);

        $viewerRole = $me->roles->first()?->name ?? 'user';
        $isStaffRoute = request()->is('staff/*');

        return Inertia::render('bill-show', [
            'bill' => $this->mapBillDetail($bill, $me),
            'viewerRole' => $viewerRole,
            'backUrl' => $isStaffRoute || $viewerRole !== 'user'
                ? '/staff/bills'
                : '/mes-commandes',
            'downloadUrl' => $isStaffRoute || $viewerRole !== 'user'
                ? "/staff/bills/{$bill->id}/download"
                : "/mes-commandes/{$bill->id}/download",
            'sendEmailUrl' => "/staff/bills/{$bill->id}/send-email",
            'markAsClientUrl' => '/staff/mark-as-client',
        ]);
    }

    public function downloadPdf(Bill $bill)
    {
        $this->authorize('view', $bill);

        $bill->load(['user', 'profile', 'matchmaker']);

        $pdf = Pdf::loadView('pdf.invoice', ['bill' => $bill]);
        $pdf->setPaper('A4', 'portrait');
        $pdf->setOption('enable-smart-shrinking', true);
        $pdf->setOption('page-break-inside', 'avoid');

        return response($pdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$bill->bill_number.'.pdf"',
            'Cache-Control' => 'no-cache, no-store, must-revalidate',
            'Pragma' => 'no-cache',
            'Expires' => '0',
        ]);
    }

    public function sendEmail(Bill $bill)
    {
        $this->authorize('resendEmail', $bill);

        $bill->load(['user', 'profile', 'matchmaker']);

        try {
            Mail::to($bill->user->email)->send(new BillEmail($bill));

            $bill->update([
                'email_sent' => true,
                'email_sent_at' => now(),
            ]);

            return back()->with('success', 'Facture renvoyée par email avec succès.');
        } catch (\Exception $e) {
            Log::error('Bill email send failed', [
                'bill_id' => $bill->id,
                'error' => $e->getMessage(),
            ]);

            return back()->with('error', 'Erreur lors de l\'envoi de l\'email. Veuillez réessayer.');
        }
    }
}
