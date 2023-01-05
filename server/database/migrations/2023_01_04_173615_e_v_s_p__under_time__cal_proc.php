<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

class EVSPUnderTimeCalProc extends Migration
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
        CREATE PROCEDURE EVSP_UnderTime_Cal(
            IN IP_LoginDate DateTime,
            IN IP_UserId BIGINT,
            IN IP_TimeLog VARCHAR(20),
            OUT ut decimal(10,2)
        )
        BEGIN
        DECLARE expected_time_out integer DEFAULT 0;
        DECLARE expected_time_in integer;
        DECLARE half_day integer;
        DECLARE undertime integer DEFAULT 0;
        DECLARE leavecount integer DEFAULT 0;
        DECLARE allowpolicy integer DEFAULT 0;
        DECLARE holidaycount integer DEFAULT 0;
        DECLARE leaveamount integer DEFAULT 0;
        DECLARE timeoff_time integer DEFAULT 0;
        DECLARE timeoff_amount float DEFAULT 0.0;
        DECLARE secondstohours float(10,2) DEFAULT 0.0;
        DECLARE renderedtime integer DEFAULT 0;
        DECLARE requiredtime integer DEFAULT 0;
        DECLARE v_dtr_id bigint;
        DECLARE v_timeid bigint;
        DECLARE v_start_datetime BIGINT;
        DECLARE v_end_datetime bigint;
        DECLARE v_break_time bigint;
        DECLARE v_start_flexy_datetime bigint;
        DECLARE v_timeout bigint;
         DECLARE v_end_flexy_datetime bigint;
         DECLARE timelog varchar(20);
         SET ut = 0;
         SET timelog=IP_TimeLog;
        -- Select time_difference INTO timelog from utc_timelog where id IN (Select country_id FROM users Where id = IP_UserId);
         -- Select data for the particular user id and date
        -- SELECT id,time_in,start_datetime,end_datetime,break_time,start_flexy_datetime,time_out,end_flexy_datetime
        SELECT id,UNIX_TIMESTAMP(CONVERT_TZ(FROM_UNIXTIME(time_in), @@session.time_zone, timelog )),
        UNIX_TIMESTAMP(CONVERT_TZ(FROM_UNIXTIME(start_datetime), @@session.time_zone, timelog )),
        UNIX_TIMESTAMP(CONVERT_TZ(FROM_UNIXTIME(end_datetime), @@session.time_zone, timelog )),
        break_time,
        UNIX_TIMESTAMP(CONVERT_TZ(FROM_UNIXTIME(start_flexy_datetime), @@session.time_zone, timelog )),
        UNIX_TIMESTAMP(CONVERT_TZ(FROM_UNIXTIME(time_out), @@session.time_zone, timelog )),
        UNIX_TIMESTAMP(CONVERT_TZ(FROM_UNIXTIME(end_flexy_datetime), @@session.time_zone, timelog ))
         into v_dtr_id,v_timeid,v_start_datetime,v_end_datetime,v_break_time,v_start_flexy_datetime,v_timeout,v_end_flexy_datetime
         FROM dtrs WHERE user_id=IP_UserId and date=IP_LoginDate;
        
        -- Fetech count of allowpolicy
        SET allowpolicy = (SELECT COUNT(*) FROM dtr_policies WHERE dtr_policies.dtr_id = v_dtr_id AND dtr_policies.policy='allow_undertime' AND dtr_policies.value='1');
        
        
        -- Fetech count of holiday 
        SET holidaycount = (SELECT COUNT(*) FROM dtr_holidays WHERE dtr_holidays.dtr_id = v_dtr_id);
        
        IF (v_timeid IS NOT NULL AND v_timeout IS NOT NULL AND v_start_datetime IS NOT NULL AND v_end_datetime IS NOT NULL) THEN
         IF (holidaycount < 1) THEN
           IF(allowpolicy >= 1)THEN
        
            SET leaveamount = (SELECT leaves.amount FROM leaves where leaves.status = 'approved' AND (leaves.type <> 'Unpaid Leave'  OR leaves.type <> 'Work from home' OR leaves.type <> 'MGC Unpaid Call Out Days') AND leaves.dtr_id=v_dtr_id);  
        SET leavecount = (SELECT COUNT(*) FROM leaves where leaves.status = 'approved' AND (leaves.type <> 'Unpaid Leave'  OR leaves.type <> 'Work from home' OR leaves.type <> 'MGC Unpaid Call Out Days') AND leaves.dtr_id=v_dtr_id);
        IF (leavecount > 0) THEN
        
        Set timeoff_time =(leaveamount * (v_end_datetime - v_start_datetime - v_break_time ));
        Set timeoff_amount = leaveamount;
        END IF;
        
        IF(v_timeid IS NOT NULL AND v_timeout IS NOT NULL) THEN
           SET renderedtime = v_timeout - v_timeid;
        ELSE
        SET renderedtime = 0;
        END IF;
        IF(v_start_datetime IS NOT NULL AND v_end_datetime IS NOT NULL) THEN
        
           SET requiredtime = v_end_datetime - v_start_datetime;
        ELSE
        SET requiredtime = 0;
        END IF;
        IF(v_start_flexy_datetime IS NULL AND  v_end_flexy_datetime IS NULL) THEN
         IF(v_timeout < v_end_datetime)THEN
        
            SET undertime = v_end_datetime - v_timeout;
         END IF;
         ELSE
         -- If the Time-In is BEFORE or EQUAL the Start-Datetime
         IF(v_timeid <= v_start_datetime) THEN
           SET expected_time_out = v_end_datetime;
         IF(v_timeout < expected_time_out )THEN
        
           SET undertime = expected_time_out - v_timeout;
         END IF;
         --  If the Time-In is BETWEEN the Start-Datetime and Start-Flexy-Datetime
         ELSEIF((v_start_flexy_datetime IS NOT NULL AND v_end_flexy_datetime IS NOT NULL AND v_timeid > v_start_datetime AND v_timeid < v_start_flexy_datetime) OR (ISNULL(v_start_flexy_datetime) AND ISNULL(v_end_flexy_datetime) AND v_timeid >= v_start_datetime)) THEN
         IF(requiredtime > renderedtime)THEN
        
            SET undertime = requiredtime - renderedtime;
          END IF;
          --  If the Time-In is AFTER or EQUAL the Start-Flexy-Datetime
         ELSEIF(v_timeid >= v_start_flexy_datetime) THEN
           SET expected_time_out = v_end_flexy_datetime; 
         
        --  If the Time-Out is BEFORE the Expected Time-Out, compute for Undertime.
            IF(v_timeout < expected_time_out )THEN
        
               SET undertime = expected_time_out - v_timeout;
            END IF;
          END IF;
         END IF;
        
         --  If the Time-off from the Leave is on Half-day (0.5)
          IF(timeoff_amount = 0.5)THEN
        --  If the Rendered Time is LESSER than the Half-day Time-off, compute for Undertime.
          IF(renderedtime <= timeoff_time) THEN
        
            SET undertime = timeoff_time - renderedtime;
        --  If not, set the Undertime default to zero (For cases like, Timeoff = 4:00 Hrs & Rendered Time = 4:01 Hrs)
        --  No undertime for exceeded Rendered Time.
          ELSE
        
            SET undertime = 0;
        END IF;
        --  If the Time-off from the Leave is Wholeday or Non-existing, compute for the Undertime.
        ELSE
        
            SET undertime = undertime - timeoff_time;
        END IF;
        
        --  Condition for breaktime deduction on undertime
         SET half_day = (requiredtime - v_break_time) / 2;
           IF(undertime >= half_day AND undertime <= (half_day + v_break_time))THEN
         
             SET undertime = undertime - (undertime - half_day);
           ELSEIF((half_day + v_break_time) < undertime)THEN
         
                SET undertime = undertime - v_break_time;
        END IF;
        --  Double checks the Validity of the Computed Undertime. If not valid, set it to Default value (0)
        --  1. If Undertime LESS THAN 0 (Negative values)
        --  2. If Undertime is GREATHER THAN 8 hours.
        
        IF(undertime < 0 OR undertime > requiredtime) THEN
        
           SET undertime = 0;
        END IF;
        IF(undertime > 0)THEN
        
         SET secondstohours = undertime / 3600;
         
        END IF;
        
        Select secondstohours into ut;
           END IF; 
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
        DB::unprepared("DROP PROCEDURE 'EVSP_UnderTime_Cal'");
    }
}
