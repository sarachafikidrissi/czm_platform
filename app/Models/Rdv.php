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
}
