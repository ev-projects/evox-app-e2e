<?php 

namespace App\Modules\Schedule\Repositories;

use App\Modules\Schedule\Models\Schedule;
use App\Modules\Schedule\Models\ScheduleDetail;
use App\Modules\User\Models\User;
use Exception;
use Illuminate\Database\Eloquent\Model;

class ScheduleRepository implements ScheduleRepositoryInterface{

    public function create(array $data){
        try {
            $schedule = new Schedule;
            $schedule->name = $data['name'];
            $schedule->source_type = $data['source_type'];
            $schedule->schedule_type = $data['schedule_type'];
            $schedule->rest_days = get_restdays( $data['work_days'] );
            $schedule->save();

            foreach( $data['schedule_details'] as $day => $details ){

                $schedule_details[ $day ] = new ScheduleDetail();
                $schedule_details[ $day ]->day               = $day;
                $schedule_details[ $day ]->start_time        = time_to_seconds($details['start_time']);
                $schedule_details[ $day ]->end_time          = time_to_seconds($details['end_time']);
                $schedule_details[ $day ]->start_flexy_time  = time_to_seconds($details['start_flexy_time']);
                $schedule_details[ $day ]->end_flexy_time    = time_to_seconds($details['end_flexy_time']);
                $schedule_details[ $day ]->break_time        = time_to_seconds($details['break_time']);
            }
            
            $schedule->schedule_details()->saveMany( $schedule_details );

        } catch (Exception $e) {
            throw $e;
        }
    }

    public function update(array $data, $id){
        
    }

    public function delete($id){
        //
    }

    public function show($id){
        try {
            return Schedule::find($id);
        } catch (Exception $e) {
            throw $e;
        }
    }

}