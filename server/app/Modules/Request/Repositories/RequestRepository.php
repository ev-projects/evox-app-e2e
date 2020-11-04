<?php 

namespace App\Modules\Request\Repositories;

use App\Modules\User\Models\User;
use Exception;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Auth;

class RequestRepository implements RequestRepositoryInterface{
    
    ###############################################################################################
    ###################################### Public functions #######################################
    ###############################################################################################


    /**
     *  Responsible for Storing the Overtime Request
     * @param array (Overtime Post Variables) $data
     * @return Overtime $overtime
     */
    public function get_status_numbers($data)
    {
        DB::beginTransaction();
        try {
            # Initialize the variable
            $query = '';
            $request_tables     = get_constant('REQUEST_TABLES');
            $request_tables_no  = count(get_constant('REQUEST_TABLES')) - 1;
            
            # Get the Id of Team or User and add it to the query
            if($data->url=='my_team_requests'){
                $id = under_supervisee_id_list(Auth::user()->supervisee()->select('id')->get());
                $list = implode(', ', $id); 
                $id_filter = '
                WHERE user_id IN ('.$list.')';          
            }elseif($data->url=='my_requests'){
                $id = Auth::user()->id;
                $id_filter = '
                WHERE user_id = '.$id.'';  
            }

            # Construct the Query by Looping the Tables that will be fetch for request numbers
            foreach(get_constant('REQUEST_TABLES')  as $key => $value) {
                $query .= ' SELECT status FROM '.  $value . ' ' .$id_filter;

                if($request_tables_no!=$key){
                    $query .= ' 
                    UNION ALL
                    ';
                }
            }

            

            # Run the Query
            $status =  DB::select( DB::raw("SELECT request.status, COUNT(*) 
                FROM (
                ".$query."
                ) AS request
                GROUP BY status") );

            $numbers = array();
            
            # Loop the result of query
            foreach ($status as $key => $value) {
                $numbers[$value->{'status'}] = $value->{'COUNT(*)'};
            }

            return array( 'status_numbers' => $numbers  );
        } catch (Exception $e) {
            DB::rollback();
            log_error($e);
            throw $e;
        }
    }



}