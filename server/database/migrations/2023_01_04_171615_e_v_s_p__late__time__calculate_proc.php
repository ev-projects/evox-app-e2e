<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

class EVSPLateTimeCalculateProc extends Migration
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
        CREATE  PROCEDURE EVSP_Late_Time_Calculate(
            IN LoginDate DateTime,
            IN UserId BIGINT,
            IN IP_TimeLog VARCHAR(20),
            OUT totallate decimal(10,2)
        )
        BEGIN
        -- Declaring required variables 
         DECLARE expected_time_in integer;
         DECLARE late integer DEFAULT 0;
         DECLARE leavecount integer DEFAULT 0;
         DECLARE allowpolicy integer DEFAULT 0;
         DECLARE holidaycount integer DEFAULT 0;
         DECLARE leaveamount integer DEFAULT 0;
         DECLARE timeoff_time integer DEFAULT 0;
         DECLARE timeoff_amount float DEFAULT 0.0;
         DECLARE latehours float DEFAULT 0.0;
         DECLARE v_dtr_id bigint;
         DECLARE v_timeid bigint;
         DECLARE v_start_datetime BIGINT;
         DECLARE v_end_datetime bigint;
         DECLARE v_break_time bigint;
         DECLARE v_start_flexy_datetime bigint;
         DECLARE timelog varchar(20);
         SET totallate =0;
         SET timelog=IP_TimeLog;
          -- Select time_difference INTO timelog from utc_timelog where id IN (Select country_id FROM users Where id = UserId);
         -- Select data for the particular user id and date
         -- SELECT id,(time_in + 9000),(start_datetime + 9000),(end_datetime + 9000),break_time,(start_flexy_datetime + 9000)
         SELECT id,UNIX_TIMESTAMP(CONVERT_TZ(FROM_UNIXTIME(time_in), @@session.time_zone, timelog )),
        UNIX_TIMESTAMP(CONVERT_TZ(FROM_UNIXTIME(start_datetime), @@session.time_zone, timelog )),
        UNIX_TIMESTAMP(CONVERT_TZ(FROM_UNIXTIME(end_datetime), @@session.time_zone, timelog )),
        break_time,
        UNIX_TIMESTAMP(CONVERT_TZ(FROM_UNIXTIME(start_flexy_datetime), @@session.time_zone, timelog ))
         into v_dtr_id,v_timeid,v_start_datetime,v_end_datetime,v_break_time,v_start_flexy_datetime FROM dtrs WHERE user_id=UserId and date=LoginDate;
        
        -- Fetech count of allowpolicy
        SET allowpolicy = (SELECT COUNT(*) FROM dtr_policies WHERE dtr_policies.dtr_id = v_dtr_id AND dtr_policies.policy='allow_late' AND dtr_policies.value='1');
        -- Fetech count of holiday 
        SET holidaycount = (SELECT COUNT(*) FROM dtr_holidays WHERE dtr_holidays.dtr_id = v_dtr_id);
        -- Condition for the null values
        IF (v_timeid IS NOT NULL AND v_start_datetime IS NOT NULL AND v_end_datetime IS NOT NULL) THEN
        -- Check whether it's a holiday, if it's holiday then calculation won't happen
         IF (holidaycount < 1) THEN
         -- Condition for the policy
           IF(allowpolicy >= 1)THEN
          
        SET leaveamount = (SELECT leaves.amount FROM leaves where leaves.status = 'approved' AND (leaves.type <> 'Unpaid Leave'  OR leaves.type <> 'Work from home' OR leaves.type <> 'MGC Unpaid Call Out Days') AND leaves.dtr_id=v_dtr_id);  
        SET leavecount = (SELECT COUNT(*) FROM leaves where leaves.status = 'approved' AND (leaves.type <> 'Unpaid Leave'  OR leaves.type <> 'Work from home' OR leaves.type <> 'MGC Unpaid Call Out Days') AND leaves.dtr_id=v_dtr_id);
        -- Validation for the half day leave
        IF (leavecount > 0) THEN
        Set timeoff_time =(leaveamount * (v_end_datetime - v_start_datetime - v_break_time ));
        Set timeoff_amount = leaveamount;
        END IF; -- end of half day validation
        -- Fetech the expected login time
        IF(v_start_flexy_datetime IS NOT NULL) THEN
        
           SET expected_time_in = v_start_flexy_datetime;
        END IF;
        IF(v_start_flexy_datetime IS  NULL) THEN
        
           SET expected_time_in = v_start_datetime;
        END IF; -- end of expected login time
        -- Calculate the late hours
        IF( v_timeid > expected_time_in )THEN
        
             SET late = v_timeid - expected_time_in;
        END IF;
        Set late = late - timeoff_time;
         IF(late < 0 OR late > 28800 OR timeoff_amount = 0.5)THEN
             SET late = 0;
        END IF;
        IF(late > 0)THEN
        
         SET latehours = ROUND((late / 3600), 2);
        END IF; -- end of lat hours calculation
        
        SELECT latehours INTO totallate;
         
           END IF; -- end of allow policy condition
          END IF;  -- end of holiday validation
         END IF; -- Condition for null values
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
        DB::unprepared("DROP PROCEDURE EVSP_Late_Time_Calculate");
    }
}
