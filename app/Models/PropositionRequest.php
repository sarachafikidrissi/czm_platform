<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PropositionRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'reference_user_id',
        'compatible_user_id',
        'user_a_id',
        'user_b_id',
        'from_matchmaker_id',
        'to_matchmaker_id',
        'message',
        'status',
        'response_message',
        'rejection_reason',
        'share_phone',
        'organizer',
        'responded_at',
    ];

    protected $casts = [
        'share_phone' => 'boolean',
        'responded_at' => 'datetime',
    ];

    /**
     * Requests still "open": pending, or accepted while the proposition can still be sent, i.e.
     * - no proposition for that pair has been sent since the acceptance, and
     * - neither profile has a blocking RDV (in progress or successful) or an active proposition
     *   (same checks as PropositionController::store; otherwise "Proposer" could never succeed).
     * Evaluated live: when the block goes away (e.g. the RDV fails), the accepted request is usable again.
     */
    public function scopeOpen(Builder $query): Builder
    {
        $involvesEitherProfile = function ($q, string $table, bool $withRecipient) {
            foreach (['reference_user_id', 'compatible_user_id'] as $profileColumn) {
                $q->orWhereColumn("{$table}.reference_user_id", "proposition_requests.{$profileColumn}")
                    ->orWhereColumn("{$table}.compatible_user_id", "proposition_requests.{$profileColumn}");
                if ($withRecipient) {
                    $q->orWhereColumn("{$table}.recipient_user_id", "proposition_requests.{$profileColumn}");
                }
            }
        };

        return $query->where(function ($q) use ($involvesEitherProfile) {
            $q->where('proposition_requests.status', 'pending')
                ->orWhere(function ($accepted) use ($involvesEitherProfile) {
                    $accepted->where('proposition_requests.status', 'accepted')
                        ->whereNotExists(function ($sent) {
                            $sent->selectRaw('1')
                                ->from('propositions')
                                ->whereColumn('propositions.reference_user_id', 'proposition_requests.reference_user_id')
                                ->whereColumn('propositions.compatible_user_id', 'proposition_requests.compatible_user_id')
                                ->whereColumn('propositions.created_at', '>=', 'proposition_requests.responded_at');
                        })
                        ->whereNotExists(function ($rdv) use ($involvesEitherProfile) {
                            $rdv->selectRaw('1')
                                ->from('rdvs')
                                ->whereIn('rdvs.status', [Rdv::STATUS_EN_COURS, Rdv::STATUS_REUSSI])
                                ->where(fn ($w) => $involvesEitherProfile($w, 'rdvs', false));
                        })
                        ->whereNotExists(function ($active) use ($involvesEitherProfile) {
                            // Same definition as Proposition::scopeActive (pending only within 7 days).
                            $active->selectRaw('1')
                                ->from('propositions')
                                ->where(fn ($w) => $w->whereIn('propositions.status', [Proposition::STATUS_INTERESTED, Proposition::STATUS_ACCEPTED])
                                    ->orWhere(fn ($p) => $p->where('propositions.status', Proposition::STATUS_PENDING)
                                        ->where(fn ($t) => $t->whereNull('propositions.created_at')
                                            ->orWhere('propositions.created_at', '>=', now()->subDays(7)))))
                                ->where(fn ($w) => $involvesEitherProfile($w, 'propositions', true));
                        });
                });
        });
    }

    public static function hasOpenRequestFor(int $fromMatchmakerId, int $compatibleUserId): bool
    {
        return static::query()
            ->open()
            ->where('from_matchmaker_id', $fromMatchmakerId)
            ->where('compatible_user_id', $compatibleUserId)
            ->exists();
    }

    public function referenceUser()
    {
        return $this->belongsTo(User::class, 'reference_user_id');
    }

    public function compatibleUser()
    {
        return $this->belongsTo(User::class, 'compatible_user_id');
    }

    public function fromMatchmaker()
    {
        return $this->belongsTo(User::class, 'from_matchmaker_id');
    }

    public function toMatchmaker()
    {
        return $this->belongsTo(User::class, 'to_matchmaker_id');
    }
}

