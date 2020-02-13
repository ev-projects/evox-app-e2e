<?php

namespace App\Modules\Schedule\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Schedule\Http\Requests\AssignScheduleRequest;
use App\Modules\Schedule\Http\Requests\StoreScheduleRequest;
use App\Modules\Schedule\Http\Requests\UpdateScheduleRequest;
use App\Modules\Schedule\Repositories\ScheduleRepositoryInterface;
use App\Modules\Schedule\Resources\ScheduleResource;
use Exception;
use Illuminate\Http\JsonResponse;

class ScheduleController extends Controller
{
    protected $schedule;

    public function __construct(ScheduleRepositoryInterface $schedule){
        $this->schedule = $schedule;
    }

    public function store(StoreScheduleRequest $request){
        try {
            log_activity( trans('messages.create_schedule') );

            return success_response(
                trans('messages.create_schedule_success'), 
                new ScheduleResource($this->schedule->store( $request->all() )),
                JsonResponse::HTTP_CREATED
            );

        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }

    public function update(UpdateScheduleRequest $request, $id){
        try {
            log_activity( trans('messages.update_schedule') );

            return success_response(
                trans('messages.update_schedule_success'), 
                new ScheduleResource( $this->schedule->update( $request->all(), $id ) ) 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }

    public function destroy($id){
        try {
            log_activity( trans('messages.delete_schedule') );

            return success_response(
                trans('messages.delete_schedule_success'), 
                $this->schedule->destroy( $id )
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }

    public function show($id){
        try {
            log_activity( trans('messages.show_schedule') );

            return success_response(
                trans('messages.show_schedule_success'), 
                new ScheduleResource( $this->schedule->show( $id ) ) 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e, JsonResponse::HTTP_NOT_FOUND);
        }
    }

    public function assign(AssignScheduleRequest $request, $emp_num ) {
        try {
            log_activity( trans('messages.assign_schedule') );
            
            # Merge all the Data needed for the Repository.
            $data = array_merge(
                $request->all(),
                [
                    'emp_num' => $emp_num
                ]
            );
            
            $schedule = $this->schedule->assign( $data );
            

            return success_response(
                trans('messages.assign_schedule_success'), 
                new ScheduleResource( $schedule ) 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }
}
