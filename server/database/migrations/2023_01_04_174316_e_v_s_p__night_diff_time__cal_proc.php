<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

class EVSPNightDiffTimeCalProc extends Migration
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
        CREATE  PROCEDURE EVSP_NightDiffTime_Cal(
            IN IP_LoginDate DateTime,
            IN IP_UserId BIGINT,
            IN IP_TimeLog VARCHAR(20),
            OUT outdtrtype varchar(20),
            OUT nightdiffhr DECIMAL(10,2),
            OUT nightdiffhr_overlapp DECIMAL(10,2)
        )
        BEGIN 
        DECLARE expected_work_start_datetime integer;
        DECLARE expected_work_end_datetime integer;
        DECLARE night_diff integer DEFAULT 0;
        DECLARE night_diff_overlapped integer DEFAULT 0;
        DECLARE getrequiredtime integer DEFAULT 0;
        DECLARE night_diff_start_datetime integer DEFAULT 0;
        DECLARE night_diff_end_datetime integer DEFAULT 0;
        DECLARE break_start_datetime integer;
        DECLARE break_end_datetime integer;
        DECLARE getRequiredHalfDayTime integer;
        DECLARE night_diff_break_time integer;
        DECLARE night_diff_overlapped_break_time integer;
        DECLARE renderedtime integer DEFAULT 0;
        DECLARE night_diffhours DECIMAL(10,2) DEFAULT 0.00;
        DECLARE night_diff_overlappedhours DECIMAL(10,2) DEFAULT 0.00;
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
         SET nightdiffhr = 0;
         SET nightdiffhr_overlapp = 0;
         SET timelog=IP_TimeLog;
         -- Select time_difference INTO timelog from utc_timelog where id IN (Select country_id FROM users Where id = IP_UserId);
         -- Select data for the particular user id and date
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
        --  Get Required Time
        IF(v_start_datetime IS NOT NULL and v_end_datetime IS NOT NULL)THEN
         SET getrequiredtime = v_end_datetime - v_start_datetime;
        ELSE
        SET getrequiredtime = 0;
        END IF;
        --  Responsible for setting the expected Work Time In and Out base on the Schedule and Time In & Out of the DTR instance.
        IF(ISNULL(v_start_flexy_datetime) and ISNULL(v_end_flexy_datetime)) THEN
                 SET expected_work_start_datetime = v_start_datetime;
                SET expected_work_end_datetime = v_end_datetime;
         ELSE
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
         END IF ;
         
        
        IF(add_time_to_timestamp(IP_LoginDate,'06:00') < expected_work_start_datetime)THEN
           SET night_diff_start_datetime = add_time_to_timestamp(IP_LoginDate,'22:00');
           SET night_diff_end_datetime = add_time_to_timestamp(add_day_to_timestamp(IP_LoginDate, 1),'06:00');
          ELSE
           SET night_diff_start_datetime = add_time_to_timestamp(subtract_days_from_timestamp(IP_LoginDate, 1),'22:00' );
           SET night_diff_end_datetime = add_time_to_timestamp(IP_LoginDate,'06:00');
        END IF;
        
        -- Set Break time
        SET break_start_datetime = expected_work_start_datetime + ((getrequiredtime / 2) - (v_break_time / 2));
        SET break_end_datetime = break_start_datetime + v_break_time;
        
        -- IF Overlapped ELSE
        IF((v_timeid IS NOT NULL and v_time_out IS NOT NULL) and timestamp_to_date(v_time_out) = timestamp_to_date(add_day_to_timestamp(IP_LoginDate, 1)))THEN
        -- select timestamp_to_date(v_time_out);
        -- select timestamp_to_date(add_day_to_timestamp(IP_LoginDate, 1));
        IF(v_timeid < add_day_to_timestamp(IP_LoginDate, 1))THEN
        
        SET night_diff_overlapped = get_total_night_diff(add_day_to_timestamp(IP_LoginDate, 1),v_time_out,expected_work_start_datetime,expected_work_end_datetime,night_diff_start_datetime,night_diff_end_datetime);
        
        SET night_diff = get_total_night_diff(v_timeid,add_day_to_timestamp(IP_LoginDate, 1),expected_work_start_datetime,expected_work_end_datetime,night_diff_start_datetime,night_diff_end_datetime);
        ELSE 
        SET night_diff_overlapped = get_total_night_diff(v_timeid,v_time_out,expected_work_start_datetime,expected_work_end_datetime,night_diff_start_datetime,night_diff_end_datetime);
         END IF;
        ELSE
        SET night_diff = get_total_night_diff(v_timeid,v_time_out,expected_work_start_datetime,expected_work_end_datetime,night_diff_start_datetime,night_diff_end_datetime);
        END IF;
        IF(v_break_time IS NOT NULL and v_break_time > 0)THEN
        IF(v_timeid IS NOT NULL and v_time_out IS NOT NULL) THEN
             SET renderedtime = v_time_out - v_timeid;
        ELSE
        SET renderedtime = 0;
        END IF;
        
        SET getRequiredHalfDayTime = (getrequiredtime / 2) - (v_break_time / 2);
        
        IF(renderedtime > (getRequiredHalfDayTime + v_break_time))THEN
        
        
        
          --  If the Break Start and End Da te is NOT the same day, compute for Night Diff. Break Time for the Night Diff. and Overlapped Night Diff.
          IF(timestamp_to_date(break_start_datetime) != timestamp_to_date(break_end_datetime))THEN
         
        --  Compute Night Diff. Break Time for Day 1 by setting the (Time Start = Break Start-Datetime) and (Time End = 12 Midnight of the Next Day).
         SET night_diff_break_time = get_total_night_diff(break_start_datetime,add_day_to_timestamp(IP_LoginDate, 1),expected_work_start_datetime,expected_work_end_datetime,night_diff_start_datetime,night_diff_end_datetime);
        --  Compute Night Diff. Break Time for Day 2 by setting the (Time Start = 12 Midnight of the Next Day) and (Time End = Break End-Datetime).
        SET night_diff_overlapped_break_time = get_total_night_diff(add_day_to_timestamp(IP_LoginDate, 1),break_end_datetime,expected_work_start_datetime,expected_work_end_datetime,night_diff_start_datetime,night_diff_end_datetime);
        
        
        --  Deduct the computed Break Times respectively.
           SET  night_diff = night_diff - night_diff_break_time;
           SET  night_diff_overlapped  = night_diff_overlapped - night_diff_overlapped_break_time;
        --  If the Break Start and End Date is the same day, compute for Night Diff. Break Time and deduct it on the correct Date.
                            --  Break Start-Datetime will represent the Break Date.
        
        ELSE
        SET night_diff_break_time = get_total_night_diff(break_start_datetime,break_end_datetime,expected_work_start_datetime,expected_work_end_datetime,night_diff_start_datetime,night_diff_end_datetime);
        
        
        --  If the DTR has Overlapped Time Logs AND Time-Out has the SAME DAY from the Break Date, deduct it from the Night. Diff. Overlapped (Day 2)
        IF(((v_timeid IS NOT NULL and v_time_out IS NOT NULL) and (timestamp_to_date(v_time_out) = timestamp_to_date(add_day_to_timestamp(IP_LoginDate, 1)))) and (timestamp_to_date( v_time_out) = timestamp_to_date(break_start_datetime)))THEN
         SET night_diff_overlapped  = night_diff_overlapped - night_diff_break_time;
        --  else, deduct it from the Night Diff.
        ELSE
          SET night_diff = night_diff - night_diff_break_time;
           END IF;
          END IF;
         END IF;
        END IF;
        
        IF(night_diff < 0 or night_diff > 28800) THEN
           SET night_diff = 0;
        END IF;
        IF(night_diff_overlapped < 0 or night_diff_overlapped > 28800)THEN
          SET night_diff_overlapped = 0;
        END IF;
        IF(night_diff > 0)THEN
         SET night_diffhours = night_diff / 3600;
        
        END IF;
        IF(night_diff_overlapped > 0)THEN
         SET night_diff_overlappedhours = night_diff_overlapped / 3600;
          
        END IF;
        
          END IF;
        
          CREATE Temporary Table Night_Type_Value
        (
            dtrtype varchar(100),
            night_diffhours DECIMAL(10,2) DEFAULT 0.00,
            reg_night_diff_overlapp DECIMAL(10,2) 
        );
        
        INSERT INTO Night_Type_Value
        SELECT dtr_type,night_diffhours,night_diff_overlappedhours;
        
        -- select dtrtype,night_diffhours,night_diff_overlappedhours INTO outdtrtype,nightdiffhr,nightdiffhr_overlapp FROM Night_Type_Value;
        select dtrtype,night_diffhours,night_diff_overlappedhours INTO outdtrtype,nightdiffhr,nightdiffhr_overlapp FROM Night_Type_Value;
        Drop temporary table Night_Type_Value;
        
        
        
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
        DB::unprepared("DROP PROCEDURE 'EVSP_NightDiffTime_Cal'");
    }
}
