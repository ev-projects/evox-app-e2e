<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class OnupdateNightDiffCal extends Migration
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
        DROP TRIGGER IF EXISTS onupdate_nightdiff_without_schedule;
        CREATE TRIGGER onupdate_nightdiff_without_schedule AFTER UPDATE ON dtr_collective_punch_history FOR EACH ROW BEGIN
DECLARE night_diff integer DEFAULT 0;
DECLARE night_diff_overlapped integer DEFAULT 0;
DECLARE night_diff_start_datetime integer DEFAULT 0;
DECLARE night_diff_end_datetime integer DEFAULT 0;
DECLARE night_diffhours DECIMAL(10,2) DEFAULT 0.00;
DECLARE night_diff_overlappedhours DECIMAL(10,2) DEFAULT 0.00;
DECLARE v_timeid bigint;
DECLARE v_timeout bigint;
DECLARE timelog varchar(20);

 
 SET timelog = (Select time_difference from utc_timelog tl
 JOIN users u ON u.country_id = tl.country_id 
 WHERE u.id=NEW.user_id);

 SET v_timeid = UNIX_TIMESTAMP(CONVERT_TZ(FROM_UNIXTIME(NEW.time_in), @@session.time_zone, timelog ));
 SET v_timeout = UNIX_TIMESTAMP(CONVERT_TZ(FROM_UNIXTIME(New.time_out), @@session.time_zone, timelog ));
 

IF(v_timeout IS NOT Null AND v_timeid Is Not Null )
 THEN

IF(add_time_to_timestamp(NEW.date,'06:00') < v_timeid)THEN
   SET night_diff_start_datetime = add_time_to_timestamp(NEW.date,'22:00');
   SET night_diff_end_datetime = add_time_to_timestamp(add_day_to_timestamp(NEW.date, 1),'06:00');
  ELSE
   SET night_diff_start_datetime = add_time_to_timestamp(subtract_days_from_timestamp(NEW.date, 1),'22:00' );
   SET night_diff_end_datetime = add_time_to_timestamp(NEW.date,'06:00');
END IF;

#IF Overlapped ELSE
IF((v_timeid IS NOT NULL AND v_timeout IS NOT NULL) AND timestamp_to_date(v_timeout) = timestamp_to_date(add_day_to_timestamp(NEW.date, 1)))THEN
IF(v_timeid < add_day_to_timestamp(NEW.date, 1))THEN
SET night_diff_overlapped = get_total_night_diff(add_day_to_timestamp(NEW.date, 1),v_timeout,Null,Null,night_diff_start_datetime,night_diff_end_datetime);
SET night_diff = get_total_night_diff(v_timeid,add_day_to_timestamp(NEW.date, 1),Null,Null,night_diff_start_datetime,night_diff_end_datetime);
ELSEIF(v_timeid >= add_day_to_timestamp(NEW.date, 1))THEN
SET night_diff_overlapped = get_total_night_diff(v_timeid,v_timeout,Null,Null,night_diff_start_datetime,night_diff_end_datetime);
ELSE
SET night_diff = get_total_night_diff(v_timeid,v_timeout,Null,Null,night_diff_start_datetime,night_diff_end_datetime);
 END IF;
ELSE
SET night_diff = get_total_night_diff(v_timeid,v_timeout,Null,Null,night_diff_start_datetime,night_diff_end_datetime);
END IF;

IF(night_diff < 0 OR night_diff > 28800) THEN
   SET night_diff = 0;
END IF;
IF(night_diff_overlapped < 0 OR night_diff_overlapped > 28800)THEN
  SET night_diff_overlapped = 0;
END IF;
IF(night_diff > 0)THEN
 SET night_diffhours = night_diff;

END IF;
IF(night_diff_overlapped > 0)THEN
 SET night_diff_overlappedhours = night_diff_overlapped;
 END IF;

END IF;
UPDATE dtr_collective_punch SET night_diff=night_diffhours,night_diff_over_lapp=night_diff_overlappedhours
WHERE dtr_collective_punch_history_id = New.id;
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
