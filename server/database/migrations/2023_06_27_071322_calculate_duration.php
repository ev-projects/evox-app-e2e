<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CalculateDuration extends Migration
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
        CREATE TRIGGER onupdate_punch AFTER UPDATE ON dtr_collective_punch_history FOR EACH ROW BEGIN
 IF EXISTS(SELECT 1 From dtr_collective_punch_history WHERE  user_id=NEW.user_id And date=NEW.date) THEN
 INSERT INTO dtr_collective_punch(date,dtr_collective_punch_history_id,user_id,time_in,time_out,duration)
 VALUES(NEW.date,NEW.id,NEW.user_id,NEW.time_in,New.time_out,if(New.time_out IS NOT Null,New.time_out - New.time_in,null));
 ELSE 
 UPDATE dtr_collective_punch SET date=New.date,dtr_collective_punch_history_id=New.id,user_id=New.user_id,
 time_in=New.time_in,time_out=New.time_out,duration=if(time_out IS NOT Null,New.time_out - New.time_in,null)
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
