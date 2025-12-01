<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Carbon\Carbon;

class UserSubscription extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'matrimonial_pack_id',
        'assigned_matchmaker_id',
        'subscription_start',
        'subscription_end',
        'duration_months',
        'pack_price',
        'pack_advantages',
        'payment_mode',
        'status',
        'notes',
    ];

    protected $casts = [
        'subscription_start' => 'date',
        'subscription_end' => 'date',
        'pack_advantages' => 'array',
        'pack_price' => 'decimal:2',
    ];

    // Relationships
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function matrimonialPack()
    {
        return $this->belongsTo(MatrimonialPack::class);
    }

    public function assignedMatchmaker()
    {
        return $this->belongsTo(User::class, 'assigned_matchmaker_id');
    }

    // Accessors
    public function getIsActiveAttribute()
    {
        return $this->status === 'active' && 
               Carbon::now()->between($this->subscription_start, $this->subscription_end);
    }

    public function getIsExpiredAttribute()
    {
        return $this->subscription_end < Carbon::now();
    }

    public function getDaysRemainingAttribute()
    {
        if ($this->is_expired) {
            return 0;
        }
        
        return Carbon::now()->diffInDays($this->subscription_end, false);
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('status', 'active')
                    ->where('subscription_start', '<=', Carbon::now())
                    ->where('subscription_end', '>=', Carbon::now());
    }

    public function scopeExpired($query)
    {
        return $query->where('subscription_end', '<', Carbon::now());
    }

    // Static methods
    public static function createFromProfile(Profile $profile, User $user, $assignedMatchmakerId = null)
    {
        $pack = $profile->matrimonialPack;
        if (!$pack) {
            throw new \Exception('No matrimonial pack found for this profile');
        }

        // Parse duration from pack
        $durationMonths = self::parseDurationToMonths($pack->duration);
        
        $subscriptionStart = Carbon::now();
        $subscriptionEnd = $subscriptionStart->copy()->addMonths($durationMonths);

        return self::create([
            'user_id' => $user->id,
            'matrimonial_pack_id' => $profile->matrimonial_pack_id,
            'assigned_matchmaker_id' => $assignedMatchmakerId,
            'subscription_start' => $subscriptionStart,
            'subscription_end' => $subscriptionEnd,
            'duration_months' => $durationMonths,
            'pack_price' => $profile->pack_price,
            'pack_advantages' => $profile->pack_advantages,
            'payment_mode' => $profile->payment_mode,
            'status' => 'active',
            'notes' => $profile->notes,
        ]);
    }

    private static function parseDurationToMonths($duration)
    {
        // Duration is now stored as integer, so just return it
        if (is_numeric($duration)) {
            return (int) $duration;
        }
        
        // Fallback for old data that might still be string
        if (is_string($duration) && preg_match('/(\d+)\s*mois/', $duration, $matches)) {
            return (int) $matches[1];
        }
        
        // Default to 6 months if parsing fails
        return 6;
    }
}