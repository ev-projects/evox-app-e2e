<?php

namespace App\Modules\Payroll\Models;

use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Traits\LogsActivity;

class PayrollCutoff extends Model
{
    use LogsActivity;

    protected $guarded = [];

    protected static $logAttributes = ['start_date', 'end_date'];

    public $timestamps = false;
}
