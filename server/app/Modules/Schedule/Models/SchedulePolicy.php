<?php

namespace App\Modules\Schedule\Models;

use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Traits\LogsActivity;

class SchedulePolicy extends Model{

    use LogsActivity;

    protected $guarded = [];

    protected static $logAttributes = ['name', 'start_time', 'end_time', 'start_flexy_time', 'end_flexy_time', 'break_time'];

    public $timestamps = false;
}
