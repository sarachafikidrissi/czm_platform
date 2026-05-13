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

    /** @see resources/js/lib/proposition-toast-messages.ts rdvToastFr */
    public const MESSAGE_RECREATE_SUCCESS = 'RDV re-créé avec succès. Les deux profils ont été notifiés.';

    public const MESSAGE_RECREATE_BLOCKED_ACTIVE_PROPOSITION = 'Re-création impossible — un profil a une proposition en cours.';

    public const MESSAGE_RECREATE_BLOCKED_RDV_EN_COURS = 'Re-création impossible — un RDV est déjà en cours pour un de ces profils.';

    public const MESSAGE_RECREATE_BLOCKED_NO_ECHEC = 'Aucun RDV échoué trouvé entre ces deux profils.';

    public const MESSAGE_RECREATE_BLOCKED_MOTIF = 'Le motif de re-création est obligatoire.';

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
            'proposition_id' => ['nullable', 'required_without:from_failed_rdv_id', 'integer', 'exists:propositions,id'],
            'from_failed_rdv_id' => ['nullable', 'required_without:proposition_id', 'integer', 'exists:rdvs,id'],
            'regle' => ['nullable', 'string', 'max:2000'],
            'message' => ['nullable', 'string', 'max:2000'],
            'share_phone' => ['nullable', 'boolean'],
            'motif_de_recreation' => ['nullable', 'string', 'max:5000'],
        ]);

        $fromFailedId = isset($data['from_failed_rdv_id']) ? (int) $data['from_failed_rdv_id'] : null;
        $propositionId = isset($data['proposition_id']) ? (int) $data['proposition_id'] : null;

        if ($fromFailedId !== null && $propositionId !== null) {
            return response()->json([
                'message' => 'Envoyez uniquement une proposition ou un RDV échoué, pas les deux.',
            ], 422);
        }

        $motifTrimmed = trim((string) ($data['motif_de_recreation'] ?? ''));

        if ($fromFailedId !== null) {
            return $this->storeRdvFromFailedRow($me, $data, $fromFailedId, $motifTrimmed);
        }

        $proposition = Proposition::findOrFail($propositionId);

        if ((int) $proposition->matchmaker_id !== (int) $me->id) {
            abort(403, 'Vous n\'êtes pas autorisé à créer un RDV pour cette proposition.');
        }

        $ref = (int) $proposition->reference_user_id;
        $comp = (int) $proposition->compatible_user_id;
        $pairHasFailed = Rdv::pairHasFailedRdv($ref, $comp);

        $qualifiesMutual = $this->bothSidesAccepted($proposition)
            || ($pairHasFailed && Proposition::pairHasMutualClosedForMatchmaker((int) $me->id, $ref, $comp));

        if (! $qualifiesMutual) {
            return response()->json([
                'message' => 'Les deux profils doivent avoir accepté la proposition.',
            ], 422);
        }

        if ($pairHasFailed) {
            if (Proposition::pairRecreationBlockedByExternalPendingOrInterested($ref, $comp)) {
                return response()->json([
                    'message' => self::MESSAGE_RECREATE_BLOCKED_ACTIVE_PROPOSITION,
                ], 422);
            }
            if (Rdv::hasInProgressRdvForUser($ref) || Rdv::hasInProgressRdvForUser($comp)) {
                return response()->json([
                    'message' => self::MESSAGE_RECREATE_BLOCKED_RDV_EN_COURS,
                ], 422);
            }
            if ($motifTrimmed === '') {
                return response()->json([
                    'message' => self::MESSAGE_RECREATE_BLOCKED_MOTIF,
                ], 422);
            }
        } elseif ($motifTrimmed !== '') {
            return response()->json([
                'message' => self::MESSAGE_RECREATE_BLOCKED_NO_ECHEC,
            ], 422);
        }

        if (Rdv::existsForPair($ref, $comp)) {
            return response()->json([
                'message' => 'Un RDV existe déjà pour cette proposition.',
            ], 422);
        }

        $defaultRegle = "Les deux profils s'engagent à respecter les règles de bienséance et de respect mutuel lors de ce rendez-vous.";

        $rdv = null;
        DB::transaction(function () use ($me, $proposition, $data, $defaultRegle, $pairHasFailed, $motifTrimmed, &$rdv) {
            $rdv = Rdv::create([
                'matchmaker_id' => $me->id,
                'reference_user_id' => $proposition->reference_user_id,
                'compatible_user_id' => $proposition->compatible_user_id,
                'proposition_id' => $proposition->id,
                'regle' => trim($data['regle'] ?? '') ?: $defaultRegle,
                'message' => isset($data['message']) ? (trim($data['message']) ?: null) : null,
                'motif_de_recreation' => $pairHasFailed ? $motifTrimmed : null,
                'is_recreation' => $pairHasFailed,
                'share_phone' => (bool) ($data['share_phone'] ?? false),
                'status' => Rdv::STATUS_EN_COURS,
            ]);

            Proposition::closeAcceptedRowsForPairAfterRdv($proposition);
        });

        $successMessage = $pairHasFailed
            ? self::MESSAGE_RECREATE_SUCCESS
            : 'RDV créé avec succès.';

        return response()->json([
            'message' => $successMessage,
            'rdv' => ['id' => $rdv->id, 'status' => $rdv->status],
        ], 201);
    }

    /**
     * Re-create from staff "RDV échecs" row when propositions are still closed (no open interested rows).
     */
    private function storeRdvFromFailedRow(User $me, array $data, int $fromFailedId, string $motifTrimmed)
    {
        $failedRdv = Rdv::query()
            ->where('matchmaker_id', $me->id)
            ->whereKey($fromFailedId)
            ->first();

        if ($failedRdv === null || $failedRdv->status !== Rdv::STATUS_ECHEC) {
            return response()->json([
                'message' => 'RDV introuvable ou non marqué comme échec.',
            ], 422);
        }

        $ref = (int) $failedRdv->reference_user_id;
        $comp = (int) $failedRdv->compatible_user_id;

        if (! Rdv::pairHasFailedRdv($ref, $comp)) {
            return response()->json([
                'message' => self::MESSAGE_RECREATE_BLOCKED_NO_ECHEC,
            ], 422);
        }

        if (Proposition::pairRecreationBlockedByExternalPendingOrInterested($ref, $comp)) {
            return response()->json([
                'message' => self::MESSAGE_RECREATE_BLOCKED_ACTIVE_PROPOSITION,
            ], 422);
        }

        if (Rdv::hasInProgressRdvForUser($ref) || Rdv::hasInProgressRdvForUser($comp)) {
            return response()->json([
                'message' => self::MESSAGE_RECREATE_BLOCKED_RDV_EN_COURS,
            ], 422);
        }

        if ($motifTrimmed === '') {
            return response()->json([
                'message' => self::MESSAGE_RECREATE_BLOCKED_MOTIF,
            ], 422);
        }

        if (Rdv::query()
            ->where('status', Rdv::STATUS_REUSSI)
            ->where(function ($q) use ($ref, $comp) {
                $q->where(function ($forward) use ($ref, $comp) {
                    $forward->where('reference_user_id', $ref)->where('compatible_user_id', $comp);
                })->orWhere(function ($reverse) use ($ref, $comp) {
                    $reverse->where('reference_user_id', $comp)->where('compatible_user_id', $ref);
                });
            })
            ->exists()) {
            return response()->json([
                'message' => 'Re-création impossible — un RDV réussi existe déjà pour cette paire.',
            ], 422);
        }

        if (Rdv::query()
            ->whereIn('status', [Rdv::STATUS_EN_COURS, Rdv::STATUS_REUSSI])
            ->where(function ($q) use ($ref, $comp) {
                $q->where(function ($forward) use ($ref, $comp) {
                    $forward->where('reference_user_id', $ref)->where('compatible_user_id', $comp);
                })->orWhere(function ($reverse) use ($ref, $comp) {
                    $reverse->where('reference_user_id', $comp)->where('compatible_user_id', $ref);
                });
            })
            ->exists()) {
            return response()->json([
                'message' => 'Un RDV existe déjà pour cette proposition.',
            ], 422);
        }

        $propositionForClose = Proposition::query()
            ->where('matchmaker_id', $me->id)
            ->where(function ($q) use ($ref, $comp) {
                $q->where(function ($forward) use ($ref, $comp) {
                    $forward->where('reference_user_id', $ref)->where('compatible_user_id', $comp);
                })->orWhere(function ($reverse) use ($ref, $comp) {
                    $reverse->where('reference_user_id', $comp)->where('compatible_user_id', $ref);
                });
            })
            ->orderByDesc('id')
            ->first();

        $defaultRegle = "Les deux profils s'engagent à respecter les règles de bienséance et de respect mutuel lors de ce rendez-vous.";

        $rdv = null;
        DB::transaction(function () use ($me, $data, $defaultRegle, $motifTrimmed, $ref, $comp, $propositionForClose, &$rdv) {
            $rdv = Rdv::create([
                'matchmaker_id' => $me->id,
                'reference_user_id' => $ref,
                'compatible_user_id' => $comp,
                'proposition_id' => $propositionForClose?->id,
                'regle' => trim($data['regle'] ?? '') ?: $defaultRegle,
                'message' => isset($data['message']) ? (trim($data['message']) ?: null) : null,
                'motif_de_recreation' => $motifTrimmed,
                'is_recreation' => true,
                'share_phone' => (bool) ($data['share_phone'] ?? false),
                'status' => Rdv::STATUS_EN_COURS,
            ]);

            if ($propositionForClose !== null) {
                Proposition::closeAcceptedRowsForPairAfterRdv($propositionForClose);
            }
        });

        return response()->json([
            'message' => self::MESSAGE_RECREATE_SUCCESS,
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

        $mapped = $rdvs->getCollection()
            ->map(function (Rdv $rdv) use ($me) {
                $row = $this->mapRdv($rdv, $me);

                return array_merge($row, $this->matchmakerRowRecreationMeta($me, $rdv));
            })
            ->values();

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

    /**
     * Staff RDV list: whether this échec row can start a re-create flow (same rules as proposition list).
     *
     * @return array{can_recreate_rdv: bool, recreate_proposition_id: int|null, recreate_from_failed_rdv_id: int|null, is_recreation_context: bool}
     */
    private function matchmakerRowRecreationMeta(User $me, Rdv $rdv): array
    {
        $empty = [
            'can_recreate_rdv' => false,
            'recreate_proposition_id' => null,
            'recreate_from_failed_rdv_id' => null,
            'is_recreation_context' => false,
        ];

        if ($rdv->status !== Rdv::STATUS_ECHEC) {
            return $empty;
        }

        $ref = (int) $rdv->reference_user_id;
        $comp = (int) $rdv->compatible_user_id;

        if (! Rdv::pairHasFailedRdv($ref, $comp)) {
            return $empty;
        }

        $hasSuccessfulRdv = Rdv::query()
            ->where('status', Rdv::STATUS_REUSSI)
            ->where(function ($q) use ($ref, $comp) {
                $q->where(function ($forward) use ($ref, $comp) {
                    $forward->where('reference_user_id', $ref)->where('compatible_user_id', $comp);
                })->orWhere(function ($reverse) use ($ref, $comp) {
                    $reverse->where('reference_user_id', $comp)->where('compatible_user_id', $ref);
                });
            })
            ->exists();

        $blockingPairRdv = Rdv::query()
            ->whereIn('status', [Rdv::STATUS_EN_COURS, Rdv::STATUS_REUSSI])
            ->where(function ($q) use ($ref, $comp) {
                $q->where(function ($forward) use ($ref, $comp) {
                    $forward->where('reference_user_id', $ref)->where('compatible_user_id', $comp);
                })->orWhere(function ($reverse) use ($ref, $comp) {
                    $reverse->where('reference_user_id', $comp)->where('compatible_user_id', $ref);
                });
            })
            ->exists();

        if ($hasSuccessfulRdv || $blockingPairRdv) {
            return $empty;
        }

        if (Proposition::pairRecreationBlockedByExternalPendingOrInterested($ref, $comp)) {
            return $empty;
        }

        if (Rdv::hasInProgressRdvForUser($ref) || Rdv::hasInProgressRdvForUser($comp)) {
            return $empty;
        }

        $latestPropId = Proposition::query()
            ->where('matchmaker_id', $me->id)
            ->where(function ($q) use ($ref, $comp) {
                $q->where(function ($forward) use ($ref, $comp) {
                    $forward->where('reference_user_id', $ref)->where('compatible_user_id', $comp);
                })->orWhere(function ($reverse) use ($ref, $comp) {
                    $reverse->where('reference_user_id', $comp)->where('compatible_user_id', $ref);
                });
            })
            ->orderByDesc('id')
            ->value('id');

        return [
            'can_recreate_rdv' => true,
            'recreate_proposition_id' => $latestPropId !== null ? (int) $latestPropId : null,
            'recreate_from_failed_rdv_id' => (int) $rdv->id,
            'is_recreation_context' => true,
        ];
    }

    private function bothSidesAccepted(Proposition $proposition): bool
    {
        $refAccepted = Proposition::query()
            ->where('reference_user_id', $proposition->reference_user_id)
            ->where('compatible_user_id', $proposition->compatible_user_id)
            ->where('recipient_user_id', $proposition->reference_user_id)
            ->whereIn('status', [Proposition::STATUS_INTERESTED, Proposition::STATUS_ACCEPTED])
            ->exists();

        $compAccepted = Proposition::query()
            ->where('reference_user_id', $proposition->reference_user_id)
            ->where('compatible_user_id', $proposition->compatible_user_id)
            ->where('recipient_user_id', $proposition->compatible_user_id)
            ->whereIn('status', [Proposition::STATUS_INTERESTED, Proposition::STATUS_ACCEPTED])
            ->exists();

        return $refAccepted && $compAccepted;
    }
}
