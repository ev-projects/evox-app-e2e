<?php

namespace App;

use Illuminate\Database\Eloquent\Model;

class EvaRegistration extends Model
{
    protected $table = 'eva_registration';

    protected $fillable = [
        'user_id',
        'eva_year',
        'eva_quarter',
        'is_attending',
    ];
}
