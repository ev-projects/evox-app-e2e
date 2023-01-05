<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

class OnupdateUndertimeTrigger extends Migration
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
        CREATE  TRIGGER onupdate_undertime AFTER UPDATE ON `dtrs` FOR EACH ROW BEGIN
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
DECLARE secondstohours float DEFAULT 0.0;
DECLARE renderedtime integer DEFAULT 0;
DECLARE requiredtime integer DEFAULT 0;

 DECLARE v_timeid bigint;
 DECLARE v_timeout bigint;
 DECLARE v_start_datetime BIGINT;
 DECLARE v_end_datetime bigint;
 DECLARE v_start_flexy_datetime bigint;
 DECLARE v_end_flexy_datetime bigint;
 DECLARE v_TimeLog varchar(20);
 DECLARE timelog varchar(20);
 
 SET timelog = (Select time_difference from utc_timelog tl
 JOIN users u ON u.country_id = tl.country_id 
 WHERE u.id=NEW.user_id);

 SET v_timeid = UNIX_TIMESTAMP(CONVERT_TZ(FROM_UNIXTIME(NEW.time_in), @@session.time_zone, timelog ));
 SET v_timeout = UNIX_TIMESTAMP(CONVERT_TZ(FROM_UNIXTIME(NEW.time_out), @@session.time_zone, timelog ));
 SET v_start_datetime = UNIX_TIMESTAMP(CONVERT_TZ(FROM_UNIXTIME(NEW.start_datetime), @@session.time_zone, timelog ));
 SET v_end_datetime = UNIX_TIMESTAMP(CONVERT_TZ(FROM_UNIXTIME(NEW.end_datetime), @@session.time_zone, timelog ));
 SET v_start_flexy_datetime = UNIX_TIMESTAMP(CONVERT_TZ(FROM_UNIXTIME(NEW.start_flexy_datetime), @@session.time_zone, timelog ));
 SET v_end_flexy_datetime = UNIX_TIMESTAMP(CONVERT_TZ(FROM_UNIXTIME(NEW.end_flexy_datetime), @@session.time_zone, timelog ));


SET allowpolicy = (SELECT COUNT(*) FROM dtr_policies WHERE dtr_policies.dtr_id = NEW.id AND dtr_policies.policy='allow_undertime' AND dtr_policies.value='1');
SET holidaycount = (SELECT COUNT(*) FROM dtr_holidays WHERE dtr_holidays.dtr_id = NEW.id);
IF (v_timeid IS NOT NULL AND v_timeout IS NOT NULL AND v_start_datetime IS NOT NULL AND v_end_datetime IS NOT NULL) THEN
 IF (holidaycount < 1) THEN
   IF(allowpolicy >= 1)THEN
	SET leaveamount = (SELECT leaves.amount FROM leaves where leaves.status = 'approved' AND (leaves.type <> 'Unpaid Leave'  OR leaves.type <> 'Work from home' OR leaves.type <> 'MGC Unpaid Call Out Days') AND leaves.dtr_id=NEW.id limit 1);  
SET leavecount = (SELECT COUNT(*) FROM leaves where leaves.status = 'approved' AND (leaves.type <> 'Unpaid Leave'  OR leaves.type <> 'Work from home' OR leaves.type <> 'MGC Unpaid Call Out Days') AND leaves.dtr_id=NEW.id);
IF (leavecount > 0) THEN
Set timeoff_time =(leaveamount * (v_end_datetime - v_start_datetime - NEW.break_time ));
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
IF(ISNULL(v_start_flexy_datetime) AND ISNULL(v_end_flexy_datetime)) THEN
 IF(v_timeout < v_end_datetime)THEN
    SET undertime = v_end_datetime - v_timeout;
 END IF;
 ELSE
 # If the Time-In is BEFORE or EQUAL the Start-Datetime
 IF(v_timeid <= v_start_datetime) THEN
   SET expected_time_out = v_end_datetime;
 IF(v_timeout < expected_time_out )THEN
   SET undertime = expected_time_out - v_timeout;
 END IF;
 # If the Time-In is BETWEEN the Start-Datetime and Start-Flexy-Datetime
 ELSEIF((v_start_flexy_datetime IS NOT NULL AND v_end_flexy_datetime IS NOT NULL AND v_timeid > v_start_datetime AND v_timeid < v_start_flexy_datetime) OR (ISNULL(v_start_flexy_datetime) AND ISNULL(v_end_flexy_datetime) AND v_timeid >= v_start_datetime)) THEN
 
 IF(requiredtime > renderedtime)THEN
    SET undertime = requiredtime - renderedtime;
  END IF;
  # If the Time-In is AFTER or EQUAL the Start-Flexy-Datetime
 ELSEIF(v_timeid >= v_start_flexy_datetime) THEN
   SET expected_time_out = v_end_flexy_datetime;

  
 
# If the Time-Out is BEFORE the Expected Time-Out, compute for Undertime.
    IF(v_timeout < expected_time_out )THEN
       SET undertime = expected_time_out - v_timeout;
    END IF;
    
  END IF;
 END IF;

 # If the Time-off from the Leave is on Half-day (0.5)
  IF(timeoff_amount = 0.5)THEN
# If the Rendered Time is LESSER than the Half-day Time-off, compute for Undertime.
  IF(renderedtime <= timeoff_time) THEN
    SET undertime = timeoff_time - renderedtime;
# If not, set the Undertime default to zero (For cases like, Timeoff = 4:00 Hrs & Rendered Time = 4:01 Hrs)
# No undertime for exceeded Rendered Time.
  ELSE
    SET undertime = 0;
END IF;
# If the Time-off from the Leave is Wholeday or Non-existing, compute for the Undertime.
ELSE
    SET undertime = undertime - timeoff_time;
END IF;

# Condition for breaktime deduction on undertime
 SET half_day = (requiredtime - NEW.break_time) / 2;
   IF(undertime >= half_day AND undertime <= (half_day + NEW.break_time))THEN
     SET undertime = undertime - (undertime - half_day);
   ELSEIF((half_day + NEW.break_time) < undertime)THEN
   	 SET undertime = undertime - NEW.break_time;
END IF;
# Double checks the Validity of the Computed Undertime. If not valid, set it to Default value (0)
# 1. If Undertime LESS THAN 0 (Negative values)
# 2. If Undertime is GREATHER THAN 8 hours.
IF(undertime < 0 OR undertime > requiredtime) THEN
   SET undertime = 0;
END IF;
IF(undertime > 0)THEN

 SET secondstohours = undertime / 3600;
END IF;

IF NOT EXISTS (SELECT 1 From drt_summary_report WHERE  user_id=NEW.user_id And login_date=NEW.date )
  THEN
INSERT INTO drt_summary_report(login_date,user_id,supervisor_id,reg_undertime)VALUES(NEW.date,NEW.user_id,0,secondstohours);
 
ELSEIF EXISTS(SELECT 1 From drt_summary_report WHERE  user_id=NEW.user_id And login_date=NEW.date) THEN
UPDATE drt_summary_report SET drt_summary_report.reg_undertime = secondstohours WHERE drt_summary_report.user_id=NEW.user_id AND drt_summary_report.login_date=NEW.date;
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
        DB::unprepared("DROP TRIGGER 'onupdate_undertime'");
    }
}
