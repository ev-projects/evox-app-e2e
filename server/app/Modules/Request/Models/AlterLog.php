<?php

namespace App\Modules\Request\Models;

use App\Modules\Payroll\Models\Dtr;
use App\Modules\Request\ApprovalTrait;
use App\Modules\User\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\Traits\LogsActivity;

class AlterLog extends Model
{
    use ApprovalTrait, SoftDeletes, LogsActivity;

    protected $guarded = [];
    
    protected static $logAttributes = ['user_id','date','current_time_in', 'current_time_out','new_time_in', 'new_time_out', 'employee_note' , 'approver_note', 'status'];

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
     * belongsTo Relationship for DTR
     */
    public function dtr(){
        return $this->belongsTo(Dtr::class, 'user_id', 'user_id')->where([
            'date' => $this->date
        ]);
    }

}
