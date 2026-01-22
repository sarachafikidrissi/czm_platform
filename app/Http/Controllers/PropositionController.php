<?php

namespace App\Http\Controllers;

use App\Models\Proposition;
use App\Models\User;
use App\Models\PropositionRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;

class PropositionController extends Controller
{
    /**
     * List propositions for the authenticated user.
     */
    public function index()
    {
        $me = Auth::user();
        if (!$me || !$me->hasRole('user')) {
            abort(403, 'Unauthorized.');
        }

        $propositions = Proposition::query()
            ->where('recipient_user_id', $me->id)
            ->with([
                'matchmaker:id,name,username',
                'referenceUser:id,name,username',
                'referenceUser.profile:id,user_id,profile_picture_path',
                'compatibleUser:id,name,username',
                'compatibleUser.profile:id,user_id,profile_picture_path',
            ])
            ->latest()
            ->get()
            ->map(function (Proposition $proposition) {
                $isExpired = $proposition->status === 'pending'
                    && $proposition->created_at
                    && $proposition->created_at->lt(now()->subDays(7));

                return [
                    'id' => $proposition->id,
                    'message' => $proposition->message,
                    'status' => $proposition->status,
                    'is_expired' => $isExpired,
                    'response_message' => $proposition->response_message,
                    'responded_at' => $proposition->responded_at,
                    'created_at' => $proposition->created_at,
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
                ];
            })
            ->values();

        return Inertia::render('propositions', [
            'propositions' => $propositions,
        ]);
    }

    /**
     * Store propositions for selected recipients.
     */
    public function store(Request $request)
    {
        $me = Auth::user();
        if (!$me || !$me->hasRole('matchmaker')) {
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

        if (!$sendToReference && !$sendToCompatible) {
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

        $hasAcceptedRequest = PropositionRequest::query()
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
            ->exists();

        if (!$hasAcceptedRequest && $compatibleUser->assigned_matchmaker_id !== $me->id) {
            abort(403, 'You can only propose between profiles assigned to you.');
        }

        $latestByRecipient = Proposition::query()
            ->where('matchmaker_id', $me->id)
            ->where('reference_user_id', $referenceUser->id)
            ->where('compatible_user_id', $compatibleUser->id)
            ->orderByDesc('created_at')
            ->get()
            ->unique('recipient_user_id')
            ->values();

        if ($latestByRecipient->count() >= 1) {
            $latestStatuses = $latestByRecipient->map(function (Proposition $proposition) {
                $isExpired = $proposition->status === 'pending'
                    && $proposition->created_at
                    && $proposition->created_at->lt(now()->subDays(7));

                if ($isExpired) {
                    return 'expired';
                }
                if ($proposition->status === 'interested') {
                    return 'accepted';
                }
                if ($proposition->status === 'not_interested') {
                    return 'rejected';
                }
                return 'pending';
            });

            if ($latestStatuses->contains('pending')) {
                return response()->json([
                    'message' => 'Proposition deja envoyee, en attente de reponse.',
                ], 422);
            }
        }

        if ($latestByRecipient->count() >= 2) {
            $latestStatuses = $latestByRecipient->map(function (Proposition $proposition) {
                $isExpired = $proposition->status === 'pending'
                    && $proposition->created_at
                    && $proposition->created_at->lt(now()->subDays(7));

                if ($isExpired) {
                    return 'expired';
                }
                if ($proposition->status === 'interested') {
                    return 'accepted';
                }
                if ($proposition->status === 'not_interested') {
                    return 'rejected';
                }
                return 'pending';
            });

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

        $created = [];
        foreach ($recipients as $recipientId) {
            $created[] = Proposition::create([
                'matchmaker_id' => $me->id,
                'user_a_id' => $referenceUser->id,
                'user_b_id' => $compatibleUser->id,
                'reference_user_id' => $referenceUser->id,
                'compatible_user_id' => $compatibleUser->id,
                'recipient_user_id' => $recipientId,
                'message' => trim($data['message']),
                'status' => 'pending',
            ]);
        }

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
        if (!$me || !$me->hasRole('matchmaker')) {
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
        if (!in_array($recipientId, [(int) $data['reference_user_id'], (int) $data['compatible_user_id']], true)) {
            return response()->json([
                'message' => 'Recipient must be one of the proposition profiles.',
            ], 422);
        }

        $referenceUser = User::select('id', 'assigned_matchmaker_id')->findOrFail($data['reference_user_id']);
        $compatibleUser = User::select('id', 'assigned_matchmaker_id')->findOrFail($data['compatible_user_id']);

        $hasAcceptedRequest = PropositionRequest::query()
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
            ->exists();

        if (!$hasAcceptedRequest && $compatibleUser->assigned_matchmaker_id !== $me->id) {
            abort(403, 'You can only propose between profiles assigned to you.');
        }

        $exists = Proposition::query()
            ->where('matchmaker_id', $me->id)
            ->where('reference_user_id', $referenceUser->id)
            ->where('compatible_user_id', $compatibleUser->id)
            ->where('recipient_user_id', $recipientId)
            ->exists();

        if ($exists) {
            return response()->json([
                'message' => 'Proposition already sent to this recipient.',
            ], 422);
        }

        $proposition = Proposition::create([
            'matchmaker_id' => $me->id,
            'user_a_id' => $referenceUser->id,
            'user_b_id' => $compatibleUser->id,
            'reference_user_id' => $referenceUser->id,
            'compatible_user_id' => $compatibleUser->id,
            'recipient_user_id' => $recipientId,
            'message' => trim($data['message']),
            'status' => 'pending',
        ]);

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
        if (!$me || !$me->hasRole('user')) {
            abort(403, 'Unauthorized.');
        }

        if ($proposition->recipient_user_id !== $me->id) {
            abort(403, 'Unauthorized.');
        }

        if ($proposition->status !== 'pending') {
            return response()->json([
                'message' => 'Proposition already responded.',
            ], 422);
        }

        if ($proposition->created_at && $proposition->created_at->lt(now()->subDays(7))) {
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

        $mappedStatus = $data['status'] === 'accepted' ? 'interested' : 'not_interested';

        $proposition->update([
            'status' => $mappedStatus,
            'response_message' => $responseMessage,
            'user_response' => $mappedStatus,
            'user_comment' => $responseMessage,
            'responded_at' => now(),
        ]);

        return response()->json([
            'message' => 'Response saved.',
            'status' => $proposition->status,
        ]);
    }
}

