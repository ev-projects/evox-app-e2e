<?php

namespace App\Modules\Payroll\Models;

use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Traits\LogsActivity;

class DtrHoliday extends Model
{

    protected $table = 'dtr_holidays';
    protected $guarded = [];

    public $timestamps = false;



}
