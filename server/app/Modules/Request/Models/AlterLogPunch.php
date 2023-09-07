<?php

namespace App\Modules\Request\Models;

use App\Modules\Payroll\Models\DtrPunchHistory;
use App\Modules\Request\ApprovalTrait;
use App\Modules\User\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\Traits\LogsActivity;


class AlterLogPunch extends Model
{
    use ApprovalTrait, LogsActivity;

    protected $table = "alter_log_punches";
    protected $guarded = [];
    
    // protected static $logAttributes = ['user_id','date','current_time_in', 'current_time_out','new_time_in', 'new_time_out', 'employee_note' , 'approver_note', 'status'];

    protected $dates = [
        // 'deleted_at',
        'created_at',
        'updated_at'
    ];

    public function user(){
        return $this->belongsTo(User::class);
    }

    public function old_punch_array()
    {
        return json_decode($this->old_punch);
    }

    public function old_punch_to_collection()
    {

        $ids = array_column($this-> old_punch_array(), 'id');
      
        return   DtrPunchHistory::whereIn('id', $ids);
    
    }
    public function new_punch_array()
    {
        return json_decode($this->new_punch);
    }
    
    
    ########################################################################
    ############################ Custom Helpers ############################
    ########################################################################



    #######################################################################

}
