<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class RestdayworkProcess extends Migration
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
        DROP TRIGGER IF EXISTS RestDay_DTR_Update;
        CREATE TRIGGER RestDay_DTR_Update AFTER UPDATE ON rest_day_works FOR EACH ROW BEGIN

 DECLARE v_time_in bigint;
 DECLARE v_time_out bigint;
 DECLARE v_id bigint;
 DECLARE get_next_date varchar(20);
 DECLARE pre_dtr_type varchar(20);
 DECLARE v_country_id varchar(20);
 DECLARE rest_day_work INT(20);
 
 SET v_country_id = (Select country_id From users where id=New.user_id);
 SET v_time_in = (select time_in from dtr_collective_punch where user_id=NEW.user_id AND date=NEW.date order by id desc limit 1);
 SET v_time_out = (select time_out from dtr_collective_punch where user_id=NEW.user_id AND date=NEW.date order by id desc limit 1);
 SET v_id = (select id from dtr_collective_punch where user_id=NEW.user_id AND date=NEW.date order by id desc limit 1);
 
-- Check the status if it's declaiend then the following block will execute

SET get_next_date = NEW.date + interval 1 day;

SET pre_dtr_type = get_dtrtype_without_schedule(get_next_date,v_country_id,NEW.user_id);

IF (pre_dtr_type = 'lh' OR pre_dtr_type ='sh')THEN
SET rest_day_work = (Select COUNT(*) FROM rest_day_works Where date=get_next_date and user_id=NEW.user_id and status='approved');
IF (rest_day_work = 0)THEN
UPDATE drt_summary_report SET rd_night_diff=0.00,rd_night_diff_overlapp=0.00,
rd_rendered_hours=0.00,rd_rendered_hours_overlapp=0.00 ,
updated_at=now() 
WHERE user_id=NEW.user_id AND login_date=get_next_date;
END IF;
END IF;

UPDATE drt_summary_report SET rd_night_diff=0.00,rd_night_diff_overlapp=0.00,
rd_rendered_hours=0.00,rd_rendered_hours_overlapp=0.00 ,
updated_at=now() 
WHERE user_id=NEW.user_id AND login_date=NEW.date;
 
UPDATE drt_summary_report SET  reg_night_diff=0.00,reg_night_diff_overlapp=0.00,
reg_rendered_hours=0.00,reg_rendered_hours_overlapp=0.00,sh_night_diff=0.00,sh_night_diff_overlapp=0.00,
sh_rendered_hours=0.00,sh_rendered_hours_overlapp=0.00, lh_night_diff=0.00,lh_night_diff_overlapp=0.00,
lh_rendered_hours=0.00,lh_rendered_hours_overlapp=0.00, dsh_night_diff=0.00,dsh_night_diff_overlapp=0.00,
dsh_rendered_hours=0.00,dsh_rendered_hours_overlapp=0.00,slh_night_diff=0.00,slh_night_diff_overlapp=0.00,
slh_rendered_hours=0.00,slh_rendered_hours_overlapp=0.00,
updated_at=now() 
WHERE user_id=NEW.user_id AND login_date=NEW.date; 

UPDATE dtr_collective_punch SET time_in=v_time_in,time_out=v_time_out where id = v_id ;
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
