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
        'contact_type',   // 'distance' or 'presentiel'
        'created_during_validation', // true if note was created during prospect validation
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


