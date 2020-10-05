<?php

namespace App\Modules\Payroll\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\Traits\LogsActivity;

class PayrollCutoff extends Model
{
    use SoftDeletes, LogsActivity;

    protected $guarded = [];

    protected static $logAttributes = ['start_date', 'end_date'];

    public $timestamps = false;
}
