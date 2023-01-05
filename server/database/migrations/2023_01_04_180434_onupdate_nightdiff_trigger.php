<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

class OnupdateNightdiffTrigger extends Migration
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
        CREATE  TRIGGER onupdate_nightdiff AFTER UPDATE ON `dtrs` FOR EACH ROW BEGIN
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
 DECLARE v_timeid bigint;
 DECLARE v_timeout bigint;
 DECLARE v_start_datetime BIGINT;
 DECLARE v_end_datetime bigint;
 DECLARE v_start_flexy_datetime bigint;
 DECLARE v_end_flexy_datetime bigint;
 DECLARE v_TimeLog varchar(20);
 DECLARE timelog varchar(20);
 DECLARE dtr_type varchar(20);
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
IF(ISNULL(v_start_flexy_datetime) AND ISNULL(v_end_flexy_datetime)) THEN
 		SET expected_work_start_datetime = v_start_datetime;
        SET expected_work_end_datetime = v_end_datetime;
 ELSE
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
 END IF ;
 

IF(add_time_to_timestamp(NEW.date,'06:00') < expected_work_start_datetime)THEN
   SET night_diff_start_datetime = add_time_to_timestamp(NEW.date,'22:00');
   SET night_diff_end_datetime = add_time_to_timestamp(add_day_to_timestamp(NEW.date, 1),'06:00');
  ELSE
   SET night_diff_start_datetime = add_time_to_timestamp(subtract_days_from_timestamp(NEW.date, 1),'22:00' );
   SET night_diff_end_datetime = add_time_to_timestamp(NEW.date,'06:00');
END IF;

#Set Break time
SET break_start_datetime = expected_work_start_datetime + ((getrequiredtime / 2) - (NEW.break_time / 2));
SET break_end_datetime = break_start_datetime + NEW.break_time;
#IF Overlapped ELSE
IF((v_timeid IS NOT NULL AND v_timeout IS NOT NULL) AND timestamp_to_date(v_timeout) = timestamp_to_date(add_day_to_timestamp(NEW.date, 1)))THEN
IF(v_timeid < add_day_to_timestamp(NEW.date, 1))THEN
-- SET night_diff = get_total_night_diff(add_day_to_timestamp(NEW.date, 1),v_timeout,expected_work_start_datetime,expected_work_end_datetime,night_diff_start_datetime,night_diff_end_datetime);
-- SET night_diff_overlapped = get_total_night_diff(v_timeid,add_day_to_timestamp(NEW.date, 1),expected_work_start_datetime,expected_work_end_datetime,night_diff_start_datetime,night_diff_end_datetime);
SET night_diff_overlapped = get_total_night_diff(add_day_to_timestamp(NEW.date, 1),v_timeout,expected_work_start_datetime,expected_work_end_datetime,night_diff_start_datetime,night_diff_end_datetime);
SET night_diff = get_total_night_diff(v_timeid,add_day_to_timestamp(NEW.date, 1),expected_work_start_datetime,expected_work_end_datetime,night_diff_start_datetime,night_diff_end_datetime);
ELSE 
SET night_diff = get_total_night_diff(v_timeid,v_timeout,expected_work_start_datetime,expected_work_end_datetime,night_diff_start_datetime,night_diff_end_datetime);
 END IF;
ELSE
SET night_diff = get_total_night_diff(v_timeid,v_timeout,expected_work_start_datetime,expected_work_end_datetime,night_diff_start_datetime,night_diff_end_datetime);
END IF;
IF(NEW.break_time IS NOT NULL AND NEW.break_time > 0)THEN
IF(v_timeid IS NOT NULL AND v_timeout IS NOT NULL) THEN
     SET renderedtime = v_timeout - v_timeid;
ELSE
SET renderedtime = 0;
END IF;

SET getRequiredHalfDayTime = (getrequiredtime / 2) - (NEW.break_time / 2);

IF(renderedtime > (getRequiredHalfDayTime + NEW.break_time))THEN



  # If the Break Start and End Da te is NOT the same day, compute for Night Diff. Break Time for the Night Diff. and Overlapped Night Diff.
  IF(timestamp_to_date(break_start_datetime ) != timestamp_to_date(break_end_datetime ))THEN
 
# Compute Night Diff. Break Time for Day 1 by setting the (Time Start = Break Start-Datetime) and (Time End = 12 Midnight of the Next Day).
 SET night_diff_break_time = get_total_night_diff(break_start_datetime,add_day_to_timestamp(NEW.date, 1),expected_work_start_datetime,expected_work_end_datetime,night_diff_start_datetime,night_diff_end_datetime);
# Compute Night Diff. Break Time for Day 2 by setting the (Time Start = 12 Midnight of the Next Day) and (Time End = Break End-Datetime).
SET night_diff_overlapped_break_time = get_total_night_diff(add_day_to_timestamp(NEW.date, 1),break_end_datetime,expected_work_start_datetime,expected_work_end_datetime,night_diff_start_datetime,night_diff_end_datetime);
# Deduct the computed Break Times respectively.
   SET  night_diff = night_diff - night_diff_break_time;
   SET  night_diff_overlapped  = night_diff_overlapped - night_diff_overlapped_break_time;
# If the Break Start and End Date is the same day, compute for Night Diff. Break Time and deduct it on the correct Date.
                    # Break Start-Datetime will represent the Break Date.

ELSE
SET night_diff_break_time = get_total_night_diff(break_start_datetime,break_end_datetime,expected_work_start_datetime,expected_work_end_datetime,night_diff_start_datetime,night_diff_end_datetime);
# If the DTR has Overlapped Time Logs AND Time-Out has the SAME DAY from the Break Date, deduct it from the Night. Diff. Overlapped (Day 2)
IF(((v_timeid IS NOT NULL AND v_timeout IS NOT NULL) AND (timestamp_to_date(v_timeout) = timestamp_to_date(add_day_to_timestamp(NEW.date, 1)))) AND (timestamp_to_date( v_timeout) = timestamp_to_date(break_start_datetime)))THEN
 SET night_diff_overlapped  = night_diff_overlapped - night_diff_break_time;
# else, deduct it from the Night Diff.
ELSE
  SET night_diff = night_diff - night_diff_break_time;
   END IF;
  END IF;
 END IF;
END IF;

IF(night_diff < 0 OR night_diff > 28800) THEN
   SET night_diff = 0;
END IF;
IF(night_diff_overlapped < 0 OR night_diff_overlapped > 28800)THEN
  SET night_diff_overlapped = 0;
END IF;
IF(night_diff > 0)THEN
 SET night_diffhours = night_diff / 3600;

END IF;
IF(night_diff_overlapped > 0)THEN
 SET night_diff_overlappedhours = night_diff_overlapped / 3600;
 END IF;
 

 
IF NOT EXISTS (SELECT 1 From drt_summary_report WHERE  user_id=NEW.user_id And login_date=NEW.date )
  THEN
 IF(dtr_type = 'reg')THEN 
INSERT INTO drt_summary_report(login_date,user_id,reg_night_diff,reg_night_diff_overlapp)VALUES(NEW.date,NEW.user_id,night_diffhours,night_diff_overlappedhours);
 # SELECT dtrs.date,team_users.user_id,team_handlers.user_id,night_diffhours,night_diff_overlappedhours FROM dtrs INNER JOIN team_users ON  dtrs.user_id = team_users.user_id INNER JOIN team_handlers ON team_users.team_id = team_handlers.team_id WHERE dtrs.id=NEW.id;
  ELSEIF(dtr_type = 'rd')THEN
INSERT INTO drt_summary_report(login_date,user_id,rd_night_diff,rd_night_diff_overlapp)VALUES(NEW.date,NEW.user_id,night_diffhours,night_diff_overlappedhours);
 # SELECT dtrs.date,team_users.user_id,team_handlers.user_id,night_diffhours,night_diff_overlappedhours FROM dtrs INNER JOIN team_users ON  dtrs.user_id = team_users.user_id INNER JOIN team_handlers ON team_users.team_id = team_handlers.team_id WHERE dtrs.id=NEW.id;
  ELSEIF(dtr_type = 'sh')THEN
  
INSERT INTO drt_summary_report(login_date,user_id,sh_night_diff,sh_night_diff_overlapp)VALUES(NEW.date,NEW.user_id,night_diffhours,night_diff_overlappedhours);

# SELECT dtrs.date,team_users.user_id,team_handlers.user_id,night_diffhours,night_diff_overlappedhours FROM dtrs INNER JOIN team_users ON  dtrs.user_id = team_users.user_id INNER JOIN team_handlers ON team_users.team_id = team_handlers.team_id WHERE dtrs.id=NEW.id;
  ELSEIF(dtr_type = 'lh')THEN
 INSERT INTO drt_summary_report(login_date,user_id,sh_night_diff,sh_night_diff_overlapp)VALUE(NEW.date,NEW.user_id,night_diffhours,night_diff_overlappedhours);

 
 # SELECT dtrs.date,team_users.user_id,team_handlers.user_id,night_diff,night_diff_overlappedhours FROM dtrs INNER JOIN team_users ON  dtrs.user_id = team_users.user_id INNER JOIN team_handlers ON team_users.team_id = team_handlers.team_id WHERE dtrs.id=NEW.id;
  ELSEIF(dtr_type = 'dsh')THEN
 INSERT INTO drt_summary_report(login_date,user_id,dsh_night_diff,dsh_night_diff_overlapp)VALUE(NEW.date,NEW.user_id,night_diffhours,night_diff_overlappedhours);
  #SELECT dtrs.date,team_users.user_id,team_handlers.user_id,night_diffhours,night_diff_overlappedhours FROM dtrs INNER JOIN team_users ON  dtrs.user_id = team_users.user_id INNER JOIN team_handlers ON team_users.team_id = team_handlers.team_id WHERE dtrs.id=NEW.id;
  ELSEIF(dtr_type = 'dlh')THEN
INSERT INTO drt_summary_report(login_date,user_id,dlh_night_diff,dlh_night_diff_overlapp)VALUE(NEW.date,NEW.user_id,night_diffhours,night_diff_overlappedhours);
  #SELECT dtrs.date,team_users.user_id,team_handlers.user_id,night_diffhours,night_diff_overlappedhours FROM dtrs INNER JOIN team_users ON  dtrs.user_id = team_users.user_id INNER JOIN team_handlers ON team_users.team_id = team_handlers.team_id WHERE dtrs.id=NEW.id;
  ELSEIF(dtr_type = 'slh')THEN
INSERT INTO drt_summary_report(login_date,user_id,slh_night_diff,slh_night_diff_overlapp)VALUE(NEW.date,NEW.user_id,night_diffhours,night_diff_overlappedhours);
  #SELECT dtrs.date,team_users.user_id,team_handlers.user_id,night_diffhours,night_diff_overlappedhours FROM dtrs INNER JOIN team_users ON  dtrs.user_id = team_users.user_id INNER JOIN team_handlers ON team_users.team_id = team_handlers.team_id WHERE dtrs.id=NEW.id;
  END IF;
ELSEIF EXISTS(SELECT 1 From drt_summary_report WHERE  user_id=NEW.user_id And login_date=NEW.date) THEN
IF(dtr_type = 'reg')THEN 
UPDATE drt_summary_report SET drt_summary_report.reg_night_diff = night_diffhours,drt_summary_report.reg_night_diff_overlapp = night_diff_overlappedhours WHERE drt_summary_report.user_id=NEW.user_id AND drt_summary_report.login_date=NEW.date;
ELSEIF(dtr_type = 'rd')THEN 
UPDATE drt_summary_report SET drt_summary_report.rd_night_diff = night_diffhours,drt_summary_report.rd_night_diff_overlapp = night_diff_overlappedhours WHERE drt_summary_report.user_id=NEW.user_id AND drt_summary_report.login_date=NEW.date;

ELSEIF(dtr_type = 'sh')THEN 
UPDATE drt_summary_report SET drt_summary_report.sh_night_diff = night_diffhours,drt_summary_report.sh_night_diff_overlapp = night_diff_overlappedhours WHERE drt_summary_report.user_id=NEW.user_id AND drt_summary_report.login_date=NEW.date;

ELSEIF(dtr_type = 'lh')THEN 
UPDATE drt_summary_report SET drt_summary_report.lh_night_diff = night_diffhours,drt_summary_report.lh_night_diff_overlapp = night_diff_overlappedhours WHERE drt_summary_report.user_id=NEW.user_id AND drt_summary_report.login_date=NEW.date;

ELSEIF(dtr_type = 'dsh')THEN 
UPDATE drt_summary_report SET drt_summary_report.dsh_night_diff = night_diffhours,drt_summary_report.dsh_night_diff_overlapp = night_diff_overlappedhours WHERE drt_summary_report.user_id=NEW.user_id AND drt_summary_report.login_date=NEW.date;
ELSEIF(dtr_type = 'dlh')THEN 
UPDATE drt_summary_report SET drt_summary_report.dlh_night_diff = night_diffhours,drt_summary_report.dlh_night_diff_overlapp = night_diff_overlappedhours WHERE drt_summary_report.user_id=NEW.user_id AND drt_summary_report.login_date=NEW.date;
ELSEIF(dtr_type = 'slh')THEN 
UPDATE drt_summary_report SET drt_summary_report.slh_night_diff = night_diffhours,drt_summary_report.slh_night_diff_overlapp = night_diff_overlappedhours WHERE drt_summary_report.user_id=NEW.user_id AND drt_summary_report.login_date=NEW.date;
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
INSERT INTO drt_summary_report(login_date,user_id,sh_night_diff_overlapp)VALUES(get_next_date,NEW.user_id,night_diff_overlappedhours);
update drt_summary_report SET nigdiff_stauts=0 ,render_status=0,status=2 Where login_date=NEW.date AND user_id=NEW.user_id;  
END IF;
 IF(pre_dtr_type = 'lh') THEN
 INSERT INTO drt_summary_report(login_date,user_id,lh_night_diff_overlapp)VALUES(get_next_date,NEW.user_id,night_diff_overlappedhours);
 update drt_summary_report SET nigdiff_stauts=0 ,render_status=0,status=2 Where login_date=NEW.date AND user_id=NEW.user_id;  
 END IF;
 ELSE
  IF(pre_dtr_type = 'sh') THEN
UPDATE drt_summary_report SET drt_summary_report.sh_night_diff_overlapp = night_diff_overlappedhours WHERE drt_summary_report.user_id=NEW.user_id AND drt_summary_report.login_date=get_next_date;
update drt_summary_report SET nigdiff_stauts=0 ,render_status=0,status=2 Where login_date=NEW.date AND user_id=NEW.user_id;  
END IF;
 IF(pre_dtr_type = 'lh') THEN
 UPDATE drt_summary_report SET drt_summary_report.lh_night_diff_overlapp = night_diff_overlappedhours WHERE drt_summary_report.user_id=NEW.user_id AND drt_summary_report.login_date=get_next_date;
 update drt_summary_report SET nigdiff_stauts=0 ,render_status=0,status=2 Where login_date=NEW.date AND user_id=NEW.user_id;  
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
        DB::unprepared("DROP TRIGGER 'onupdate_nightdiff'");
    }
}
