<?php 

namespace App\Modules\Team\Repositories;

use App\Modules\Team\Models\Team;
use App\Modules\User\Models\User;
use Exception;


use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class TeamRepository implements TeamRepositoryInterface 
{
    /**
     *  Responsible for fetching all the Teams
     * 
     * @return Collection $team_collection
     */
    public function all()
    {
        try {
            $team_collection = Team::orderBy('name', 'asc')->get();
            log_to_file('info', 'Success', [$team_collection]);
            return $team_collection;

        } catch (Exception $e) {
            log_error($e);
            throw $e;
        }
    }

    /**
     *  Responsible for fetching all the Teams via the Department ID
     * 
     * @return Collection $team_collection
     */
    public function list_via_department( $department_id )
    {
        try {
            $team_collection = Team::where('department_id', $department_id)
                                    ->orderBy('name', 'asc')
                                    ->get();
            log_to_file('info', 'Success', [$team_collection]);
            return $team_collection;

        } catch (Exception $e) {
            log_error($e);
            throw $e;
        }
    }

    /**
     *  Responsible for fetching all the Teams via the User ID
     * @param $user_od
     * @return Collection $team_collection
     */
    public function list_via_team_handler( $user_id )
    {
        try {
            $team_collection = User::find($user_id)
                                    ->teams_handled()
                                    ->get();
            log_to_file('info', 'Success', [$team_collection]);
            return $team_collection;

        } catch (Exception $e) {
            log_error($e);
            throw $e;
        }
    }

    
    /**
     *  Responsible for fetching the Team with the ID given.
     * @param $id
     * @return Team $team
     */
    public function find( $id )
    {
        try {
            $team = Team::find($id);
            log_to_file('info', 'Success', [$team]);
            return $team;

        } catch (Exception $e) {
            log_error($e);
            throw $e;
        }
    }

    public function store( array $data )
    {
        DB::beginTransaction();
        try {
            
            $team = new Team();

            $team->name             = ( isset( $data['name'] ) && is_valid( $data['name'] ) ) ? strip_tags($data['name']) : null;
            $team->department_id    = ( isset( $data['department_id'] ) && is_valid( $data['department_id'] ) ) ? $data['department_id'] : null;
            $team->updated_by       = auth()->user()->id;
            $team->created_by       = auth()->user()->id;
                  
            $team->save();

            $team->team_handlers()->sync( $data['team_handlers'] );
            $team->team_users()->sync( $data['team_users'] );
            
            DB::commit();
            log_to_file('info', 'Success', [$team], 'team');
            return $team;

        } catch (Exception $e) {
            DB::rollback();
            log_error($e);
            throw $e;
        }
    }

    public function update( array $data , $id )
    {
        DB::beginTransaction();
        try {
            
            $team = Team::find($id);

            $team->name             = ( isset( $data['name'] ) && is_valid( $data['name'] ) ) ? strip_tags($data['name']) : null;
            $team->department_id    = ( isset( $data['department_id'] ) && is_valid( $data['department_id'] ) ) ? $data['department_id'] : null;
            $team->updated_by       = auth()->user()->id;
                  
            $team->save();

            $team->team_handlers()->sync( $data['team_handlers'] );
            $team->team_users()->sync( $data['team_users'] );
            
            DB::commit();
            log_to_file('info', 'Success', [$team], 'team');
            return $team;

        } catch (Exception $e) {
            DB::rollback();
            log_error($e);
            throw $e;
        }
    }

    public function destroy( $id )
    {
        DB::beginTransaction();
        try {
            
            $team = Team::find($id);
            $team->updated_by = auth()->user()->id;
            $team->team_handlers()->detach();
            $team->team_users()->detach();
            $team->delete();
            
            DB::commit();
            log_to_file('info', 'Success', [$team], 'team');
            return $team;

        } catch (Exception $e) {
            DB::rollback();
            log_error($e);
            throw $e;
        }
    }
}