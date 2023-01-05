<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

class UpdateAbsentschedulerProc extends Migration
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
        CREATE PROCEDURE update_absentscheduler()
BEGIN
DECLARE leavecount integer DEFAULT 0;
DECLARE holidaycount integer DEFAULT 0;
DECLARE dtr_type varchar(20);
for var_user in (
      SELECT id FROM users WHERE is_active='1' AND employment_status<>'Terminated' AND termination_date IS NOT NULL
    ) do
for var_user1 in (
  	  SELECT * FROM dtrs WHERE dtrs.user_id=var_user.id
    ) do
    SET holidaycount = (SELECT COUNT(*) FROM dtr_holidays WHERE dtr_holidays.dtr_id = var_user.id);
    SET leavecount = (SELECT COUNT(*) FROM leaves where leaves.status = 'approved' AND (leaves.type <> 'Unpaid Leave'  OR leaves.type <> 'Work from home' OR leaves.type <> 'MGC Unpaid Call Out Days') AND leaves.dtr_id=var_user.id);
    SET dtr_type = get_dtrtype(var_user1.id,var_user1.source_type_tagging,var_user1.is_rest_day);
  IF((var_user1.time_in IS Null AND var_user1.time_out IS Null) AND (NEW.start_datetime IS NOT Null AND NEW.end_datetime IS NOT Null) AND (leavecount <= 0) AND (holidaycount <= 0) AND dtr_type ='reg')THEN  
 IF NOT EXISTS (SELECT 1 From drt_summary_report WHERE  user_id=var_user.user_id And login_date=var_user1.date )
  THEN
INSERT INTO drt_summary_report(login_date,user_id,unpaid_leave)VALUE(var_user1.date,var_user.user_id,'1');
ELSEIF EXISTS(SELECT 1 From drt_summary_report WHERE  user_id=var_user.user_id And login_date=var_user1.date) THEN
UPDATE drt_summary_report SET drt_summary_report.unpaid_leave = '1' WHERE drt_summary_report.id=var_user1.id And login_date=var_user1.date;
     END IF;
  END IF;

    end for;
end for;
END");
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        //
        DB::unprepared("DROP PROCEDURE 'update_absentscheduler'");
    }
}
