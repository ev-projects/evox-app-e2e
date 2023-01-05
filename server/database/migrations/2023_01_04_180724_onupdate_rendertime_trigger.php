<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

class OnupdateRendertimeTrigger extends Migration
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
        CREATE  TRIGGER onupdate_rendertime AFTER UPDATE ON `dtrs` FOR EACH ROW BEGIN
DECLARE rendered_hours integer DEFAULT 0;
DECLARE rendered_hours_overlapped integer DEFAULT 0;
DECLARE rendered_hrs DOUBLE(10,2) DEFAULT 0.00;
DECLARE rendered_hrs_overlapped DOUBLE(10,2) DEFAULT 0.00;
DECLARE actual_time_start_datetime integer DEFAULT 0;
DECLARE actual_time_end_datetime integer DEFAULT 0;
DECLARE expected_work_start_datetime integer;
DECLARE expected_work_end_datetime integer;
DECLARE getrequiredtime integer DEFAULT 0;
DECLARE break_start_datetime integer;
DECLARE break_end_datetime integer;
DECLARE getRequiredHalfDayTime integer;
DECLARE rendered_hours_break_time integer;
DECLARE dtr_type varchar(20);
 DECLARE v_timeid bigint;
 DECLARE v_timeout bigint;
 DECLARE v_start_datetime BIGINT;
 DECLARE v_end_datetime bigint;
 DECLARE v_start_flexy_datetime bigint;
 DECLARE v_end_flexy_datetime bigint;
 DECLARE v_TimeLog varchar(20);
 DECLARE timelog varchar(20);
 DECLARE nightdiffhr_overlapp1 DECIMAL(10,2) DEFAULT 0.00;
 DECLARE v_dtr_id1 bigint;
 DECLARE v_source_type_tagging1 varchar(100);
 DECLARE v_is_rest_day1 INT;
 DECLARE get_next_date varchar(20);
 DECLARE pre_dtr_type varchar(20);
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
IF (v_timeid IS NOT NULL AND v_timeout IS NOT NULL AND v_start_datetime IS NOT NULL AND v_end_datetime IS NOT NULL) THEN
# Get Required Time
IF(v_start_datetime IS NOT NULL AND v_end_datetime IS NOT NULL)THEN
 SET getrequiredtime = v_end_datetime - v_start_datetime;
ELSE
SET getrequiredtime = 0;
END IF;
# Responsible for setting the expected Work Time In and Out base on the Schedule and Time In & Out of the DTR instance.
IF(v_start_flexy_datetime IS NOT NULL AND v_end_flexy_datetime IS NOT NULL) THEN

 IF(v_timeid <= v_start_datetime) THEN
    SET expected_work_start_datetime = v_start_datetime;
    SET expected_work_end_datetime = v_end_datetime;
  ELSEIF((v_start_flexy_datetime IS NOT NULL AND v_end_flexy_datetime IS NOT NULL AND v_timeid > v_start_datetime AND v_timeid < v_start_flexy_datetime) OR (v_start_flexy_datetime IS NOT NULL AND v_end_flexy_datetime IS NOT NULL AND v_timeid >= v_start_datetime)) THEN
  SET expected_work_start_datetime = v_timeid;
  SET expected_work_end_datetime = v_timeid + getrequiredtime;
   IF(v_end_flexy_datetime < v_timeid + getrequiredtime)THEN
     SET expected_work_end_datetime = v_end_flexy_datetime;
     END IF;
  ELSEIF(v_timeid >= v_start_flexy_datetime) THEN
    SET expected_work_start_datetime = v_start_flexy_datetime;
    SET expected_work_end_datetime = v_end_flexy_datetime;
  END IF;
 		
 ELSE
SET expected_work_start_datetime = v_start_datetime;
SET expected_work_end_datetime = v_end_datetime;
 END IF ;
 
#Calculate actualtime
 # If the Time-In is BEFORE or EQUAL the Expected Work Start-Datetime, use the Expected Work Start-Datetime.
IF(v_timeid <= expected_work_start_datetime)THEN
  SET actual_time_start_datetime = expected_work_start_datetime;
  ELSE
  SET actual_time_start_datetime = v_timeid;
END IF;
  # If the Time-Out is BEFORE or EQUAL the Expected Work End-Datetime, use the DTR's Time-Out.
IF(v_timeout <= expected_work_end_datetime)THEN
	SET actual_time_end_datetime = v_timeout;
ELSE
    SET actual_time_end_datetime = expected_work_end_datetime;
END IF;

# Set Break time
SET getRequiredHalfDayTime = (getrequiredtime / 2) - (NEW.break_time / 2);
SET break_start_datetime = expected_work_start_datetime + ((getrequiredtime / 2) - (NEW.break_time / 2));

SET break_end_datetime = break_start_datetime + NEW.break_time;

# if overlapped 
IF((v_timeid IS NOT NULL AND v_timeout IS NOT NULL) AND timestamp_to_date(v_timeout) <> timestamp_to_date(add_day_to_timestamp(NEW.date, 1)) AND timestamp_to_date(actual_time_start_datetime) =  timestamp_to_date(actual_time_end_datetime))THEN
 # if not overlapped
SET rendered_hours = (break_start_datetime - actual_time_start_datetime) + (actual_time_end_datetime - break_end_datetime);


        
ELSE
IF(actual_time_start_datetime < add_day_to_timestamp(NEW.date, 1))THEN 
# Gets the Rendered Hours for the Day 1 of the DTR. (Actual Start Datetime to Day 2 12AM)
  SET rendered_hours = add_day_to_timestamp(NEW.date, 1) - actual_time_start_datetime;
# Gets the Rendered Hours for the Day 2 of the DTR. (Day 2 12AM to Actual End Datetime)
  SET rendered_hours_overlapped = actual_time_end_datetime - add_day_to_timestamp(NEW.date, 1);
  

ELSE
# Gets the Rendered Hours for the Day 2 of the DTR. (Actual Start Datetime to Actual End Datetime)
  SET rendered_hours_overlapped = actual_time_end_datetime - actual_time_start_datetime;
END IF;
# If the Break Start and End Date is NOT the same day, compute for Night Diff. Break Time for the Rendered Hours and Rendered Hours Overlapped.
 IF(timestamp_to_date(break_start_datetime) != timestamp_to_date(break_end_datetime))THEN
# Deduct the computed Break Times respectively.
  SET rendered_hours = rendered_hours - (add_day_to_timestamp(New.date, 1) - break_start_datetime);
  SET rendered_hours_overlapped  = rendered_hours_overlapped - (break_end_datetime - add_day_to_timestamp(NEW.date, 1));
 
  
 # If the Break Start and End Date is the same day, compute for Rendered Hours Break Time and deduct it on the correct Date.
 ELSE
# Gets the total Break Time.
  SET rendered_hours_break_time = break_end_datetime - break_start_datetime;
# If the DTR has Overlapped Time Logs AND Time-Out has the SAME DAY from the Break Date, deduct it from the Rendered Hours Overlapped (Day 2)
IF((v_timeid IS NOT NULL AND v_timeout IS NOT NULL) AND timestamp_to_date(v_timeout) = timestamp_to_date(add_day_to_timestamp(NEW.date, 1)) AND timestamp_to_date(v_timeout) = timestamp_to_date(break_start_datetime))THEN

   SET rendered_hours_overlapped  = rendered_hours_overlapped - rendered_hours_break_time;
# If the Time-In has the SAME DAY from the Break Date, deduct it from the Rendered Hours. (Day 1)
ELSEIF(timestamp_to_date(v_timeid) = timestamp_to_date(break_start_datetime))THEN
   SET rendered_hours = rendered_hours - rendered_hours_break_time;
 
   END IF;
END IF;
END IF;

IF(rendered_hours < 0 OR rendered_hours > getrequiredtime)THEN
   SET rendered_hours = 0;
END IF;
IF(rendered_hours_overlapped < 0 OR rendered_hours > getrequiredtime)THEN
   SET rendered_hours_overlapped = 0;
END IF;
IF(rendered_hours > 0  OR rendered_hours_overlapped > 0)THEN

SET rendered_hrs = rendered_hours / 3600;
SET rendered_hrs_overlapped = rendered_hours_overlapped / 3600;

  IF NOT EXISTS (SELECT 1 From drt_summary_report WHERE  user_id=NEW.user_id And login_date=NEW.date )
  THEN
 IF(dtr_type = 'reg')THEN 
  INSERT INTO drt_summary_report(login_date,user_id,reg_rendered_hours,reg_rendered_hours_overlapp)VALUES(NEW.date,NEW.user_id,rendered_hrs,rendered_hrs_overlapped);
 
  ELSEIF(dtr_type = 'rd')THEN
  INSERT INTO drt_summary_report(login_date,user_id,rd_rendered_hours,rd_rendered_hours_overlapp)VALUES(NEW.date,NEW.user_id,rendered_hrs,rendered_hrs_overlapped);
 
  ELSEIF(dtr_type = 'sh')THEN
  INSERT INTO drt_summary_report(login_date,user_id,sh_rendered_hours,sh_rendered_hours_overlapp)VALUES(NEW.date,NEW.user_id,rendered_hrs,rendered_hrs_overlapped);
 
  ELSEIF(dtr_type = 'lh')THEN
  INSERT INTO drt_summary_report(login_date,user_id,lh_rendered_hours,lh_rendered_hours_overlapp)VALUES(NEW.date,NEW.user_id,rendered_hrs,rendered_hrs_overlapped);

  ELSEIF(dtr_type = 'dsh')THEN
  INSERT INTO drt_summary_report(login_date,user_id,dsh_rendered_hours,dsh_rendered_hours_overlapp)VALUES(NEW.date,NEW.user_id,rendered_hrs,rendered_hrs_overlapped);
 
  ELSEIF(dtr_type = 'dlh')THEN
  INSERT INTO drt_summary_report(login_date,user_id,dlh_rendered_hours,dlh_rendered_hours_overlapp)VALUES(NEW.date,NEW.user_id,rendered_hrs,rendered_hrs_overlapped);
 
  ELSEIF(dtr_type = 'dsl')THEN
  INSERT INTO drt_summary_report(login_date,user_id,slh_rendered_hours,slh_rendered_hours_overlapp)VALUES(NEW.date,NEW.user_id,rendered_hrs,rendered_hrs_overlapped);
 
  END IF;
ELSEIF EXISTS(SELECT 1 From drt_summary_report WHERE  user_id=NEW.user_id And login_date=NEW.date) THEN
IF(dtr_type = 'reg')THEN 
UPDATE drt_summary_report SET drt_summary_report.reg_rendered_hours = rendered_hrs,drt_summary_report.reg_rendered_hours_overlapp = rendered_hrs_overlapped WHERE drt_summary_report.user_id=NEW.user_id AND drt_summary_report.login_date=NEW.date;
ELSEIF(dtr_type = 'rd')THEN 
UPDATE drt_summary_report SET drt_summary_report.rd_rendered_hours = rendered_hrs,drt_summary_report.rd_rendered_hours_overlapp = rendered_hrs_overlapped WHERE drt_summary_report.user_id=NEW.user_id AND drt_summary_report.login_date=NEW.date;
ELSEIF(dtr_type = 'sh')THEN 
UPDATE drt_summary_report SET drt_summary_report.sh_rendered_hours = rendered_hrs,drt_summary_report.sh_rendered_hours_overlapp = rendered_hrs_overlapped WHERE drt_summary_report.user_id=NEW.user_id AND drt_summary_report.login_date=NEW.date;
ELSEIF(dtr_type = 'lh')THEN 
UPDATE drt_summary_report SET drt_summary_report.lh_rendered_hours = rendered_hrs,drt_summary_report.lh_rendered_hours_overlapp = rendered_hrs_overlapped WHERE drt_summary_report.user_id=NEW.user_id AND drt_summary_report.login_date=NEW.date;
ELSEIF(dtr_type = 'dsh')THEN 
UPDATE drt_summary_report SET drt_summary_report.dsh_rendered_hours = rendered_hours,drt_summary_report.dsh_rendered_hours_overlapp = rendered_hours_overlapped WHERE drt_summary_report.user_id=NEW.user_id AND drt_summary_report.login_date=NEW.date;
ELSEIF(dtr_type = 'dlh')THEN 
UPDATE drt_summary_report SET drt_summary_report.dlh_rendered_hours = rendered_hrs,drt_summary_report.dlh_rendered_hours_overlapp = rendered_hrs_overlapped WHERE drt_summary_report.user_id=NEW.user_id AND drt_summary_report.login_date=NEW.date;
ELSEIF(dtr_type = 'slh')THEN 
UPDATE drt_summary_report SET drt_summary_report.slh_rendered_hours = rendered_hrs,drt_summary_report.slh_rendered_hours_overlapp = rendered_hrs_overlapped WHERE drt_summary_report.user_id=NEW.user_id AND drt_summary_report.login_date=NEW.date;
END IF;
  END IF;
END IF;
END IF;

SET get_next_date = NEW.date + interval 1 day;
SET v_dtr_id1 =(SELECT id FROM dtrs WHERE user_id=NEW.user_id AND date=get_next_date);
SET v_source_type_tagging1 = (SELECT source_type_tagging FROM dtrs WHERE user_id=NEW.user_id AND date=get_next_date);
SET v_is_rest_day1 = (SELECT is_rest_day FROM dtrs WHERE user_id=NEW.user_id AND date=get_next_date);
SET pre_dtr_type = get_dtrtype(v_dtr_id1,v_source_type_tagging1,v_is_rest_day1);
IF NOT EXISTS (SELECT 1 From drt_summary_report WHERE  user_id=NEW.user_id And login_date=get_next_date)
  THEN
IF(pre_dtr_type = 'sh') THEN
INSERT INTO drt_summary_report(login_date,user_id,sh_rendered_hours_overlapp)VALUES(get_next_date,NEW.user_id,rendered_hrs_overlapped);
END IF;
 IF(pre_dtr_type = 'lh') THEN
 INSERT INTO drt_summary_report(login_date,user_id,lh_rendered_hours_overlapp)VALUE(get_next_date,NEW.user_id,rendered_hrs_overlapped);
 END IF;
 ELSE
 IF(pre_dtr_type = 'sh') THEN
UPDATE drt_summary_report SET drt_summary_report.sh_rendered_hours_overlapp = rendered_hrs_overlapped WHERE drt_summary_report.user_id=NEW.user_id AND drt_summary_report.login_date=get_next_date;
END IF;
 IF(pre_dtr_type = 'lh') THEN
 UPDATE drt_summary_report SET drt_summary_report.lh_rendered_hours_overlapp = rendered_hrs_overlapped WHERE drt_summary_report.user_id=NEW.user_id AND drt_summary_report.login_date=get_next_date;
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
        DB::unprepared("DROP TRIGGER onupdate_rendertime");
    }
}
