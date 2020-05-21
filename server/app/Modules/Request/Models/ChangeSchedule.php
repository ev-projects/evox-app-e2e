<?php

namespace App\Modules\Request\Models;

use App\Modules\Payroll\Models\Dtr;
use App\Modules\Request\ApprovalTrait;
use App\Modules\Schedule\Models\Schedule;
use App\Modules\User\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\Traits\LogsActivity;

class ChangeSchedule extends Model
{
    use ApprovalTrait, SoftDeletes, LogsActivity;

    protected $guarded = [];
    
    protected static $logAttributes = ['user_id','schedule_id','valid_from', 'valid_to', 'employee_note' , 'approver_note', 'status'];

    protected $dates = [
        'deleted_at',
        'created_at',
        'updated_at'
    ];


    
    ########################################################################
    ############################ Custom Helpers ############################
    ########################################################################



    ########################################################################

    /**
     *  Relationships
     */
    /**
     * belongsTo Relationship for a User
     */
    public function user(){
        return $this->belongsTo(User::class);
    }

    
    /**
     *  Relationships
     */
    /**
     * belongsTo Relationship for DTR
     */
    public function dtr(){
        return $this->belongsTo(Dtr::class, 'user_id', 'user_id')->whereBetween(
            'date', [$this->valid_from, $this->valid_to]
        );
    }
    
    /**
     * hasOne Relationship for the Schedule
     */
    public function schedule(){
        return $this->hasOne(Schedule::class, 'id', 'schedule_id')->where([
            'source_type' => get_constant('DTR_SOURCE_TYPE_TAGGING.change_schedule')
        ]);
    }
}
