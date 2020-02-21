<?php

namespace App\Modules\Schedule\Models;

use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Traits\LogsActivity;

class ScheduleDetail extends Model{
    
    use LogsActivity;

    protected $guarded = [];

    protected static $logAttributes = ['policy', 'value'];

    public $timestamps = false;

    protected $dateFormat = 'U';
}
