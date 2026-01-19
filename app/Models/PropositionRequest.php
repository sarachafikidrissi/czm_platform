<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PropositionRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'reference_user_id',
        'compatible_user_id',
        'user_a_id',
        'user_b_id',
        'from_matchmaker_id',
        'to_matchmaker_id',
        'message',
        'status',
        'response_message',
        'rejection_reason',
        'share_phone',
        'organizer',
        'responded_at',
    ];

    protected $casts = [
        'share_phone' => 'boolean',
        'responded_at' => 'datetime',
    ];

    public function referenceUser()
    {
        return $this->belongsTo(User::class, 'reference_user_id');
    }

    public function compatibleUser()
    {
        return $this->belongsTo(User::class, 'compatible_user_id');
    }

    public function fromMatchmaker()
    {
        return $this->belongsTo(User::class, 'from_matchmaker_id');
    }

    public function toMatchmaker()
    {
        return $this->belongsTo(User::class, 'to_matchmaker_id');
    }
}

