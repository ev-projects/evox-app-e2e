<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

class GetTotalNightDiffFunction extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        DB::unprepared("
        CREATE    FUNCTION get_total_night_diff(time_in bigint,time_out bigint,ex_work_start_datetime bigint,ex_work_end_datetime bigint,
ni_diff_start_datetime bigint,ni_diff_end_datetime bigint) RETURNS bigint
    DETERMINISTIC
BEGIN
DECLARE total_night_diff integer DEFAULT 0;
DECLARE to_measure_start_datetime integer DEFAULT 0;
DECLARE to_measure_end_datetime integer DEFAULT 0;

 # If Expected Work Start-Datetime is not existing, set the Time Start to Compute as default value;
IF(ISNULL(ex_work_start_datetime) or ex_work_start_datetime = 0)THEN
    SET ex_work_start_datetime = time_in;
     
END IF;
# If Expected Work End-Datetime is not existing, set the Time End to Compute as default value;
IF(ISNULL(ex_work_end_datetime) or ex_work_end_datetime = 0)THEN
    SET ex_work_end_datetime = time_out;
     
END IF;
# Sets the Start-Datetime to be measured for Night Diff.
IF(time_in > ex_work_start_datetime)THEN
   SET to_measure_start_datetime = time_in;
   ELSE 
   SET to_measure_start_datetime = ex_work_start_datetime;
END IF;
IF(time_out < ex_work_end_datetime)THEN
   SET to_measure_end_datetime = time_out;
   ELSE 
   SET to_measure_end_datetime = ex_work_end_datetime;
END IF;
# If the Start-Datetime is between the Night Diff. Date Range
IF((to_measure_start_datetime >= ni_diff_start_datetime)  and 
      (to_measure_start_datetime <= ni_diff_end_datetime))THEN
# If the End-Datetime is more than the Night Diff. End-Datetime, Get the Difference between Night Diff. End-Datetime and Start-Datetime.
  IF(to_measure_end_datetime >= ni_diff_end_datetime)THEN
       SET total_night_diff = ni_diff_end_datetime - to_measure_start_datetime;
      
# If not, get the difference between the Start and End Datetime
  ELSE
       SET total_night_diff = to_measure_end_datetime - to_measure_start_datetime;
         
  END IF;
# If the End-Datetime is between the Night Diff. Date Range
   ELSEIF(to_measure_end_datetime >= ni_diff_start_datetime  and to_measure_end_datetime <= ni_diff_end_datetime)THEN
# If the Start-Datetime is less than the Night Diff. Start-Datetime, Get the Difference between End-Datetime and Night Diff. Start-Datetime.

   IF(to_measure_start_datetime <= ni_diff_start_datetime)THEN
         SET total_night_diff = to_measure_end_datetime - ni_diff_start_datetime;
       
 # If not, get the difference between the Start and End Datetime
   ELSE
   
         SET total_night_diff = to_measure_end_datetime - to_measure_start_datetime;
   END IF;
# If the Start and End-Datetime is outside the Night Diff. Date range, get the Difference between the Night Diff. Date  Range ( Complete 8 hours )
   ELSE
   IF(to_measure_start_datetime < ni_diff_start_datetime and  
                to_measure_end_datetime   > ni_diff_end_datetime)THEN
		SET total_night_diff =  ni_diff_end_datetime - ni_diff_start_datetime;
 END IF;
  END IF;
  RETURN total_night_diff;
END");
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        DB::unprepared("DROP FUNCTION get_total_night_diff");
    }
}
