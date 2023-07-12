<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class GetDtrtypeWithoutSchedule extends Migration
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
        DROP TRIGGER IF EXISTS get_dtrtype_without_schedule;
        CREATE FUNCTION get_dtrtype_without_schedule(dtr_date date,user_country_id INT,v_user_id bigint) RETURNS varchar(20) CHARSET utf8mb4
    DETERMINISTIC
BEGIN
    DECLARE type varchar(20);
    DECLARE holidaycount integer DEFAULT 0;
    DECLARE allow_legal_holiday_policy integer DEFAULT 0;
    DECLARE allow_special_holiday_policy integer DEFAULT 0;
    DECLARE var_user INT;
    DECLARE type_count INT;
    DECLARE rest_day_work INT;
    DECLARE v_dtrtype VARCHAR(50);
	DECLARE v_pivot_date BIGINT;
    DROP temporary TABLE if exists Temp_Type;
    CREATE TEMPORARY TABLE Temp_Type
    (
        Id INT auto_increment primary key,
        dtrtype VARCHAR(50),
        pivot_date BIGINT
    );
        
    SET type = '';
    SET holidaycount = (SELECT COUNT(*) FROM holidays where date=dtr_date and country_id=user_country_id);
    
    IF(holidaycount > 0)THEN
    
    INSERT INTO Temp_Type (dtrtype,pivot_date) 
    SELECT holidays.type as dtrtype,holidays.date FROM holidays where date=dtr_date and country_id=user_country_id;
    
    SELECT COUNT(id) INTO type_count from Temp_Type;
    SET var_user=1;
    
    WHILE (var_user<=type_count) do
    
    SELECT dtrtype,pivot_date INTO v_dtrtype,v_pivot_date FROM Temp_Type WHERE id=var_user;

    IF(type != '' )THEN
        IF(type = 'lh')THEN
            IF(v_dtrtype = 'lh')THEN
             SET type = 'dlh';
            ELSEIF(type = 'sh')THEN
             SET type = 'slh';
            END IF;
        ELSEIF(type = 'sh')THEN
            IF(v_dtrtype= 'sh')THEN
             SET type = 'dsh';
            ELSEIF(type = 'lh')THEN
             SET type = 'slh';
            END IF;
        END IF;
    ELSE
    IF((v_dtrtype = 'lh') or (v_dtrtype = 'sh')) THEN 
    SET type=v_dtrtype; 
    END IF;
    END IF;
    SET var_user=var_user+1;
    end while;
    END IF;
    IF(type IS NULL or type = '')THEN

       SET rest_day_work = (Select COUNT(*) FROM rest_day_works Where date=dtr_date and user_id=v_user_id and status='approved');
       
       IF(rest_day_work > 0)THEN
		SET type = 'rd';
       ELSE
        SET type = 'reg';
       END IF;
    END IF;
    drop temporary table Temp_Type;
    RETURN type;
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
