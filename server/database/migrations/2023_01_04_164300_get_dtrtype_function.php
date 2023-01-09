<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

class GetDtrtypeFunction extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        DB::unprepared("
        CREATE FUNCTION get_dtrtype(dtrs_id BIGINT,source_type VARCHAR(255),rest_of_day INT) RETURNS varchar(20) CHARSET utf8mb4
        DETERMINISTIC
    BEGIN
    DECLARE type varchar(20);
    DECLARE holidaycount integer DEFAULT 0;
    DECLARE allow_legal_holiday_policy integer DEFAULT 0;
    DECLARE allow_special_holiday_policy integer DEFAULT 0;
    DECLARE var_user INT;
    DECLARE type_count INT;
    DECLARE v_dtrtype VARCHAR(50);
        DECLARE v_pivot_dtr_id BIGINT;
        DECLARE v_pivot_holiday_id BIGINT;
    DROP temporary TABLE if exists Temp_Type;
    CREATE TEMPORARY TABLE Temp_Type
    (
        Id INT auto_increment primary key,
        dtrtype VARCHAR(50),
        pivot_dtr_id BIGINT,
        pivot_holiday_id BIGINT
    );
        
    SET type = '';
    SET holidaycount = (SELECT COUNT(*) FROM holidays inner join dtr_holidays on holidays.id = dtr_holidays.holiday_id where dtr_holidays.dtr_id = dtrs_id);
    
    IF(holidaycount > 0)THEN
    
    INSERT INTO Temp_Type (dtrtype,pivot_dtr_id,pivot_holiday_id) 
    SELECT holidays.type as dtrtype, dtr_holidays.dtr_id as pivot_dtr_id, dtr_holidays.holiday_id as pivot_holiday_id 
    FROM holidays INNER JOIN dtr_holidays ON holidays.id = dtr_holidays.holiday_id
    where dtr_holidays.dtr_id = dtrs_id;
    
    SELECT COUNT(id) INTO type_count from Temp_Type;
    SET var_user=1;
    
    WHILE (var_user<=type_count) do
    
    SELECT  dtrtype,pivot_dtr_id,pivot_holiday_id INTO v_dtrtype,v_pivot_dtr_id,v_pivot_holiday_id  FROM Temp_Type WHERE id=var_user;
    
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
     SET allow_legal_holiday_policy = (SELECT COUNT(*) FROM dtr_policies WHERE dtr_policies.dtr_id = dtrs_id AND dtr_policies.dtr_id IS NOT NULL AND dtr_policies.policy = 'allow_legal_holiday' AND value=1 LIMIT 1);  
     SET allow_special_holiday_policy = (SELECT COUNT(*) FROM dtr_policies WHERE dtr_policies.dtr_id = dtrs_id AND dtr_policies.dtr_id IS NOT NULL and dtr_policies.policy = 'allow_special_holiday' AND value=1 LIMIT 1);
    IF((v_dtrtype = 'lh' and allow_legal_holiday_policy = 1) or (v_dtrtype = 'sh' and allow_special_holiday_policy = 1)) THEN 
    SET type=v_dtrtype; 
    END IF;
    END IF;
    set var_user=var_user+1;
    end while;
    END IF;
    IF(type IS NULL or type = '')THEN
        IF(rest_of_day = 1 and source_type='rest_day_work')THEN
        SET type = 'rd';
        ELSE
        SET type = 'reg';
        END IF;
    END IF;
    drop temporary table Temp_Type;
    RETURN type;
    END");
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        DB::unprepared("DROP FUNCTION get_dtrtype");
    }
}
