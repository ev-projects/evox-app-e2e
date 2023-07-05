<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class OnupdateNightDiffDataUpdate extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        //
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        //
        DB::unprepared("
        DROP TRIGGER IF EXISTS onupdate_night_diff;
        CREATE TRIGGER onupdate_night_diff AFTER UPDATE ON dtr_collective_punch FOR EACH ROW BEGIN
DECLARE night_diff_hrs DOUBLE(10,2) DEFAULT 0.00;
DECLARE night_diff_hrs_overlapped DOUBLE(10,2) DEFAULT 0.00;
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
DECLARE night_diff_hours integer DEFAULT 0;
DECLARE night_diff_overlapped integer DEFAULT 0;
DECLARE v_night_diff integer DEFAULT 0;
DECLARE v_night_diff_over_lapp integer DEFAULT 0;
DECLARE var_user INT;
DECLARE type_count INT;

SET country_id = (Select country_id From users where id=New.user_id);
DROP temporary TABLE if exists Temp_Type;
    CREATE TEMPORARY TABLE Temp_Type
    (
        Id INT auto_increment primary key,
        user_id VARCHAR(50),
        login_date BIGINT,
        night_diff INT,
        night_diff_over_lapp INT
    );
    INSERT INTO Temp_Type (user_id,login_date,night_diff,night_diff_over_lapp) 
    SELECT user_id,date,night_diff,night_diff_over_lapp FROM dtr_collective_punch 
    where user_id=New.user_id and date=New.date;
	SELECT COUNT(id) INTO type_count from Temp_Type;
    SET var_user=1;
    WHILE (var_user<=type_count) do
    SELECT  night_diff,night_diff_over_lapp INTO v_night_diff,v_night_diff_over_lapp
    FROM Temp_Type WHERE id=var_user;
    SET night_diff_hours = night_diff_hours + v_night_diff;
    SET night_diff_overlapped = night_diff_overlapped + v_night_diff_over_lapp;
	set var_user=var_user+1;
    end while;
	Drop temporary TABLE Temp_Type;
SET night_diff_hrs = night_diff_hours / 3600;
SET night_diff_hrs_overlapped = night_diff_overlapped / 3600;

SET dtr_type = get_dtrtype_without_schedule(NEW.date,country_id,NEW.user_id);

SET rest_day_work = (Select COUNT(*) FROM rest_day_works Where date=NEW.date and user_id=NEW.user_id and status='approved');

IF NOT EXISTS (SELECT 1 From drt_summary_report WHERE user_id=NEW.user_id AND login_date=NEW.date)THEN
IF(dtr_type = 'reg')THEN
INSERT INTO drt_summary_report(login_date,user_id,reg_night_diff,reg_night_diff_overlapp)
VALUES(NEW.date,NEW.user_id,night_diff_hrs,night_diff_hrs_overlapped);
ELSEIF(dtr_type = 'sh')THEN
IF(rest_day_work>1) THEN
INSERT INTO drt_summary_report(login_date,user_id,sh_night_diff,sh_night_diff_overlapp,rd_night_diff,rd_night_diff_overlapp)
VALUES(NEW.date,NEW.user_id,night_diff_hrs,night_diff_hrs_overlapped,night_diff_hrs,night_diff_hrs_overlapped);
END IF;
IF(rest_day_work>0) THEN
INSERT INTO drt_summary_report(login_date,user_id,sh_night_diff,sh_night_diff_overlapp)
VALUES(NEW.date,NEW.user_id,night_diff_hrs,night_diff_hrs_overlapped);
END IF;
ELSEIF(dtr_type = 'lh')THEN
IF(rest_day_work>1) THEN
INSERT INTO drt_summary_report(login_date,user_id,lh_night_diff,lh_night_diff_overlapp,rd_night_diff,rd_night_diff_overlapp)
VALUES(NEW.date,NEW.user_id,night_diff_hrs,night_diff_hrs_overlapped,night_diff_hrs,night_diff_hrs_overlapped);
END IF;
IF(rest_day_work>0) THEN
INSERT INTO drt_summary_report(login_date,user_id,lh_night_diff,lh_night_diff_overlapp)
VALUES(NEW.date,NEW.user_id,night_diff_hrs,night_diff_hrs_overlapped);
END IF;
ELSEIF(dtr_type = 'rd')THEN
INSERT INTO drt_summary_report(login_date,user_id,rd_night_diff,rd_night_diff_overlapp)
VALUES(NEW.date,NEW.user_id,night_diff_hrs,night_diff_hrs_overlapped);
ELSEIF(dtr_type = 'dsh')THEN
IF(rest_day_work>1) THEN
INSERT INTO drt_summary_report(login_date,user_id,dsh_night_diff,dsh_night_diff_overlapp,rd_night_diff,rd_night_diff_overlapp)
VALUES(NEW.date,NEW.user_id,night_diff_hrs,night_diff_hrs_overlapped,night_diff_hrs,night_diff_hrs_overlapped);
END IF;
IF(rest_day_work>0) THEN
INSERT INTO drt_summary_report(login_date,user_id,dsh_night_diff,dsh_night_diff_overlapp)
VALUES(NEW.date,NEW.user_id,night_diff_hrs,night_diff_hrs_overlapped);
END IF;
ELSEIF(dtr_type = 'dlh')THEN
IF(rest_day_work>1) THEN
INSERT INTO drt_summary_report(login_date,user_id,dlh_night_diff,dlh_night_diff_overlapp,rd_night_diff,rd_night_diff_overlapp)
VALUES(NEW.date,NEW.user_id,night_diff_hrs,night_diff_hrs_overlapped,night_diff_hrs,night_diff_hrs_overlapped);
END IF;
IF(rest_day_work>0) THEN
INSERT INTO drt_summary_report(login_date,user_id,dlh_night_diff,dlh_night_diff_overlapp)
VALUES(NEW.date,NEW.user_id,night_diff_hrs,night_diff_hrs_overlapped);
END IF;
ELSEIF(dtr_type = 'slh')THEN
IF(rest_day_work>1) THEN
INSERT INTO drt_summary_report(login_date,user_id,slh_night_diff,slh_night_diff_overlapp,rd_night_diff,rd_night_diff_overlapp)
VALUES(NEW.date,NEW.user_id,night_diff_hrs,night_diff_hrs_overlapped,night_diff_hrs,night_diff_hrs_overlapped);
END IF;
IF(rest_day_work>0) THEN
INSERT INTO drt_summary_report(login_date,user_id,slh_night_diff,slh_night_diff_overlapp)
VALUES(NEW.date,NEW.user_id,night_diff_hrs,night_diff_hrs_overlapped);
END IF;
END IF;
ELSEIF EXISTS(SELECT 1 From drt_summary_report WHERE  user_id=NEW.user_id And login_date=NEW.date) THEN
Update drt_summary_report SET unpaid_leave = 0.00 WHERE 
drt_summary_report.user_id=NEW.user_id AND drt_summary_report.login_date=NEW.date and unpaid_leave > 0; 
IF(dtr_type = 'reg')THEN 
UPDATE drt_summary_report SET drt_summary_report.reg_night_diff = night_diff_hrs,
drt_summary_report.reg_night_diff_overlapp = night_diff_hrs_overlapped,
drt_summary_report.updated_at=now() 
WHERE drt_summary_report.user_id=NEW.user_id AND drt_summary_report.login_date=NEW.date;
ELSEIF(dtr_type = 'rd')THEN 
UPDATE drt_summary_report SET drt_summary_report.rd_night_diff = night_diff_hrs,
drt_summary_report.rd_night_diff_overlapp = night_diff_hrs_overlapped,
drt_summary_report.updated_at=now() 
WHERE drt_summary_report.user_id=NEW.user_id AND drt_summary_report.login_date=NEW.date;
ELSEIF(dtr_type = 'sh')THEN 

          -- if the rest has registered on the same LH and SH then that value has to be set as null
IF(rest_day_work>1) THEN
UPDATE drt_summary_report SET drt_summary_report.rd_night_diff = night_diff_hrs,
drt_summary_report.rd_night_diff_overlapp = night_diff_hrs_overlapped,
drt_summary_report.updated_at=now() 
WHERE drt_summary_report.user_id=NEW.user_id AND drt_summary_report.login_date=NEW.date;
END IF;

SET get_previous_date = NEW.date - interval 1 day;
UPDATE drt_summary_report SET drt_summary_report.sh_night_diff = night_diff_hrs,
drt_summary_report.sh_night_diff_overlapp = night_diff_hrs_overlapped,
drt_summary_report.updated_at=now() 
WHERE drt_summary_report.user_id=NEW.user_id AND drt_summary_report.login_date=NEW.date;
UPDATE drt_summary_report SET drt_summary_report.nigdiff_stauts = 1,drt_summary_report.render_status = 1 
WHERE drt_summary_report.user_id=NEW.user_id AND drt_summary_report.login_date=get_previous_date;
ELSEIF(dtr_type = 'lh')THEN
          -- if the rest has registered on the same LH and SH then that value has to be set as null
IF(rest_day_work>1) THEN
UPDATE drt_summary_report SET drt_summary_report.rd_night_diff = night_diff_hrs,
drt_summary_report.rd_night_diff_overlapp = night_diff_hrs_overlapped,
drt_summary_report.updated_at=now() 
WHERE drt_summary_report.user_id=NEW.user_id AND drt_summary_report.login_date=NEW.date;
END IF; 
SET get_previous_date = NEW.date - interval 1 day;
UPDATE drt_summary_report SET drt_summary_report.lh_night_diff = night_diff_hrs,
drt_summary_report.lh_night_diff_overlapp = night_diff_hrs_overlapped,
drt_summary_report.updated_at=now() WHERE drt_summary_report.user_id=NEW.user_id AND drt_summary_report.login_date=NEW.date;
UPDATE drt_summary_report SET drt_summary_report.nigdiff_stauts = 1,drt_summary_report.render_status = 1 
WHERE drt_summary_report.user_id=NEW.user_id AND drt_summary_report.login_date=get_previous_date;
ELSEIF(dtr_type = 'dsh')THEN 
          -- if the rest has registered on the same LH and SH then that value has to be set as null
IF(rest_day_work>1) THEN
UPDATE drt_summary_report SET drt_summary_report.rd_night_diff = night_diff_hrs,
drt_summary_report.rd_night_diff_overlapp = drt_summary_report.rd_night_diff_overlapp + night_diff_hrs_overlapped,
drt_summary_report.updated_at=now() 
WHERE drt_summary_report.user_id=NEW.user_id AND drt_summary_report.login_date=NEW.date;
END IF;
UPDATE drt_summary_report SET drt_summary_report.dsh_night_diff = night_diff_hrs,
drt_summary_report.dsh_night_diff_overlapp = night_diff_hrs_overlapped,
drt_summary_report.updated_at=now() 
WHERE drt_summary_report.user_id=NEW.user_id AND drt_summary_report.login_date=NEW.date;
ELSEIF(dtr_type = 'dlh')THEN 
          -- if the rest has registered on the same LH and SH then that value has to be set as null
IF(rest_day_work>1) THEN
UPDATE drt_summary_report SET drt_summary_report.rd_night_diff = night_diff_hrs,
drt_summary_report.rd_night_diff_overlapp = night_diff_hrs_overlapped,drt_summary_report.updated_at=now() 
WHERE drt_summary_report.user_id=NEW.user_id AND drt_summary_report.login_date=NEW.date;
END IF;
UPDATE drt_summary_report SET drt_summary_report.dlh_night_diff = night_diff_hrs,
drt_summary_report.dlh_night_diff_overlapp = night_diff_hrs_overlapped,
drt_summary_report.updated_at=now()
WHERE drt_summary_report.user_id=NEW.user_id AND drt_summary_report.login_date=NEW.date;
ELSEIF(dtr_type = 'slh')THEN 
          -- if the rest has registered on the same LH and SH then that value has to be set as null
IF(rest_day_work>1) THEN
UPDATE drt_summary_report SET drt_summary_report.rd_night_diff = night_diff_hrs,
drt_summary_report.rd_night_diff_overlapp = night_diff_hrs_overlapped,
drt_summary_report.updated_at=now() 
WHERE drt_summary_report.user_id=NEW.user_id AND drt_summary_report.login_date=NEW.date;
END IF;
UPDATE drt_summary_report SET drt_summary_report.slh_night_diff = night_diff_hrs,
drt_summary_report.slh_night_diff_overlapp = night_diff_hrs_overlapped,
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
INSERT INTO drt_summary_report(login_date,user_id,sh_night_diff_overlapp,rd_night_diff_overlapp)
VALUES(get_next_date,NEW.user_id,night_diff_hrs_overlapped,night_diff_hrs_overlapped);
END IF;
IF(rest_day_work=0) THEN
INSERT INTO drt_summary_report(login_date,user_id,sh_night_diff_overlapp)
VALUES(get_next_date,NEW.user_id,night_diff_hrs_overlapped);
END IF;
END IF;
IF(pre_dtr_type = 'lh') THEN
 -- if the rest has registered on the same LH and SH then that value has to be set as null
IF(rest_day_work=1) THEN
INSERT INTO drt_summary_report(login_date,user_id,lh_night_diff_overlapp,rd_night_diff_overlapp)
VALUES(get_next_date,NEW.user_id,night_diff_hrs_overlapped,night_diff_hrs_overlapped);
END IF;
IF(rest_day_work=0) THEN
 INSERT INTO drt_summary_report(login_date,user_id,lh_night_diff_overlapp)
 VALUE(get_next_date,NEW.user_id,night_diff_hrs_overlapped);
 END IF;
 END IF;
 ELSE
 IF(pre_dtr_type = 'sh') THEN
  -- if the rest has registered on the same LH and SH then that value has to be set as null
IF(rest_day_work=1) THEN
UPDATE drt_summary_report SET drt_summary_report.sh_night_diff_overlapp = night_diff_hrs_overlapped,
drt_summary_report.rd_night_diff_overlapp = night_diff_hrs_overlapped,drt_summary_report.updated_at=now() 
WHERE drt_summary_report.user_id=NEW.user_id AND drt_summary_report.login_date=get_next_date;
END IF;
IF(rest_day_work=0) THEN
UPDATE drt_summary_report SET drt_summary_report.sh_night_diff_overlapp = night_diff_hrs_overlapped,drt_summary_report.updated_at=now() 
WHERE drt_summary_report.user_id=NEW.user_id AND drt_summary_report.login_date=get_next_date;
END IF;
END IF;
 IF(pre_dtr_type = 'lh') THEN
   -- if the rest has registered on the same LH and SH then that value has to be set as null
IF(rest_day_work=1) THEN
UPDATE drt_summary_report SET drt_summary_report.lh_night_diff_overlapp = night_diff_hrs_overlapped,
drt_summary_report.rd_night_diff_overlapp = night_diff_hrs_overlapped,drt_summary_report.updated_at=now() 
WHERE drt_summary_report.user_id=NEW.user_id AND drt_summary_report.login_date=get_next_date;
END IF;
IF(rest_day_work=0) THEN
 UPDATE drt_summary_report SET drt_summary_report.lh_night_diff_overlapp = night_diff_hrs_overlapped,
 drt_summary_report.updated_at=now() WHERE drt_summary_report.user_id=NEW.user_id AND drt_summary_report.login_date=get_next_date;
 END IF;
 END IF;
 END IF; 
END IF;
END
        ");
    }
}
