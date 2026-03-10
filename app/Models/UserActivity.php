<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserActivity extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'performed_by',
        'type',
        'description',
        'metadata',
        'created_at',
    ];

    protected $casts = [
        'metadata' => 'array',
        'created_at' => 'datetime',
    ];

    public const TYPE_PROPOSITION = 'proposition';
    public const TYPE_PROPOSITION_ACCEPTED = 'proposition_accepted';
    public const TYPE_PROPOSITION_REFUSED = 'proposition_refused';
    public const TYPE_PROPOSITION_EXPIRED = 'proposition_expired';
    public const TYPE_RDV = 'rdv';
    public const TYPE_SUBSCRIPTION = 'subscription';
    public const TYPE_STATUS_CHANGE = 'status_change';
    public const TYPE_NOTE = 'note';
    public const TYPE_MATCHMAKER_ASSIGNED = 'matchmaker_assigned';

    public static function types(): array
    {
        return [
            self::TYPE_PROPOSITION,
            self::TYPE_PROPOSITION_ACCEPTED,
            self::TYPE_PROPOSITION_REFUSED,
            self::TYPE_PROPOSITION_EXPIRED,
            self::TYPE_RDV,
            self::TYPE_SUBSCRIPTION,
            self::TYPE_STATUS_CHANGE,
            self::TYPE_NOTE,
            self::TYPE_MATCHMAKER_ASSIGNED,
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function performer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'performed_by');
    }
}
