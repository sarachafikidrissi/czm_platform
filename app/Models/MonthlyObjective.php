<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MonthlyObjective extends Model
{
    protected $fillable = [
        'user_id',
        'role_type',
        'month',
        'year',
        'target_ventes',
        'target_membres',
        'target_rdv',
        'target_match',
        'commission_paid',
        'commission_paid_at',
        'commission_paid_by',
    ];

    protected $casts = [
        'target_ventes' => 'decimal:2',
        'target_membres' => 'integer',
        'target_rdv' => 'integer',
        'target_match' => 'integer',
        'commission_paid' => 'boolean',
        'commission_paid_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function commissionPaidBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'commission_paid_by');
    }
}
