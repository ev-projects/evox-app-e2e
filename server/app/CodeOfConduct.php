<?php

namespace App;

use Illuminate\Database\Eloquent\Model;

class CodeOfConduct extends Model
{
    protected $table = 'code_of_conduct';

    protected $fillable = [
        'user_id',
        'is_acknowledged',
        'is_completed',
        'acknowledged_at',
        'completed_at',
    ];
}
