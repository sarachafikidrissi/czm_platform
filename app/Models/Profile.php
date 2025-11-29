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
        'cin_hash',
        'identity_card_front_path',
        'identity_card_front_hash',
        'profile_picture_path',
        'banner_image_path',
        'notes',
        'recommendations',
        'service_id',
        'matrimonial_pack_id',
        'pack_price',
        'pack_advantages',
        'payment_mode',
        // Step1 extensions
        'origine',
        'pays_residence',
        'ville_residence',
        'pays_origine',
        'ville_origine',
        'apropos_description',
        // Step2 extensions
        'has_children',
        'children_count',
        'children_guardian',
        'hijab_choice',
        'veil',
        'specific_veil_wish',
        'niqab_acceptance',
        'polygamy',
        'foreign_marriage',
        'work_after_marriage',
        'situation_sante',
        // Step3 extensions
        'profil_recherche_description',
        // Account status
        'account_status',
        'activation_reason',
        'deactivation_reason',
    ];

    protected $casts = [
        'pack_advantages' => 'array',
        'villes_recherche' => 'array',
        'situation_matrimoniale_recherche' => 'array', // Changed to array to support multiple selections
        'pays_recherche' => 'array', // Changed to array to support multiple selections
        'situation_sante' => 'array', // Changed to array to support multiple selections
        'is_completed' => 'boolean',
        'has_children' => 'boolean',
        'current_step' => 'integer',
        'age_minimum' => 'integer',
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
