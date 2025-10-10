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

    public function profiles()
    {
        return $this->hasMany(Profile::class);
    }
}
