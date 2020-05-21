<?php

namespace App\Modules\Request\Models;

use App\Modules\Request\ApprovalTrait;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\Traits\LogsActivity;

class AlterLog extends Model
{
    use ApprovalTrait, SoftDeletes, LogsActivity;

    protected $guarded = [];
    
    protected static $logAttributes = ['user_id','date','time_in', 'time_out', 'employee_note' , 'approver_note', 'status'];

    protected $dates = [
        'deleted_at',
        'created_at',
        'updated_at'
    ];
}
