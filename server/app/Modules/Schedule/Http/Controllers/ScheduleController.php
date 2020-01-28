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
            $this->schedule->create( $request->all() );
        } catch(Exception $e){
            throw $e;
        }
        // try {
        //     trans(1234);
        // // Validates the current request with StoreSchedule as Rules
        // $validated = $request->validated();
        // }
        // if( $validated ){

        //     return response()->json( $validated , JsonResponse::HTTP_CREATED);
        // }
    }

    public function show($id){
        try {
            
            // return $this->schedule->show( $id );
            return new ScheduleResource( $this->schedule->show( $id ) );
        } catch(Exception $e){
            throw $e;
        }
    }

    public function update(Request $request, $id){
        return 'update';
    }

    public function destroy($id){
        return 'destroy';
    }
}
