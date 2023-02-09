<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

class UpdateUpdateAbsentschedulerProcedure extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        //
        DB::unprepared("Drop PROCEDURE update_absentscheduler;");
        DB::unprepared("
        CREATE  PROCEDURE update_absentscheduler()
BEGIN
DECLARE leavecount integer DEFAULT 0;
DECLARE holidaycount integer DEFAULT 0;
DECLARE dtr_type varchar(20);
DECLARE usercount int;
DECLARE totlacount int;

DECLARE dtrscount int;
DECLARE dtrstotlacount int;

DECLARE LP_UserId INT;
DECLARE LP_drts_id bigint;
DECLARE LP_type_tagging varchar(200);
DECLARE LP_isrestday int;
DECLARE LP_dtrs_date date;
DECLARE LP_timein bigint;
DECLARE LP_timeout bigint;
DECLARE LP_startdate bigint;
DECLARE LP_enddate bigint;

DECLARE DV_StartDate Date;
DECLARE DV_ENDDate Date;
DECLARE DV_TotalCount int;
DECLARE DV_LoopCount INT;

SET DV_StartDate=  convert(now(),date);
SET DV_ENDDate= convert(adddate(now(),-15),date);

set DV_LoopCount =1;

drop temporary table If exists  Temp_dtrs_data;

create temporary table Temp_dtrs_data
(
	id int auto_increment key ,
    user_id int,
    log_date date
    
);


-- Update absent data 
insert into Temp_dtrs_data(user_id,log_date)
SELECT user_id,date FROM dtrs 
WHERE dtrs.date between DV_StartDate AND DV_ENDDate
AND time_in IS  NULL 
AND time_out IS  NULL 
 AND (start_datetime IS NOT NULL OR start_flexy_datetime IS NOT NULL) 
 AND (end_datetime IS NOT NULL OR end_flexy_datetime IS NOT NULL)
 AND is_rest_day = 0
 and exists (select 1 from users u where u.id=dtrs.user_id and u.is_active=1)
  and Not exists (Select 1 from dtr_holidays where dtr_id=id)
 AND NOT EXISTS (SELECT 1 FROM leaves l
					WHERE l.dtr_id=dtrs.id
                    AND status='approved'
                    AND type in ( 'Vacation Leave','Sick Leave')
                    AND amount>0)
   AND  EXISTS (SELECT 1 FROM drt_summary_report dr where dr.user_id = dtrs.user_id and dr.login_date=dtrs.date and dr.unpaid_leave=0 and dr.on_leave =0
  and dr.login_date between DV_StartDate AND DV_ENDDate) 	;
 
 -- Mark absent if time out is not there
 insert into Temp_dtrs_data(user_id,log_date)
 select user_id,date FROM dtrs 
WHERE  dtrs.date between DV_StartDate AND DV_ENDDate
AND time_in IS NOT  NULL 
AND time_out IS  NULL 
 AND (start_datetime IS NOT NULL OR start_flexy_datetime IS NOT NULL) 
 AND (end_datetime IS NOT NULL OR end_flexy_datetime IS NOT NULL)
 AND is_rest_day = 0
 and exists (select 1 from users u where u.id=dtrs.user_id and u.is_active=1)
  and Not exists (Select 1 from dtr_holidays where dtr_id=id)
 AND NOT EXISTS (SELECT 1 FROM leaves l
					WHERE l.dtr_id=dtrs.id
                    AND status='approved'
                    AND type in ( 'Vacation Leave','Sick Leave')
                    AND amount>0)
   AND  EXISTS (SELECT 1 FROM drt_summary_report dr where dr.user_id = dtrs.user_id and dr.login_date=dtrs.date and dr.unpaid_leave=0 and dr.on_leave =0
  and dr.login_date between DV_StartDate AND DV_ENDDate) 
  and NOt Exists(SELECT 1 FROM dtrs_data dd where dd.user_id=dtrs.user_id and  dd.log_date=dtrs.date );


select count(1) into DV_TotalCount  from Temp_dtrs_data;

While(DV_LoopCount<=DV_TotalCount) Do

select user_id,log_date INTO LP_UserId,LP_dtrs_date from Temp_dtrs_data where id=DV_LoopCount;

 IF NOT EXISTS (SELECT 1 From drt_summary_report WHERE  user_id=LP_UserId And login_date=LP_dtrs_date )
  THEN
INSERT INTO drt_summary_report(login_date,user_id,unpaid_leave)VALUE(LP_dtrs_date,LP_UserId,'1');
ELSEIF EXISTS(SELECT 1 From drt_summary_report WHERE  user_id=LP_UserId And login_date=LP_dtrs_date) THEN
UPDATE drt_summary_report SET drt_summary_report.unpaid_leave = '1' WHERE drt_summary_report.id=LP_drts_id And login_date=LP_dtrs_date;
END IF; 

set DV_LoopCount=DV_LoopCount+1;

end While;

drop temporary table Temp_dtrs_data;

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
        DB::unprepared("Drop PROCEDURE update_absentscheduler;");
    }
}
