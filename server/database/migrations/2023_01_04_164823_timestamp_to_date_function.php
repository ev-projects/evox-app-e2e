<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

class TimestampToDateFunction extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        DB::unprepared("
        CREATE   FUNCTION timestamp_to_date(timestamp1 bigint) RETURNS varchar(255) CHARSET utf8mb4
    DETERMINISTIC
BEGIN
DECLARE dateval date;
DECLARE timestamp2 bigint;
IF(timestamp1 IS NOT NULL)THEN
SET timestamp2 = timestamp1;
SET dateval = FROM_UNIXTIME(timestamp2, '%Y-%m-%d');
END IF;
RETURN dateval;
END");
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        DB::unprepared("DROP FUNCTION timestamp_to_date");
    }
}
