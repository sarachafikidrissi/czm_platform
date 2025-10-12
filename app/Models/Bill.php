<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Bill extends Model
{
    protected $fillable = [
        'bill_number',
        'user_id',
        'profile_id',
        'matchmaker_id',
        'order_number',
        'bill_date',
        'due_date',
        'status',
        'amount',
        'tax_rate',
        'tax_amount',
        'total_amount',
        'currency',
        'payment_method',
        'pack_name',
        'pack_price',
        'pack_advantages',
        'notes',
        'email_sent',
        'email_sent_at',
    ];

    protected $casts = [
        'bill_date' => 'date',
        'due_date' => 'date',
        'amount' => 'decimal:2',
        'tax_rate' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'pack_price' => 'decimal:2',
        'pack_advantages' => 'array',
        'email_sent' => 'boolean',
        'email_sent_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function profile(): BelongsTo
    {
        return $this->belongsTo(Profile::class);
    }

    public function matchmaker(): BelongsTo
    {
        return $this->belongsTo(User::class, 'matchmaker_id');
    }

    public static function generateBillNumber(): string
    {
        $year = date('Y');
        $month = date('m');
        $lastBill = static::whereYear('created_at', $year)
            ->whereMonth('created_at', $month)
            ->orderBy('id', 'desc')
            ->first();
        
        $sequence = $lastBill ? (int) substr($lastBill->bill_number, -3) + 1 : 1;
        
        return sprintf('FAC-%s-%s-%03d', $year, $month, $sequence);
    }

    public static function generateOrderNumber(): string
    {
        $year = date('Y');
        $month = date('m');
        $lastOrder = static::whereYear('created_at', $year)
            ->whereMonth('created_at', $month)
            ->orderBy('id', 'desc')
            ->first();
        
        $sequence = $lastOrder ? (int) substr($lastOrder->order_number, -3) + 1 : 1;
        
        return sprintf('CMD-%s-%s-%03d', $year, $month, $sequence);
    }
}
