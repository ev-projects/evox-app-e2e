<?php

namespace App\Modules\Payroll\Models;

use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Traits\LogsActivity;

class DtrPayrollItem extends Model
{
    use LogsActivity;

    protected $guarded = [];

    protected static $logAttributes = ['dtr_id', 'computation_type', 'items', 'value'];

    public $timestamps = false;
}
