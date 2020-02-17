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
            log_activity( trans('messages.create_schedule_attempt') );

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
            log_activity( trans('messages.update_schedule_attempt') );

            $schedule = $this->schedule->show( $id );

            // Schedule can be updated only if it's only a TEMPLATE.
            if( $schedule->isTemplate() ) {

                $result = $this->schedule->update( $request->all(), $id );

                return success_response(
                    trans('messages.update_schedule_success'), 
                    new ScheduleResource( $result ) 
                );
            }
            
            // Return not Authorized for Update by default.
            return success_response( trans('messages.update_schedule_not_auth') );

        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }

    public function destroy($id){
        try {
            log_activity( trans('messages.delete_schedule_attempt') );

            $schedule = $this->schedule->show( $id );

            // Schedule can be deleted if it's only a TEMPLATE.
            if(  $schedule->isTemplate()  ) {
                return success_response( trans('messages.delete_schedule_success'), $this->schedule->destroy( $id ) );
            }

            // Return not Authorized for deletion by default.
            return success_response( trans('messages.delete_schedule_not_auth') );

        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }

    public function show($id){
        try {
            log_activity( trans('messages.show_schedule_attempt') );

            return success_response(
                trans('messages.show_schedule_success'), 
                new ScheduleResource( $this->schedule->show( $id ) ) 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e, JsonResponse::HTTP_NOT_FOUND);
        }
    }

    public function assign(AssignScheduleRequest $request ) {
        try {
            log_activity( trans('messages.assign_schedule_attempt') );

            return success_response(
                trans('messages.assign_schedule_success'), 
                new ScheduleResource( $this->schedule->assign( $request->all() )) 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }
}
