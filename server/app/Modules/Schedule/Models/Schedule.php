<?php

namespace App\Modules\Schedule\Models;

use Illuminate\Database\Eloquent\Model;

class Schedule extends Model
{
    //
    use SoftDeletes;

    /**
     * The attributes that should be mutated to dates.
     *
     * @var array
     */
    protected $dates = ['deleted_at'];
}
