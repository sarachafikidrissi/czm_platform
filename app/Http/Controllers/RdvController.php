<?php

namespace App\Http\Controllers;

use App\Models\Proposition;
use App\Models\Rdv;
use App\Models\RdvFeedback;
use App\Models\User;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class RdvController extends Controller
{
    use AuthorizesRequests;

    protected function mapRdv(Rdv $rdv, User $me): array
    {
        $feedbacks = $rdv->feedbacks ?? collect();
        $myFeedback = $feedbacks->firstWhere('author_id', $me->id);
        $alreadySubmitted = $myFeedback !== null;

        $isParticipant = (int) $rdv->reference_user_id === (int) $me->id
            || (int) $rdv->compatible_user_id === (int) $me->id
            || (int) $rdv->matchmaker_id === (int) $me->id;

        $otherUser = null;
        if ((int) $rdv->reference_user_id === (int) $me->id) {
            $otherUser = $rdv->compatibleUser;
        } elseif ((int) $rdv->compatible_user_id === (int) $me->id) {
            $otherUser = $rdv->referenceUser;
        }

        return [
            'id' => $rdv->id,
            'status' => $rdv->status,
            'regle' => $rdv->regle,
            'message' => $rdv->message,
            'share_phone' => $rdv->share_phone,
            'created_at' => $rdv->created_at,
            'proposition_id' => $rdv->proposition_id,
            'matchmaker' => $rdv->matchmaker ? [
                'id' => $rdv->matchmaker->id,
                'name' => $rdv->matchmaker->name,
            ] : null,
            'reference_user' => $rdv->referenceUser ? [
                'id' => $rdv->referenceUser->id,
                'name' => $rdv->referenceUser->name,
                'username' => $rdv->referenceUser->username,
                'profile' => $rdv->referenceUser->profile,
            ] : null,
            'compatible_user' => $rdv->compatibleUser ? [
                'id' => $rdv->compatibleUser->id,
                'name' => $rdv->compatibleUser->name,
                'username' => $rdv->compatibleUser->username,
                'profile' => $rdv->compatibleUser->profile,
            ] : null,
            'feedbacks' => $feedbacks->map(fn (RdvFeedback $fb) => [
                'id' => $fb->id,
                'author_id' => $fb->author_id,
                'author_role' => $fb->author_role,
                'avis' => $fb->avis,
                'feedback_message' => $fb->feedback_message,
                'espace_de_rdv' => $fb->espace_de_rdv,
                'espace_autre_detail' => $fb->espace_autre_detail,
                'signe_de_rdv' => $fb->signe_de_rdv,
                'avis_matchmaker' => $fb->avis_matchmaker,
                'evaluation_de_rdv' => $fb->evaluation_de_rdv,
                'created_at' => $fb->created_at,
            ])->values()->toArray(),
            'can_add_feedback' => $isParticipant && ! $alreadySubmitted,
            'other_profile_phone' => ($rdv->share_phone && $otherUser) ? $otherUser->phone : null,
            'my_feedback' => $myFeedback ? [
                'id' => $myFeedback->id,
                'author_role' => $myFeedback->author_role,
                'avis' => $myFeedback->avis,
                'feedback_message' => $myFeedback->feedback_message,
                'espace_de_rdv' => $myFeedback->espace_de_rdv,
                'espace_autre_detail' => $myFeedback->espace_autre_detail,
                'signe_de_rdv' => $myFeedback->signe_de_rdv,
                'avis_matchmaker' => $myFeedback->avis_matchmaker,
                'evaluation_de_rdv' => $myFeedback->evaluation_de_rdv,
                'created_at' => $myFeedback->created_at,
            ] : null,
        ];
    }

    /**
     * Create a new RDV (matchmaker only).
     * POST /staff/rdv
     */
    public function store(Request $request)
    {
        $me = Auth::user();
        if (! $me || ! $me->hasRole('matchmaker')) {
            abort(403, 'Unauthorized.');
        }

        $data = $request->validate([
            'proposition_id' => ['required', 'integer', 'exists:propositions,id'],
            'regle' => ['nullable', 'string', 'max:2000'],
            'message' => ['nullable', 'string', 'max:2000'],
            'share_phone' => ['nullable', 'boolean'],
        ]);

        $proposition = Proposition::findOrFail($data['proposition_id']);

        if ((int) $proposition->matchmaker_id !== (int) $me->id) {
            abort(403, 'Vous n\'êtes pas autorisé à créer un RDV pour cette proposition.');
        }

        if (! $this->bothSidesAccepted($proposition)) {
            return response()->json([
                'message' => 'Les deux profils doivent avoir accepté la proposition.',
            ], 422);
        }

        if (Rdv::existsForPair((int) $proposition->reference_user_id, (int) $proposition->compatible_user_id)) {
            return response()->json([
                'message' => 'Un RDV existe déjà pour cette proposition.',
            ], 422);
        }

        $defaultRegle = "Les deux profils s'engagent à respecter les règles de bienséance et de respect mutuel lors de ce rendez-vous.";

        $rdv = null;
        DB::transaction(function () use ($me, $proposition, $data, $defaultRegle, &$rdv) {
            $rdv = Rdv::create([
                'matchmaker_id' => $me->id,
                'reference_user_id' => $proposition->reference_user_id,
                'compatible_user_id' => $proposition->compatible_user_id,
                'proposition_id' => $proposition->id,
                'regle' => trim($data['regle'] ?? '') ?: $defaultRegle,
                'message' => isset($data['message']) ? (trim($data['message']) ?: null) : null,
                'share_phone' => (bool) ($data['share_phone'] ?? false),
                'status' => Rdv::STATUS_EN_COURS,
            ]);

            Proposition::closeAcceptedRowsForPairAfterRdv($proposition);
        });

        return response()->json([
            'message' => 'RDV créé avec succès.',
            'rdv' => ['id' => $rdv->id, 'status' => $rdv->status],
        ], 201);
    }

    /**
     * Inertia page: "Mes RDVs" for members.
     * GET /mes-rdvs
     */
    public function mesRdvsPage(Request $request)
    {
        $me = Auth::user();
        if (! $me) {
            abort(403, 'Unauthorized.');
        }

        $query = Rdv::query()
            ->where(function ($q) use ($me) {
                $q->where('reference_user_id', $me->id)
                    ->orWhere('compatible_user_id', $me->id);
            })
            ->with([
                'matchmaker:id,name,username',
                'referenceUser:id,name,username,phone',
                'referenceUser.profile:id,user_id,profile_picture_path',
                'compatibleUser:id,name,username,phone',
                'compatibleUser.profile:id,user_id,profile_picture_path',
                'feedbacks',
            ])
            ->latest();

        $rdvs = $query->paginate(10);

        $mapped = $rdvs->getCollection()->map(fn (Rdv $rdv) => $this->mapRdv($rdv, $me))->values();

        return Inertia::render('mes-rdvs', [
            'rdvs' => $mapped,
            'pagination' => [
                'current_page' => $rdvs->currentPage(),
                'last_page' => $rdvs->lastPage(),
                'total' => $rdvs->total(),
            ],
        ]);
    }

    /**
     * Inertia page: matchmaker RDV list.
     * GET /staff/rdv
     */
    public function matchmakerRdvsPage(Request $request)
    {
        $me = Auth::user();
        if (! $me || ! $me->hasRole('matchmaker')) {
            abort(403, 'Unauthorized.');
        }

        $status = $request->query('status');

        $rdvs = Rdv::query()
            ->where('matchmaker_id', $me->id)
            ->when($status, fn ($q) => $q->where('status', $status))
            ->with([
                'matchmaker:id,name,username',
                'referenceUser:id,name,username,phone',
                'referenceUser.profile:id,user_id,profile_picture_path',
                'compatibleUser:id,name,username,phone',
                'compatibleUser.profile:id,user_id,profile_picture_path',
                'feedbacks',
            ])
            ->latest()
            ->paginate(10);

        $mapped = $rdvs->getCollection()->map(fn (Rdv $rdv) => $this->mapRdv($rdv, $me))->values();

        return Inertia::render('matchmaker/rdv-list', [
            'rdvs' => $mapped,
            'status_filter' => $status,
            'pagination' => [
                'current_page' => $rdvs->currentPage(),
                'last_page' => $rdvs->lastPage(),
                'total' => $rdvs->total(),
            ],
        ]);
    }

    /**
     * Single RDV detail.
     * GET /staff/rdv/{rdv}
     */
    public function show(Rdv $rdv)
    {
        $me = Auth::user();
        if (! $me) {
            abort(403, 'Unauthorized.');
        }

        $this->authorize('view', $rdv);

        $rdv->load([
            'matchmaker:id,name,username',
            'referenceUser:id,name,username,phone',
            'referenceUser.profile:id,user_id,profile_picture_path',
            'compatibleUser:id,name,username,phone',
            'compatibleUser.profile:id,user_id,profile_picture_path',
            'feedbacks',
        ]);

        return response()->json($this->mapRdv($rdv, $me));
    }

    /**
     * Submit feedback for a RDV.
     * POST /rdv/{rdv}/feedback
     */
    public function addFeedback(Request $request, Rdv $rdv)
    {
        $me = Auth::user();
        if (! $me) {
            abort(403, 'Unauthorized.');
        }

        $rdv->load('feedbacks');
        $this->authorize('addFeedback', $rdv);

        $isMatchmaker = $me->hasRole('matchmaker') && (int) $rdv->matchmaker_id === (int) $me->id;

        $baseRules = [
            'author_role' => ['required', 'in:user,matchmaker'],
            'feedback_message' => ['nullable', 'string', 'max:2000'],
        ];

        $roleRules = $isMatchmaker ? [
            'espace_de_rdv' => ['required', 'in:agence,espace_public,autre'],
            'espace_autre_detail' => ['nullable', 'required_if:espace_de_rdv,autre', 'string', 'max:500'],
            'signe_de_rdv' => ['required', 'in:positif,negatif'],
            'avis_matchmaker' => ['nullable', 'string', 'max:2000'],
            'evaluation_de_rdv' => ['nullable', 'string', 'max:2000'],
        ] : [
            'avis' => ['required', 'in:liked,not_liked'],
        ];

        $data = $request->validate(array_merge($baseRules, $roleRules));

        RdvFeedback::create([
            'rdv_id' => $rdv->id,
            'author_id' => $me->id,
            'author_role' => $data['author_role'],
            'avis' => $data['avis'] ?? null,
            'feedback_message' => isset($data['feedback_message']) ? trim($data['feedback_message']) : null,
            'espace_de_rdv' => $data['espace_de_rdv'] ?? null,
            'espace_autre_detail' => $data['espace_autre_detail'] ?? null,
            'signe_de_rdv' => $data['signe_de_rdv'] ?? null,
            'avis_matchmaker' => isset($data['avis_matchmaker']) ? trim($data['avis_matchmaker']) : null,
            'evaluation_de_rdv' => isset($data['evaluation_de_rdv']) ? trim($data['evaluation_de_rdv']) : null,
        ]);

        return response()->json(['message' => 'Feedback enregistré avec succès.'], 201);
    }

    /**
     * Update feedback (matchmaker only).
     * PUT /staff/rdv-feedbacks/{feedback}
     */
    public function updateFeedback(Request $request, RdvFeedback $feedback)
    {
        $me = Auth::user();
        if (! $me) {
            abort(403, 'Unauthorized.');
        }

        $this->authorize('updateFeedback', $feedback);

        $data = $request->validate([
            'feedback_message' => ['nullable', 'string', 'max:2000'],
            'espace_de_rdv' => ['nullable', 'in:agence,espace_public,autre'],
            'espace_autre_detail' => ['nullable', 'required_if:espace_de_rdv,autre', 'string', 'max:500'],
            'signe_de_rdv' => ['nullable', 'in:positif,negatif'],
            'avis_matchmaker' => ['nullable', 'string', 'max:2000'],
            'evaluation_de_rdv' => ['nullable', 'string', 'max:2000'],
        ]);

        $feedback->update($data);

        return response()->json(['message' => 'Feedback mis à jour.', 'feedback' => $feedback->fresh()]);
    }

    /**
     * Delete feedback (matchmaker only).
     * DELETE /staff/rdv-feedbacks/{feedback}
     */
    public function deleteFeedback(RdvFeedback $feedback)
    {
        $me = Auth::user();
        if (! $me) {
            abort(403, 'Unauthorized.');
        }

        $this->authorize('deleteFeedback', $feedback);
        $feedback->delete();

        return response()->json(['message' => 'Feedback supprimé.']);
    }

    /**
     * Update RDV status (matchmaker owner only).
     * PATCH /staff/rdv/{rdv}/status
     */
    public function updateStatus(Request $request, Rdv $rdv)
    {
        $me = Auth::user();
        if (! $me) {
            abort(403, 'Unauthorized.');
        }

        $this->authorize('updateStatus', $rdv);

        $data = $request->validate([
            'status' => ['required', 'in:reussi,echec'],
        ]);

        $rdv->update(['status' => $data['status']]);

        return response()->json([
            'message' => 'Statut du RDV mis à jour.',
            'rdv' => ['id' => $rdv->id, 'status' => $rdv->status],
        ]);
    }

    /**
     * Inertia page: user feedback form.
     * GET /mes-rdvs/{rdv}/feedback
     */
    public function feedbackPage(Rdv $rdv)
    {
        $me = Auth::user();
        if (! $me) {
            abort(403, 'Unauthorized.');
        }

        $rdv->load([
            'feedbacks',
            'referenceUser:id,name,username',
            'compatibleUser:id,name,username',
        ]);

        $this->authorize('view', $rdv);

        return Inertia::render('rdv-feedback', [
            'rdv' => $this->mapRdv($rdv, $me),
            'already_submitted' => $rdv->feedbacks->contains('author_id', $me->id),
        ]);
    }

    private function bothSidesAccepted(Proposition $proposition): bool
    {
        $refAccepted = Proposition::query()
            ->where('reference_user_id', $proposition->reference_user_id)
            ->where('compatible_user_id', $proposition->compatible_user_id)
            ->where('recipient_user_id', $proposition->reference_user_id)
            ->where('status', 'interested')
            ->exists();

        $compAccepted = Proposition::query()
            ->where('reference_user_id', $proposition->reference_user_id)
            ->where('compatible_user_id', $proposition->compatible_user_id)
            ->where('recipient_user_id', $proposition->compatible_user_id)
            ->where('status', 'interested')
            ->exists();

        return $refAccepted && $compAccepted;
    }
}
