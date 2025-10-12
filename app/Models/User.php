<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable , HasRoles;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'phone',
        'gender',
        'country',
        'city',
        'condition',
        'status',
        'approval_status',
        'agency',
        'agency_id',
        'profile_picture',
        'identity_card_front_hash',
        'identity_card_back_hash',
        'cin_hash',
        'assigned_matchmaker_id',
        'approved_at',
        'approved_by'
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'condition' => 'boolean',
        ];
    }

    public function profile() {
        return $this->hasOne(Profile::class)->withDefault([
            'current_step' => 1
        ]);
    }

    public function assignedMatchmaker() {
        return $this->belongsTo(User::class, 'assigned_matchmaker_id');
    }

    public function assignedUsers() {
        return $this->hasMany(User::class, 'assigned_matchmaker_id');
    }

    public function approvedBy() {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function approvedUsers() {
        return $this->hasMany(User::class, 'approved_by');
    }

    public function agency() {
        return $this->belongsTo(Agency::class);
    }

    public function bills() {
        return $this->hasMany(Bill::class);
    }

    public function createdBills() {
        return $this->hasMany(Bill::class, 'matchmaker_id');
    }
}
