<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Profile extends Model
{
    protected $fillable = [
        'user_id',
        'current_step',
        'heard_about_us',
        'heard_about_reference',
        'cin',
        'identity_card_front_path',
        'identity_card_back_path',
        'profile_picture_path',
        'notes',
        'recommendations',
        'service_id',
        'matrimonial_pack_id',
        'pack_price',
        'pack_advantages',
        'payment_mode',
        // Step2 extensions
        'has_children',
        'children_count',
        'children_guardian',
        'hijab_choice'
    ];

    protected $casts = [
        'pack_advantages' => 'array',
        'villes_recherche' => 'array',
    ];

    public function matrimonialPack()
    {
        return $this->belongsTo(MatrimonialPack::class);
    }

    public function bills()
    {
        return $this->hasMany(Bill::class);
    }
}
