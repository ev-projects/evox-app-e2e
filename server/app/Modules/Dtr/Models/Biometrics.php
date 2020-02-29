<?php

namespace App\Modules\Dtr\Models;

use Illuminate\Database\Eloquent\Model;
use MichaelAChrisco\ReadOnly\ReadOnlyTrait;

class Biometrics extends Model
{
    use ReadOnlyTrait;

    protected $guarded = ['Logid','Userid','CheckTime','CheckType','Sensorid','Checked','WorkType','AttFlag','SSMA_TimeStamp'];
    
    public $incrementing = false;

    protected $connection = 'biometrix';
    protected $table = 'checkinout';
    
    ########################################################################
    ############################ Custom Helpers ############################
    ########################################################################

    /**
     * 
     *  Check if the CheckType is 'I' or In.
     * @return bool 
     */
    public function isIn()
    {
        return ( $this->CheckType == "I" ) ? true : false;
    }

    
    /**
     *      
     *  Check if the CheckType is 'O' or Out.
     * @return bool 
     */
    public function isOut()
    {
        return ( $this->CheckType == "O" ) ? true : false;
    }


    /**
     * 
     *  Gets the Parsed Biometrics' 'Userid' to EVOX's 'emp_num'.
     * @return bool 
     */
    public function getParsedEmpNum()
    {
        return parse_emp_num_for_evox( $this->Userid );
    }
    
    /**
     *      
     *  Gets the FROM datetime of the CheckIn time. (- 6 hours)
     * @return bool 
     */
    public function getFrom()
    {
        return subtract_time_from_timestamp( $this->CheckTime, "06:00" );
    }


    
    /**
     *      
     *  Gets the TO datetime of the CheckIn time. (+ 6 hours)
     * @return bool 
     */
    public function getTo()
    {
        return add_time_to_timestamp( $this->CheckTime, "06:00" );
    }

    

    /**
     *      
     *  Gets the Time Type base on the CheckType
     * @return bool 
     */
    public function getTimeType()
    {
        return ( $this->isIn() ? 'time_in' : ( $this->isOut() ? 'time_out' : null ) );
    }



    /**
     *      
     *  Gets the Duty Type base on the CheckType
     * @return bool 
     */
    public function getDutyType()
    {
        return ( $this->isIn() ? 'start_datetime' : ( $this->isOut()  ? 'end_datetime' : null ) );
    }



    /**
     *      
     *  Gets the Flexy Type base on the CheckType
     * @return bool 
     */
    public function getFlexyType()
    {
        return ( $this->isIn() ? 'start_flexy_datetime' : ( $this->isOut() ? 'end_flexy_datetime' : null ) );
    }

}
