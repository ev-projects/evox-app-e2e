<?php

namespace App\Modules\Request\Models;

use App\Modules\Payroll\Models\DtrPunchHistory;
use App\Modules\Request\Traits\ApprovalTrait;
use App\Modules\User\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\Traits\LogsActivity;


class AlterLogPunch extends Model
{
    use ApprovalTrait, LogsActivity;

    protected $table = "alter_log_punches_new";
    protected $guarded = [];

    protected $dates = [
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
