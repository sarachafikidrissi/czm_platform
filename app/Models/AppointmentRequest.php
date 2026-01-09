<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AppointmentRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'email',
        'phone',
        'city',
        'country',
        'reason',
        'preferred_date',
        'message',
        'status',
        'treatment_status',
        'assigned_agency_id',
        'assigned_matchmaker_id',
        'converted_to_prospect_id',
        'done_at',
        'done_by',
    ];

    protected $casts = [
        'preferred_date' => 'datetime',
        'done_at' => 'datetime',
    ];

    /**
     * Get the prospect user if this appointment was converted
     */
    public function convertedToProspect()
    {
        return $this->belongsTo(User::class, 'converted_to_prospect_id');
    }

    /**
     * Get the agency assigned to handle this request
     */
    public function assignedAgency()
    {
        return $this->belongsTo(Agency::class, 'assigned_agency_id');
    }

    /**
     * Get the matchmaker assigned to handle this request
     */
    public function assignedMatchmaker()
    {
        return $this->belongsTo(User::class, 'assigned_matchmaker_id');
    }

    /**
     * Get the matchmaker who marked this request as done
     */
    public function doneBy()
    {
        return $this->belongsTo(User::class, 'done_by');
    }
}

