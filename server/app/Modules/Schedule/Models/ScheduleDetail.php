<?php

namespace App\Modules\Schedule\Models;

use Illuminate\Database\Eloquent\Model;

class ScheduleDetail extends Model{
    
    protected $guarded = [];

    public $timestamps = false;

    protected $dateFormat = 'U';
}
