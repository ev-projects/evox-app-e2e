<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

class DropAndCreateOnupdatelate extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        //
        DB::unprepared("DROP TRIGGER onupdatelate");
        DB::unprepared("
        CREATE TRIGGER `onupdatelate` AFTER UPDATE ON `dtrs` FOR EACH ROW BEGIN
DECLARE expected_time_in integer;
DECLARE late integer DEFAULT 0;
DECLARE leavecount integer DEFAULT 0;
DECLARE allowpolicy integer DEFAULT 0;
DECLARE holidaycount integer DEFAULT 0;
DECLARE leaveamount integer DEFAULT 0;
DECLARE timeoff_time integer DEFAULT 0;
DECLARE timeoff_amount float DEFAULT 0.0;
DECLARE latehours float DEFAULT 0.0;
 DECLARE v_timeid bigint;
 DECLARE v_timeout bigint;
 DECLARE v_start_datetime BIGINT;
 DECLARE v_end_datetime bigint;
 DECLARE v_start_flexy_datetime bigint;
 DECLARE v_end_flexy_datetime bigint;
 DECLARE v_TimeLog varchar(20);
 DECLARE timelog varchar(20);
 DECLARE dtr_type varchar(20);
 
 SET timelog = (Select time_difference from utc_timelog tl
 JOIN users u ON u.country_id = tl.country_id 
 WHERE u.id=NEW.user_id);

 SET v_timeid = UNIX_TIMESTAMP(CONVERT_TZ(FROM_UNIXTIME(NEW.time_in), @@session.time_zone, timelog ));
 SET v_timeout = UNIX_TIMESTAMP(CONVERT_TZ(FROM_UNIXTIME(NEW.time_out), @@session.time_zone, timelog ));
 SET v_start_datetime = UNIX_TIMESTAMP(CONVERT_TZ(FROM_UNIXTIME(NEW.start_datetime), @@session.time_zone, timelog ));
 SET v_end_datetime = UNIX_TIMESTAMP(CONVERT_TZ(FROM_UNIXTIME(NEW.end_datetime), @@session.time_zone, timelog ));
 SET v_start_flexy_datetime = UNIX_TIMESTAMP(CONVERT_TZ(FROM_UNIXTIME(NEW.start_flexy_datetime), @@session.time_zone, timelog ));
 SET v_end_flexy_datetime = UNIX_TIMESTAMP(CONVERT_TZ(FROM_UNIXTIME(NEW.end_flexy_datetime), @@session.time_zone, timelog ));
 SET dtr_type = get_dtrtype(NEW.id,NEW.source_type_tagging,NEW.is_rest_day);
 IF(dtr_type <> 'rd') THEN
 SET allowpolicy = (SELECT COUNT(*) FROM dtr_policies WHERE dtr_policies.dtr_id = NEW.id AND dtr_policies.policy='allow_late' AND dtr_policies.value='1');
SET holidaycount = (SELECT COUNT(*) FROM dtr_holidays WHERE dtr_holidays.dtr_id = NEW.id);
IF (v_timeid  IS NOT NULL AND v_start_datetime IS NOT NULL AND v_end_datetime IS NOT NULL) THEN
 IF (holidaycount < 1) THEN

   IF(allowpolicy >= 1)THEN

	SET leaveamount = (SELECT leaves.amount FROM leaves where leaves.status = 'approved' AND (leaves.type <> 'Unpaid Leave'  OR leaves.type <> 'Work from home' OR leaves.type <> 'MGC Unpaid Call Out Days') AND leaves.dtr_id=NEW.id);  
SET leavecount = (SELECT COUNT(*) FROM leaves where leaves.status = 'approved' AND (leaves.type <> 'Unpaid Leave'  OR leaves.type <> 'Work from home' OR leaves.type <> 'MGC Unpaid Call Out Days') AND leaves.dtr_id=NEW.id);
IF (leavecount > 0) THEN

Set timeoff_time =(leaveamount * (v_end_datetime - v_start_datetime - NEW.break_time ));
Set timeoff_amount = leaveamount;
END IF;
IF(v_start_flexy_datetime IS NOT NULL) THEN
   SET expected_time_in = v_start_flexy_datetime;
END IF;
IF(v_start_flexy_datetime IS NULL) THEN
   SET expected_time_in = v_start_datetime;
END IF;

IF( v_timeid  > expected_time_in )THEN
     SET late = v_timeid - expected_time_in;
END IF;
Set late = late - timeoff_time;
 IF(late < 0 OR late > 28800 OR timeoff_amount = 0.5)THEN
     SET late = 0;
END IF;
IF(late > 0)THEN
 SET latehours = late / 3600;
END IF;

IF NOT EXISTS (SELECT 1 From drt_summary_report WHERE  user_id=NEW.user_id And login_date=NEW.date )
  THEN
INSERT INTO drt_summary_report(login_date,user_id,reg_late,supervisor_id)VALUES(NEW.date,NEW.user_id,latehours,0);
ELSEIF EXISTS(SELECT 1 From drt_summary_report WHERE  user_id=NEW.user_id And login_date=NEW.date) THEN
UPDATE drt_summary_report SET drt_summary_report.reg_late = latehours WHERE drt_summary_report.user_id=NEW.user_id AND drt_summary_report.login_date=NEW.date ;
     END IF;
   END IF; 
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
        DB::unprepared("DROP TRIGGER onupdatelate");
    }
}
