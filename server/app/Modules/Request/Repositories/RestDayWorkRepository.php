<?php 

namespace App\Modules\Request\Repositories;

use App\Modules\Request\Models\RestDayWork;
use App\Modules\Request\Resources\RestDayWorkResource;
use App\Modules\User\Models\User;
use Exception;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RestDayWorkRepository implements RestDayWorkRepositoryInterface{
    
    ###############################################################################################
    ###################################### Public functions #######################################
    ###############################################################################################


    /**
     *  Responsible for Storing the Rest Day Work Request
     * @param array (Rest Day Work Post Variables) $data
     * @return RestDayWork $rest_day_work
     */
    public function store(array $data)
    {
        DB::beginTransaction();
        try {

            $rest_day_work = new RestDayWork();

            $rest_day_work->user_id         = auth()->user()->id;
            $rest_day_work->date            = ( isset( $data['date'] ) && is_valid( $data['date'] ) ) ? $data['date'] : null;
            $rest_day_work->start_time      = ( isset( $data['start_time'] ) && is_valid( $data['start_time'] ) ) ? time_to_seconds( $data['start_time'] ) : 0;
            $rest_day_work->end_time        = ( isset( $data['end_time'] )   && is_valid( $data['end_time'] ) )   ? time_to_seconds( $data['end_time'] )   : 0;
            $rest_day_work->break_time      = ( isset( $data['break_time'] ) && is_valid( $data['break_time'] ) ) ? time_to_seconds( $data['break_time'] )   : 0;
            $rest_day_work->updated_by      = auth()->user()->id;
            $rest_day_work->employee_note   = ( isset( $data['employee_note'] ) && is_valid( $data['employee_note'] ) ) ? $data['employee_note'] : null;
            $rest_day_work->updated_by      = auth()->user()->id;
            $rest_day_work->created_by      = auth()->user()->id;
            $rest_day_work->save();
            
            DB::commit();
            log_to_file('info', 'Success', [$rest_day_work]);
            return $rest_day_work;

        } catch (Exception $e) {
            DB::rollback();
            log_error($e);
            throw $e;
        }
    }


    /**
     *  Responsible for Updating the Rest Day Work Request 
     * @param array (Rest Day Work Post Variables) $data
     * @param RestDayWork (Rest Day Work Instance/ ID String ) $id_or_rest_day_work
     * @return RestDayWork $rest_day_work
     */
    public function update(array $data, $id_or_rest_day_work)
    {
        DB::beginTransaction();
        try {

            $rest_day_work =   ( $id_or_rest_day_work instanceof RestDayWork ) ? $id_or_rest_day_work : RestDayWork::findOrFail($id_or_rest_day_work);
            
            // Authenticate the User first if valid for the Update
            if( get_authenticated_user( $rest_day_work->user_id ) ) {
            
                $rest_day_work->date         = ( isset( $data['date'] ) && is_valid( $data['date'] ) ) ? $data['date'] : null;
                $rest_day_work->start_time   = ( isset( $data['start_time'] ) && is_valid( $data['start_time'] ) ) ? time_to_seconds( $data['start_time'] ) : 0;
                $rest_day_work->end_time     = ( isset( $data['end_time'] )   && is_valid( $data['end_time'] ) )   ? time_to_seconds( $data['end_time'] )   : 0;
                $rest_day_work->break_time   = ( isset( $data['break_time'] ) && is_valid( $data['break_time'] ) ) ? time_to_seconds( $data['break_time'] )   : 0;
                $rest_day_work->updated_by   = auth()->user()->id;
                
                $rest_day_work->employee_note  = ( isset( $data['employee_note'] ) && is_valid( $data['employee_note'] ) ) ? $data['employee_note'] : $rest_day_work->employee_note ;
                $rest_day_work->approver_note  = ( isset( $data['approver_note'] ) && is_valid( $data['approver_note'] ) ) ? $data['approver_note'] : $rest_day_work->approver_note ;
                $rest_day_work->updated_by   = auth()->user()->id;
                $rest_day_work->update();
                
                DB::commit();

                $rest_day_work->pending();

                log_to_file('info', 'Success', [$rest_day_work]);
                return $rest_day_work;
            }

        } catch (Exception $e) {
            DB::rollback();
            log_error($e);
            throw $e;
        }
    }


    /**
     *  Responsible for Soft-Deleting the Rest Day Work Request from Database
     * @param $id
     * @return bool
     */
    public function destroy($id)
    {
        DB::beginTransaction();
        try {

            $rest_day_work = RestDayWork::findOrFail($id);
            
            if( get_authenticated_user( $rest_day_work->user_id ) ) {

                $rest_day_work->updated_by = auth()->user()->id;

                $rest_day_work->update();

                $rest_day_work->delete();

                DB::commit();
                log_to_file('info', 'Success', [$rest_day_work]);
                return true;

            }

        } catch (Exception $e) {
            DB::rollback();
            log_error($e);
            throw $e;
        }
    }

    
    /**
     *  Responsible for fetching the Rest Day Work Request with the ID given.
     * @param $id
     * @return RestDayWork $rest_day_work
     */
    public function find($id)
    {
        try {

            $rest_day_work = RestDayWork::find($id);

            if( get_authenticated_user( $rest_day_work->user_id ) ) {
                
                log_to_file('info', 'Success', [$rest_day_work]);
                return $rest_day_work;
            }

        } catch (Exception $e) {
            log_error($e);
            throw $e;
        }
    }

    
    /**
     *  Responsible for fetching the Rest Day Work Requests with the given Parameters.
     * @param array $parameter
     * @return Collection $rest_day_work_collection
     */
    public function where(array $parameter)
    {
        try {
            $query_array = ['1 = 1'];
            $wildcard_array = [];


            if( count( $parameter ) > 0 ) {
                
                # If the Valid From and Valid To is set, fetch the Request with Dates that are in between the 2 dates.
                if( isset( $parameter['valid_from'] ) && is_valid( $parameter['valid_from'] ) && 
                    isset( $parameter['valid_to'] ) && is_valid( $parameter['valid_to'] ) ) {

                    $query_array[] = "rest_day_works.date BETWEEN ? AND ?";
                    array_push( $wildcard_array, $parameter['valid_from'], $parameter['valid_to'] );

                # If the Valid From is set, fetch the Request with  Dates that is beyond the Valid From Date.
                } else if( isset( $parameter['valid_from'] ) && is_valid( $parameter['valid_from'] ) ) {

                    $query_array[] = "rest_day_works.date >= ?";
                    array_push( $wildcard_array, $parameter['valid_from'] );

                # If the Valid To is set, fetch the Request with Dates that is before the Valid To Date.
                } else if( isset( $parameter['valid_to'] ) && is_valid( $parameter['valid_to'] ) ) {

                    $query_array[] = "rest_day_works.date <= ?";
                    array_push( $wildcard_array, $parameter['valid_to'] );

                }

                # If the Request Status is set, fetches the request with the given Request Status
                if( isset( $parameter['request_status'] ) && is_valid( $parameter['request_status'] ) ) {

                    $query_array[] = "rest_day_works.status = ?";
                    array_push( $wildcard_array, $parameter['request_status'] );

                }

                # If the Department ID is set, fetches the request with the given User's Department ID
                if( isset( $parameter['department_id'] ) && is_valid( $parameter['department_id'] ) ) {

                    $query_array[] = "users.department_id = ?";
                    array_push( $wildcard_array, $parameter['department_id'] );

                }

                if( isset( $parameter['user'] ) && is_valid( $parameter['user'] ) ) {

                    $query_array[] = "(
                        CONCAT(users.first_name,' ',users.middle_name,' ',users.last_name) LIKE ? OR
                        users.email LIKE ? OR
                        users.emp_num = ? OR
                        users.id = ?
                    )";
                    array_push( $wildcard_array, '%'.$parameter['user'].'%', '%'.$parameter['user'].'%', $parameter['user'], $parameter['user']  );

                }

                if( isset( $parameter['show_owned'] ) && $parameter['show_owned'] ) {

                    $query_array[] = "rest_day_works.user_id = ?";
                    array_push( $wildcard_array, auth()->user()->id );

                }

            } 

            

            $rest_day_work_collection = RestDayWork::select('rest_day_works.*')
                                                    ->leftJoin('users', 'rest_day_works.user_id', '=', 'users.id')
                                                    ->whereRaw( implode(' AND ', $query_array) , $wildcard_array)
                                                    ->get();

            log_to_file('info', 'Success', [$rest_day_work_collection]);
            return RestDayWorkResource::collection( $rest_day_work_collection );

        } catch (Exception $e) {
            log_error($e);
            throw $e;
        }
    }


    /**
     *  Responsible for updating the Request's Details and Approving the Rest Day Work Request with the ID given
     * @param array $data
     * @param $id
     * @return RestDayWork $rest_day_work
     */
    public function approve(array $data, $id)
    {
        DB::beginTransaction();
        try {
            # Fetch the Rest Day Work base on the ID
            $rest_day_work = RestDayWork::findOrFail($id);

            // Authenticate the User first if the Rest Day Work Submitter is under the user logged in's supervisee
            if( is_under_supervisee( $rest_day_work->user_id ) ) {

                if(!empty($data)){
                    $this->update($data, $rest_day_work);
                }

                $rest_day_work->approve();
            }
            DB::commit();
            return $rest_day_work;

        } catch (Exception $e) {
            DB::rollback();
            log_error($e);
            throw $e;
        }
    }



    /**
     *  Responsible for updating the Request's Details and Declining the Rest Day Work Request with the ID given
     * @param array $data
     * @param $id
     * @return RestDayWork $rest_day_work
     */
    public function decline( array $data, $id)
    {
        DB::beginTransaction();
        try {
            
            # Fetch the Rest Day Work base on the ID
            $rest_day_work = RestDayWork::findOrFail($id);

            // Authenticate the User first if the Rest Day Work Submitter is under the user logged in's supervisee
            if( is_under_supervisee( $rest_day_work->user_id ) ) {

                if(!empty($data)){
                    $this->update($data, $rest_day_work);
                }


                $rest_day_work->decline();
            }

            DB::commit();
            return $rest_day_work;

        } catch (Exception $e) {
            DB::rollback();
            log_error($e);
            throw $e;
        }
    }

   /**
     *  Responsible for Applying the newly fetched Drupal Rest Day Work to EVOX
     * @param array $drupal_evox_rest_day_work_array
     * 
     * @return arrayu $to_compute_items
     */
    public function apply_drupal_evox_data_to_rest_day_work( array $drupal_evox_alter_rest_day_work )
    {   
        DB::beginTransaction();
        try {

            log_to_file( 'info', get_constant('LOG_START') . __FUNCTION__ , [], "drupal_migration");

            $users_not_existing = [];
            $to_compute_items = [];

            // Iterates the Array fetched from the Drupal Database
            foreach( $drupal_evox_alter_rest_day_work as $drupal_evox_rest_day_work) {

                // Fetch the User via the emp_num field of the User
                $user = User::where(['emp_num' => $drupal_evox_rest_day_work->employee_number])->first();

                // Checks if the user is existing
                if(!is_null($user )) {

                    $rest_day_work = $user->rest_day_works()->where(['date' => $drupal_evox_rest_day_work->date])->first();
                    # Insert Alter Log
                    if( $rest_day_work == null ) {
                        $rest_day_work                   = new RestDayWork();
                        $rest_day_work->user_id          =  $user->id;
                        $rest_day_work->date             =  $drupal_evox_rest_day_work->date;

                        $rest_day_work->start_time       =  $drupal_evox_rest_day_work->on_duty;
                        $rest_day_work->end_time         =  $drupal_evox_rest_day_work->off_duty;

                        $rest_day_work->employee_note    =  $drupal_evox_rest_day_work->employee_note ?? null;
                        $rest_day_work->approver_note    =  $drupal_evox_rest_day_work->superviser_note ?? null;
                        
                        $rest_day_work->status           =  $drupal_evox_rest_day_work->status;
                        $rest_day_work->created_by       =  $user->id;
                        $rest_day_work->created_at       =  $drupal_evox_rest_day_work->date_created;
                        $rest_day_work->updated_at       =  $drupal_evox_rest_day_work->date_updated;
                        $rest_day_work->save();

                        // Saved the To compute Items
                        if( in_array($rest_day_work->status, array('approved','declined')) ) {
                            $to_compute_items[] = $rest_day_work;
                        }
                        log_to_file( 'info', 'Success', [$rest_day_work->getAttributes()], "drupal_migration");
                    }
                } else {
                    log_to_file( 'info', 'User not existing', [$drupal_evox_rest_day_work], "drupal_migration");
                    $users_not_existing[$drupal_evox_rest_day_work->employee_number] = $drupal_evox_rest_day_work->employee_number;
                }

            }

            DB::commit();

            if( count( $users_not_existing ) > 0 ){
                log_to_file( 'info', 'Employee Numbers that does not exist"', [$users_not_existing], "drupal_migration");
            }

            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "drupal_migration");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "drupal_migration");
            return $to_compute_items;

        } catch (Exception $e) {
            DB::rollback();
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "drupal_migration");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "drupal_migration");
            log_error($e);
            throw $e;
        }
    }



    /**
     *  Responsible for updating the Request's Details and Declining the Rest Day Work Request with the ID given
     * @param array $data
     * @param $id
     * @return RestDayWork $rest_day_work
     */
    public function pending( $id )
    {
        try {
            $rest_day_work = RestDayWork::findOrFail($id);
            $rest_day_work->pending();

            return $rest_day_work;
            
        } catch (Exception $e) {
            log_error($e);
            throw $e;
        }
    }


    /**
     *  Responsible for updating the Request's Details and Declining the Rest Day Work Request with the ID given
     * @param array $data
     * @param $id
     * @return RestDayWork $rest_day_work
     */
    public function cancel( $id )
    {
        try {
            $rest_day_work = RestDayWork::findOrFail($id);
            $rest_day_work->cancel();

            return $rest_day_work;

        } catch (Exception $e) {
            log_error($e);
            throw $e;
        }
    }




    ###############################################################################################
    ##################################### Protected functions #####################################
    ###############################################################################################



    ###############################################################################################
    ##################################### Validation functions #####################################
    ###############################################################################################



}