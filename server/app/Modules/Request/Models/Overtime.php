<?php

namespace App\Modules\Request\Models;

use App\Modules\Payroll\Models\Dtr;
use App\Modules\Request\RequestTrait;
use App\Modules\User\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\Traits\LogsActivity;

class Overtime extends Model
{
    use RequestTrait, SoftDeletes, LogsActivity;

    protected $guarded = [];
    
    protected static $logAttributes = ['user_id', 'date', 'amount', 'type', 'employee_note', 'approver_note'];

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
     * belongsTo Relationship for a User
     */
    public function dtr(){
        return $this->belongsTo(Dtr::class, 'user_id', 'user_id')->where([
            'date' => $this->date
        ]);
    }
}
