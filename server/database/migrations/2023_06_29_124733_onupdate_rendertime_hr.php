<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class OnupdateRendertimeHr extends Migration
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
        DROP TRIGGER IF EXISTS onupdate_rendertime_hr;
        CREATE TRIGGER onupdate_rendertime_hr AFTER UPDATE ON dtr_collective_punch FOR EACH ROW BEGIN
        DECLARE rendered_hrs DOUBLE(10,2) DEFAULT 0.00;
        DECLARE rendered_hrs_overlapped DOUBLE(10,2) DEFAULT 0.00;
        DECLARE v_render_hours integer DEFAULT 0;
        DECLARE v_render_hours_overlapp integer DEFAULT 0;
        DECLARE dtr_type varchar(20);
        DECLARE country_id varchar(20);
        DECLARE rest_day_work INT(20);
        DECLARE rest_day_work1 INT(20);
        DECLARE get_previous_date varchar(20);
        DECLARE get_next_date varchar(20);
        DECLARE pre_dtr_type varchar(20);
        DECLARE timelog varchar(20);
        DECLARE v_timeid bigint;
        DECLARE v_timeout bigint;
        DECLARE rendered_hours integer DEFAULT 0;
        DECLARE rendered_hours_overlapped integer DEFAULT 0;
        
        SET country_id = (Select country_id From users where id=New.user_id);
        
        
        
        SET v_render_hours = get_render_hr(NEW.user_id,New.date);
        SET v_render_hours_overlapp = get_render_hr_over_lapp(NEW.user_id,New.date);
        
        SET rendered_hrs = v_render_hours / 3600;
        SET rendered_hrs_overlapped = v_render_hours_overlapp / 3600;
        
        SET dtr_type = get_dtrtype_without_schedule(NEW.date,country_id,NEW.user_id);
        
        SET rest_day_work = (Select COUNT(*) FROM rest_day_works Where date=NEW.date and user_id=NEW.user_id and status='approved');
        
        IF NOT EXISTS (SELECT 1 From drt_summary_report WHERE user_id=NEW.user_id AND login_date=NEW.date)THEN
        IF(dtr_type = 'reg')THEN
        INSERT INTO drt_summary_report(login_date,user_id,reg_rendered_hours,reg_rendered_hours_overlapp)
        VALUES(NEW.date,NEW.user_id,rendered_hrs,rendered_hrs_overlapped);
        ELSEIF(dtr_type = 'sh')THEN
        IF(rest_day_work>1) THEN
        INSERT INTO drt_summary_report(login_date,user_id,sh_rendered_hours,sh_rendered_hours_overlapp,rd_rendered_hours,rd_rendered_hours_overlapp)
        VALUES(NEW.date,NEW.user_id,rendered_hrs,rendered_hrs_overlapped,rendered_hrs,rendered_hrs_overlapped);
        END IF;
        IF(rest_day_work>0) THEN
        INSERT INTO drt_summary_report(login_date,user_id,sh_rendered_hours,sh_rendered_hours_overlapp)
        VALUES(NEW.date,NEW.user_id,rendered_hrs,rendered_hrs_overlapped);
        END IF;
        ELSEIF(dtr_type = 'lh')THEN
        IF(rest_day_work>1) THEN
        INSERT INTO drt_summary_report(login_date,user_id,lh_rendered_hours,lh_rendered_hours_overlapp,rd_rendered_hours,rd_rendered_hours_overlapp)
        VALUES(NEW.date,NEW.user_id,rendered_hrs,rendered_hrs_overlapped,rendered_hrs,rendered_hrs_overlapped);
        END IF;
        IF(rest_day_work>0) THEN
        INSERT INTO drt_summary_report(login_date,user_id,lh_rendered_hours,lh_rendered_hours_overlapp)
        VALUES(NEW.date,NEW.user_id,rendered_hrs,rendered_hrs_overlapped);
        END IF;
        ELSEIF(dtr_type = 'rd')THEN
        INSERT INTO drt_summary_report(login_date,user_id,rd_rendered_hours,rd_rendered_hours_overlapp)
        VALUES(NEW.date,NEW.user_id,rendered_hrs,rendered_hrs_overlapped);
        ELSEIF(dtr_type = 'dsh')THEN
        IF(rest_day_work>1) THEN
        INSERT INTO drt_summary_report(login_date,user_id,dsh_rendered_hours,dsh_rendered_hours_overlapp,rd_rendered_hours,rd_rendered_hours_overlapp)
        VALUES(NEW.date,NEW.user_id,rendered_hrs,rendered_hrs_overlapped,rendered_hrs,rendered_hrs_overlapped);
        END IF;
        IF(rest_day_work>0) THEN
        INSERT INTO drt_summary_report(login_date,user_id,dsh_rendered_hours,dsh_rendered_hours_overlapp)
        VALUES(NEW.date,NEW.user_id,rendered_hrs,rendered_hrs_overlapped);
        END IF;
        ELSEIF(dtr_type = 'dlh')THEN
        IF(rest_day_work>1) THEN
        INSERT INTO drt_summary_report(login_date,user_id,dlh_rendered_hours,dlh_rendered_hours_overlapp,rd_rendered_hours,rd_rendered_hours_overlapp)
        VALUES(NEW.date,NEW.user_id,rendered_hrs,rendered_hrs_overlapped,rendered_hrs,rendered_hrs_overlapped);
        END IF;
        IF(rest_day_work>0) THEN
        INSERT INTO drt_summary_report(login_date,user_id,dlh_rendered_hours,dlh_rendered_hours_overlapp)
        VALUES(NEW.date,NEW.user_id,rendered_hrs,rendered_hrs_overlapped);
        END IF;
        ELSEIF(dtr_type = 'slh')THEN
        IF(rest_day_work>1) THEN
        INSERT INTO drt_summary_report(login_date,user_id,slh_rendered_hours,slh_rendered_hours_overlapp,rd_rendered_hours,rd_rendered_hours_overlapp)
        VALUES(NEW.date,NEW.user_id,rendered_hrs,rendered_hrs_overlapped,rendered_hrs,rendered_hrs_overlapped);
        END IF;
        IF(rest_day_work>0) THEN
        INSERT INTO drt_summary_report(login_date,user_id,slh_rendered_hours,slh_rendered_hours_overlapp)
        VALUES(NEW.date,NEW.user_id,rendered_hrs,rendered_hrs_overlapped);
        END IF;
        END IF;
        ELSEIF EXISTS(SELECT 1 From drt_summary_report WHERE  user_id=NEW.user_id And login_date=NEW.date) THEN
        Update drt_summary_report SET unpaid_leave = 0.00 WHERE 
        drt_summary_report.user_id=NEW.user_id AND drt_summary_report.login_date=NEW.date and unpaid_leave > 0; 
        IF(dtr_type = 'reg')THEN 
        UPDATE drt_summary_report SET drt_summary_report.reg_rendered_hours = rendered_hrs,
        drt_summary_report.reg_rendered_hours_overlapp = rendered_hrs_overlapped,
        drt_summary_report.updated_at=now() 
        WHERE drt_summary_report.user_id=NEW.user_id AND drt_summary_report.login_date=NEW.date;
        ELSEIF(dtr_type = 'rd')THEN 
        UPDATE drt_summary_report SET drt_summary_report.rd_rendered_hours = rendered_hrs,
        drt_summary_report.rd_rendered_hours_overlapp = rendered_hrs_overlapped,
        drt_summary_report.updated_at=now() 
        WHERE drt_summary_report.user_id=NEW.user_id AND drt_summary_report.login_date=NEW.date;
        ELSEIF(dtr_type = 'sh')THEN 
        
                  -- if the rest has registered on the same LH and SH then that value has to be set as null
        IF(rest_day_work>1) THEN
        UPDATE drt_summary_report SET drt_summary_report.rd_rendered_hours = rendered_hrs,
        drt_summary_report.rd_rendered_hours_overlapp = rendered_hrs_overlapped,
        drt_summary_report.updated_at=now() 
        WHERE drt_summary_report.user_id=NEW.user_id AND drt_summary_report.login_date=NEW.date;
        END IF;
        
        SET get_previous_date = NEW.date - interval 1 day;
        UPDATE drt_summary_report SET drt_summary_report.sh_rendered_hours = rendered_hrs,
        drt_summary_report.sh_rendered_hours_overlapp = rendered_hrs_overlapped,
        drt_summary_report.updated_at=now() 
        WHERE drt_summary_report.user_id=NEW.user_id AND drt_summary_report.login_date=NEW.date;
        UPDATE drt_summary_report SET drt_summary_report.nigdiff_stauts = 1,drt_summary_report.render_status = 1 
        WHERE drt_summary_report.user_id=NEW.user_id AND drt_summary_report.login_date=get_previous_date;
        ELSEIF(dtr_type = 'lh')THEN
                  -- if the rest has registered on the same LH and SH then that value has to be set as null
        IF(rest_day_work>1) THEN
        UPDATE drt_summary_report SET drt_summary_report.rd_rendered_hours = rendered_hrs,
        drt_summary_report.rd_rendered_hours_overlapp = rendered_hrs_overlapped,
        drt_summary_report.updated_at=now() 
        WHERE drt_summary_report.user_id=NEW.user_id AND drt_summary_report.login_date=NEW.date;
        END IF; 
        SET get_previous_date = NEW.date - interval 1 day;
        UPDATE drt_summary_report SET drt_summary_report.lh_rendered_hours = rendered_hrs,
        drt_summary_report.lh_rendered_hours_overlapp = rendered_hrs_overlapped,
        drt_summary_report.updated_at=now() WHERE drt_summary_report.user_id=NEW.user_id AND drt_summary_report.login_date=NEW.date;
        UPDATE drt_summary_report SET drt_summary_report.nigdiff_stauts = 1,drt_summary_report.render_status = 1 
        WHERE drt_summary_report.user_id=NEW.user_id AND drt_summary_report.login_date=get_previous_date;
        ELSEIF(dtr_type = 'dsh')THEN 
                  -- if the rest has registered on the same LH and SH then that value has to be set as null
        IF(rest_day_work>1) THEN
        UPDATE drt_summary_report SET drt_summary_report.rd_rendered_hours = rendered_hrs,
        drt_summary_report.rd_rendered_hours_overlapp = rendered_hrs_overlapped,
        drt_summary_report.updated_at=now() 
        WHERE drt_summary_report.user_id=NEW.user_id AND drt_summary_report.login_date=NEW.date;
        END IF;
        UPDATE drt_summary_report SET drt_summary_report.dsh_rendered_hours = rendered_hours,
        drt_summary_report.dsh_rendered_hours_overlapp = rendered_hours_overlapped,
        drt_summary_report.updated_at=now() 
        WHERE drt_summary_report.user_id=NEW.user_id AND drt_summary_report.login_date=NEW.date;
        ELSEIF(dtr_type = 'dlh')THEN 
                  -- if the rest has registered on the same LH and SH then that value has to be set as null
        IF(rest_day_work>1) THEN
        UPDATE drt_summary_report SET drt_summary_report.rd_rendered_hours = rendered_hrs,
        drt_summary_report.rd_rendered_hours_overlapp = rendered_hrs_overlapped,drt_summary_report.updated_at=now() 
        WHERE drt_summary_report.user_id=NEW.user_id AND drt_summary_report.login_date=NEW.date;
        END IF;
        UPDATE drt_summary_report SET drt_summary_report.dlh_rendered_hours = rendered_hrs,
        drt_summary_report.dlh_rendered_hours_overlapp = rendered_hrs_overlapped,
        drt_summary_report.updated_at=now()
        WHERE drt_summary_report.user_id=NEW.user_id AND drt_summary_report.login_date=NEW.date;
        ELSEIF(dtr_type = 'slh')THEN 
                  -- if the rest has registered on the same LH and SH then that value has to be set as null
        IF(rest_day_work>1) THEN
        UPDATE drt_summary_report SET drt_summary_report.rd_rendered_hours = rendered_hrs,
        drt_summary_report.rd_rendered_hours_overlapp = rendered_hrs_overlapped,
        drt_summary_report.updated_at=now() 
        WHERE drt_summary_report.user_id=NEW.user_id AND drt_summary_report.login_date=NEW.date;
        END IF;
        UPDATE drt_summary_report SET drt_summary_report.slh_rendered_hours = rendered_hrs,
        drt_summary_report.slh_rendered_hours_overlapp = rendered_hrs_overlapped,
        drt_summary_report.updated_at=now() 
        WHERE drt_summary_report.user_id=NEW.user_id AND drt_summary_report.login_date=NEW.date;
        END IF;
        END IF;
         IF(New.time_out IS NOT Null AND New.time_in Is Not Null )
         THEN 
        SET get_next_date = NEW.date + interval 1 day;
        -- SET rest_day_work1 = (Select COUNT(*) FROM rest_day_works Where date=get_next_date and user_id=NEW.user_id and status='approved');
        SET pre_dtr_type = get_dtrtype_without_schedule(get_next_date,country_id,NEW.user_id);
        IF NOT EXISTS (SELECT 1 From drt_summary_report WHERE  user_id=NEW.user_id And login_date=get_next_date)
          THEN
        IF(pre_dtr_type = 'sh') THEN
        -- if the rest has registered on the same LH and SH then that value has to be set as null
        IF(rest_day_work=1) THEN
        INSERT INTO drt_summary_report(login_date,user_id,sh_rendered_hours_overlapp,rd_rendered_hours_overlapp)
        VALUES(get_next_date,NEW.user_id,rendered_hrs_overlapped,rendered_hrs_overlapped);
        END IF;
        IF(rest_day_work=0) THEN
        INSERT INTO drt_summary_report(login_date,user_id,sh_rendered_hours_overlapp)
        VALUES(get_next_date,NEW.user_id,rendered_hrs_overlapped);
        END IF;
        END IF;
        IF(pre_dtr_type = 'lh') THEN
         -- if the rest has registered on the same LH and SH then that value has to be set as null
        IF(rest_day_work=1) THEN
        INSERT INTO drt_summary_report(login_date,user_id,lh_rendered_hours_overlapp,rd_rendered_hours_overlapp)
        VALUES(get_next_date,NEW.user_id,rendered_hrs_overlapped,rendered_hrs_overlapped);
        END IF;
        IF(rest_day_work=0) THEN
         INSERT INTO drt_summary_report(login_date,user_id,lh_rendered_hours_overlapp)
         VALUE(get_next_date,NEW.user_id,rendered_hrs_overlapped);
         END IF;
         END IF;
         ELSE
         IF(pre_dtr_type = 'sh') THEN
          -- if the rest has registered on the same LH and SH then that value has to be set as null
        IF(rest_day_work=1) THEN
        UPDATE drt_summary_report SET drt_summary_report.sh_rendered_hours_overlapp = rendered_hrs_overlapped,
        drt_summary_report.rd_rendered_hours_overlapp = rendered_hrs_overlapped,drt_summary_report.updated_at=now() 
        WHERE drt_summary_report.user_id=NEW.user_id AND drt_summary_report.login_date=get_next_date;
        END IF;
        IF(rest_day_work=0) THEN
        UPDATE drt_summary_report SET drt_summary_report.sh_rendered_hours_overlapp = rendered_hrs_overlapped,drt_summary_report.updated_at=now() 
        WHERE drt_summary_report.user_id=NEW.user_id AND drt_summary_report.login_date=get_next_date;
        END IF;
        END IF;
         IF(pre_dtr_type = 'lh') THEN
           -- if the rest has registered on the same LH and SH then that value has to be set as null
        IF(rest_day_work=1) THEN
        UPDATE drt_summary_report SET drt_summary_report.lh_rendered_hours_overlapp = rendered_hrs_overlapped,
        drt_summary_report.rd_rendered_hours_overlapp = rendered_hrs_overlapped,drt_summary_report.updated_at=now() 
        WHERE drt_summary_report.user_id=NEW.user_id AND drt_summary_report.login_date=get_next_date;
        END IF;
        IF(rest_day_work=0) THEN
         UPDATE drt_summary_report SET drt_summary_report.lh_rendered_hours_overlapp = rendered_hrs_overlapped,
         drt_summary_report.updated_at=now() WHERE drt_summary_report.user_id=NEW.user_id AND drt_summary_report.login_date=get_next_date;
         END IF;
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
