<?php

namespace App\Modules\Careers\Models;

use Illuminate\Database\Eloquent\Model;

use Illuminate\Database\Eloquent\SoftDeletes;

class Careers extends Model
{
    use SoftDeletes;
    
    protected $guarded = [];

    protected $dates = [
        'deleted_at',
        'created_at',
        'updated_at'
    ];

    protected $table = 'job_openings';
}
