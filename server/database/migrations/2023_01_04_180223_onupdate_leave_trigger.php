<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

class OnupdateLeaveTrigger extends Migration
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
        CREATE  TRIGGER onupdate_leave AFTER UPDATE ON `leaves` FOR EACH ROW BEGIN  
     IF NOT EXISTS (SELECT 1 From drt_summary_report INNER JOIN dtrs ON dtrs.id =NEW.dtr_id WHERE    drt_summary_report.user_id=dtrs.user_id AND drt_summary_report.login_date=dtrs.date) THEN
  INSERT INTO drt_summary_report(login_date,user_id,on_leave)
SELECT dtrs.date,dtrs.user_id,IF(NEW.status = 'approved', NEW.amount, 0) FROM dtrs WHERE dtrs.id=NEW.dtr_id;
  ELSEIF EXISTS (SELECT 1 From drt_summary_report INNER JOIN dtrs ON dtrs.id =NEW.dtr_id WHERE    drt_summary_report.user_id=dtrs.user_id AND drt_summary_report.login_date=dtrs.date) THEN
 UPDATE drt_summary_report SET on_leave=IF(NEW.status = 'approved', NEW.amount, 0) WHERE drt_summary_report.login_date IN (SELECT dtrs.date From drt_summary_report INNER JOIN dtrs ON dtrs.id =NEW.dtr_id) AND drt_summary_report.user_id IN (SELECT dtrs.user_id FROM dtrs WHERE dtrs.id = NEW.dtr_id);
  END IF;  
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
        DB::unprepared("DROP TRIGGER 'onupdate_leave'");
    }
}
