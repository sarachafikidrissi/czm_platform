<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class MatrimonialPack extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'duration',
    ];

    protected $casts = [
        'duration' => 'integer',
    ];

    public function profiles()
    {
        return $this->hasMany(Profile::class);
    }

    // Accessor to format duration for display
    public function getDurationDisplayAttribute()
    {
        return $this->duration . ' mois';
    }
}
