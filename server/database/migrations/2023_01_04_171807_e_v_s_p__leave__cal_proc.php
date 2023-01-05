<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

class EVSPLeaveCalProc extends Migration
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
        CREATE  PROCEDURE EVSP_Leave_Cal(
            IN IP_LoginDate DateTime,
            IN IP_UserId BIGINT,
            IN IP_TimeLog varchar(20),
             OUT totalleave decimal(10,2)
        )
        BEGIN 
        DECLARE v_dtr_id BIGINT;
        DECLARE v_Leave decimal(2,1) DEFAULT 0.0;
        DECLARE leavecount integer DEFAULT 0;
        DECLARE holidaycount integer DEFAULT 0;
        DECLARE absent integer DEFAULT 0;
        DECLARE dtr_type varchar(20);
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
         SET timelog=IP_TimeLog;
        
        SELECT id,UNIX_TIMESTAMP(CONVERT_TZ(FROM_UNIXTIME(time_in), @@session.time_zone, timelog )),
        UNIX_TIMESTAMP(CONVERT_TZ(FROM_UNIXTIME(start_datetime), @@session.time_zone, timelog )),
        UNIX_TIMESTAMP(CONVERT_TZ(FROM_UNIXTIME(end_datetime), @@session.time_zone, timelog )),
        break_time,
        UNIX_TIMESTAMP(CONVERT_TZ(FROM_UNIXTIME(start_flexy_datetime), @@session.time_zone, timelog)),
        source_type_tagging,is_rest_day,
        UNIX_TIMESTAMP(CONVERT_TZ(FROM_UNIXTIME(time_out), @@session.time_zone, timelog)),
        UNIX_TIMESTAMP(CONVERT_TZ(FROM_UNIXTIME(end_flexy_datetime), @@session.time_zone, timelog))
         into v_dtr_id,v_timeid,v_start_datetime,v_end_datetime,v_break_time,v_start_flexy_datetime,v_source_type_tagging,v_is_rest_day,
         v_time_out,v_end_flexy_datetime FROM dtrs WHERE user_id=IP_UserId and date=IP_LoginDate;
        SET dtr_type = get_dtrtype(v_dtr_id,v_source_type_tagging,v_is_rest_day);
         SET holidaycount = (SELECT COUNT(*) FROM dtr_holidays WHERE dtr_holidays.dtr_id = v_dtr_id);
         SET leavecount = (SELECT COUNT(*) FROM leaves where leaves.status = 'approved' AND (leaves.type <> 'Unpaid Leave'  OR leaves.type <> 'Work from home' OR leaves.type <> 'MGC Unpaid Call Out Days') AND leaves.dtr_id=v_dtr_id);
        SET absent = 0;
        
        SET totalleave = 0;
            Select id,time_in,time_out,start_datetime,end_datetime into v_dtr_id,v_timeid,v_time_out,v_start_datetime,v_end_datetime FROM dtrs Where date=IP_LoginDate and user_id=IP_UserId;
        IF (v_timeid IS NOT NULL and v_time_out IS NOT NULL and v_start_datetime IS NOT NULL and v_end_datetime IS NOT NULL) THEN 
        SET totalleave = 0;
        
        
            ELSE IF((v_timeid IS NULL AND v_time_out IS NULL) AND (v_start_datetime IS NOT NULL AND v_end_datetime IS NOT NULL) AND (leavecount <= 0) AND (holidaycount <= 0) AND dtr_type = 'reg' )THEN  
         
        SET totalleave = 0; 
          ELSE
          
            IF EXISTS (SELECT 1 FROM Leaves Where dtr_id=v_dtr_id and status='approved')
            THEN
           
            SELECT amount into v_Leave from leaves where dtr_id=v_dtr_id and status='approved' Order by id desc limit 1;
            END IF;
            END IF;
          END IF;
        Select v_Leave INTO totalleave;
        
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
        DB::unprepared("DROP PROCEDURE 'EVSP_Leave_Cal'");
    }
}
