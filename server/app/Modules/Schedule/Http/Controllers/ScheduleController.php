<?php

namespace App\Modules\Schedule\Http\Controllers;

use Illuminate\Http\Request;

use App\Http\Controllers\Controller;
use App\Modules\Schedule\Http\Requests\StoreSchedule;
use App\Modules\Schedule\Models\Schedule;
use App\Modules\Schedule\Repositories\ScheduleRepository;
use App\Modules\Schedule\Repositories\ScheduleRepositoryInterface;
use App\Modules\Schedule\Resources\ScheduleResource;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class ScheduleController extends Controller
{
    protected $schedule;

    public function __construct(ScheduleRepositoryInterface $schedule){
        $this->schedule = $schedule;
    }

    public function store(StoreSchedule $request){
        try {
            return success_response(
                trans('messages.create_schedule_success'), 
                new ScheduleResource($this->schedule->store( $request->all() )),
                JsonResponse::HTTP_CREATED
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), [], JsonResponse::HTTP_BAD_REQUEST);
        }
    }

    public function update(StoreSchedule $request, $id){
        try {
            return success_response(
                trans('messages.update_schedule_success'), 
                new ScheduleResource( $this->schedule->update( $request->all(), $id ) ) 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), [], JsonResponse::HTTP_BAD_REQUEST);
        }
    }

    public function destroy($id){
        try {
            return success_response(
                trans('messages.delete_schedule_success'), 
                $this->schedule->destroy( $id )
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), [], JsonResponse::HTTP_BAD_REQUEST);
        }
    }

    public function show($id){
        try {
            return success_response(
                trans('messages.show_schedule_success'), 
                new ScheduleResource( $this->schedule->show( $id ) ) 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), [], JsonResponse::HTTP_NOT_FOUND);
        }
    }
}
