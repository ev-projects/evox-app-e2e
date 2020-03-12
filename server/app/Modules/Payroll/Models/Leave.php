<?php

namespace App\Modules\Payroll\Models;

use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Traits\LogsActivity;

class Leave extends Model
{
    use LogsActivity;

    protected $guarded = [];

    protected static $logAttributes = ['dtr_id', 'name', 'status'];

    protected $dates = [
        'deleted_at',
        'created_at',
        'updated_at'
    ];

    protected $casts = [
        'is_predefined' => 'boolean'  # Casts the is_predefinedto Boolean
    ];

    ########################################################################
    ############################ Custom Helpers ############################
    ########################################################################

}
