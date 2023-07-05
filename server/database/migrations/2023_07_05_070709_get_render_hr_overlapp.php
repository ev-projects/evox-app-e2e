<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class GetRenderHrOverlapp extends Migration
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
        DROP FUNCTION IF EXISTS get_render_hr_over_lapp;
        CREATE FUNCTION get_render_hr_over_lapp(v_user_id BIGINT,v_date VARCHAR(255)) RETURNS bigint(20)
    DETERMINISTIC
BEGIN
DECLARE var_user INT;
DECLARE type_count INT;
DECLARE v_render_hours integer DEFAULT 0;
DECLARE v_render_hours_overlapp integer DEFAULT 0;
DECLARE rendered_hours integer DEFAULT 0;
DECLARE rendered_hours_overlapped integer DEFAULT 0;
    DROP temporary TABLE if exists Temp_Type;
    CREATE TEMPORARY TABLE Temp_Type
    (
        Id INT auto_increment primary key,
        user_id VARCHAR(50),
        login_date BIGINT,
        render_hours_overlapp INT
    );
	INSERT INTO Temp_Type (user_id,login_date,render_hours_overlapp) 
    SELECT user_id,date,render_hours_overlapp FROM dtr_collective_punch 
    where user_id=v_user_id and date=v_date;
	SELECT COUNT(id) INTO type_count from Temp_Type;
    SET var_user=1;
    WHILE (var_user<=type_count) do
    SELECT render_hours_overlapp INTO v_render_hours_overlapp  FROM Temp_Type WHERE id=var_user;
    SET rendered_hours_overlapped = rendered_hours_overlapped + v_render_hours_overlapp;
	set var_user=var_user + 1;
    end while;
     Drop temporary TABLE Temp_Type;
    RETURN rendered_hours_overlapped;
    
END
        ");
    }
}
