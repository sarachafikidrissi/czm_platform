<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Proposition extends Model
{
    use HasFactory;

    public const STATUS_PENDING = 'pending';

    public const STATUS_INTERESTED = 'interested';

    public const STATUS_ACCEPTED = 'accepted';

    public const STATUS_NOT_INTERESTED = 'not_interested';

    public const STATUS_CANCELLED = 'cancelled';

    public const STATUS_EXPIRED = 'expired';

    protected $fillable = [
        'matchmaker_id',
        'pair_id',
        'user_a_id',
        'user_b_id',
        'reference_user_id',
        'compatible_user_id',
        'recipient_user_id',
        'message',
        'status',
        'user_response',
        'user_comment',
        'response_message',
        'responded_at',
        'cancelled_at',
    ];

    protected $casts = [
        'responded_at' => 'datetime',
        'cancelled_at' => 'datetime',
    ];

    /**
     * Active propositions: pending, interested, or accepted.
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->whereIn('status', [self::STATUS_PENDING, self::STATUS_INTERESTED, self::STATUS_ACCEPTED]);
    }

    /**
     * Canonical "active proposition" guard used across the app:
     * - status is pending, interested, or accepted
     * - user is involved as reference, compatible, or recipient
     * - no time window (expiry is handled by expiry command)
     */
    public function scopeActiveForUser(Builder $query, int $userId): Builder
    {
        return $query
            ->active()
            ->where(function ($q) use ($userId) {
                $q->where('reference_user_id', $userId)
                    ->orWhere('compatible_user_id', $userId)
                    ->orWhere('recipient_user_id', $userId);
            });
    }

    public static function hasActiveProposition(int $userId): bool
    {
        return static::query()->activeForUser($userId)->exists();
    }

    /**
     * @return array{exists: bool, status: ?string, proposition_id: ?int, role: ?string, reference_user_id: ?int, compatible_user_id: ?int, recipient_user_id: ?int, recipient_pending_response: bool, pending_response_proposition_id: ?int}
     */
    public static function activeSnapshotForUser(int $userId): array
    {
        $p = static::query()->activeForUser($userId)->orderByDesc('id')->first();
        $pendingResponseId = static::pendingResponsePropositionIdForRecipient($userId);

        if ($p === null) {
            return [
                'exists' => false,
                'status' => null,
                'proposition_id' => null,
                'role' => null,
                'reference_user_id' => null,
                'compatible_user_id' => null,
                'recipient_user_id' => null,
                'recipient_pending_response' => false,
                'pending_response_proposition_id' => null,
            ];
        }

        $role = (int) $p->recipient_user_id === $userId ? 'receiver' : 'proposer';

        return [
            'exists' => true,
            'status' => $p->status,
            'proposition_id' => (int) $p->id,
            'role' => $role,
            'reference_user_id' => (int) $p->reference_user_id,
            'compatible_user_id' => (int) $p->compatible_user_id,
            'recipient_user_id' => (int) $p->recipient_user_id,
            'recipient_pending_response' => $pendingResponseId !== null,
            'pending_response_proposition_id' => $pendingResponseId,
        ];
    }

    /**
     * Pair-scoped active proposition snapshot for matchmaking payload rows.
     *
     * @return array{exists: bool, status: ?string, proposition_id: ?int, role: ?string, reference_user_id: ?int, compatible_user_id: ?int, recipient_user_id: ?int, recipient_pending_response: bool, pending_response_proposition_id: ?int}
     */
    public static function activeSnapshotForPair(int $referenceUserId, int $compatibleUserId, int $viewerUserId): array
    {
        $p = static::query()
            ->where('reference_user_id', $referenceUserId)
            ->where('compatible_user_id', $compatibleUserId)
            ->active()
            ->orderByDesc('id')
            ->first();

        $pendingResponseId = static::pendingResponsePropositionIdForRecipientInPair(
            $viewerUserId,
            $referenceUserId,
            $compatibleUserId
        );

        if ($p === null) {
            return [
                'exists' => false,
                'status' => null,
                'proposition_id' => null,
                'role' => null,
                'reference_user_id' => null,
                'compatible_user_id' => null,
                'recipient_user_id' => null,
                'recipient_pending_response' => false,
                'pending_response_proposition_id' => null,
            ];
        }

        $role = (int) $p->recipient_user_id === $viewerUserId ? 'receiver' : 'proposer';

        return [
            'exists' => true,
            'status' => $p->status,
            'proposition_id' => (int) $p->id,
            'role' => $role,
            'reference_user_id' => (int) $p->reference_user_id,
            'compatible_user_id' => (int) $p->compatible_user_id,
            'recipient_user_id' => (int) $p->recipient_user_id,
            'recipient_pending_response' => $pendingResponseId !== null,
            'pending_response_proposition_id' => $pendingResponseId,
        ];
    }

    public static function pendingResponsePropositionIdForRecipient(int $userId): ?int
    {
        $p = static::query()
            ->where('status', self::STATUS_PENDING)
            ->where('recipient_user_id', $userId)
            ->orderByDesc('id')
            ->first();

        if ($p === null || $p->responded_at !== null) {
            return null;
        }

        return (int) $p->id;
    }

    public static function pendingResponsePropositionIdForRecipientInPair(int $userId, int $referenceUserId, int $compatibleUserId): ?int
    {
        $p = static::query()
            ->where('status', self::STATUS_PENDING)
            ->where('reference_user_id', $referenceUserId)
            ->where('compatible_user_id', $compatibleUserId)
            ->where('recipient_user_id', $userId)
            ->orderByDesc('id')
            ->first();

        if ($p === null || $p->responded_at !== null) {
            return null;
        }

        return (int) $p->id;
    }

    public function isActive(): bool
    {
        return in_array($this->status, [self::STATUS_PENDING, self::STATUS_INTERESTED, self::STATUS_ACCEPTED], true);
    }

    /**
     * Matchmakers may cancel any non-cancelled row (pending, answered, expired, etc.).
     */
    public function canBeCancelledByMatchmaker(): bool
    {
        return $this->status !== self::STATUS_CANCELLED;
    }

    /**
     * Either profile (as recipient) has any active proposition, any match / matchmaker.
     * Used when sending to both profiles in one request.
     */
    public static function eitherMatchProfileHasActiveProposition(int $referenceUserId, int $compatibleUserId): bool
    {
        return static::query()
            ->where(function ($q) use ($referenceUserId, $compatibleUserId) {
                $q->where('reference_user_id', $referenceUserId)
                    ->orWhere('compatible_user_id', $referenceUserId)
                    ->orWhere('recipient_user_id', $referenceUserId)
                    ->orWhere('reference_user_id', $compatibleUserId)
                    ->orWhere('compatible_user_id', $compatibleUserId)
                    ->orWhere('recipient_user_id', $compatibleUserId);
            })
            ->active()
            ->exists();
    }

    /**
     * Active proposition for this reference/compatible pair where the recipient is one of the two profiles.
     */
    public static function pairMatchHasActiveProposition(int $referenceUserId, int $compatibleUserId): bool
    {
        return static::query()
            ->where('reference_user_id', $referenceUserId)
            ->where('compatible_user_id', $compatibleUserId)
            ->where(function ($q) use ($referenceUserId, $compatibleUserId) {
                $q->where('recipient_user_id', $referenceUserId)
                    ->orWhere('recipient_user_id', $compatibleUserId);
            })
            ->active()
            ->exists();
    }

    /**
     * Other rows sharing the same non-null pair_id (excludes the given proposition).
     */
    public function scopePairedWith(Builder $query, Proposition $proposition): Builder
    {
        return $query
            ->where('pair_id', $proposition->pair_id)
            ->where('id', '!=', $proposition->id)
            ->whereNotNull('pair_id');
    }

    public function matchmaker()
    {
        return $this->belongsTo(User::class, 'matchmaker_id');
    }

    public function referenceUser()
    {
        return $this->belongsTo(User::class, 'reference_user_id');
    }

    public function compatibleUser()
    {
        return $this->belongsTo(User::class, 'compatible_user_id');
    }

    public function recipientUser()
    {
        return $this->belongsTo(User::class, 'recipient_user_id');
    }
}
