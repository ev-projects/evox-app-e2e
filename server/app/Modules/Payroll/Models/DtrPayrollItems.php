<?php

namespace App\Modules\Payroll\Models;

use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Traits\LogsActivity;

class DtrPayrollItems extends Model
{
    use LogsActivity;

    protected $guarded = [];

    protected static $logAttributes = ['dtr_id', 'type', 'items', 'value'];

    public $timestamps = false;

    
    
    ########################################################################
    ############################ Custom Helpers ############################
    ########################################################################

    /**
     * 
     *  Check if Payroll Item's Tagging is Regular.
     * @return bool 
     */
    public function isRegular()
    {    
        return ( is_null( $this->tag ) ) ? true : false;
    }

    /**
     * 
     *  Check if Payroll Item's Tagging is Underlapped.
     * @return bool 
     */
    public function isUnderlapped()
    {    
        return ( $this->tag == get_constant('PAYROLL_ITEM_TAGS.underlapped') ) ? true : false;
    }

    /**
     * 
     *  Check if Payroll Item's Tagging is Overlapped.
     * @return bool 
     */
    public function isOverlapped()
    {    
        return ( $this->tag == get_constant('PAYROLL_ITEM_TAGS.overlapped') ) ? true : false;
    }

    /**
     * 
     *  Check if Payroll Item is Overlapped.
     * @return bool 
     */
    public function isLate()
    {    
        return ( $this->item == get_constant('PAYROLL_ITEMS.late') ) ? true : false;
    }

    /**
     * 
     *  Check if Payroll Item is Undertime.
     * @return bool 
     */
    public function isUndertime()
    {    
        return ( $this->item == get_constant('PAYROLL_ITEMS.undertime') ) ? true : false;
    }

    /**
     * 
     *  Check if Payroll Item is Night Diff.
     * @return bool 
     */
    public function isNightDiff()
    {    
        return ( $this->item == get_constant('PAYROLL_ITEMS.night_diff') ) ? true : false;
    }

    /**
     * 
     *  Check if Payroll Item is Overtime.
     * @return bool 
     */
    public function isOvertime()
    {    
        return ( $this->item == get_constant('PAYROLL_ITEMS.overtime') ) ? true : false;
    }

    /**
     * 
     *  Check if Payroll Item is Overtime Night Diff.
     * @return bool 
     */
    public function isOvertimeNightDiff()
    {    
        return ( $this->item == get_constant('PAYROLL_ITEMS.overtime_night_diff') ) ? true : false;
    }

    /**
     * 
     *  Check if Payroll Item is Rendered Hours.
     * @return bool 
     */
    public function isRenderedHours()
    {    
        return ( $this->item == get_constant('PAYROLL_ITEMS.rendered_hours') ) ? true : false;
    }

}
