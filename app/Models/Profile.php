<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Profile extends Model
{
    protected $fillable = [
        'user_id',
        'current_step',
        'heard_about_us',
        'cin',
        'identity_card_front_path',
        'identity_card_back_path',
        'notes',
        'recommendations'
    ];

    
}
