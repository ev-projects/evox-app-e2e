<?php 

namespace App\Modules\Request\Repositories;

use App\Modules\Request\Models\Overtime;
use App\Modules\Request\Resources\OvertimeResource;
use App\Modules\User\Models\User;
use Exception;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class OvertimeRepository implements OvertimeRepositoryInterface{
    
    ###############################################################################################
    ###################################### Public functions #######################################
    ###############################################################################################


    /**
     *  Responsible for Storing the Overtime Request
     * @param array (Overtime Post Variables) $data
     * @return Overtime $overtime
     */
    public function store(array $data)
    {
        DB::beginTransaction();
        try {

            $overtime = new Overtime();

            $overtime->user_id      = auth()->user()->id;
            $overtime->date         = ( isset( $data['date'] ) && is_valid( $data['date'] ) ) ? $data['date'] : null;
            $overtime->amount       = ( isset( $data['amount'] ) && is_valid( $data['amount'] ) ) ? time_to_seconds( $data['amount'] ) : 0;
            $overtime->type         = ( isset( $data['type'] ) && is_valid( $data['type'] ) ) ? $data['type'] : null;
            $overtime->updated_by   = auth()->user()->id;
            $overtime->created_by   = auth()->user()->id;
                        
            if( isset($data['employee_note'] ) ) {
                $overtime->set_employee_note( $data['employee_note']  );
            }
            
            $overtime->pending();

            $overtime->save();
            
            DB::commit();
            log_to_file('info', 'Success', [$overtime]);
            return $overtime;

        } catch (Exception $e) {
            DB::rollback();
            log_error($e);
            throw $e;
        }
    }


    /**
     *  Responsible for Updating the Overtime Request 
     * @param array (Overtime Post Variables) $data
     * @param $id
     * @return Overtime $overtime
     */
    public function update(array $data, $id_or_overtime)
    {
        DB::beginTransaction();
        try {

            $overtime =   ( $id_or_overtime instanceof Overtime ) ? $id_or_overtime : Overtime::findOrFail($id_or_overtime);
            
            if( get_authenticated_user( $overtime->user_id ) ) {
            
                $overtime->date         = ( isset( $data['date'] ) && is_valid( $data['date'] ) ) ? $data['date'] : null;
                $overtime->amount       = ( isset( $data['amount'] ) && is_valid( $data['amount'] ) ) ? time_to_seconds( $data['amount'] ) : 0;
                $overtime->type         = ( isset( $data['type'] ) && is_valid( $data['type'] ) ) ? $data['type'] : null;
                $overtime->updated_by   = auth()->user()->id;
                
                if( isset($data['employee_note'] ) && is_valid( $data['employee_note'] ) ) {
                    $overtime->set_employee_note( $data['employee_note']  );
                }
    
                if( isset($data['approver_note'] ) && is_valid( $data['approver_note'] ) ) {
                    $overtime->set_approver_note( $data['approver_note']  );
                }
    
                $overtime->update();
                
                DB::commit();

                $overtime->pending();

                log_to_file('info', 'Success', [$overtime]);
                return $overtime;
            }

        } catch (Exception $e) {
            DB::rollback();
            log_error($e);
            throw $e;
        }
    }


    /**
     *  Responsible for Soft-Deleting the Overtime Request from Database
     * @param $id
     * @return bool
     */
    public function destroy($id)
    {
        DB::beginTransaction();
        try {

            $overtime = Overtime::findOrFail($id);
            
            if( get_authenticated_user( $overtime->user_id ) ) {

                $overtime->updated_by = auth()->user()->id;

                $overtime->update();

                $overtime->delete();

                DB::commit();
                log_to_file('info', 'Success', [$overtime]);
                return true;

            }

        } catch (Exception $e) {
            DB::rollback();
            log_error($e);
            throw $e;
        }
    }

    
    /**
     *  Responsible for fetching the Overtime Request with the ID given.
     * @param $id
     * @return Overtime $overtime
     */
    public function find($id)
    {
        try {

            $overtime = Overtime::find($id);

            log_to_file('info', 'Success', [$overtime]);
            return $overtime;

        } catch (Exception $e) {
            log_error($e);
            throw $e;
        }
    }

    
    /**
     *  Responsible for fetching the Overtime Requests with the given Parameters.
     * @param array $parameter
     * @return Collection $overtime_collection
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

                    $query_array[] = "overtimes.date BETWEEN ? AND ?";
                    array_push( $wildcard_array, $parameter['valid_from'], $parameter['valid_to'] );

                # If the Valid From is set, fetch the Request with  Dates that is beyond the Valid From Date.
                } else if( isset( $parameter['valid_from'] ) && is_valid( $parameter['valid_from'] ) ) {

                    $query_array[] = "overtimes.date >= ?";
                    array_push( $wildcard_array, $parameter['valid_from'] );

                # If the Valid To is set, fetch the Request with Dates that is before the Valid To Date.
                } else if( isset( $parameter['valid_to'] ) && is_valid( $parameter['valid_to'] ) ) {

                    $query_array[] = "overtimes.date <= ?";
                    array_push( $wildcard_array, $parameter['valid_to'] );

                }

                # If the Request Status is set, fetches the request with the given Request Status
                if( isset( $parameter['request_status'] ) && is_valid( $parameter['request_status'] ) ) {

                    $query_array[] = "overtimes.status = ?";
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

                    $query_array[] = "overtimes.user_id = ?";
                    array_push( $wildcard_array, auth()->user()->id );

                }

            } 

            

            $overtime_collection = Overtime::select('overtimes.*')
                                            ->leftJoin('users', 'overtimes.user_id', '=', 'users.id')
                                            ->whereRaw( implode(' AND ', $query_array) , $wildcard_array)
                                            ->get();

            log_to_file('info', 'Success', [$overtime_collection]);
            return OvertimeResource::collection( $overtime_collection );

        } catch (Exception $e) {
            log_error($e);
            throw $e;
        }
    }


    /**
     *  Responsible for updating the Request's Details and Approving the Overtime Request with the ID given
     * @param array $data
     * @param $id
     * @return Overtime $overtime
     */
    public function approve(array $data, $id)
    {
        try {
            
            
            # Fetch the Overtime base on the ID
            $overtime = Overtime::findOrFail($id);

            // Authenticate the User first if the Overtime submitter is under the user logged in's supervisee
            if( is_under_supervisee( $overtime->user_id ) ) {

                if(!empty($data)){
                    $this->update($data, $overtime);
                }

                $overtime->approve();
            }

            return $overtime;

        } catch (Exception $e) {
            log_error($e);
            throw $e;
        }
    }



    /**
     *  Responsible for updating the Request's Details and Declining the Overtime Request with the ID given
     * @param array $data
     * @param $id
     * @return Overtime $overtime
     */
    public function decline(array $data, $id)
    {
        try {
            
             # Fetch the Overtime base on the ID
             $overtime = Overtime::findOrFail($id);
            
            // Authenticate the User first if the Overtime submitter is under the user logged in's supervisee
            if( is_under_supervisee( $overtime->user_id ) ) {

                if(!empty($data)){
                    $overtime = $this->update($data, $overtime);
                }else{
                    $overtime = Overtime::findOrFail($id);
                }

                $overtime->decline();
            }

            return $overtime;

        } catch (Exception $e) {
            log_error($e);
            throw $e;
        }
    }


    /**
     *  Responsible for updating the Request's Details and Declining the Overtime Request with the ID given
     * @param array $data
     * @param $id
     * @return Overtime $overtime
     */
    public function pending( $id )
    {
        try {
            
            $overtime = Overtime::findOrFail($id);
            $overtime->pending();

            return $overtime;

        } catch (Exception $e) {
            log_error($e);
            throw $e;
        }
    }


    /**
     *  Responsible for updating the Request's Details and Declining the Overtime Request with the ID given
     * @param array $data
     * @param $id
     * @return Overtime $overtime
     */
    public function cancel( $id )
    {
        try {
            
            $overtime = Overtime::findOrFail($id);
            $overtime->cancel();

            return $overtime;

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