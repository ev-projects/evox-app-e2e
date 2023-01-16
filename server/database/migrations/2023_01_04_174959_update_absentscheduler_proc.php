<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

class UpdateAbsentschedulerProc extends Migration
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
        CREATE PROCEDURE update_absentscheduler()
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

set usercount =1;

create temporary table temp_user
(
	id int,
    user_id int
);

create temporary table dtrs_user
(
	id int,
    drts_id bigint,
    type_tagging varchar(200),
    isrestday int,
    dtrs_date date,
    timein bigint,
    timeout bigint,
    startdate bigint,
    enddate bigint
    
);



insert into temp_user
SELECT ROW_NUMBER() OVER(order by id),id  FROM users 
WHERE is_active='1' AND employment_status<>'Terminated' AND termination_date IS NOT NULL;

select count(1) into usercount from temp_user;

While (usercount <= totlacount) do

select  user_id into LP_UserId From temp_user where id=usercount;


set dtrscount=0;
insert into dtrs_user
SELECT ROW_NUMBER() OVER(order by id),id,source_type_tagging,is_rest_day,date,time_in,time_out,
start_datetime,end_datetime FROM dtrs WHERE dtrs.user_id=LP_UserId;

select count(1)into dtrstotlacount from dtrs_user;

While(dtrscount<=dtrstotlacount) Do

select  drts_id,type_tagging,isrestday,dtrs_date, timein,timeout,startdate,enddate 
INTO LP_drts_id,LP_type_tagging,LP_isrestday,LP_dtrs_date,LP_timein,LP_timeout,LP_startdate,LP_enddate 
from dtrs_user where id=dtrscount;

    SET holidaycount = (SELECT COUNT(*) FROM dtr_holidays WHERE dtr_holidays.dtr_id = LP_UserId);
    SET leavecount = (SELECT COUNT(*) FROM leaves where leaves.status = 'approved' AND (leaves.type <> 'Unpaid Leave'  OR leaves.type <> 'Work from home' OR leaves.type <> 'MGC Unpaid Call Out Days') AND leaves.dtr_id=LP_UserId);
    SET dtr_type = get_dtrtype(LP_drts_id,LP_type_tagging,LP_isrestday);
  IF((LP_timein IS Null AND LP_timeout IS Null) AND (LP_startdate IS NOT Null AND LP_enddate  IS NOT Null) AND (leavecount <= 0) AND (holidaycount <= 0) AND dtr_type ='reg')THEN  
 IF NOT EXISTS (SELECT 1 From drt_summary_report WHERE  user_id=LP_UserId And login_date=LP_dtrs_date )
  THEN
INSERT INTO drt_summary_report(login_date,user_id,unpaid_leave)VALUE(LP_dtrs_date,LP_UserId,'1');
ELSEIF EXISTS(SELECT 1 From drt_summary_report WHERE  user_id=LP_UserId And login_date=LP_dtrs_date) THEN
UPDATE drt_summary_report SET drt_summary_report.unpaid_leave = '1' WHERE drt_summary_report.id=LP_drts_id And login_date=LP_dtrs_date;
     END IF;
  END IF;

set dtrscount=dtrscount+1;
    end While;
    truncate  table dtrs_user;
    set usercount=usercount+1;
end While;

drop temporary table temp_user;
drop temporary table dtrs_user;

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
        DB::unprepared("DROP PROCEDURE update_absentscheduler");
    }
}
