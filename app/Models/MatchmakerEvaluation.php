<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MatchmakerEvaluation extends Model
{
    protected $fillable = [
        'user_id',          // Target user
        'author_id',        // Evaluator (matchmaker/admin/manager)
        'status',           // prospect|member|client
        'appearance',
        'communication',
        'seriousness',
        'emotional_psychological',
        'values_principles',
        'social_compatibility',
        'qualities',
        'defects',
        'recommendation',   // ready|accompany|not_ready
        'remarks',
        'feedback_behavior',
        'feedback_partner_impression',
        'feedback_pos_neg',
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


