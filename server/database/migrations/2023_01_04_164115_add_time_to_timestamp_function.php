<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

class AddTimeToTimestampFunction extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        DB::unprepared("
        CREATE  FUNCTION add_time_to_timestamp(str1 char(20),str2 char(20)) RETURNS int
        DETERMINISTIC
    BEGIN
    DECLARE timestampval integer;
    DECLARE timeval integer;
    
    IF(str1 NOT REGEXP '^[0-9]+$')THEN
    SET timestampval = UNIX_TIMESTAMP(str1);
    ELSE 
    SET timestampval = str1;
    END IF;
    IF(str2 NOT REGEXP '^[0-9]+$')THEN
    SET timeval = TIME_TO_SEC(str2);
    ELSE 
    SET timeval = str2;
    END IF;
     RETURN (timestampval+timeval);   
    END");
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        DB::unprepared("DROP FUNCTION 'add_time_to_timestamp'");
    }
}
