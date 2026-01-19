<?php

namespace App\Http\Controllers;

use App\Models\PropositionRequest;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;

class PropositionRequestController extends Controller
{
    /**
     * Display sent/received proposition requests.
     */
    public function index(Request $request)
    {
        $me = Auth::user();
        if (!$me || !$me->hasRole('matchmaker')) {
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
            ->get();

        $sentRequests = PropositionRequest::where('from_matchmaker_id', $me->id)
            ->with([
                'referenceUser.profile',
                'compatibleUser.profile',
                'fromMatchmaker',
                'toMatchmaker',
            ])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function (PropositionRequest $request) {
                $compatiblePhone = null;
                if ($request->status === 'accepted' && $request->share_phone) {
                    $compatiblePhone = $request->compatibleUser?->phone;
                }

                return array_merge($request->toArray(), [
                    'compatible_phone' => $compatiblePhone,
                ]);
            })
            ->values();

        return Inertia::render('matchmaker/proposition-requests', [
            'receivedRequests' => $receivedRequests,
            'sentRequests' => $sentRequests,
        ]);
    }

    /**
     * Create a proposition request to another matchmaker.
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

        if (!$compatibleUser->assigned_matchmaker_id) {
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
        if (!$me || !$me->hasRole('matchmaker')) {
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
}

