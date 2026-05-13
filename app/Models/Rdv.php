<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Rdv extends Model
{
    use HasFactory;

    public const STATUS_EN_COURS = 'en_cours';

    public const STATUS_REUSSI = 'reussi';

    public const STATUS_ECHEC = 'echec';

    protected $fillable = [
        'matchmaker_id',
        'reference_user_id',
        'compatible_user_id',
        'proposition_id',
        'regle',
        'message',
        'share_phone',
        'status',
    ];

    protected $casts = [
        'share_phone' => 'boolean',
    ];

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

    public function proposition()
    {
        return $this->belongsTo(Proposition::class, 'proposition_id');
    }

    public function feedbacks()
    {
        return $this->hasMany(RdvFeedback::class);
    }

    /**
     * Whether an active (en_cours) RDV already exists for a given reference/compatible pair.
     */
    public static function existsForPair(int $referenceUserId, int $compatibleUserId): bool
    {
        return static::query()
            ->where('reference_user_id', $referenceUserId)
            ->where('compatible_user_id', $compatibleUserId)
            ->where('status', self::STATUS_EN_COURS)
            ->exists();
    }

    /**
     * Whether the user appears on any RDV row with status en_cours (as reference or compatible).
     */
    public static function hasInProgressRdvForUser(int $userId): bool
    {
        return static::query()
            ->where('status', self::STATUS_EN_COURS)
            ->where(function ($query) use ($userId) {
                $query->where('reference_user_id', $userId)
                    ->orWhere('compatible_user_id', $userId);
            })
            ->exists();
    }

    /**
     * Latest RDV snapshot for a user, restricted to en_cours/reussi.
     *
     * @return array{
     *     exists: bool,
     *     rdv_id?: int,
     *     reference_user_id?: int,
     *     compatible_user_id?: int,
     *     status?: string
     * }
     */
    public static function activeOrSuccessfulSnapshotForUser(int $userId): array
    {
        $rdv = static::query()
            ->where(function ($q) use ($userId) {
                $q->where('reference_user_id', $userId)
                    ->orWhere('compatible_user_id', $userId);
            })
            ->whereIn('status', [self::STATUS_EN_COURS, self::STATUS_REUSSI])
            ->orderByDesc('id')
            ->first(['id', 'reference_user_id', 'compatible_user_id', 'status']);

        if (! $rdv) {
            return ['exists' => false];
        }

        return [
            'exists' => true,
            'rdv_id' => (int) $rdv->id,
            'reference_user_id' => (int) $rdv->reference_user_id,
            'compatible_user_id' => (int) $rdv->compatible_user_id,
            'status' => (string) $rdv->status,
        ];
    }
}
