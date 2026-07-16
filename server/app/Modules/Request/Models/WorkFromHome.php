<?php

namespace App\Modules\Request\Models;

use Illuminate\Database\Eloquent\Model;
use App\Modules\Request\ApprovalTrait;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\Traits\LogsActivity;

class WorkFromHome extends Model
{
    use ApprovalTrait, SoftDeletes, LogsActivity;

    protected $guarded = [];
    
    protected static $logAttributes = ['user_id','valid_from','valid_to','employee_note', 'approver_note','status', 'updated_by', 'created_by' ];

    protected $dates = [
        'deleted_at',
        'created_at',
        'updated_at'
    ];
}
