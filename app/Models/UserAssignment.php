<?php

namespace App\Models;

use App\Services\StatsService;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;

/**
 * Immutable assignment history row.
 *
 * Each row records one period during which a user was assigned to a matchmaker.
 * `unassigned_at = null` means the assignment is currently active.
 * Rows are never deleted; `unassigned_at` is the only field set after insertion.
 *
 * Static helpers are the single entry-point for all controllers:
 *   - recordAssignment()   — close previous + open new (all assignment/reassignment events)
 *   - recordUnassignment() — close only (agency reassign that clears the matchmaker field)
 */
class UserAssignment extends Model
{
    protected $fillable = [
        'user_id',
        'matchmaker_id',
        'assigned_by',
        'assigned_at',
        'unassigned_at',
        'reason',
    ];

    protected $casts = [
        'assigned_at'   => 'datetime',
        'unassigned_at' => 'datetime',
    ];

    // -------------------------------------------------------------------------
    // Relations
    // -------------------------------------------------------------------------

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function matchmaker()
    {
        return $this->belongsTo(User::class, 'matchmaker_id');
    }

    public function assignedBy()
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }

    // -------------------------------------------------------------------------
    // Static helpers — must be called inside a DB::transaction at each write site
    // -------------------------------------------------------------------------

    /**
     * Close the currently active assignment row for this user (if any).
     *
     * Returns the previous matchmaker_id so callers can invalidate its cache.
     */
    public static function closeActiveForUser(int $userId, ?Carbon $at = null): ?int
    {
        $at ??= Carbon::now();

        // Deferred (next maintenance pass): no row lock here; concurrent writes may leave
        // duplicate open assignment rows for the same user_id.
        $previous = static::where('user_id', $userId)
            ->whereNull('unassigned_at')
            ->first();

        if (! $previous) {
            return null;
        }

        $previous->update(['unassigned_at' => $at]);

        // Invalidate cache for the matchmaker who is losing the prospect
        StatsService::invalidateForMatchmaker($previous->matchmaker_id);

        return $previous->matchmaker_id;
    }

    /**
     * Close any open assignment row, then insert a new open one.
     * This is the main entry-point for every assignment / reassignment event.
     */
    public static function recordAssignment(
        int $userId,
        int $matchmakerId,
        ?int $assignedBy,
        string $reason
    ): void {
        $now = Carbon::now();

        static::closeActiveForUser($userId, $now);

        static::create([
            'user_id'       => $userId,
            'matchmaker_id' => $matchmakerId,
            'assigned_by'   => $assignedBy,
            'assigned_at'   => $now,
            'unassigned_at' => null,
            'reason'        => $reason,
        ]);

        // Invalidate the new matchmaker's KPI cache (and related admin/agency caches).
        // closeActiveForUser already handles the old matchmaker; this covers the new one.
        StatsService::invalidateForMatchmaker($matchmakerId);
    }

    /**
     * Close any open assignment row without opening a new one.
     * Used when a user is moved back to an agency pool (assigned_matchmaker_id → null).
     */
    public static function recordUnassignment(int $userId, ?int $assignedBy = null): void
    {
        static::closeActiveForUser($userId);
    }
}
