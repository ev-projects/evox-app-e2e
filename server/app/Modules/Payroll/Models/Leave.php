<?php

namespace App\Modules\Payroll\Models;

use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Traits\LogsActivity;

class Leave extends Model
{
    use LogsActivity;

    protected $guarded = [];

    protected static $logAttributes = ['dtr_id', 'type', 'status', 'amount', 'employee_note', 'manager_note'];

    protected $dates = [
        'deleted_at',
        'created_at',
        'updated_at'
    ];

    protected $casts = [
        'is_predefined' => 'boolean'  # Casts the is_predefined to Boolean
    ];
    
    ########################################################################
    ############################ Custom Helpers ############################
    ########################################################################


    /**
     * 
     *  Check if the Leave status is Requested
     * @return bool 
     */
    public function isRequested()
    {
        return ( $this->status == 'requested' ) ? true : false;
    }


    /**
     * 
     *  Check if the Leave status is Approved
     * @return bool 
     */
    public function isApproved()
    {
        return ( $this->status == 'approved' ) ? true : false;
    }
    

    /**
     * 
     *  Check if the Leave status is Denied.
     * @return bool 
     */
    public function isDenied()
    {
        return ( $this->status == 'denied' ) ? true : false;
    }


    /**
     * 
     *  Check if the Leave status is Canceled.
     * @return bool 
     */
    public function isCanceled()
    {
        return ( $this->status == 'canceled' ) ? true : false;
    }


    /**
     * 
     *  Check if the current Leave is Paid.
     * @return bool 
     */
    public function isPaidLeave()
    {
        return ( ! in_array( $this->type, get_constant("UNPAID_LEAVE_TYPES") ) ) ? true : false;
    }

    ########################################################################

    /**
     *  Relationships
     */
    /**
     * hasOne Relationship to DTR
     */
    public function dtr(){
        return $this->belongsTo(Dtr::class);
    }
}
