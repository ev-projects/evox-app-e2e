<?php

namespace App\Modules\Team\Http\Controllers;

use Illuminate\Http\Request;

use App\Http\Controllers\Controller;
use App\Modules\Department\Repositories\DepartmentRepositoryInterface;
use App\Modules\Team\Http\Requests\TeamRequest;
use App\Modules\Team\Repositories\TeamRepositoryInterface;
use App\Modules\Team\Resources\TeamListResource;
use App\Modules\Team\Resources\TeamResource;
use Exception;
use Illuminate\Http\JsonResponse;

class TeamController extends Controller
{
    private $team;
    private $department;
    
    public function __construct(TeamRepositoryInterface $team,
                                DepartmentRepositoryInterface $department){
        $this->team = $team;
        $this->department = $department;
    }

    
    /**
     * Shows all existing Team
     * @return \Illuminate\Http\JsonResponse
     */
    public function all(){
        try {
            $team_collection = $this->team->all();
            return success_response(
                trans('messages.all_team_success'), 
                TeamListResource::collection( $team_collection ) 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e, JsonResponse::HTTP_NOT_FOUND);
        }
    }


    /**
     * Shows all existing Team via the Department ID Parameter
     * @return \Illuminate\Http\JsonResponse
     */
    public function list_via_department( $department_id ){
        try {
            $team_collection = $this->team->list_via_department( $department_id );
            return success_response(
                trans('messages.list_team_via_department_success'), 
                TeamListResource::collection( $team_collection ) 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e, JsonResponse::HTTP_NOT_FOUND);
        }
    }


    /**
     * Shows all Teams via the Users Teams being handled.
     * @return \Illuminate\Http\JsonResponse
     */
    public function list_via_team_handler( $user_id ){
        try {
            $team_collection = $this->team->list_via_team_handler( $user_id );
            return success_response(
                trans('messages.list_team_via_department_success'), 
                TeamListResource::collection( $team_collection ) 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e, JsonResponse::HTTP_NOT_FOUND);
        }
    }

    

    /**
     * Display the specified resource.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function find($id)
    {
        try {
            $team = $this->team->find( $id );
            return success_response(
                trans('messages.find_team_success'), 
                new TeamResource( $team ) 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e, JsonResponse::HTTP_NOT_FOUND);
        }
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function store(TeamRequest $request)
    {
        log_activity( trans('messages.store_team_attempt') );
        try {
            // Store the Team
            $team = $this->team->store( $request->all() );
            return success_response(
                trans('messages.store_team_success'), 
                new TeamResource( $team ) 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e, JsonResponse::HTTP_NOT_FOUND);
        }
    }

    /**
     * Update the specified resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function update(TeamRequest $request, $id)
    {
        log_activity( trans('messages.update_team_attempt') );
        try {
            // Update the Team
            $team = $this->team->update( $request->all(), $id );
            return success_response(
                trans('messages.update_team_success'), 
                new TeamResource( $team ) 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e, JsonResponse::HTTP_NOT_FOUND);
        }
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function destroy($id)
    {
        log_activity( trans('messages.destroy_team_attempt') );
        try {
            // Update the Team
            $team = $this->team->destroy( $id );
            return success_response(
                trans('messages.destroy_team_success'), 
                new TeamResource( $team ) 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e, JsonResponse::HTTP_NOT_FOUND);
        }
    }
}
