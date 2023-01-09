<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

class EVSPOverTimeCalProc extends Migration
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
        CREATE  PROCEDURE EVSP_OverTime_Cal(
            IN IP_LoginDate DateTime,
            IN IP_UserId BIGINT,
            IN IP_TimeLog VARCHAR(20),
            OUT outdtrtype varchar(20),
            OUT ovhr decimal(10,2),
            OUT ovhr_nightdiff decimal(10,2)
        )
        BEGIN
        DECLARE overtime integer DEFAULT 0;
        DECLARE overtime_night_diff integer DEFAULT 0;
        DECLARE overtime_underlapped integer DEFAULT 0;
        DECLARE overtime_night_diff_underlapped integer DEFAULT 0;
        DECLARE overtime_overlapped integer DEFAULT 0;
        DECLARE overtime_night_diff_overlapped integer DEFAULT 0;
        DECLARE overtime_start_datetime integer DEFAULT 0;
        DECLARE overtime_end_datetime integer DEFAULT 0;
        DECLARE actual_time_start_datetime integer DEFAULT NULL;
        DECLARE actual_time_end_datetime integer DEFAULT NULL;
        DECLARE expected_work_start_datetime integer;
        DECLARE expected_work_end_datetime integer;
        DECLARE getrequiredtime integer DEFAULT 0;
        DECLARE overtime_count integer DEFAULT 0;
        DECLARE overtime_type varchar(25);
        DECLARE start_time integer DEFAULT 0;
        DECLARE amount integer DEFAULT 0;
        DECLARE date_to_compare integer;
        DECLARE night_diff_start_datetime integer DEFAULT 0;
        DECLARE night_diff_end_datetime integer DEFAULT 0;
        DECLARE totalovertime  DECIMAL(10,2)  DEFAULT 0.00;
        DECLARE totalovertimenightdiff  DECIMAL(10,2) DEFAULT 0.00;
        DECLARE sectohrs DECIMAL(10,2);
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
         SET ovhr =0;
         SET ovhr_nightdiff =0;
         
         SET timelog=IP_TimeLog;
         -- Select data for the particular user id and date
         -- SELECT id,time_in,start_datetime,end_datetime,break_time,start_flexy_datetime,source_type_tagging,is_rest_day,time_out,end_flexy_datetime
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
           --  insert into test3 (name,valuee) VALUES ('exxx',expected_work_end_datetime);
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
         
         -- INSERT INTO test3(name,valuee)VALUES('exworktime',expected_work_start_datetime);
         -- INSERT INTO test3(name,valuee)VALUES('expected_work_end_datetime',expected_work_end_datetime);
        -- Calculate actualtime
         --  If the Time-In is BEFORE or EQUAL the Expected Work Start-Datetime, use the Expected Work Start-Datetime.
        IF(v_timeid <= expected_work_start_datetime)THEN
          SET actual_time_start_datetime = expected_work_start_datetime;
          ELSE
          SET actual_time_start_datetime = v_timeid;
        END IF;
          --  If the Time-Out is BEFORE or EQUAL the Expected Work End-Datetime, use the DTR's Time-Out. 
        IF(v_time_out <= expected_work_end_datetime)THEN
         
          SET actual_time_end_datetime = v_time_out;
          -- insert into test3 (name,valuee) VALUES ('accccc',actual_time_end_datetime);
          ELSE
           SET actual_time_end_datetime = expected_work_end_datetime;
          --  insert into test3 (name,valuee) VALUES ('accccc',actual_time_end_datetime);
        END IF;
        SET overtime_type = (SELECT overtimes.type FROM overtimes WHERE overtimes.user_id = IP_UserId AND overtimes.date = IP_LoginDate AND overtimes.status = 'approved' order by overtimes.id desc LIMIT 1);
        SET overtime_count = (SELECT COUNT(*) FROM overtimes WHERE overtimes.user_id = IP_UserId AND overtimes.date = IP_LoginDate AND overtimes.status = 'approved');
        SET amount = (SELECT overtimes.amount FROM overtimes WHERE overtimes.user_id = IP_UserId AND overtimes.date = IP_LoginDate AND overtimes.status = 'approved' order by overtimes.id desc LIMIT 1);
        -- INSERT INTO test3(name,valuee)VALUES('overtime_type',overtime_type);
        -- If the Overtime Type is a Pre-Overtime.
           IF(overtime_type = 'pre_overtime')THEN
         --  INSERT INTO test3(name,valuee)VALUES('pre','2');
                IF(ISNULL(actual_time_start_datetime))THEN
                SET start_time = v_start_datetime;
                ELSE 
                SET start_time = actual_time_start_datetime;
                END IF;
         --  Set the Overtime Start-Datetime by subtracting the Overtime Amount from the Actual Time Start-Datetime.
            SET overtime_start_datetime = start_time - amount;
        -- Set the Overtime End-Datetime using the Actual Time Start-Datetime.
            SET overtime_end_datetime   = start_time;
        --  Sets the Date to compare to 12AM of the current Day
            SET date_to_compare = add_day_to_timestamp(IP_LoginDate,0);
        -- If the Overtime Type is a Post-Overtime.
         
        
        ELSEIF(overtime_type = 'post_overtime')THEN 
             IF(ISNULL(actual_time_end_datetime))THEN
             SET start_time = v_end_datetime;
             ELSE
             SET start_time =actual_time_end_datetime;
             SET overtime_start_datetime = start_time;
             SET overtime_end_datetime   = start_time + amount;
         --  Sets the Date to compare to 12AM of the Next Day
             SET date_to_compare = add_day_to_timestamp(IP_LoginDate, 1);
             
          END IF;
        
          IF(add_time_to_timestamp(IP_LoginDate,'06:00') < overtime_start_datetime)THEN
        
           SET night_diff_start_datetime = add_time_to_timestamp(IP_LoginDate, '22:00');
           SET night_diff_end_datetime = add_time_to_timestamp(add_day_to_timestamp(IP_LoginDate, 1),'06:00');
        
          ELSE
        
           SET night_diff_start_datetime = add_time_to_timestamp(subtract_days_from_timestamp(IP_LoginDate, 1),'22:00' );
           SET night_diff_end_datetime = add_time_to_timestamp(IP_LoginDate,'06:00');
            
        END IF;
        
        --  If Overtime Start and End-Datetime is within the same Date.
        
              
         IF(timestamp_to_date(overtime_start_datetime) = IP_LoginDate and
                            timestamp_to_date(overtime_start_datetime) = timestamp_to_date(overtime_end_datetime))THEN
        --  Compute the Overtime Night Diff. of Day 1 by setting the (Time Start = Overtime Start-Datetime) and (Time End = Overtime End-Datetime).
            -- INSERT INTO test3(name,valuee)VALUES('post','6');
                          SET overtime_night_diff =get_total_night_diff(overtime_start_datetime,overtime_end_datetime,0,0,night_diff_start_datetime,night_diff_end_datetime);
        --  Compute the Overtime of Day 1 by getting the difference between Overtime Start and End-Datetime and subtracting the Overtime Night Diff. from the total.
                          SET overtime = (overtime_end_datetime - overtime_start_datetime) - overtime_night_diff;
        ELSE 
        --  Discern if the Overtime Start-Datetime is BEFORE the Date to Compare, compute for Overtime, Overtime Night Diff., Overtime Night Diff. Overlapped, and Overtime Overlapped.
           IF(overtime_start_datetime < date_to_compare)THEN
           
        --  If the Overtime Request is a Pre-Overtime AND the Overtime Start-Datetime started before the Current DTR Date (Previous Day), Compute for Underlapped Details. 
           IF(overtime_type = 'pre_overtime' and
          overtime_start_datetime < add_day_to_timestamp(IP_LoginDate,0))THEN
          
             
        --  Compute the Overtime Night Diff. Underlapped of Day 0 by setting the getting the difference between Overtime Start-Datetime AND 12 Midnight of the Next Day.
                    SET overtime_night_diff_underlapped =get_total_night_diff(overtime_start_datetime,date_to_compare,0,0,night_diff_start_datetime,night_diff_end_datetime);
        --  Compute the Overtime Underlapped of Day 0 by getting the difference between Overtime Start and End-Datetime and subtracting the Overtime Night Diff. from the total.
                    SET overtime_underlapped = (date_to_compare - overtime_start_datetime) - overtime_night_diff_underlapped;
        --  Compute the Overtime Night Diff. of Day 1 by getting the difference between 12 Midnight of the Next Day AND Overtime End-Datetime.
                    SET overtime_night_diff =get_total_night_diff(date_to_compare,overtime_end_datetime,0,0,night_diff_start_datetime,night_diff_end_datetime);
        --  Compute the Overtime  of Day 1 by getting the difference between Overtime Start and End-Datetime and subtracting the Overtime Night Diff. from the total.
                  SET overtime = (overtime_end_datetime - date_to_compare) - overtime_night_diff;
        ELSE
         
        --  Compute the Overtime Night Diff. of Day 1 by setting the getting the difference between Overtime Start-Datetime AND 12 Midnight of the Next Day.
              SET overtime_night_diff = get_total_night_diff(overtime_start_datetime,date_to_compare,0,0,night_diff_start_datetime,night_diff_end_datetime );
        --  Compute the Overtime of Day 1 by getting the difference between Overtime Start and End-Datetime and subtracting the Overtime Night Diff. from the total.
              SET overtime = (date_to_compare - overtime_start_datetime) - overtime_night_diff;
        --  Compute the Overtime Night Diff. Overlapped of Day 2 by getting the difference between 12 Midnight of the Next Day AND Overtime End-Datetime.
             SET overtime_night_diff_overlapped = get_total_night_diff(date_to_compare,overtime_end_datetime,0,0,night_diff_start_datetime,night_diff_end_datetime );
        --  Compute the Overtime Overlapped of Day 2 by getting the difference between Overtime Start and End-Datetime and subtracting the Overtime Night Diff. from the total.
             SET overtime_overlapped = (overtime_end_datetime - date_to_compare) - overtime_night_diff_overlapped;
        END IF;
        --  Discern if the Time In is BEYOND the 12AM of the Next Day, compute for Overtime Night Diff. Overlapped and Overtime Overlapped only.
               ELSE                       
        --  Compute the Overtime Night Diff. Overlapped of Day 2 by getting the difference between 12 Midnight of the Next Day AND Overtime End-Datetime.
              SET overtime_night_diff_overlapped = get_total_night_diff(overtime_start_datetime,overtime_end_datetime,0,0,night_diff_start_datetime,night_diff_end_datetime);
        --  Compute the Overtime Overlapped of Day 2 by getting the difference between Overtime Start and End-Datetime and subtracting the Overtime Night Diff. from the total.
             SET overtime_overlapped = (overtime_end_datetime - overtime_start_datetime) - overtime_night_diff_overlapped;
             
         END IF;
        
        END IF;
        
          END IF;
          
          IF(overtime <= 0 )THEN
          SET overtime = 0;
          ELSE
          SET sectohrs = overtime / 3600;
          SET totalovertime= totalovertime + sectohrs;
          
          END IF;
          IF(overtime_night_diff <= 0 )THEN
          SET overtime_night_diff = 0;
          ELSE
           SET sectohrs = overtime_night_diff / 3600;
           SET totalovertimenightdiff= totalovertimenightdiff + sectohrs;
           
          END IF;
          IF(overtime_night_diff_underlapped <= 0 )THEN
          SET overtime_night_diff_underlapped = 0;
          ELSE
           SET sectohrs = overtime_night_diff_underlapped / 3600;
           SET totalovertimenightdiff= totalovertimenightdiff + 
           sectohrs;
           
          END IF;
           IF(overtime_underlapped <= 0 )THEN
          SET overtime_underlapped = 0;
          ELSE 
          SET sectohrs = overtime_underlapped / 3600;
          SET totalovertimenightdiff= totalovertimenightdiff + sectohrs;
          
          END IF;
           IF(overtime_night_diff_overlapped <= 0 )THEN
          SET overtime_night_diff_overlapped = 0;
          ELSE
          SET sectohrs = overtime_night_diff_overlapped / 3600;
          SET totalovertimenightdiff= totalovertimenightdiff + sectohrs;
          
          END IF;
           IF(overtime_overlapped <= 0 )THEN
          SET overtime_overlapped = 0;
          ELSE
          SET sectohrs = overtime_overlapped / 3600;
          SET totalovertime= totalovertime + sectohrs;
          
          END IF;
          CREATE Temporary Table Over_Type_Value
        (
            dtrtype varchar(100),
            totalovertime DECIMAL(10,2) DEFAULT 0.00,
         totalovertimenightdiff DECIMAL(10,2) 
        );
        
        INSERT INTO Over_Type_Value
        SELECT dtr_type,totalovertime,totalovertimenightdiff;
        
        select dtrtype,totalovertime,totalovertimenightdiff INTO outdtrtype,ovhr,ovhr_nightdiff FROM Over_Type_Value;
        
        Drop temporary table Over_Type_Value;
        
        
        
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
        DB::unprepared("DROP PROCEDURE EVSP_OverTime_Cal");
    }
}
