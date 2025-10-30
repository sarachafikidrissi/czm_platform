<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MatchmakerNote extends Model
{
    protected $fillable = [
        'user_id',        // Target user (prospect/member/client)
        'author_id',      // The staff who wrote the note (matchmaker/admin/manager)
        'content',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }
}


