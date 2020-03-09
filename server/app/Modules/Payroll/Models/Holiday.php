<?php

namespace App\Modules\Payroll\Models;

use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Traits\LogsActivity;

class Holiday extends Model
{
    use LogsActivity;

    protected $guarded = [];

    protected static $logAttributes = ['name', 'date', 'type', 'is_predefined'];

    public $timestamps = false;
}
