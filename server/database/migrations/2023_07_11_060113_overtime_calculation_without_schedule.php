<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class OvertimeCalculationWithoutSchedule extends Migration
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
        DROP TRIGGER IF EXISTS overtimes_without_schedule_employees;
        CREATE TRIGGER overtimes_without_schedule_employees AFTER UPDATE ON overtimes FOR EACH ROW BEGIN
DECLARE overtime integer DEFAULT 0;
DECLARE overtime_night_diff integer DEFAULT 0;
DECLARE overtime_underlapped integer DEFAULT 0;
DECLARE overtime_night_diff_underlapped integer DEFAULT 0;
DECLARE overtime_overlapped integer DEFAULT 0;
DECLARE overtime_night_diff_overlapped integer DEFAULT 0;
DECLARE overtime_start_datetime integer DEFAULT 0;
DECLARE overtime_end_datetime integer DEFAULT 0;
DECLARE start_time integer DEFAULT 0;
DECLARE amount integer DEFAULT 0;
DECLARE date_to_compare integer;
DECLARE night_diff_start_datetime integer DEFAULT 0;
DECLARE night_diff_end_datetime integer DEFAULT 0;
DECLARE totalovertime  DECIMAL(10,2) DEFAULT 0.00;
DECLARE totalovertimenightdiff  DECIMAL(10,2) DEFAULT 0.00;
DECLARE sectohrs DECIMAL(10,2);
DECLARE dtr_type varchar(20);
DECLARE v_timeid bigint;
DECLARE v_timeout bigint;
DECLARE timelog varchar(20);
DECLARE dtr_timein bigint;
DECLARE dtr_timeout bigint;
DECLARE dtr_id int; 
DECLARE country_id varchar(20);
DECLARE dtr_isrestday INT(20);
 
 SET country_id = (Select country_id From users where id=New.user_id);
 SET timelog = (Select time_difference from utc_timelog tl
 JOIN users u ON u.country_id = tl.country_id 
 WHERE u.id=NEW.user_id);
 
 SET dtr_timein = (select time_in from dtr_collective_punch where user_id=NEW.user_id and date=NEW.date order by id asc limit 1);
 SET dtr_timeout = (select time_out from dtr_collective_punch where user_id=NEW.user_id and date=NEW.date order by id desc limit 1);
 
 SET v_timeid = UNIX_TIMESTAMP(CONVERT_TZ(FROM_UNIXTIME(dtr_timein), @@session.time_zone, timelog ));
 SET v_timeout = UNIX_TIMESTAMP(CONVERT_TZ(FROM_UNIXTIME(dtr_timeout), @@session.time_zone, timelog ));
 
 
SET dtr_type = get_dtrtype_without_schedule(NEW.date,country_id,NEW.user_id);
SET dtr_isrestday = (Select COUNT(*) FROM rest_day_works Where date=NEW.date and user_id=NEW.user_id and status='approved');

IF(New.status='declined' and Not exists (Select 1 From overtimes where status='approved' and date=New.date and user_id=new.user_id and amount > 0 ))
THEN

IF(dtr_type = 'reg')THEN 
UPDATE drt_summary_report SET drt_summary_report.reg_overtime = totalovertime,drt_summary_report.reg_overtime_night_diff = totalovertimenightdiff WHERE user_id=NEW.user_id And login_date=NEW.date;
ELSEIF(dtr_type = 'rd')THEN 
UPDATE drt_summary_report SET drt_summary_report.rd_overtime = totalovertime,drt_summary_report.rd_overtime_night_diff = totalovertimenightdiff WHERE user_id=NEW.user_id And login_date=NEW.date;
ELSEIF(dtr_type = 'sh')THEN 
-- adding condition if that's a rest day then the over time hours got update
IF(dtr_isrestday>0) THEN
UPDATE drt_summary_report SET drt_summary_report.rd_overtime = totalovertime,drt_summary_report.rd_overtime_night_diff = totalovertimenightdiff WHERE user_id=NEW.user_id And login_date=NEW.date;
END IF;
UPDATE drt_summary_report SET drt_summary_report.sh_overtime = totalovertime,drt_summary_report.sh_overtime_night_diff = totalovertimenightdiff WHERE user_id=NEW.user_id And login_date=NEW.date;
ELSEIF(dtr_type = 'lh')THEN 
-- adding condition if that's a rest day then the over time hours got update
IF(dtr_isrestday>0) THEN
UPDATE drt_summary_report SET drt_summary_report.rd_overtime = totalovertime,drt_summary_report.rd_overtime_night_diff = totalovertimenightdiff WHERE user_id=NEW.user_id And login_date=NEW.date;
END IF;
UPDATE drt_summary_report SET drt_summary_report.lh_overtime = totalovertime,drt_summary_report.lh_overtime_night_diff = totalovertimenightdiff WHERE user_id=NEW.user_id And login_date=NEW.date;
ELSEIF(dtr_type = 'dsh')THEN 
-- adding condition if that's a rest day then the over time hours got update
IF(dtr_isrestday>0) THEN
UPDATE drt_summary_report SET drt_summary_report.rd_overtime = totalovertime,drt_summary_report.rd_overtime_night_diff = totalovertimenightdiff WHERE user_id=NEW.user_id And login_date=NEW.date;
END IF;
UPDATE drt_summary_report SET drt_summary_report.dsh_overtime = totalovertime,drt_summary_report.dsh_overtime_night_diff = totalovertimenightdiff WHERE user_id=NEW.user_id And login_date=NEW.date;
ELSEIF(dtr_type = 'dlh')THEN 
-- adding condition if that's a rest day then the over time hours got update
IF(dtr_isrestday>0) THEN
UPDATE drt_summary_report SET drt_summary_report.rd_overtime = totalovertime,drt_summary_report.rd_overtime_night_diff = totalovertimenightdiff WHERE user_id=NEW.user_id And login_date=NEW.date;
END IF;
UPDATE drt_summary_report SET drt_summary_report.dlh_overtime = totalovertime,drt_summary_report.dlh_overtime_night_diff = totalovertimenightdiff WHERE user_id=NEW.user_id And login_date=NEW.date;
ELSEIF(dtr_type = 'slh')THEN 
-- adding condition if that's a rest day then the over time hours got update
IF(dtr_isrestday>0) THEN
UPDATE drt_summary_report SET drt_summary_report.rd_overtime = totalovertime,drt_summary_report.rd_overtime_night_diff = totalovertimenightdiff WHERE user_id=NEW.user_id And login_date=NEW.date;
END IF;
UPDATE drt_summary_report SET drt_summary_report.slh_overtime = totalovertime,drt_summary_report.slh_overtime_night_diff = totalovertimenightdiff WHERE user_id=NEW.user_id And login_date=NEW.date;
END IF;

END IF;

 IF(New.status='approved') THEN
#If the Overtime Type is a Pre-Overtime.
   IF(New.type = 'pre_overtime')THEN
	SET start_time = v_timeid;
      # Set the Overtime Start-Datetime by subtracting the Overtime Amount from the Actual Time Start-Datetime.
    SET overtime_start_datetime = start_time - New.amount;
#Set the Overtime End-Datetime using the Actual Time Start-Datetime.
    SET overtime_end_datetime   = start_time;
# Sets the Date to compare to 12AM of the current Day
    SET date_to_compare = add_day_to_timestamp(NEW.date,0);
#If the Overtime Type is a Post-Overtime.
 
ELSEIF(New.type = 'post_overtime')THEN
     SET start_time = v_timeout;
     SET overtime_start_datetime = start_time;
     SET overtime_end_datetime   = start_time + NEW.amount;
 # Sets the Date to compare to 12AM of the Next Day
     SET date_to_compare = add_day_to_timestamp(NEW.date, 1);
END IF;
IF(add_time_to_timestamp(NEW.date,'06:00') < overtime_start_datetime)THEN
   SET night_diff_start_datetime = add_time_to_timestamp(NEW.date, '22:00');
   SET night_diff_end_datetime = add_time_to_timestamp(add_day_to_timestamp(NEW.date, 1),'06:00');
  ELSE
   SET night_diff_start_datetime = add_time_to_timestamp(subtract_days_from_timestamp(NEW.date, 1),'22:00' );
   SET night_diff_end_datetime = add_time_to_timestamp(NEW.date,'06:00');
END IF;
# If Overtime Start and End-Datetime is within the same Date.
 
      
 IF(timestamp_to_date(overtime_start_datetime) = NEW.date AND
                    timestamp_to_date(overtime_start_datetime) = timestamp_to_date(overtime_end_datetime))THEN
# Compute the Overtime Night Diff. of Day 1 by setting the (Time Start = Overtime Start-Datetime) and (Time End = Overtime End-Datetime).
  
                  SET overtime_night_diff =get_total_night_diff(overtime_start_datetime,overtime_end_datetime,0,0,night_diff_start_datetime,night_diff_end_datetime);
# Compute the Overtime of Day 1 by getting the difference between Overtime Start and End-Datetime and subtracting the Overtime Night Diff. from the total.
                  SET overtime = (overtime_end_datetime - overtime_start_datetime) - overtime_night_diff;
ELSE 
# Discern if the Overtime Start-Datetime is BEFORE the Date to Compare, compute for Overtime, Overtime Night Diff., Overtime Night Diff. Overlapped, and Overtime Overlapped.
   IF(overtime_start_datetime < date_to_compare)THEN
  
# If the Overtime Request is a Pre-Overtime AND the Overtime Start-Datetime started before the Current DTR Date (Previous Day), Compute for Underlapped Details. 
   IF(new.type = 'pre_overtime' AND
  overtime_start_datetime < add_day_to_timestamp(NEW.date,0))THEN
  
# Compute the Overtime Night Diff. Underlapped of Day 0 by setting the getting the difference between Overtime Start-Datetime AND 12 Midnight of the Next Day.
            SET overtime_night_diff_underlapped =get_total_night_diff(overtime_start_datetime,date_to_compare,0,0,night_diff_start_datetime,night_diff_end_datetime);
# Compute the Overtime Underlapped of Day 0 by getting the difference between Overtime Start and End-Datetime and subtracting the Overtime Night Diff. from the total.
            SET overtime_underlapped = (date_to_compare - overtime_start_datetime) - overtime_night_diff_underlapped;
# Compute the Overtime Night Diff. of Day 1 by getting the difference between 12 Midnight of the Next Day AND Overtime End-Datetime.
            SET overtime_night_diff =get_total_night_diff(date_to_compare,overtime_end_datetime,0,0,night_diff_start_datetime,night_diff_end_datetime);
# Compute the Overtime  of Day 1 by getting the difference between Overtime Start and End-Datetime and subtracting the Overtime Night Diff. from the total.
          SET overtime = (overtime_end_datetime - date_to_compare) - overtime_night_diff;
ELSE
  
# Compute the Overtime Night Diff. of Day 1 by setting the getting the difference between Overtime Start-Datetime AND 12 Midnight of the Next Day.
      SET overtime_night_diff = get_total_night_diff(overtime_start_datetime,date_to_compare,0,0,night_diff_start_datetime,night_diff_end_datetime);
# Compute the Overtime of Day 1 by getting the difference between Overtime Start and End-Datetime and subtracting the Overtime Night Diff. from the total.
      SET overtime = (date_to_compare - overtime_start_datetime) - overtime_night_diff;
# Compute the Overtime Night Diff. Overlapped of Day 2 by getting the difference between 12 Midnight of the Next Day AND Overtime End-Datetime.
     SET overtime_night_diff_overlapped = get_total_night_diff(date_to_compare,overtime_end_datetime,0,0,night_diff_start_datetime,night_diff_end_datetime);
# Compute the Overtime Overlapped of Day 2 by getting the difference between Overtime Start and End-Datetime and subtracting the Overtime Night Diff. from the total.
     SET overtime_overlapped = (overtime_end_datetime - date_to_compare) - overtime_night_diff_overlapped;
END IF;
# Discern if the Time In is BEYOND the 12AM of the Next Day, compute for Overtime Night Diff. Overlapped and Overtime Overlapped only.
       ELSE                       
# Compute the Overtime Night Diff. Overlapped of Day 2 by getting the difference between 12 Midnight of the Next Day AND Overtime End-Datetime.
      SET overtime_night_diff_overlapped = get_total_night_diff(overtime_start_datetime,overtime_end_datetime,0,0,night_diff_start_datetime,night_diff_end_datetime);
# Compute the Overtime Overlapped of Day 2 by getting the difference between Overtime Start and End-Datetime and subtracting the Overtime Night Diff. from the total.
     SET overtime_overlapped = (overtime_end_datetime - overtime_start_datetime) - overtime_night_diff_overlapped;
     
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
    IF NOT EXISTS (SELECT 1 From drt_summary_report WHERE  user_id=NEW.user_id AND login_date=NEW.date )
  THEN
 IF(dtr_type = 'reg')THEN 
INSERT INTO drt_summary_report(login_date,user_id,reg_overtime,reg_overtime_night_diff)VALUES(NEW.date,NEW.user_id,totalovertime,totalovertimenightdiff);
  ELSEIF(dtr_type = 'rd')THEN
INSERT INTO drt_summary_report(login_date,user_id,rd_overtime,rd_overtime_night_diff)VALUES(NEW.date,NEW.user_id,totalovertime,totalovertimenightdiff);
  ELSEIF(dtr_type = 'sh')THEN
  -- adding condition if that's a rest day then the over time hours got update
IF(dtr_isrestday>0) THEN
 INSERT INTO drt_summary_report(login_date,user_id,sh_overtime,sh_overtime_night_diff,rd_overtime,rd_overtime_night_diff)VALUES(NEW.date,NEW.user_id,totalovertime,totalovertimenightdiff,totalovertime,totalovertimenightdiff);
 else
  INSERT INTO drt_summary_report(login_date,user_id,sh_overtime,sh_overtime_night_diff)VALUES(NEW.date,NEW.user_id,totalovertime,totalovertimenightdiff);
   END IF;
  ELSEIF(dtr_type = 'lh')THEN
  IF(dtr_isrestday>0) THEN
 INSERT INTO drt_summary_report(login_date,user_id,lh_overtime,lh_overtime_night_diff,rd_overtime,rd_overtime_night_diff)VALUES(NEW.date,NEW.user_id,totalovertime,totalovertimenightdiff,totalovertime,totalovertimenightdiff);
 else
 INSERT INTO drt_summary_report(login_date,user_id,lh_overtime,lh_overtime_night_diff)VALUES(NEW.date,NEW.user_id,totalovertime,totalovertimenightdiff);
 end if;
  ELSEIF(dtr_type = 'dsh')THEN
    IF(dtr_isrestday>0) THEN
 INSERT INTO drt_summary_report(login_date,user_id,dsh_overtime,dsh_overtime_night_diff,rd_overtime,rd_overtime_night_diff)VALUES(NEW.date,NEW.user_id,totalovertime,totalovertimenightdiff,totalovertime,totalovertimenightdiff);
 else
 INSERT INTO drt_summary_report(login_date,user_id,dsh_overtime,dsh_overtime_night_diff)VALUES(NEW.date,NEW.user_id,totalovertime,totalovertimenightdiff);
 end if;
  ELSEIF(dtr_type = 'dlh')THEN
     IF(dtr_isrestday>0) THEN
 INSERT INTO drt_summary_report(login_date,user_id,dlh_overtime,dlh_overtime_night_diff,rd_overtime,rd_overtime_night_diff)VALUES(NEW.date,NEW.user_id,totalovertime,totalovertimenightdiff,totalovertime,totalovertimenightdiff);
 else
INSERT INTO drt_summary_report(login_date,user_id,dlh_overtime,dlh_overtime_night_diff)VALUES(NEW.date,NEW.user_id,totalovertime,totalovertimenightdiff);
end if;
  ELSEIF(dtr_type = 'dsl')THEN
    IF(dtr_isrestday>0) THEN
 INSERT INTO drt_summary_report(login_date,user_id,dsl_overtime,dsl_overtime_night_diff,rd_overtime,rd_overtime_night_diff)VALUES(NEW.date,NEW.user_id,totalovertime,totalovertimenightdiff,totalovertime,totalovertimenightdiff);
 else
INSERT INTO drt_summary_report(login_date,user_id,dsl_overtime,dsl_overtime_night_diff)VALUES(NEW.date,NEW.user_id,totalovertime,totalovertimenightdiff);
end if;
  END IF;
ELSEIF EXISTS(SELECT 1 From drt_summary_report WHERE  user_id=NEW.user_id And login_date=NEW.date) THEN
IF(dtr_type = 'reg')THEN 
UPDATE drt_summary_report SET drt_summary_report.reg_overtime = totalovertime,drt_summary_report.reg_overtime_night_diff = totalovertimenightdiff WHERE user_id=NEW.user_id And login_date=NEW.date;
ELSEIF(dtr_type = 'rd')THEN 
UPDATE drt_summary_report SET drt_summary_report.rd_overtime = totalovertime,drt_summary_report.rd_overtime_night_diff = totalovertimenightdiff WHERE user_id=NEW.user_id And login_date=NEW.date;
ELSEIF(dtr_type = 'sh')THEN 
-- adding condition if that's a rest day then the over time hours got update
IF(dtr_isrestday>0) THEN
UPDATE drt_summary_report SET drt_summary_report.rd_overtime = totalovertime,drt_summary_report.rd_overtime_night_diff = totalovertimenightdiff WHERE user_id=NEW.user_id And login_date=NEW.date;
END IF;
UPDATE drt_summary_report SET drt_summary_report.sh_overtime = totalovertime,drt_summary_report.sh_overtime_night_diff = totalovertimenightdiff WHERE user_id=NEW.user_id And login_date=NEW.date;
ELSEIF(dtr_type = 'lh')THEN 
-- adding condition if that's a rest day then the over time hours got update
IF(dtr_isrestday>0) THEN
UPDATE drt_summary_report SET drt_summary_report.rd_overtime = totalovertime,drt_summary_report.rd_overtime_night_diff = totalovertimenightdiff WHERE user_id=NEW.user_id And login_date=NEW.date;
END IF;
UPDATE drt_summary_report SET drt_summary_report.lh_overtime = totalovertime,drt_summary_report.lh_overtime_night_diff = totalovertimenightdiff WHERE user_id=NEW.user_id And login_date=NEW.date;
ELSEIF(dtr_type = 'dsh')THEN 
-- adding condition if that's a rest day then the over time hours got update
IF(dtr_isrestday>0) THEN
UPDATE drt_summary_report SET drt_summary_report.rd_overtime = totalovertime,drt_summary_report.rd_overtime_night_diff = totalovertimenightdiff WHERE user_id=NEW.user_id And login_date=NEW.date;
END IF;
UPDATE drt_summary_report SET drt_summary_report.dsh_overtime = totalovertime,drt_summary_report.dsh_overtime_night_diff = totalovertimenightdiff WHERE user_id=NEW.user_id And login_date=NEW.date;
ELSEIF(dtr_type = 'dlh')THEN 
-- adding condition if that's a rest day then the over time hours got update
IF(dtr_isrestday>0) THEN
UPDATE drt_summary_report SET drt_summary_report.rd_overtime = totalovertime,drt_summary_report.rd_overtime_night_diff = totalovertimenightdiff WHERE user_id=NEW.user_id And login_date=NEW.date;
END IF;
UPDATE drt_summary_report SET drt_summary_report.dlh_overtime = totalovertime,drt_summary_report.dlh_overtime_night_diff = totalovertimenightdiff WHERE user_id=NEW.user_id And login_date=NEW.date;
ELSEIF(dtr_type = 'slh')THEN 
-- adding condition if that's a rest day then the over time hours got update
IF(dtr_isrestday>0) THEN
UPDATE drt_summary_report SET drt_summary_report.rd_overtime = totalovertime,drt_summary_report.rd_overtime_night_diff = totalovertimenightdiff WHERE user_id=NEW.user_id And login_date=NEW.date;
END IF;
UPDATE drt_summary_report SET drt_summary_report.slh_overtime = totalovertime,drt_summary_report.slh_overtime_night_diff = totalovertimenightdiff WHERE user_id=NEW.user_id And login_date=NEW.date;
END IF;
  END IF;
  
  END IF;
END
        ");
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        //
    }
}
