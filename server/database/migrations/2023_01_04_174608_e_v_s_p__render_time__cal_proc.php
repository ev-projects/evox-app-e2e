<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

class EVSPRenderTimeCalProc extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        //
        DB::unprepared("
        CREATE  PROCEDURE EVSP_RenderTime_Cal(
            IN IP_LoginDate DateTime,
            IN IP_UserId BIGINT,
            IN IP_TimeLog VARCHAR(20),
            OUT outdtrtype varchar(20),
            OUT totalrh DECIMAL(10,2),
            OUT totalrh_overlapp DECIMAL(10,2)
            
        )
        BEGIN 
        DECLARE rendered_hours integer DEFAULT 0;
        DECLARE rendered_hours_overlapped integer DEFAULT 0;
        DECLARE rendered_hrs DECIMAL(10,2) DEFAULT 0.00;
        DECLARE rendered_hrs_overlapped DECIMAL(10,2) DEFAULT 0.00;
        DECLARE actual_time_start_datetime integer DEFAULT 0;
        DECLARE actual_time_end_datetime integer DEFAULT 0;
        DECLARE expected_work_start_datetime integer;
        DECLARE expected_work_end_datetime integer;
        DECLARE getrequiredtime integer DEFAULT 0;
        DECLARE break_start_datetime integer;
        DECLARE break_end_datetime integer;
        DECLARE getRequiredHalfDayTime integer;
        DECLARE rendered_hours_break_time integer;
        DECLARE dtr_type varchar(20);
        DECLARE v_dtr_id bigint;
         DECLARE v_timeid bigint;
         DECLARE v_start_datetime BIGINT;
         DECLARE v_end_datetime bigint;
         DECLARE v_break_time bigint;
         DECLARE v_start_flexy_datetime bigint;
         DECLARE v_source_type_tagging varchar(100);
         DECLARE v_is_rest_day INT;
         DECLARE v_time_out bigint;
         DECLARE v_end_flexy_datetime bigint;
         DECLARE timelog varchar(20);
         SET totalrh = 0;
         SET totalrh_overlapp = 0;
         SET timelog=IP_TimeLog;
         -- Select time_difference INTO timelog from utc_timelog where id IN (Select country_id FROM users Where id = IP_UserId);
        -- Select timelog;
         -- Select data for the particular user id and date
         -- SELECT id,time_in,start_datetime,end_datetime,break_time,start_flexy_datetime,source_type_tagging,is_rest_day,time_out,end_flexy_datetime
        -- SELECT id,(time_in+9000),(start_datetime+9000),(end_datetime+9000),break_time,(start_flexy_datetime+9000),source_type_tagging,is_rest_day,(time_out+9000),(end_flexy_datetime+9000)
        SELECT id,UNIX_TIMESTAMP(CONVERT_TZ(FROM_UNIXTIME(time_in), @@session.time_zone, timelog )),
        UNIX_TIMESTAMP(CONVERT_TZ(FROM_UNIXTIME(start_datetime), @@session.time_zone, timelog )),
        UNIX_TIMESTAMP(CONVERT_TZ(FROM_UNIXTIME(end_datetime), @@session.time_zone, timelog )),
        break_time,
        UNIX_TIMESTAMP(CONVERT_TZ(FROM_UNIXTIME(start_flexy_datetime), @@session.time_zone, timelog )),
        source_type_tagging,is_rest_day,
        UNIX_TIMESTAMP(CONVERT_TZ(FROM_UNIXTIME(time_out), @@session.time_zone, timelog )),
        UNIX_TIMESTAMP(CONVERT_TZ(FROM_UNIXTIME(end_flexy_datetime), @@session.time_zone, timelog ))
         into v_dtr_id,v_timeid,v_start_datetime,v_end_datetime,v_break_time,v_start_flexy_datetime,v_source_type_tagging,v_is_rest_day,
         v_time_out,v_end_flexy_datetime
         FROM dtrs WHERE user_id=IP_UserId and date=IP_LoginDate;
        
        SET dtr_type = get_dtrtype(v_dtr_id,v_source_type_tagging,v_is_rest_day);
        
        IF (v_timeid IS NOT NULL and v_time_out IS NOT NULL and v_start_datetime IS NOT NULL and v_end_datetime IS NOT NULL) THEN
        # Get Required Time
        IF(v_start_datetime IS NOT NULL and v_end_datetime IS NOT NULL)THEN
         SET getrequiredtime = v_end_datetime - v_start_datetime;
        ELSE
        SET getrequiredtime = 0;
        END IF;
        # Responsible for setting the expected Work Time In and Out base on the Schedule and Time In & Out of the DTR instance.
        IF(v_start_flexy_datetime IS NOT NULL and v_end_flexy_datetime IS NOT NULL) THEN
        
         IF(v_timeid <= v_start_datetime) THEN
            SET expected_work_start_datetime = v_start_datetime;
            SET expected_work_end_datetime = v_end_datetime;
          ELSEIF((v_start_flexy_datetime IS NOT NULL and v_end_flexy_datetime IS NOT NULL and v_timeid > v_start_datetime and v_timeid < v_start_flexy_datetime) or (v_start_flexy_datetime IS NOT NULL and v_end_flexy_datetime IS NOT NULL and v_timeid >= v_start_datetime)) THEN
          SET expected_work_start_datetime = v_timeid;
          SET expected_work_end_datetime = v_timeid + getrequiredtime;
           IF(v_end_flexy_datetime < v_timeid + getrequiredtime)THEN
             SET expected_work_end_datetime = v_end_flexy_datetime;
             END IF;
          ELSEIF(v_timeid >= v_start_flexy_datetime) THEN
            SET expected_work_start_datetime = v_start_flexy_datetime;
            SET expected_work_end_datetime = v_end_flexy_datetime;
          END IF;
                 
         ELSE
        SET expected_work_start_datetime = v_start_datetime;
        SET expected_work_end_datetime = v_end_datetime;
         END IF ;
         
        #Calculate actualtime
         # If the Time-In is BEFORE or EQUAL the Expected Work Start-Datetime, use the Expected Work Start-Datetime.
        IF(v_timeid <= expected_work_start_datetime)THEN
          SET actual_time_start_datetime = expected_work_start_datetime;
          ELSE
          SET actual_time_start_datetime = v_timeid;
        END IF;
          # If the Time-Out is BEFORE or EQUAL the Expected Work End-Datetime, use the DTR's Time-Out.
        IF(v_time_out <= expected_work_end_datetime)THEN
            SET actual_time_end_datetime = v_time_out;
        ELSE
            SET actual_time_end_datetime = expected_work_end_datetime;
        END IF;
        
        # Set Break time
        SET getRequiredHalfDayTime = (getrequiredtime / 2) - (v_break_time / 2);
        SET break_start_datetime = expected_work_start_datetime + ((getrequiredtime / 2) - (v_break_time / 2));
        
        SET break_end_datetime = break_start_datetime + v_break_time;
        
        # if overlapped 
        IF((v_timeid IS NOT NULL and v_time_out IS NOT NULL) and timestamp_to_date(v_time_out) <> timestamp_to_date(add_day_to_timestamp(IP_LoginDate, 1)) and timestamp_to_date(actual_time_start_datetime) =  timestamp_to_date(actual_time_end_datetime))THEN
         # if not overlapped
        SET rendered_hours = (break_start_datetime - actual_time_start_datetime) + (actual_time_end_datetime - break_end_datetime);
        
        
                
        ELSE
        IF(actual_time_start_datetime < add_day_to_timestamp(IP_LoginDate, 1))THEN 
        # Gets the Rendered Hours for the Day 1 of the DTR. (Actual Start Datetime to Day 2 12AM)
          SET rendered_hours = add_day_to_timestamp(IP_LoginDate, 1) - actual_time_start_datetime;
        # Gets the Rendered Hours for the Day 2 of the DTR. (Day 2 12AM to Actual End Datetime)
          SET rendered_hours_overlapped = actual_time_end_datetime - add_day_to_timestamp(IP_LoginDate, 1);
          
        
        ELSE
        # Gets the Rendered Hours for the Day 2 of the DTR. (Actual Start Datetime to Actual End Datetime)
          SET rendered_hours_overlapped = actual_time_end_datetime - actual_time_start_datetime;
        END IF;
        # If the Break Start and End Date is NOT the same day, compute for Night Diff. Break Time for the Rendered Hours and Rendered Hours Overlapped.
         IF(timestamp_to_date(break_start_datetime) != timestamp_to_date(break_end_datetime))THEN
        # Deduct the computed Break Times respectively.
          SET rendered_hours = rendered_hours - (add_day_to_timestamp(IP_LoginDate, 1) - break_start_datetime);
          SET rendered_hours_overlapped  = rendered_hours_overlapped - (break_end_datetime - add_day_to_timestamp(IP_LoginDate, 1));
         
          
         # If the Break Start and End Date is the same day, compute for Rendered Hours Break Time and deduct it on the correct Date.
         ELSE
        # Gets the total Break Time.
          SET rendered_hours_break_time = break_end_datetime - break_start_datetime;
        # If the DTR has Overlapped Time Logs AND Time-Out has the SAME DAY from the Break Date, deduct it from the Rendered Hours Overlapped (Day 2)
        IF((v_timeid IS NOT NULL and v_time_out IS NOT NULL) and timestamp_to_date(v_time_out) = timestamp_to_date(add_day_to_timestamp(IP_LoginDate, 1)) and timestamp_to_date(v_time_out) = timestamp_to_date(break_start_datetime))THEN
        
           SET rendered_hours_overlapped  = rendered_hours_overlapped - rendered_hours_break_time;
        # If the Time-In has the SAME DAY from the Break Date, deduct it from the Rendered Hours. (Day 1)
        ELSEIF(timestamp_to_date(v_timeid) = timestamp_to_date(break_start_datetime))THEN
        
           SET rendered_hours = rendered_hours - rendered_hours_break_time;
         
           END IF;
        END IF;
        END IF;
        
        
        
        
        
        IF(rendered_hours < 0 or rendered_hours > getrequiredtime)THEN
           SET rendered_hours = 0;
        END IF;
        IF(rendered_hours_overlapped < 0 or rendered_hours > getrequiredtime)THEN
           SET rendered_hours_overlapped = 0;
        END IF;
        IF(rendered_hours > 0  or rendered_hours_overlapped > 0)THEN
        
        SET rendered_hrs = rendered_hours / 3600;
        SET rendered_hrs_overlapped = rendered_hours_overlapped / 3600;
        
         CREATE Temporary Table Rend_Type_Value
        (
            dtrtype varchar(100),
            renderedhrs DECIMAL(10,2) DEFAULT 0.00,
         renderedhrsoverlapped DECIMAL(10,2) 
        );
        
        INSERT INTO Rend_Type_Value
        
        SELECT dtr_type,rendered_hrs,rendered_hrs_overlapped;
        
        Select dtrtype,renderedhrs,renderedhrsoverlapped INTO outdtrtype,totalrh,totalrh_overlapp From Rend_Type_Value;
        drop temporary table Rend_Type_Value;
        END IF;
        END IF; 
        END");
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        //
        DB::unprepared("DROP PROCEDURE 'EVSP_RenderTime_Cal'");
    }
}
