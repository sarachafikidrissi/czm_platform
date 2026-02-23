<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Activity extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'type',
        'actor_id',
        'subject_type',
        'subject_id',
        'metadata',
        'created_at',
    ];

    protected $casts = [
        'metadata' => 'array',
        'created_at' => 'datetime',
    ];

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }

    public function subject(): MorphTo
    {
        return $this->morphTo();
    }

    public function post(): HasOne
    {
        return $this->hasOne(Post::class);
    }

    /**
     * Scope: activities for the staff feed (actor is one of the given staff user IDs).
     * Optionally filter by agency (actor's agency_id).
     */
    public function scopeForStaffFeed($query, array $staffIds, ?int $agencyId = null)
    {
        $query->whereIn('actor_id', $staffIds)
            ->orderBy('created_at', 'desc');

        if ($agencyId !== null) {
            $query->whereHas('actor', function ($q) use ($agencyId) {
                $q->where('agency_id', $agencyId);
            });
        }

        return $query;
    }

    /**
     * Record a feed activity. Only records if actor is staff (matchmaker/manager/admin).
     */
    public static function record(
        string $type,
        ?int $actorId,
        Model $subject,
        array $metadata = []
    ): ?self {
        if ($actorId === null) {
            return null;
        }

        $staffIds = \App\Models\User::role(['matchmaker', 'manager', 'admin'])->pluck('id')->all();
        if (! in_array($actorId, $staffIds, true)) {
            return null;
        }

        return self::create([
            'type' => $type,
            'actor_id' => $actorId,
            'subject_type' => $subject->getMorphClass(),
            'subject_id' => $subject->getKey(),
            'metadata' => $metadata,
            'created_at' => now(),
        ]);
    }
}
