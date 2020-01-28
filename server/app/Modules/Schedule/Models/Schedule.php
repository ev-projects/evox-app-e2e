<?php

namespace App\Modules\Schedule\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Schedule extends Model
{
    use SoftDeletes;

    protected $guarded = [];

    protected $dates = [
        'deleted_at'
    ];

    protected $casts = [
        'rest_days' => 'array'
    ];


    public function schedule_details(){
        return $this->hasMany(ScheduleDetail::class);
    }

    public function schedule_settings(){
        return $this->hasMany(ScheduleSettings::class);
    }
}
