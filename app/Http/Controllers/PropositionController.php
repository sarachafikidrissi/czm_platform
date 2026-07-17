<?php

namespace App\Http\Controllers;

use App\Models\Proposition;
use App\Models\PropositionRequest;
use App\Models\Rdv;
use App\Models\User;
use App\Models\UserActivity;
use App\Services\PropositionStaffPayloadService;
use App\Services\UserActivityService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Inertia\Inertia;

class PropositionController extends Controller
{
    use AuthorizesRequests;

    /** @var string French UI message — recipient already has pending/interested proposition */
    public const MESSAGE_RECIPIENT_HAS_ACTIVE_PROPOSITION = 'Ce profil a déjà une proposition active. Annulez-la avant d\'en envoyer une nouvelle.';

    public const MESSAGE_REFERENCE_HAS_ACTIVE_PROPOSITION = 'Le profil de référence a déjà une proposition en cours. Annulez-la ou attendez sa résolution avant d\'en envoyer une nouvelle.';

    public const MESSAGE_COMPATIBLE_HAS_ACTIVE_PROPOSITION = 'Le profil compatible a déjà une proposition en cours. Annulez-la ou attendez sa résolution avant d\'en envoyer une nouvelle.';

    /** @var string French UI message — cancel not allowed in current state */
    public const MESSAGE_CANCEL_INVALID_STATE = 'Cette proposition ne peut pas être annulée dans son état actuel.';
    public const MESSAGE_CANCEL_EXPIRED = 'Cette proposition est expirée et ne peut pas être annulée.';
    public const MESSAGE_ACTIVE_RDV_IN_PROGRESS = 'Ce profil a déjà un RDV en cours ou réussi. Une nouvelle proposition ne peut être envoyée que si le RDV échoue.';

    /**
     * Map a proposition for JSON / Inertia payloads (staff lists).
     *
     * @param  array<string, mixed>  $extra
     */
    protected function mapPropositionForPayload(Proposition $proposition, ?User $actor = null, array $extra = []): array
    {
        $isExpired = $proposition->status === 'expired'
            || ($proposition->status === 'pending'
                && $proposition->created_at
                && $proposition->created_at->lt(now()->subDays(7)));

        $isActive = $proposition->isActive();
        $canCancel = false;
        if ($actor && $actor->hasRole('matchmaker') && $proposition->canBeCancelledByMatchmaker()) {
            $canCancel = $actor->can('cancel', $proposition);
        }

        return array_merge([
            'id' => $proposition->id,
            'message' => $proposition->message,
            'status' => $proposition->status,
            'is_expired' => $isExpired,
            'is_active' => $isActive,
            'can_cancel' => $canCancel,
            'cancelled_at' => $proposition->cancelled_at,
            'response_message' => $proposition->response_message,
            'user_response' => $proposition->user_response,
            'responded_at' => $proposition->responded_at,
            'created_at' => $proposition->created_at,
            'pair_id' => $proposition->pair_id,
        ], $extra);
    }

    /**
     * Normalize DB status for "latest cycle" gates in store() (re-propose after close/cancel/etc.).
     */
    protected function mapPropositionToLatestCycleStatus(Proposition $proposition): string
    {
        $isStalePending = $proposition->status === 'pending'
            && $proposition->created_at
            && $proposition->created_at->lt(now()->subDays(7));

        if ($isStalePending) {
            return 'expired';
        }
        if ($proposition->status === 'interested') {
            return 'accepted';
        }
        if ($proposition->status === 'not_interested') {
            return 'rejected';
        }
        if ($proposition->status === Proposition::STATUS_EXPIRED) {
            return 'expired';
        }
        if ($proposition->status === Proposition::STATUS_CANCELLED) {
            return 'cancelled';
        }
        if ($proposition->status === Proposition::STATUS_CLOSED) {
            return 'closed';
        }

        return 'pending';
    }

    /**
     * List propositions for the authenticated user.
     */
    public function index(Request $request)
    {
        $me = Auth::user();
        if (! $me || ! $me->hasRole('user')) {
            abort(403, 'Unauthorized.');
        }

        $paginated = Proposition::query()
            ->where('recipient_user_id', $me->id)
            ->with([
                'matchmaker:id,name,username',
                'referenceUser:id,name,username',
                'referenceUser.profile:id,user_id,profile_picture_path',
                'compatibleUser:id,name,username',
                'compatibleUser.profile:id,user_id,profile_picture_path',
            ])
            ->latest()
            ->paginate(10);

        $propositions = $paginated->getCollection()
            ->map(function (Proposition $proposition) use ($me) {
                $base = $this->mapPropositionForPayload($proposition, $me);
                $isExpired = (bool) ($base['is_expired'] ?? false);
                $canRespond = ! $isExpired
                    && $proposition->status === Proposition::STATUS_PENDING
                    && $proposition->responded_at === null;

                return array_merge($base, [
                    'recipient_user_id' => $proposition->recipient_user_id,
                    'can_respond' => $canRespond,
                    'matchmaker' => $proposition->matchmaker ? [
                        'id' => $proposition->matchmaker->id,
                        'name' => $proposition->matchmaker->name,
                        'username' => $proposition->matchmaker->username,
                    ] : null,
                    'reference_user' => $proposition->referenceUser ? [
                        'id' => $proposition->referenceUser->id,
                        'name' => $proposition->referenceUser->name,
                        'username' => $proposition->referenceUser->username,
                        'profile' => $proposition->referenceUser->profile,
                    ] : null,
                    'compatible_user' => $proposition->compatibleUser ? [
                        'id' => $proposition->compatibleUser->id,
                        'name' => $proposition->compatibleUser->name,
                        'username' => $proposition->compatibleUser->username,
                        'profile' => $proposition->compatibleUser->profile,
                    ] : null,
                ]);
            })
            ->values();

        return Inertia::render('propositions', [
            'propositions' => $propositions,
            'pagination' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'total' => $paginated->total(),
            ],
        ]);
    }

    /**
     * Single proposition detail.
     * GET /propositions/{proposition} | GET /staff/propositions/{proposition}
     */
    public function show(Proposition $proposition)
    {
        $me = Auth::user();
        if (! $me) {
            abort(403, 'Unauthorized.');
        }

        $this->authorize('view', $proposition);

        $viewerRole = $me->roles->first()?->name ?? 'user';
        $service = app(PropositionStaffPayloadService::class);

        $proposition->load([
            'matchmaker:id,name,username,email,phone,agency_id',
            'matchmaker.agency:id,name',
            'referenceUser:id,name,username,phone,gender,status',
            'referenceUser.profile:id,user_id,profile_picture_path,date_naissance,pays_residence,ville_residence',
            'compatibleUser:id,name,username,phone,gender,status',
            'compatibleUser.profile:id,user_id,profile_picture_path,date_naissance,pays_residence,ville_residence',
            'recipientUser:id,name,username,assigned_matchmaker_id',
            'recipientUser.profile:id,user_id,profile_picture_path',
        ]);

        $pairRows = $proposition->pair_id
            ? Proposition::query()
                ->where('pair_id', $proposition->pair_id)
                ->with([
                    'recipientUser:id,name,username,assigned_matchmaker_id',
                    'recipientUser.profile:id,user_id,profile_picture_path',
                    'referenceUser:id,name,username',
                    'referenceUser.profile:id,user_id,profile_picture_path',
                    'compatibleUser:id,name,username',
                    'compatibleUser.profile:id,user_id,profile_picture_path',
                ])
                ->orderBy('id')
                ->get()
            : collect([$proposition]);

        $rawForContext = $service->visiblePropositionsQuery($me)
            ->where(function ($q) use ($proposition) {
                $q->where('reference_user_id', $proposition->reference_user_id)
                    ->where('compatible_user_id', $proposition->compatible_user_id);
            })
            ->with([
                'recipientUser:id,name,username,assigned_matchmaker_id',
                'recipientUser.profile:id,user_id,profile_picture_path',
                'referenceUser:id,name,username',
                'referenceUser.profile:id,user_id,profile_picture_path',
                'compatibleUser:id,name,username',
                'compatibleUser.profile:id,user_id,profile_picture_path',
            ])
            ->get();

        $context = $service->buildStaffContext($rawForContext, $me);
        $mappedRows = $pairRows->map(fn (Proposition $row) => $service->mapStaffRow($row, $me, $context));
        $group = $service->groupStaffRows($mappedRows)[0] ?? null;

        if ($group === null) {
            $singleMapped = $service->mapStaffRow($proposition, $me, $context);
            $group = [
                'key' => $proposition->pair_id ? 'pair-'.$proposition->pair_id : 'single-'.$proposition->id,
                'id' => $proposition->id,
                'pair_id' => $proposition->pair_id,
                'matchmaker_id' => $proposition->matchmaker_id,
                'reference_user' => $service->mapUserSummary($proposition->referenceUser, true),
                'compatible_user' => $service->mapUserSummary($proposition->compatibleUser, true),
                'message' => $proposition->message,
                'created_at' => $proposition->created_at,
                'recipients' => [
                    $proposition->recipient_user_id => $singleMapped,
                ],
                'aggregate_status' => $service->computeAggregateStatus([
                    'recipients' => [$proposition->recipient_user_id => $singleMapped],
                ]),
            ];
        }

        $myRecipientRow = $group['recipients'][$me->id]
            ?? $group['recipients'][(string) $me->id]
            ?? null;
        $isExpired = $myRecipientRow
            ? (bool) ($myRecipientRow['is_expired'] ?? false)
            : ($proposition->status === Proposition::STATUS_EXPIRED
                || ($proposition->status === Proposition::STATUS_PENDING
                    && $proposition->created_at
                    && $proposition->created_at->lt(now()->subDays(7))));

        $canRespond = $viewerRole === 'user'
            && (int) $proposition->recipient_user_id === (int) $me->id
            && ! $isExpired
            && $proposition->status === Proposition::STATUS_PENDING
            && $proposition->responded_at === null;

        $recipientRows = [];
        foreach ($group['recipients'] as $recipientId => $row) {
            $recipientRows[(string) $recipientId] = $row;
        }

        $cancellable = array_values(array_filter($recipientRows, fn ($row) => ! empty($row['can_cancel'])));
        $rdvSource = collect($recipientRows)->first(fn ($row) => ! empty($row['can_create_rdv']));

        if ($viewerRole === 'user') {
            return Inertia::render('proposition-show', [
                'proposition' => [
                    'id' => $proposition->id,
                    'pair_id' => $group['pair_id'],
                    'message' => $group['message'],
                    'aggregate_status' => $group['aggregate_status'],
                    'created_at' => $proposition->created_at?->format('d/m/Y'),
                    'updated_at' => $proposition->updated_at?->format('d/m/Y'),
                    'reference_user_id' => $proposition->reference_user_id,
                    'compatible_user_id' => $proposition->compatible_user_id,
                    'recipient_user_id' => $proposition->recipient_user_id,
                    'reference_user' => $service->mapUserSummary($proposition->referenceUser, false),
                    'compatible_user' => $service->mapUserSummary($proposition->compatibleUser, false),
                    'matchmaker' => $proposition->matchmaker,
                    'my_recipient_row' => $myRecipientRow,
                ],
                'viewerRole' => $viewerRole,
                'canRespond' => $canRespond,
            ]);
        }

        return Inertia::render('proposition-show', [
            'proposition' => [
                'id' => $proposition->id,
                'pair_id' => $group['pair_id'],
                'message' => $group['message'],
                'aggregate_status' => $group['aggregate_status'],
                'created_at' => $proposition->created_at?->format('d/m/Y'),
                'updated_at' => $proposition->updated_at?->format('d/m/Y'),
                'reference_user_id' => $proposition->reference_user_id,
                'compatible_user_id' => $proposition->compatible_user_id,
                'recipient_user_id' => $proposition->recipient_user_id,
                'reference_user' => $service->mapUserSummary($proposition->referenceUser, true),
                'compatible_user' => $service->mapUserSummary($proposition->compatibleUser, true),
                'matchmaker' => $proposition->matchmaker,
                'recipients' => $recipientRows,
                'my_recipient_row' => $myRecipientRow,
                'can_cancel' => count($cancellable) > 0,
                'cancellable_proposition_id' => $cancellable[0]['id'] ?? null,
                'can_create_rdv' => $rdvSource !== null,
                'rdv_proposition_id' => $rdvSource['id'] ?? null,
                'is_recreation_context' => (bool) ($rdvSource['is_recreation_context'] ?? false),
                'recreate_from_failed_rdv_id' => $rdvSource['recreate_from_failed_rdv_id'] ?? null,
                'rdv_exists' => collect($recipientRows)->contains(fn ($row) => ! empty($row['rdv_exists'])),
            ],
            'viewerRole' => $viewerRole,
            'canRespond' => $canRespond,
        ]);
    }

    /**
     * Store propositions for selected recipients.
     */
    public function store(Request $request)
    {
        $me = Auth::user();
        if (! $me || ! $me->hasAnyRole(['matchmaker', 'manager'])) {
            abort(403, 'Unauthorized.');
        }

        $data = $request->validate([
            'reference_user_id' => ['required', 'integer', 'exists:users,id'],
            'compatible_user_id' => ['required', 'integer', 'exists:users,id'],
            'message' => ['required', 'string', 'max:2000'],
            'send_to_reference' => ['nullable', 'boolean'],
            'send_to_compatible' => ['nullable', 'boolean'],
        ]);

        $sendToReference = (bool) ($data['send_to_reference'] ?? false);
        $sendToCompatible = (bool) ($data['send_to_compatible'] ?? false);

        if (! $sendToReference && ! $sendToCompatible) {
            return response()->json([
                'message' => 'Select at least one recipient.',
            ], 422);
        }

        if ((int) $data['reference_user_id'] === (int) $data['compatible_user_id']) {
            return response()->json([
                'message' => 'Reference and compatible profiles must be different.',
            ], 422);
        }

        $referenceUser = User::select('id', 'assigned_matchmaker_id')->findOrFail($data['reference_user_id']);
        $compatibleUser = User::select('id', 'assigned_matchmaker_id')->findOrFail($data['compatible_user_id']);
        if ($this->hasBlockingRdvForEitherProfile((int) $referenceUser->id, (int) $compatibleUser->id)) {
            return response()->json([
                'message' => self::MESSAGE_ACTIVE_RDV_IN_PROGRESS,
            ], 422);
        }

        if (Proposition::hasActiveProposition((int) $referenceUser->id)) {
            return response()->json([
                'message' => self::MESSAGE_REFERENCE_HAS_ACTIVE_PROPOSITION,
            ], 422);
        }
        if (Proposition::hasActiveProposition((int) $compatibleUser->id)) {
            return response()->json([
                'message' => self::MESSAGE_COMPATIBLE_HAS_ACTIVE_PROPOSITION,
            ], 422);
        }

        $acceptedRequest = PropositionRequest::query()
            ->where('from_matchmaker_id', $me->id)
            ->where('to_matchmaker_id', $compatibleUser->assigned_matchmaker_id)
            ->where('status', 'accepted')
            ->where(function ($query) use ($referenceUser, $compatibleUser) {
                if (Schema::hasColumn('proposition_requests', 'reference_user_id')) {
                    $query->where('reference_user_id', $referenceUser->id)
                        ->where('compatible_user_id', $compatibleUser->id);
                } elseif (Schema::hasColumn('proposition_requests', 'user_a_id')) {
                    $query->where('user_a_id', $referenceUser->id)
                        ->where('user_b_id', $compatibleUser->id);
                }
            })
            ->orderByDesc('responded_at')
            ->orderByDesc('created_at')
            ->first();

        $hasAcceptedRequest = (bool) $acceptedRequest;

        if (! $hasAcceptedRequest && $compatibleUser->assigned_matchmaker_id !== $me->id) {
            abort(403, 'You can only propose between profiles assigned to you.');
        }

        // Refusal gate removed by design: matchmakers can re-propose directly after
        // a refusal without needing a new accepted proposition request.

        $latestByRecipient = Proposition::query()
            ->where('matchmaker_id', $me->id)
            ->where('reference_user_id', $referenceUser->id)
            ->where('compatible_user_id', $compatibleUser->id)
            ->orderByDesc('created_at')
            ->get()
            ->unique('recipient_user_id')
            ->values();

        if ($latestByRecipient->count() >= 1) {
            $latestStatuses = $latestByRecipient->map(fn (Proposition $proposition) => $this->mapPropositionToLatestCycleStatus($proposition));

            if ($latestStatuses->contains('pending')) {
                return response()->json([
                    'message' => 'Proposition deja envoyee, en attente de reponse.',
                ], 422);
            }
        }

        if ($latestByRecipient->count() >= 2) {
            $latestStatuses = $latestByRecipient->map(fn (Proposition $proposition) => $this->mapPropositionToLatestCycleStatus($proposition));

            $allAccepted = $latestStatuses->every(fn ($status) => $status === 'accepted');
            if ($allAccepted) {
                return response()->json([
                    'message' => 'Proposition deja acceptee par les deux profils. En attente de rendez-vous.',
                ], 422);
            }
        }

        $recipients = [];
        if ($sendToReference) {
            $recipients[] = $referenceUser->id;
        }
        if ($sendToCompatible) {
            $recipients[] = $compatibleUser->id;
        }

        if (count($recipients) === 2) {
            if (Proposition::eitherMatchProfileHasActiveProposition((int) $referenceUser->id, (int) $compatibleUser->id)) {
                return response()->json([
                    'message' => self::MESSAGE_RECIPIENT_HAS_ACTIVE_PROPOSITION,
                ], 422);
            }
        } else {
            foreach ($recipients as $recipientId) {
                if (Proposition::hasActiveProposition((int) $recipientId)) {
                    return response()->json([
                        'message' => self::MESSAGE_RECIPIENT_HAS_ACTIVE_PROPOSITION,
                    ], 422);
                }
            }
        }

        $pairId = count($recipients) > 1 ? (string) Str::uuid() : null;

        $created = [];
        foreach ($recipients as $recipientId) {
            $proposition = Proposition::create([
                'matchmaker_id' => $me->id,
                'pair_id' => $pairId,
                'reference_user_id' => $referenceUser->id,
                'compatible_user_id' => $compatibleUser->id,
                'recipient_user_id' => $recipientId,
                'message' => trim($data['message']),
                'status' => 'pending',
            ]);
            $created[] = $proposition;
        }

        $names = User::whereIn('id', [$referenceUser->id, $compatibleUser->id])->pluck('name', 'id');
        $otherNameRef = $names[$compatibleUser->id] ?? 'another profile';
        $otherNameComp = $names[$referenceUser->id] ?? 'another profile';
        UserActivityService::log(
            $referenceUser->id,
            $me->id,
            'proposition',
            "Proposition envoyée avec {$otherNameRef}. ".(strlen(trim($data['message'])) > 0 ? 'Message : '.\Illuminate\Support\Str::limit(trim($data['message']), 100) : ''),
            []
        );
        UserActivityService::log(
            $compatibleUser->id,
            $me->id,
            'proposition',
            "Proposition envoyée avec {$otherNameComp}. ".(strlen(trim($data['message'])) > 0 ? 'Message : '.\Illuminate\Support\Str::limit(trim($data['message']), 100) : ''),
            []
        );

        return response()->json([
            'message' => 'Proposition sent.',
            'count' => count($created),
        ]);
    }

    /**
     * Send a proposition to the other profile (staged flow).
     */
    public function sendToOther(Request $request)
    {
        $me = Auth::user();
        if (! $me || ! $me->hasAnyRole(['matchmaker', 'manager'])) {
            abort(403, 'Unauthorized.');
        }

        $data = $request->validate([
            'reference_user_id' => ['required', 'integer', 'exists:users,id'],
            'compatible_user_id' => ['required', 'integer', 'exists:users,id'],
            'recipient_user_id' => ['required', 'integer', 'exists:users,id'],
            'message' => ['required', 'string', 'max:2000'],
        ]);

        if ((int) $data['reference_user_id'] === (int) $data['compatible_user_id']) {
            return response()->json([
                'message' => 'Reference and compatible profiles must be different.',
            ], 422);
        }

        $recipientId = (int) $data['recipient_user_id'];
        if (! in_array($recipientId, [(int) $data['reference_user_id'], (int) $data['compatible_user_id']], true)) {
            return response()->json([
                'message' => 'Recipient must be one of the proposition profiles.',
            ], 422);
        }

        $referenceUserId = (int) $data['reference_user_id'];
        $compatibleUserId = (int) $data['compatible_user_id'];

        $sibling = Proposition::query()
            ->where('matchmaker_id', $me->id)
            ->where('reference_user_id', $referenceUserId)
            ->where('compatible_user_id', $compatibleUserId)
            ->where('recipient_user_id', '!=', $recipientId)
            ->whereIn('recipient_user_id', [$referenceUserId, $compatibleUserId])
            ->active()
            ->orderByDesc('id')
            ->first();

        if (Proposition::hasActiveProposition($recipientId, $sibling?->id)) {
            return response()->json([
                'message' => self::MESSAGE_RECIPIENT_HAS_ACTIVE_PROPOSITION,
            ], 422);
        }

        $referenceUser = User::select('id', 'assigned_matchmaker_id')->findOrFail($referenceUserId);
        $compatibleUser = User::select('id', 'assigned_matchmaker_id')->findOrFail($compatibleUserId);
        if ($this->hasBlockingRdvForEitherProfile((int) $referenceUser->id, (int) $compatibleUser->id)) {
            return response()->json([
                'message' => self::MESSAGE_ACTIVE_RDV_IN_PROGRESS,
            ], 422);
        }

        if (Proposition::hasActiveProposition((int) $referenceUser->id, $sibling?->id)) {
            return response()->json([
                'message' => self::MESSAGE_REFERENCE_HAS_ACTIVE_PROPOSITION,
            ], 422);
        }
        if (Proposition::hasActiveProposition((int) $compatibleUser->id, $sibling?->id)) {
            return response()->json([
                'message' => self::MESSAGE_COMPATIBLE_HAS_ACTIVE_PROPOSITION,
            ], 422);
        }

        $acceptedRequest = PropositionRequest::query()
            ->where('from_matchmaker_id', $me->id)
            ->where('to_matchmaker_id', $compatibleUser->assigned_matchmaker_id)
            ->where('status', 'accepted')
            ->where(function ($query) use ($referenceUser, $compatibleUser) {
                if (Schema::hasColumn('proposition_requests', 'reference_user_id')) {
                    $query->where('reference_user_id', $referenceUser->id)
                        ->where('compatible_user_id', $compatibleUser->id);
                } elseif (Schema::hasColumn('proposition_requests', 'user_a_id')) {
                    $query->where('user_a_id', $referenceUser->id)
                        ->where('user_b_id', $compatibleUser->id);
                }
            })
            ->orderByDesc('responded_at')
            ->orderByDesc('created_at')
            ->first();

        $hasAcceptedRequest = (bool) $acceptedRequest;

        if (! $hasAcceptedRequest && $compatibleUser->assigned_matchmaker_id !== $me->id) {
            abort(403, 'You can only propose between profiles assigned to you.');
        }

        // Refusal gate removed by design: matchmakers can re-propose directly after
        // a refusal without needing a new accepted proposition request.

        $exists = Proposition::query()
            ->where('matchmaker_id', $me->id)
            ->where('reference_user_id', $referenceUser->id)
            ->where('compatible_user_id', $compatibleUser->id)
            ->where('recipient_user_id', $recipientId)
            ->active()
            ->exists();

        if ($exists) {
            return response()->json([
                'message' => 'Proposition already sent to this recipient.',
            ], 422);
        }

        $pairId = null;

        if ($sibling !== null) {
            if ($sibling->pair_id !== null) {
                $pairId = $sibling->pair_id;
            } else {
                $pairId = (string) Str::uuid();
                $sibling->update(['pair_id' => $pairId]);
            }
        }

        $proposition = Proposition::create([
            'matchmaker_id' => $me->id,
            'pair_id' => $pairId,
            'reference_user_id' => $referenceUser->id,
            'compatible_user_id' => $compatibleUser->id,
            'recipient_user_id' => $recipientId,
            'message' => trim($data['message']),
            'status' => 'pending',
        ]);

        $names = User::whereIn('id', [$referenceUser->id, $compatibleUser->id])->pluck('name', 'id');
        $otherNameRef = $names[$compatibleUser->id] ?? 'another profile';
        $otherNameComp = $names[$referenceUser->id] ?? 'another profile';
        UserActivityService::log(
            $referenceUser->id,
            $me->id,
            'proposition',
            "Proposition envoyée avec {$otherNameRef}. ".(strlen(trim($data['message'])) > 0 ? 'Message : '.\Illuminate\Support\Str::limit(trim($data['message']), 100) : ''),
            []
        );
        UserActivityService::log(
            $compatibleUser->id,
            $me->id,
            'proposition',
            "Proposition envoyée avec {$otherNameComp}. ".(strlen(trim($data['message'])) > 0 ? 'Message : '.\Illuminate\Support\Str::limit(trim($data['message']), 100) : ''),
            []
        );

        return response()->json([
            'message' => 'Proposition sent.',
            'id' => $proposition->id,
        ]);
    }

    /**
     * Respond to a proposition (accept/reject).
     */
    public function respond(Request $request, Proposition $proposition)
    {
        $me = Auth::user();
        if (! $me) {
            abort(403, 'Unauthorized.');
        }

        $recipient = User::select(['id', 'assigned_matchmaker_id'])
            ->find($proposition->recipient_user_id);

        $canRespondAsUser = $me->hasRole('user')
            && $recipient
            && $recipient->id === $me->id;

        $canRespondAsMatchmaker = $me->hasRole('matchmaker')
            && $recipient
            && $recipient->assigned_matchmaker_id === $me->id;

        if (! $canRespondAsUser && ! $canRespondAsMatchmaker) {
            abort(403, 'Unauthorized.');
        }

        if ($proposition->status === Proposition::STATUS_CANCELLED) {
            return response()->json([
                'message' => 'Cette proposition a été annulée.',
            ], 422);
        }

        if ($proposition->status === Proposition::STATUS_CLOSED) {
            return response()->json([
                'message' => 'Cette proposition est clôturée suite à la création d\'un RDV.',
            ], 422);
        }

        if ($canRespondAsUser && (
            $proposition->status !== Proposition::STATUS_PENDING
            || $proposition->responded_at !== null
        )) {
            return response()->json([
                'message' => 'Proposition already responded.',
            ], 422);
        }

        if ($proposition->status === Proposition::STATUS_PENDING && $proposition->created_at && $proposition->created_at->lt(now()->subDays(7))) {
            DB::transaction(function () use ($proposition, $me) {
                $locked = Proposition::query()->whereKey($proposition->id)->lockForUpdate()->first();
                if (! $locked || $locked->status !== Proposition::STATUS_PENDING) {
                    return;
                }
                if (! $locked->created_at || ! $locked->created_at->lt(now()->subDays(7))) {
                    return;
                }

                $toExpire = $locked->pair_id
                    ? Proposition::query()
                        ->where('pair_id', $locked->pair_id)
                        ->where('status', Proposition::STATUS_PENDING)
                        ->lockForUpdate()
                        ->get()
                    : collect([$locked]);

                foreach ($toExpire as $row) {
                    $row->update(['status' => Proposition::STATUS_EXPIRED]);
                    UserActivityService::log(
                        (int) $row->recipient_user_id,
                        $me->id,
                        'proposition_expired',
                        'Proposition expirée (délai dépassé).',
                        [
                            'proposition_id' => $row->id,
                            'previous_status' => Proposition::STATUS_PENDING,
                            'new_status' => Proposition::STATUS_EXPIRED,
                        ]
                    );
                }
            });

            return response()->json([
                'message' => 'Proposition expired.',
            ], 422);
        }

        $data = $request->validate([
            'status' => ['required', 'in:accepted,rejected'],
            'response_message' => ['nullable', 'string', 'max:2000'],
        ]);

        $responseMessage = isset($data['response_message']) ? trim($data['response_message']) : null;
        if ($data['status'] === 'rejected' && ($responseMessage === null || $responseMessage === '')) {
            return response()->json([
                'message' => 'Rejection message is required.',
            ], 422);
        }

        $mappedUserResponse = $data['status'] === 'accepted' ? Proposition::STATUS_INTERESTED : Proposition::STATUS_NOT_INTERESTED;

        $final = DB::transaction(function () use ($proposition, $mappedUserResponse, $responseMessage, $me, $data, $canRespondAsUser) {
            $locked = Proposition::query()->whereKey($proposition->id)->lockForUpdate()->firstOrFail();

            $pairRows = $locked->pair_id
                ? Proposition::query()
                    ->where('pair_id', $locked->pair_id)
                    ->orderBy('id')
                    ->lockForUpdate()
                    ->get()
                : collect([$locked]);

            $target = $pairRows->firstWhere('id', $locked->id);
            if ($target === null) {
                abort(404);
            }

            // Final safety checks under lock to prevent stale races.
            if ($pairRows->contains(fn (Proposition $row) => $row->status === Proposition::STATUS_CANCELLED)) {
                throw new HttpResponseException(response()->json([
                    'message' => 'Cette proposition a été annulée.',
                ], 422));
            }

            if ($pairRows->contains(fn (Proposition $row) => $row->status === Proposition::STATUS_CLOSED)) {
                throw new HttpResponseException(response()->json([
                    'message' => 'Cette proposition est clôturée suite à la création d\'un RDV.',
                ], 422));
            }

            $hasExpiredRow = $pairRows->contains(function (Proposition $row) {
                return $row->status === Proposition::STATUS_EXPIRED
                    || ($row->created_at && $row->created_at->lt(now()->subDays(7)));
            });
            if ($hasExpiredRow) {
                foreach ($pairRows as $row) {
                    if ($row->status !== Proposition::STATUS_PENDING) {
                        continue;
                    }
                    $row->update(['status' => Proposition::STATUS_EXPIRED]);
                }

                throw new HttpResponseException(response()->json([
                    'message' => 'Proposition expired.',
                ], 422));
            }

            // Keep user behavior strict, while preserving matchmaker "mettre a jour la reponse" flow.
            if ($canRespondAsUser) {
                $allRowsPending = $pairRows->every(fn (Proposition $row) => $row->status === Proposition::STATUS_PENDING);
                $targetUnanswered = $target->responded_at === null;
                if (! $allRowsPending || ! $targetUnanswered) {
                    throw new HttpResponseException(response()->json([
                        'message' => 'Proposition already responded.',
                    ], 422));
                }
            }

            $previousStatus = $locked->status;

            $target->update([
                'user_response' => $mappedUserResponse,
                'user_comment' => $responseMessage,
                'response_message' => $responseMessage,
                'responded_at' => now(),
            ]);

            $ids = $pairRows->pluck('id');
            $fresh = Proposition::query()->whereIn('id', $ids)->orderBy('id')->get();
            $newStatus = Proposition::computeSyncedPairStatus($fresh);

            foreach ($fresh as $r) {
                if ($r->status !== $newStatus) {
                    $r->update(['status' => $newStatus]);
                }
            }

            $activityType = $data['status'] === 'accepted' ? 'proposition_accepted' : 'proposition_refused';
            $activityDescription = $data['status'] === 'accepted'
                ? 'Proposition acceptée.'
                : 'Proposition refusée.';
            UserActivityService::log(
                (int) $target->recipient_user_id,
                $me->id,
                $activityType,
                $activityDescription,
                [
                    'proposition_id' => $target->id,
                    'previous_status' => $previousStatus,
                    'new_status' => $newStatus,
                ]
            );

            return Proposition::query()->findOrFail($proposition->id);
        });

        return response()->json([
            'message' => 'Response saved.',
            'status' => $final->status,
        ]);
    }

    /**
     * Cancel a proposition (assigned matchmaker only). Unlocks recipient for a new proposition.
     */
    public function cancel(Proposition $proposition)
    {
        $me = Auth::user();
        if (! $me || ! $me->hasAnyRole(['matchmaker', 'manager'])) {
            abort(403, 'Unauthorized.');
        }

        $this->authorize('cancel', $proposition);

        $isExpired = $proposition->status === Proposition::STATUS_EXPIRED
            || ($proposition->status === Proposition::STATUS_PENDING
                && $proposition->created_at
                && $proposition->created_at->lt(now()->subDays(7)));
        if ($isExpired) {
            return response()->json([
                'message' => self::MESSAGE_CANCEL_EXPIRED,
            ], 422);
        }

        if (! $proposition->canBeCancelledByMatchmaker()) {
            return response()->json([
                'message' => self::MESSAGE_CANCEL_INVALID_STATE,
            ], 422);
        }

        $previousStatus = $proposition->status;

        [$cancelledIds, $pairWasCancelled] = DB::transaction(function () use ($proposition, $me, $previousStatus) {
            $proposition->refresh();

            $cancelledAt = now();
            $ids = [];

            $proposition->update([
                'status' => Proposition::STATUS_CANCELLED,
                'cancelled_at' => $cancelledAt,
            ]);

            UserActivityService::log(
                (int) $proposition->recipient_user_id,
                $me->id,
                UserActivity::TYPE_PROPOSITION_CANCELLED,
                'Proposition annulée par votre matchmaker.',
                [
                    'proposition_id' => $proposition->id,
                    'previous_status' => $previousStatus,
                    'new_status' => Proposition::STATUS_CANCELLED,
                ]
            );
            $ids[] = (int) $proposition->id;

            $pairWasCancelled = false;
            if ($proposition->pair_id) {
                $siblings = Proposition::query()
                    ->pairedWith($proposition)
                    ->where('status', '!=', Proposition::STATUS_CANCELLED)
                    ->get();

                foreach ($siblings as $sibling) {
                    $prevSibling = $sibling->status;
                    $sibling->update([
                        'status' => Proposition::STATUS_CANCELLED,
                        'cancelled_at' => $cancelledAt,
                    ]);
                    $pairWasCancelled = true;
                    UserActivityService::log(
                        (int) $sibling->recipient_user_id,
                        $me->id,
                        UserActivity::TYPE_PROPOSITION_CANCELLED,
                        'Proposition annulée par votre matchmaker.',
                        [
                            'proposition_id' => $sibling->id,
                            'previous_status' => $prevSibling,
                            'new_status' => Proposition::STATUS_CANCELLED,
                            'paired_cancellation' => true,
                        ]
                    );
                    $ids[] = (int) $sibling->id;
                }
            }

            return [$ids, $pairWasCancelled];
        });

        $proposition->refresh();

        return response()->json([
            'message' => 'Proposition annulée.',
            'proposition' => $this->mapPropositionForPayload($proposition, $me, [
                'reference_user_id' => $proposition->reference_user_id,
                'compatible_user_id' => $proposition->compatible_user_id,
                'recipient_user_id' => $proposition->recipient_user_id,
            ]),
            'cancelled_proposition_ids' => $cancelledIds,
            'pair_was_cancelled' => $pairWasCancelled,
        ]);
    }

    private function hasBlockingRdvForEitherProfile(int $referenceUserId, int $compatibleUserId): bool
    {
        return Rdv::query()
            ->whereIn('status', [Rdv::STATUS_EN_COURS, Rdv::STATUS_REUSSI])
            ->where(function ($query) use ($referenceUserId, $compatibleUserId) {
                $query->where('reference_user_id', $referenceUserId)
                    ->orWhere('compatible_user_id', $referenceUserId)
                    ->orWhere('reference_user_id', $compatibleUserId)
                    ->orWhere('compatible_user_id', $compatibleUserId);
            })
            ->exists();
    }
}
