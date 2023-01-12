<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

class EVSPWorkTimeCalMainProc extends Migration
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
        CREATE  PROCEDURE EVSP_Work_Time_Cal_Main(
            IP_FromDate DATETIME,
            IP_ToDate DATETIME
        )
        BEGIN
        -- Declare require variables
        DECLARE v_LoginDate DateTime;
        DECLARE v_userid Bigint;
        DECLARE v_user_count Int;
        DECLARE v_User_Loop Int;
        DECLARE r_Leave INT;
        DECLARE dtype varchar(20);
        DECLARE v_TimeLog varchar(20);
        DECLARE get_previous_date varchar(20);
        DECLARE pre_dtr_type varchar(20);
        DECLARE v_dtr_id1 bigint;
        DECLARE v_source_type_tagging1 varchar(100);
        DECLARE v_is_rest_day1 INT;
        DECLARE pre_night_diffq DECIMAL(10,2);
        DECLARE pre_night_diff_overlappq DECIMAL(10,2);
        DECLARE pre_renderhr DECIMAL(10,2);
        DECLARE pre_renderhr_overlapp DECIMAL(10,2);
        DECLARE pre_night_diff varchar(120);
        DECLARE pre_night_diff_overlapp varchar(120);
        DECLARE next_night_diff DECIMAL(10,2);
        DECLARE next_night_diff_overlapp DECIMAL(10,2);
        DECLARE v_timeid bigint;
         DECLARE v_time_out bigint;
        -- Creating Temporary Table for feteching users on the particulare date
        Create Temporary Table User_On_Date
        (
            Id INT Primary Key Auto_Increment,
            User_Id BigInt
        );
        
        -- loop for each date of given input dates
        WHILE(IP_FromDate <= IP_ToDate) DO
        -- Fetch the users from dtrs table for the particulare date
        Insert Into User_On_Date (User_Id)
        -- Select user_id From dtrs Where date=IP_FromDate and User_Id=1584;
        Select user_id From dtrs Where date=IP_FromDate;
        Select Count(id) INTO v_user_count From User_On_Date;
        
        SET v_User_Loop=1;
        -- Loop for each user on the date
        WHILE(v_User_Loop<=v_user_count) DO
        
        SELECT User_Id INTO v_userid FROM User_On_Date Where Id=v_User_Loop;
        
         Select time_difference INTO v_TimeLog from utc_timelog tl
         JOIN users u ON u.country_id = tl.country_id 
         WHERE u.id=v_userid;
        
        -- Leave Calculation Sp
        CALL  EVSP_Leave_Cal(IP_FromDate, v_userid,v_TimeLog,@totalleave);
        
        
        -- Rendter time calculation
        
        CALL  EVSP_RenderTime_Cal(IP_FromDate, v_userid,v_TimeLog,@outdtrtype,@totalrh,@totalrh_overlapp);
        -- Select @outdtrtype;
        -- select @totalrh;
        -- select @totalrh_overlapp;
        
        -- Late time calculation
        CALL  EVSP_Late_Time_Calculate(IP_FromDate, v_userid,v_TimeLog, @totallate);
        -- SELECT @totallate;
        
        -- Night diff calculation
        CALL  EVSP_NightDiffTime_Cal(IP_FromDate, v_userid,v_TimeLog,@outdtrtype,@nightdiffhr,@nightdiffhr_overlapp);
        -- select @outdtrtype;
        -- select @nightdiffhr;
        -- select @nightdiffhr_overlapp;
        
        -- Over time calculation 
        
        CALL EVSP_OverTime_Cal(IP_FromDate, v_userid,v_TimeLog, @outdtrtype, @ovhr, @ovhr_nightdiff);
        
        IF(@outdtrtype = 'sh' OR @outdtrtype = 'lh')THEN
        SELECT time_in,time_out
        into v_timeid,v_time_out FROM dtrs WHERE user_id=v_userid and date=IP_FromDate;
        
        -- update drt_summary_report SET status=2 Where login_date=IP_FromDate AND user_id=v_userid; 
        IF (v_timeid IS NULL AND v_time_out IS NULL) THEN
        SET get_previous_date = IP_FromDate - interval 1 day;
        SELECT id,source_type_tagging,is_rest_day into v_dtr_id1,v_source_type_tagging1,v_is_rest_day1
        FROM dtrs WHERE user_id=v_userid AND date=get_previous_date;
        SET pre_dtr_type = get_dtrtype(v_dtr_id1,v_source_type_tagging1,v_is_rest_day1);
        
        IF(pre_dtr_type = \"reg\")THEN
        SELECT reg_rendered_hours_overlapp,reg_night_diff_overlapp INTO pre_renderhr_overlapp,pre_night_diff_overlappq FROM drt_summary_report Where login_date=get_previous_date AND user_id=v_userid;
        ELSEIF(pre_dtr_type = \"sh\")THEN
        SELECT sh_rendered_hours_overlapp,sh_night_diff_overlapp INTO pre_renderhr_overlapp,pre_night_diff_overlappq FROM drt_summary_report Where login_date=get_previous_date AND user_id=v_userid;
        ELSEIF(pre_dtr_type = \"lh\")THEN
        SELECT lh_rendered_hours_overlapp,lh_night_diff_overlapp INTO pre_renderhr_overlapp,pre_night_diff_overlappq FROM drt_summary_report Where login_date=get_previous_date AND user_id=v_userid;
        ELSEIF(pre_dtr_type = \"dsh\")THEN
        SELECT dsh_rendered_hours_overlapp,dsh_night_diff_overlapp INTO pre_renderhr_overlapp,pre_night_diff_overlappq FROM drt_summary_report Where login_date=get_previous_date AND user_id=v_userid;
        ELSEIF(pre_dtr_type = \"dlh\")THEN
        SELECT dlh_rendered_hours_overlapp,dlh_night_diff_overlapp INTO pre_renderhr_overlapp,pre_night_diff_overlappq FROM drt_summary_report Where login_date=get_previous_date AND user_id=v_userid;
        ELSEIF(pre_dtr_type = \"slh\")THEN
        SELECT slh_rendered_hours_overlapp,slh_night_diff_overlapp INTO pre_renderhr_overlapp,pre_night_diff_overlappq FROM drt_summary_report Where login_date=get_previous_date AND user_id=v_userid;
        END IF;
        
        
        SET  @nightdiffhr_overlapp = pre_night_diff_overlappq;
        SET  @totalrh_overlapp = pre_renderhr_overlapp;
        
        update drt_summary_report SET nigdiff_stauts=0 ,render_status=0,status=2 Where login_date=get_previous_date AND user_id=v_userid;  
        
        END IF;
        -- SET @statement3 = CONCAT('SELECT ',@pre_night_diff,',',@pre_night_diff_overlapp,' INTO pre_night_diffq,pre_night_diff_overlappq FROM drt_summary_report Where login_date=\"',get_previous_date,'\"AND user_id=',v_userid,';');
        -- Select @statement3;
        -- PREPARE myquery3 FROM @statement3;
        -- EXECUTE myquery3;
        -- DEALLOCATE PREPARE myquery3;
        
        END IF;
        
        -- select @ovhr;
        -- select @ovhr_nightdiff;
        CALL  EVSP_UnderTime_Cal(IP_FromDate, v_userid,v_TimeLog,@ut);
        -- select @ut;
        CALL EVSP_Absent_calculation(IP_FromDate,v_userid,v_TimeLog,@totalabsent);
        -- Select @totalabsent;
        SET @logindate = IP_FromDate;
        SET @userid = v_userid;
        
        Set @dtype1 = CONCAT(@outdtrtype,'_','rendered_hours');
        SET @param1 = CONCAT(@outdtrtype,'_','rendered_hours_overlapp');
        SET @param2 = CONCAT(@outdtrtype,'_','night_diff');
        SET @param3 = CONCAT(@outdtrtype,'_','night_diff_overlapp');
        SET @param4 = CONCAT(@outdtrtype,'_','overtime');
        SET @param5 = CONCAT(@outdtrtype,'_','overtime_night_diff');
        IF NOT EXISTS (SELECT 1 From drt_summary_report WHERE  user_id=v_userid AND login_date=IP_FromDate)
          THEN
        SET @statement = CONCAT('insert into drt_summary_report (login_date,user_id,supervisor_id,unpaid_leave,on_leave,reg_late,reg_undertime,',@dtype1,',',@param1,',',@param2,',',@param3,',',@param4,',',@param5,') VALUES (@logindate,@userid,0,@totalabsent,@totalleave,@totallate,@ut,@totalrh,@totalrh_overlapp,@nightdiffhr,@nightdiffhr_overlapp,@ovhr,@ovhr_nightdiff);');
        PREPARE myquery FROM @statement;
        EXECUTE myquery;
        DEALLOCATE PREPARE myquery;
        ELSE
        SET @statement1 = CONCAT('Update drt_summary_report SET unpaid_leave=',@totalabsent,',on_leave=',@totalleave,',reg_late=',@totallate,',reg_undertime=',@ut,',',@dtype1,'=',@totalrh,',',@param1,'=',@totalrh_overlapp,',',@param2,'=',@nightdiffhr,',',@param3,'=',@nightdiffhr_overlapp,',',@param4,'=',@ovhr,',',@param5,'=',@ovhr_nightdiff,' Where login_date=\"',@logindate,'\" AND user_id=',@userid,';');
        PREPARE myquery1 FROM @statement1;
        EXECUTE myquery1;
        DEALLOCATE PREPARE myquery1;
        END IF;
        
        SET v_User_Loop=v_User_Loop+1;
        END WHILE;
        TRUNCATE Table User_On_Date;
        SET IP_FromDate = DATE_ADD(IP_FromDate,INTERVAL 1 DAY);
        END WHILE;
        
        DROP Temporary Table User_On_Date;
        
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
        DB::unprepared("DROP PROCEDURE 'EVSP_Work_Time_Cal_Main'");
    }
}
