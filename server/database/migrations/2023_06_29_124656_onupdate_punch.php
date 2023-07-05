<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class OnupdatePunch extends Migration
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
        DROP TRIGGER IF EXISTS onupdate_punch;
        CREATE TRIGGER onupdate_punch AFTER UPDATE ON dtr_collective_punch_history FOR EACH ROW BEGIN
        DECLARE v_timeid bigint;
        DECLARE v_timeout bigint;
        DECLARE timelog varchar(20);
        DECLARE rendered_hours integer DEFAULT 0;
        DECLARE rendered_hours_overlapped integer DEFAULT 0;
        
        SET timelog = (Select time_difference from utc_timelog tl
        JOIN users u ON u.country_id = tl.country_id 
        WHERE u.id=NEW.user_id);
        
         SET v_timeid = UNIX_TIMESTAMP(CONVERT_TZ(FROM_UNIXTIME(NEW.time_in), @@session.time_zone, timelog ));
         SET v_timeout = UNIX_TIMESTAMP(CONVERT_TZ(FROM_UNIXTIME(NEW.time_out), @@session.time_zone, timelog ));
         
         IF NOT EXISTS(SELECT 1 From dtr_collective_punch WHERE dtr_collective_punch_history_id=NEW.id) THEN
         INSERT INTO dtr_collective_punch(date,dtr_collective_punch_history_id,user_id,time_in,time_out,duration)
         VALUES(NEW.date,NEW.id,NEW.user_id,NEW.time_in,New.time_out,if(New.time_out IS NOT Null,New.time_out - New.time_in,null));
         ELSE
         UPDATE dtr_collective_punch SET date=New.date,dtr_collective_punch_history_id=New.id,user_id=New.user_id,
         time_in=New.time_in,time_out=New.time_out,duration=if(time_out IS NOT Null,New.time_out - New.time_in,null)
         WHERE dtr_collective_punch_history_id = New.id;
         END IF;
         # if overlapped 
        IF((v_timeid IS NOT NULL AND v_timeout IS NOT NULL) AND timestamp_to_date(v_timeout) <> timestamp_to_date(add_day_to_timestamp(NEW.date, 1)) AND timestamp_to_date(v_timeid) =  timestamp_to_date(v_timeout))THEN
         # if not overlapped
        SET rendered_hours = v_timeout - v_timeid; 
        ELSE
        IF(v_timeid < add_day_to_timestamp(NEW.date, 1))THEN 
        # Gets the Rendered Hours for the Day 1 of the DTR. (Actual Start Datetime to Day 2 12AM)
          SET rendered_hours = add_day_to_timestamp(NEW.date, 1) - v_timeid;
        # Gets the Rendered Hours for the Day 2 of the DTR. (Day 2 12AM to Actual End Datetime)
          SET rendered_hours_overlapped = v_timeout - add_day_to_timestamp(NEW.date, 1);
        ELSE
        # Gets the Rendered Hours for the Day 2 of the DTR. (Actual Start Datetime to Actual End Datetime)
          SET rendered_hours_overlapped = v_timeout - v_timeid;
        END IF;
        END IF;
        IF(rendered_hours > 0  OR rendered_hours_overlapped > 0)THEN
        UPDATE dtr_collective_punch SET render_hours=rendered_hours,render_hours_overlapp=rendered_hours_overlapped
        WHERE dtr_collective_punch_history_id = New.id;
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
