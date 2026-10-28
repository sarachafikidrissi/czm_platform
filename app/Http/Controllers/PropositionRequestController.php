<?php

namespace App\Http\Controllers;

use App\Models\Proposition;
use App\Models\PropositionRequest;
use App\Models\Rdv;
use App\Models\User;
use App\Policies\UserProfileActionPolicy;
use App\Services\MatchmakingResultsPayloadService;
use App\Services\MatchmakingService;
use App\Support\ProspectListSearch;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class PropositionRequestController extends Controller
{
    /** @var string Must stay in sync with `propositionToastFr.acceptRequestBlockedRdvInProgress` */
    public const MESSAGE_ACCEPT_BLOCKED_RDV_IN_PROGRESS = 'Impossible d\'accepter — un RDV est en cours pour le profil concerné.';

    public const MESSAGE_ACCEPT_BLOCKED_ACTIVE_PROPOSITION = 'Impossible d\'accepter — l\'un des deux profils a encore une proposition active. Clôturez-la avant d\'accepter une nouvelle demande.';

    /** Subject-level and reference-level blocks for a new request (code => message). */
    public const REQUEST_BLOCK_MESSAGES = [
        'open_request' => 'Vous avez déjà une demande en cours pour ce profil. Attendez la réponse ou l\'envoi de la proposition.',
        'compatible_active' => 'Ce profil a déjà une proposition en cours. Elle doit être clôturée avant une nouvelle demande.',
        'compatible_rdv' => 'Ce profil a déjà un RDV en cours ou réussi.',
        'reference_active' => 'Votre membre a déjà une proposition en cours. Clôturez-la avant une nouvelle demande.',
        'reference_rdv' => 'Votre membre a déjà un RDV en cours ou réussi.',
    ];

    /**
     * Display sent/received proposition requests.
     */
    public function index(Request $request)
    {
        $me = Auth::user();
        if (! $me || ! $me->hasAnyRole(['matchmaker', 'manager'])) {
            abort(403, 'Unauthorized.');
        }

        $receivedRequests = PropositionRequest::where('to_matchmaker_id', $me->id)
            ->with([
                'referenceUser.profile',
                'compatibleUser.profile',
                'fromMatchmaker',
                'toMatchmaker',
            ])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function (PropositionRequest $propRequest) use ($me) {
                $acceptBlock = self::acceptBlockReason($propRequest, (int) $me->id);
                $canAccept = $acceptBlock === null;
                $compatibleProposition = Proposition::activeSnapshotForUser((int) $propRequest->compatible_user_id);
                $compatiblePropositionModel = $compatibleProposition['exists']
                    ? Proposition::find($compatibleProposition['proposition_id'])
                    : null;

                return array_merge($propRequest->toArray(), [
                    'evaluation_access_level' => $propRequest->status === 'accepted' ? 'read' : 'none',
                    'reference_user_proposition' => Proposition::activeSnapshotForUser((int) $propRequest->reference_user_id),
                    'compatible_user_proposition' => $compatibleProposition,
                    // "Clôturer la proposition" only for whoever may cancel it (its creator, or a manager).
                    'compatible_user_proposition_can_cancel' => $compatiblePropositionModel !== null
                        && $me->can('cancel', $compatiblePropositionModel),
                    'can_accept' => $canAccept,
                    'accept_block_reason' => $acceptBlock,
                ]);
            })
            ->values();

        $sentRequests = PropositionRequest::where('from_matchmaker_id', $me->id)
            ->with([
                'referenceUser.profile',
                'compatibleUser.profile',
                'fromMatchmaker',
                'toMatchmaker',
            ])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function (PropositionRequest $propRequest) {
                $compatiblePhone = null;
                if ($propRequest->status === 'accepted' && $propRequest->share_phone) {
                    $compatiblePhone = $propRequest->compatibleUser?->phone;
                }

                $evaluationAccessLevel = $propRequest->status === 'accepted' ? 'read' : 'none';

                return array_merge($propRequest->toArray(), [
                    'compatible_phone' => $compatiblePhone,
                    'evaluation_access_level' => $evaluationAccessLevel,
                    'reference_user_proposition' => Proposition::activeSnapshotForUser((int) $propRequest->reference_user_id),
                    'compatible_user_proposition' => Proposition::activeSnapshotForUser((int) $propRequest->compatible_user_id),
                ]);
            })
            ->values();

        return Inertia::render('matchmaker/proposition-requests', [
            'receivedRequests' => $receivedRequests,
            'sentRequests' => $sentRequests,
        ]);
    }

    /**
     * Why one of my users cannot be the reference profile of a request towards $subject, or null when eligible.
     * Conditions: member, client or expired client (not prospect), active account, completed profile, opposite gender.
     * Same base conditions as MatchmakingService candidates.
     */
    public static function referenceIneligibility(User $reference, User $subject): ?string
    {
        if ($reference->status === 'prospect') {
            return 'prospect';
        }
        if (! in_array($reference->status, ['member', 'client', 'client_expire'], true)) {
            return 'not_member';
        }
        if (($reference->profile?->account_status ?? null) !== 'active') {
            return 'deactivated';
        }
        if (! $reference->profile?->is_completed) {
            return 'incomplete';
        }
        if (! $subject->gender || ! $reference->gender || $reference->gender === $subject->gender) {
            return 'same_gender';
        }

        return null;
    }

    /**
     * Why I cannot ask for a proposition with $subject right now (or null):
     * it is engaged (active proposition, RDV in progress/successful) or I already have an open request for it.
     */
    public static function subjectBlockReason(User $me, User $subject): ?string
    {
        if (Rdv::hasBlockingRdvForUser((int) $subject->id)) {
            return 'compatible_rdv';
        }
        if (Proposition::hasActiveProposition((int) $subject->id)) {
            return 'compatible_active';
        }
        if (PropositionRequest::hasOpenRequestFor((int) $me->id, (int) $subject->id)) {
            return 'open_request';
        }

        return null;
    }

    /**
     * My proposition requests involving $subject, for the staff profile header:
     * - on another matchmaker's profile: my latest request towards it (pending, accepted or rejected);
     * - on my own member's profile: my open requests where it is the reference profile.
     * "counterpart" is the other profile of the pair (linked from the header, with its picture).
     */
    public static function requestLinksFor(User $viewer, User $subject): array
    {
        $isMine = $subject->assigned_matchmaker_id !== null
            && (int) $subject->assigned_matchmaker_id === (int) $viewer->id;

        $sent = $isMine
            ? PropositionRequest::query()->open()
                ->where('from_matchmaker_id', $viewer->id)
                ->where('reference_user_id', $subject->id)
                ->orderByDesc('id')
                ->limit(10)
                ->get()
            : PropositionRequest::query()
                ->where('from_matchmaker_id', $viewer->id)
                ->where('compatible_user_id', $subject->id)
                ->whereIn('status', ['pending', 'accepted', 'rejected'])
                ->orderByDesc('id')
                ->limit(1)
                ->get();

        // Requests other matchmakers sent me where this profile is one of the pair: pending first, then the latest answers.
        $received = PropositionRequest::query()
            ->where('to_matchmaker_id', $viewer->id)
            ->where(function ($q) use ($subject) {
                $q->where('compatible_user_id', $subject->id)->orWhere('reference_user_id', $subject->id);
            })
            ->whereIn('status', ['pending', 'accepted', 'rejected'])
            ->with('fromMatchmaker:id,name')
            ->orderByRaw("CASE WHEN status = 'pending' THEN 0 ELSE 1 END")
            ->orderByDesc('id')
            ->limit(5)
            ->get();

        $requests = $sent->concat($received);
        if ($requests->isEmpty()) {
            return [];
        }

        $openIds = PropositionRequest::query()->open()->whereIn('id', $requests->pluck('id'))->pluck('id')->all();
        $people = User::query()
            ->whereIn('id', $requests->pluck('reference_user_id')->merge($requests->pluck('compatible_user_id'))->unique())
            ->with('profile:id,user_id,profile_picture_path')
            ->get(['id', 'name', 'username'])
            ->keyBy('id');

        $summary = function (?User $user) {
            return $user ? [
                'id' => $user->id,
                'name' => $user->name,
                'username' => $user->username,
                'photo' => $user->profile?->profile_picture_path ? '/storage/'.$user->profile->profile_picture_path : null,
            ] : null;
        };

        return $requests->map(function (PropositionRequest $request) use ($viewer, $subject, $openIds, $people, $summary) {
            $reference = $people->get($request->reference_user_id);
            $compatible = $people->get($request->compatible_user_id);
            $isOpen = in_array($request->id, $openIds, true);
            $isReceived = (int) $request->to_matchmaker_id === (int) $viewer->id;
            $canRespond = $isReceived && $request->status === 'pending';
            $acceptBlock = $canRespond ? self::acceptBlockReason($request, (int) $viewer->id) : null;

            return [
                'id' => $request->id,
                'direction' => $isReceived ? 'received' : 'sent',
                'status' => $request->status,
                'from_matchmaker' => $isReceived ? ['id' => $request->from_matchmaker_id, 'name' => $request->fromMatchmaker?->name] : null,
                // Sent, accepted and the proposition not sent yet: "Proposer" opens the usual propose modal.
                'can_propose' => ! $isReceived && $request->status === 'accepted' && $isOpen,
                // Received and pending: "Répondre" opens the shared answer dialog.
                'can_respond' => $canRespond,
                'can_accept' => $canRespond && $acceptBlock === null,
                'accept_block_reason' => $acceptBlock,
                'reference' => $summary($reference),
                'compatible' => $summary($compatible),
                // The other profile of the pair, relative to the profile being viewed.
                'counterpart' => $summary((int) $request->reference_user_id === (int) $subject->id ? $compatible : $reference),
                'reference_has_active_proposition' => Proposition::hasActiveProposition((int) $request->reference_user_id),
                'compatible_has_active_proposition' => Proposition::hasActiveProposition((int) $request->compatible_user_id),
            ];
        })->values()->all();
    }

    /** Why one of my members cannot be the reference right now (or null): it is already engaged. */
    public static function referenceBlockReason(User $reference): ?string
    {
        if (Rdv::hasBlockingRdvForUser((int) $reference->id)) {
            return 'reference_rdv';
        }
        if (Proposition::hasActiveProposition((int) $reference->id)) {
            return 'reference_active';
        }

        return null;
    }

    /**
     * Reference profiles for a request towards $user (someone else's member/client):
     * - suggestions: my members the matching engine finds compatible with $user, best score first;
     * - results (when ?q= is given): any of my users matching the search, compatible or not,
     *   each with the reason it cannot be selected (null when eligible).
     */
    public function eligibleReferences(Request $request, User $user)
    {
        $me = Auth::user();

        if (! app(UserProfileActionPolicy::class)->requestProposition($me, $user)->allowed()) {
            abort(403, 'Unauthorized.');
        }

        $pendingReferenceIds = PropositionRequest::query()
            ->where('compatible_user_id', $user->id)
            ->where('from_matchmaker_id', $me->id)
            ->where('status', 'pending')
            ->pluck('reference_user_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        $present = function (User $member, ?int $score = null) use ($pendingReferenceIds) {
            return [
                'id' => $member->id,
                'name' => $member->name,
                'username' => $member->username,
                'status' => $member->status,
                'age' => $member->profile?->date_naissance ? Carbon::parse($member->profile->date_naissance)->age : null,
                'city' => $member->profile?->ville_residence,
                'photo' => $member->profile?->profile_picture_path ? '/storage/'.$member->profile->profile_picture_path : null,
                'score' => $score,
                'pending' => in_array((int) $member->id, $pendingReferenceIds, true),
            ];
        };

        // Compatible suggestions: one engine run for this profile, kept to my own members.
        $suggestions = [];
        if ($user->profile?->is_completed) {
            try {
                $matches = (new MatchmakingService)->findMatches($user->id)['matches'];
                foreach ($matches as $match) {
                    $candidate = $match['user'];
                    if ((int) $candidate->assigned_matchmaker_id !== (int) $me->id
                        || self::referenceIneligibility($candidate, $user) !== null) {
                        continue;
                    }
                    $suggestions[] = $present($candidate, isset($match['score']) ? (int) round($match['score']) : null)
                        + ['blocked_reason' => self::referenceBlockReason($candidate)];
                }
            } catch (\Throwable $e) {
                $suggestions = [];
            }
        }

        $results = null;
        $search = trim((string) $request->query('q', ''));
        if (mb_strlen($search) >= 2) {
            $suggestedIds = array_column($suggestions, 'id');
            $query = User::role('user')
                ->where('assigned_matchmaker_id', $me->id)
                ->where('users.id', '!=', $user->id)
                ->with('profile');
            ProspectListSearch::apply($query, $search);

            $results = $query->orderBy('name')->limit(20)->get()
                ->map(function (User $member) use ($present, $user, $suggestedIds) {
                    return $present($member) + [
                        'blocked_reason' => self::referenceIneligibility($member, $user) ?? self::referenceBlockReason($member),
                        'suggested' => in_array($member->id, $suggestedIds, true),
                    ];
                })
                ->values();
        }

        return response()->json([
            'owner' => [
                'id' => $user->assigned_matchmaker_id,
                'name' => User::query()->whereKey($user->assigned_matchmaker_id)->value('name'),
            ],
            'suggestions' => array_values($suggestions),
            'results' => $results,
        ]);
    }

    /**
     * Create a proposition request to another matchmaker.
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
        ]);

        if ((int) $data['reference_user_id'] === (int) $data['compatible_user_id']) {
            return response()->json([
                'message' => 'Reference and compatible profiles must be different.',
            ], 422);
        }

        $referenceUser = User::select('id', 'assigned_matchmaker_id')->findOrFail($data['reference_user_id']);
        $compatibleUser = User::select('id', 'assigned_matchmaker_id')->findOrFail($data['compatible_user_id']);

        if ($referenceUser->assigned_matchmaker_id !== $me->id) {
            abort(403, 'You can only request propositions for profiles assigned to you.');
        }

        $referenceProfileUser = User::with('profile')->find($referenceUser->id);
        $compatibleProfileUser = User::select('id', 'gender')->find($compatibleUser->id);
        if (self::referenceIneligibility($referenceProfileUser, $compatibleProfileUser) !== null) {
            return response()->json([
                'message' => 'Votre membre doit être un membre, client ou client expiré actif, au profil complet et de sexe opposé.',
                'error' => 'reference_not_eligible',
            ], 422);
        }

        // Never request a proposition with a prospect (validated or rejected) or a deactivated account.
        if ($blocked = MatchmakingResultsPayloadService::propositionBlockedFor(User::with('profile')->find($compatibleUser->id))) {
            return response()->json([
                'message' => MatchmakingResultsPayloadService::RESTRICTION_LABELS[$blocked],
                'error' => 'compatible_not_eligible',
            ], 422);
        }

        // Same engagement guards as sending a proposition, plus one open request per profile.
        $blockReason = self::subjectBlockReason($me, $compatibleProfileUser)
            ?? self::referenceBlockReason($referenceProfileUser);
        if ($blockReason !== null) {
            return response()->json([
                'message' => self::REQUEST_BLOCK_MESSAGES[$blockReason],
                'error' => $blockReason,
            ], 422);
        }

        if (! $compatibleUser->assigned_matchmaker_id) {
            return response()->json([
                'message' => 'Le profil compatible n\'est pas assigné à un matchmaker.',
            ], 422);
        }

        if ($compatibleUser->assigned_matchmaker_id === $me->id) {
            return response()->json([
                'message' => 'Le profil compatible est déjà assigné à vous.',
            ], 422);
        }

        $exists = PropositionRequest::query()
            ->where('reference_user_id', $referenceUser->id)
            ->where('compatible_user_id', $compatibleUser->id)
            ->where('from_matchmaker_id', $me->id)
            ->where('to_matchmaker_id', $compatibleUser->assigned_matchmaker_id)
            ->where('status', 'pending')
            ->exists();

        if ($exists) {
            return response()->json([
                'message' => 'Une demande est déjà en attente pour ces profils.',
            ], 422);
        }

        $payload = [
            'reference_user_id' => $referenceUser->id,
            'compatible_user_id' => $compatibleUser->id,
            'from_matchmaker_id' => $me->id,
            'to_matchmaker_id' => $compatibleUser->assigned_matchmaker_id,
            'message' => trim($data['message']),
            'status' => 'pending',
        ];

        if (Schema::hasColumn('proposition_requests', 'user_a_id')) {
            $payload['user_a_id'] = $referenceUser->id;
        }
        if (Schema::hasColumn('proposition_requests', 'user_b_id')) {
            $payload['user_b_id'] = $compatibleUser->id;
        }

        $created = PropositionRequest::create($payload);

        return response()->json([
            'message' => 'Demande envoyée.',
            'id' => $created->id,
        ]);
    }

    /**
     * Respond to a proposition request.
     */
    public function respond(Request $request, PropositionRequest $propositionRequest)
    {
        $me = Auth::user();
        if (! $me || ! $me->hasAnyRole(['matchmaker', 'manager'])) {
            abort(403, 'Unauthorized.');
        }

        if ($propositionRequest->to_matchmaker_id !== $me->id) {
            abort(403, 'Unauthorized.');
        }

        if ($propositionRequest->status !== 'pending') {
            return redirect()->back()->with('error', 'Cette demande a déjà été traitée.');
        }

        $data = $request->validate([
            'status' => ['required', 'in:accepted,rejected'],
            'rejection_reason' => ['nullable', 'string', 'max:2000'],
            'response_message' => ['nullable', 'string', 'max:2000'],
            'share_phone' => ['nullable', 'boolean'],
            'organizer' => ['nullable', 'in:vous,moi'],
        ]);

        if ($data['status'] === 'rejected' && empty(trim($data['rejection_reason'] ?? ''))) {
            return redirect()->back()->with('error', 'Le motif est obligatoire pour un refus.');
        }

        if ($data['status'] === 'accepted' && empty($data['organizer'])) {
            return redirect()->back()->with('error', 'Veuillez sélectionner qui organise le rendez-vous.');
        }

        if ($data['status'] === 'accepted') {
            // RDV in progress on my profile, or an active proposition on either profile, blocks accepting.
            $acceptBlock = self::acceptBlockReason($propositionRequest, (int) $me->id);
            if ($acceptBlock !== null) {
                throw ValidationException::withMessages([
                    'accept' => [$acceptBlock === 'rdv_in_progress'
                        ? self::MESSAGE_ACCEPT_BLOCKED_RDV_IN_PROGRESS
                        : self::MESSAGE_ACCEPT_BLOCKED_ACTIVE_PROPOSITION],
                ]);
            }
        }

        $propositionRequest->update([
            'status' => $data['status'],
            'rejection_reason' => $data['status'] === 'rejected' ? trim($data['rejection_reason']) : null,
            'response_message' => isset($data['response_message']) ? trim($data['response_message']) : null,
            'share_phone' => (bool) ($data['share_phone'] ?? false),
            'organizer' => $data['status'] === 'accepted' ? ($data['organizer'] ?? null) : null,
            'responded_at' => now(),
        ]);

        return redirect()->back()->with('success', 'Réponse envoyée.');
    }

    /**
     * The profile (reference or compatible) assigned to the given matchmaker on this request.
     */
    /**
     * Why the receiving matchmaker cannot accept this request right now (or null).
     * Same checks as respond(): RDV in progress on their profile, then an active proposition on either profile.
     */
    public static function acceptBlockReason(PropositionRequest $propositionRequest, int $matchmakerId): ?string
    {
        $assignedProfileId = self::assignedProfileUserIdForMatchmaker($propositionRequest, $matchmakerId);
        if ($assignedProfileId !== null && Rdv::hasInProgressRdvForUser($assignedProfileId)) {
            return 'rdv_in_progress';
        }

        if (Proposition::hasActiveProposition((int) $propositionRequest->reference_user_id)
            || Proposition::hasActiveProposition((int) $propositionRequest->compatible_user_id)) {
            return 'active_proposition';
        }

        return null;
    }

    private static function assignedProfileUserIdForMatchmaker(PropositionRequest $propositionRequest, int $matchmakerId): ?int
    {
        $referenceId = (int) $propositionRequest->reference_user_id;
        $compatibleId = (int) $propositionRequest->compatible_user_id;

        $user = User::query()
            ->whereIn('id', [$referenceId, $compatibleId])
            ->where('assigned_matchmaker_id', $matchmakerId)
            ->orderBy('id')
            ->first(['id']);

        return $user ? (int) $user->id : null;
    }
}
