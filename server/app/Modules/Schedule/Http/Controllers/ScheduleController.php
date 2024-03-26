<?php

namespace App\Modules\Schedule\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;
use App\Modules\Schedule\Http\Requests\AssignScheduleRequest;
use App\Modules\Schedule\Http\Requests\StoreScheduleRequest;
use App\Modules\Schedule\Http\Requests\UpdateScheduleRequest;
use App\Modules\Schedule\Repositories\ScheduleRepositoryInterface;
use App\Modules\Schedule\Resources\ScheduleResource;
use App\Modules\Schedule\Resources\TemplateScheduleResource;
use Exception;
use Illuminate\Http\JsonResponse;

class ScheduleController extends Controller
{
    protected $schedule;
    protected $dtr;

    public function __construct(ScheduleRepositoryInterface $schedule, DtrRepositoryInterface $dtr){
        $this->schedule = $schedule;
        $this->dtr = $dtr;
    }

    /**
     * Creates a Schedule
     * @return \Illuminate\Http\JsonResponse
     */
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

    /**
     * Updates an existing Schedule. Proceeding on update only if it's a Template
     * @return \Illuminate\Http\JsonResponse
     */
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

    /**
     * Deletes an existing Schedule. Proceeding on delete only if it's a Template
     * @return \Illuminate\Http\JsonResponse
     */
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

    /**
     * Shows an existing Schedule.
     * @return \Illuminate\Http\JsonResponse
     */
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

    /**
     * Assigns a Schedule to a Specific Module (User or Department).
     *  - If bind to is for user, automatically applies the Schedule to the DTR within the Valid From & Valid To Scope.
     * @return \Illuminate\Http\JsonResponse
     */
    public function assign(AssignScheduleRequest $request ) {
        try {
            log_activity( trans('messages.assign_schedule_attempt') );

            $schedule = $this->schedule->assign( $request->all() );

            // If the bind to is for user, apply the newly assigned schedule to the DTR related
            if( $schedule->bind_to == 'user' ) {
                $dtr_collection = $this->dtr->apply_schedule_to_dtr( $schedule->bind_id, $schedule );

            // If the bind to is for department and the actions meets the Assign actions, apply the newly updated schedule to the Department User's DTR related
            } elseif( $schedule->bind_to == 'department' ) {

                if( in_array( $request->action, get_constant('ASSIGN_DEPARTMENT_ACTIONS') ) ){

                    // Get the department owner of the schedule
                    $department = $schedule->owner()->first();

                    // Iterate the Department Users and apply the schedule to user default schedule
                    foreach( $department->users()->get() as $user ){
    
                        // Fetch the user default schedule
                        $user_schedule = $user->defaultSchedule()->first();
                        
                        // If the User Schedule exist, proceed on replicating the schedule details depending on the action
                        if( is_valid($user_schedule) ) {

                            switch( $request->action ){

                                // Replicate the schedule holiday policy of the department schedule to user default schedule
                                case "assign_schedule_holiday_policy":
                                    $user_schedule = $this->schedule->replicate_schedule_holiday_policy( $user_schedule, $schedule );
                                    break;
                                // Replicate the schedule policy of the department schedule to user default schedule
                                case "assign_schedule_policy":
                                    $user_schedule = $this->schedule->replicate_schedule_policy( $user_schedule, $schedule );
                                    break;
                                // Replicate the schedule of the department schedule to user default schedule
                                case "assign":
                                    $user_schedule = $this->schedule->replicate_schedule( $user_schedule, $schedule );
                                    break;
            
                            }
                            
                        // If the User Schedule DOES NOT exist, proceed on copying the whole department schedule to the user.
                        } else {
                            $user_schedule = $this->schedule->copy_schedule_to_user( $schedule, $user );
                        }

                        // Apply the updated user schedule to the user's DTR. (bypass the checking of the default schedule of user)
                        $this->dtr->apply_schedule_to_dtr( $user_schedule->bind_id, $user_schedule, true );
                    }
                }

            }

            return success_response(
                trans('messages.assign_schedule_success'), 
                new ScheduleResource( $schedule ) 
            ); 
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }

    

    /**
     * Fetches all the Template Schedule that exists
     * @return \Illuminate\Http\JsonResponse
     */
    public function templates() {
        try {
            log_activity( trans('messages.fetch_templates_schedule_attempt') );
            // dd("here");
            $schedule_collection = $this->schedule->get_template_schedules();

            return success_response(
                trans('messages.fetch_templates_schedule_success'), 
                TemplateScheduleResource::collection( $schedule_collection )
            ); 
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }
}
