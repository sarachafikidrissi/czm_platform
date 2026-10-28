<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PostComment extends Model
{
    protected $fillable = [
        'post_id',
        'user_id',
        'parent_id',
        'content'
    ];

    public function post(): BelongsTo
    {
        return $this->belongsTo(Post::class);
    }

    /**
     * Who may delete this comment: its author, an admin, the matchmaker (or manager) assigned to the
     * profile who wrote it, or a manager of that profile's agency. Mirrored in PostCard.jsx.
     */
    public function canBeDeletedBy(User $viewer): bool
    {
        if ((int) $this->user_id === (int) $viewer->id || $viewer->hasRole('admin')) {
            return true;
        }

        $author = $this->user;
        if (! $author || ! $author->hasRole('user')) {
            return false;
        }

        if ($viewer->hasAnyRole(['matchmaker', 'manager'])
            && $author->assigned_matchmaker_id !== null
            && (int) $author->assigned_matchmaker_id === (int) $viewer->id) {
            return true;
        }

        if ($viewer->hasRole('manager') && $viewer->agency_id !== null) {
            $authorAgencyId = $author->agency_id ?? $author->assignedMatchmaker?->agency_id;

            return $authorAgencyId !== null && (int) $authorAgencyId === (int) $viewer->agency_id;
        }

        return false;
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(PostComment::class, 'parent_id');
    }

    public function replies(): HasMany
    {
        return $this->hasMany(PostComment::class, 'parent_id')->orderBy('created_at', 'asc');
    }
}
