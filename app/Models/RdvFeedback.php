<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RdvFeedback extends Model
{
    use HasFactory;

    protected $table = 'rdv_feedbacks';

    protected $fillable = [
        'rdv_id',
        'author_id',
        'author_role',
        'avis',
        'feedback_message',
        'espace_de_rdv',
        'espace_autre_detail',
        'signe_de_rdv',
        'avis_matchmaker',
        'evaluation_de_rdv',
    ];

    public function rdv()
    {
        return $this->belongsTo(Rdv::class);
    }

    public function author()
    {
        return $this->belongsTo(User::class, 'author_id');
    }
}
