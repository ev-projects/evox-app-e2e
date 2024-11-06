<?php

namespace App\Modules\Schedule\Models;

use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Traits\LogsActivity;

class ScheduleDetail extends Model{
    
    use LogsActivity;

    protected $guarded = [];

    protected static $logAttributes = ['name', 'start_time', 'end_time', 'start_flexy_time', 'end_flexy_time', 'break_time'];

    public $timestamps = false;

    protected $dateFormat = 'U';

    
    /**
     *  Responsible for Formatting the Detail with it's Corresponding structure.
     * @return array
     */
    public function getFormattedDetail(){
        return [
            'start_time'        => seconds_to_time( $this->start_time ,false,true),
            'end_time'          => seconds_to_time( $this->end_time ,false,true),
            'start_flexy_time'  => seconds_to_time( $this->start_flexy_time ,false,true),
            'end_flexy_time'    => seconds_to_time( $this->end_flexy_time ,false,true),
            'break_time'        => seconds_to_time( $this->break_time ),
        ];
    }

    public function getFormattedDetailPOV($owner){
        return [
            'start_time'        => seconds_to_time_POV( $this->start_time ,false,true, $owner),
            'end_time'          => seconds_to_time_POV( $this->end_time ,false,true, $owner),
            'start_flexy_time'  => seconds_to_time_POV( $this->start_flexy_time ,false,true, $owner),
            'end_flexy_time'    => seconds_to_time_POV( $this->end_flexy_time ,false,true, $owner),
            'break_time'        => seconds_to_time( $this->break_time ),
        ];
    }
    

    /**
     *  Responsible for Parsing the current Schedule Detail instance with the specific Date parameter.
     *  - Also checks for overlapped times (for Night Shift) and automatically adjusts the Date whenever it's detected.
     * @param date $date
     * @return array
     */
    public function getParsedDetailToDate( $date ) 
    {

        
        
        # Sets the default value for the Parsed Detail to Date which merges the Start & Start Flexy & End & End Flexy with the Corresponding Time.
        $result = [
            'start_datetime'        => add_time_to_timestamp( $date, (int)$this->start_time ),
            'end_datetime'          => add_time_to_timestamp( $date, (int)$this->end_time ),
            'start_flexy_datetime'  => !is_null( $this->start_flexy_time ) ? add_time_to_timestamp( $date, (int)$this->start_flexy_time ) : null,
            'end_flexy_datetime'    => !is_null( $this->end_flexy_time ) ? add_time_to_timestamp( $date, (int)$this->end_flexy_time ) : null,
            'break_time'            => $this->break_time
        ];

        /**
         * If the start_datetime is greater than end_datetime, adds additional 1 day on end_datetime (For Nightshift Overlapped-Schedule)
         *  (Ex. If 
         *          start_datetime = 2020-02-24 21:00:00 & 
         *          end_datetime = 2020-02-24 06:00:00, 
         *      sets 
         *          end_datetime = 2020-02-25 06:00:00 
         * )
         * */ 
        if( $result['start_datetime'] > $result['end_datetime'] ) {
            $result['end_datetime'] = add_days_to_timestamp( $result['end_datetime'], 1 );
        }


        /**
         *  If Start and End Flexy is valid, checks for additional condition.
         */
        if( is_valid ( $result['start_flexy_datetime'] ) && is_valid( $result['end_flexy_datetime'] ) ) 
        {
            /**
             * If the end_flexy_datetime is less than start_flexy_datetime, adds additional 1 day on end_flexy_datetime (For Nightshift Overlapped-Schedule)
             *  (Ex. If 
             *          end_flexy_datetime = 2020-02-24 08:00:00 & 
             *          start_flexy_datetime = 2020-02-24 23:00:00, 
             *      sets 
             *          end_datetime = 2020-02-25 08:00:00
             * )
             * */ 
            if( $result['end_flexy_datetime'] < $result['start_flexy_datetime'] ) {
                $result['end_flexy_datetime'] = add_days_to_timestamp( $result['end_flexy_datetime'], 1 );
            }

            /**
             * If the start_flexy_datetime is less than start_datetime, adds additional 1 day on start_flexy_datetime & end_flexy_datetime (For Nightshift Overlapped-Schedule)
             *  (Ex. If 
             *          start_datetime       = 2020-02-24 21:00:00 &
             *          end_datetime         = 2020-02-24 06:00:00 &
             *          start_flexy_datetime = 2020-02-24 01:00:00 & 
             *          end_flexy_datetime   = 2020-02-24 10:00:00 & 
             *      sets  
             *          start_flexy_datetime = 2020-02-25 01:00:00 
             *          end_flexy_datetime   = 2020-02-25 10:00:00 
             * )
             * */ 
            if( $result['start_flexy_datetime'] < $result['start_datetime'] ) {
                $result['start_flexy_datetime'] = add_days_to_timestamp( $result['start_flexy_datetime'], 1 );
                $result['end_flexy_datetime']   = add_days_to_timestamp( $result['end_flexy_datetime'], 1 );
            }
        }

        return $result;
    }


    

    ########################################################################

    /**
     *  Relationships
     */

    /**
     * belongsTo Relationship for Schedule model
     */
    public function schedule(){
        return $this->belongsTo(Schedule::class);
    }



}
