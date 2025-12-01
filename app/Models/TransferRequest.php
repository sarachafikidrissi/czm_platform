<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TransferRequest extends Model
{
    protected $fillable = [
        'user_id',
        'from_matchmaker_id',
        'to_matchmaker_id',
        'status',
        'rejection_reason',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function fromMatchmaker(): BelongsTo
    {
        return $this->belongsTo(User::class, 'from_matchmaker_id');
    }

    public function toMatchmaker(): BelongsTo
    {
        return $this->belongsTo(User::class, 'to_matchmaker_id');
    }
}
