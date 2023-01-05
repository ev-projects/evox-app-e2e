<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

class SubtractDaysFromTimestampFunction extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        DB::unprepared("
        CREATE  FUNCTION subtract_days_from_timestamp(dtr_date char(20),dtr_day char(20)) RETURNS int
    DETERMINISTIC
BEGIN

DECLARE dateval integer;
DECLARE dayval integer;

IF(dtr_date NOT REGEXP '^[0-9]+$')THEN
SET dateval = UNIX_TIMESTAMP(dtr_date);
ELSE 
SET dateval = dtr_date;
END IF;
SET dayval =86400 * dtr_day;
 RETURN dateval-dayval;   

END");
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        DB::unprepared("DROP FUNCTION 'subtract_days_from_timestamp'");
    }
}
