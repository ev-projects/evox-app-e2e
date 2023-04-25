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
            $numbers = array(
                "pending" => 0,
                "approved" => 0,
                "decline" => 0,
                "canceled" => 0,
            );


            # Initialize the variable
            $query = '';
            $request_tables     = get_constant('REQUEST_TABLES');
            $request_tables_no  = count(get_constant('REQUEST_TABLES')) - 1;
            
            # Get the Id of Team or User and add it to the query
            if($data->url=='my_team_requests'){
                $id = under_supervisee_id_list(Auth::user()->users_handled()->select('id')->get());
                $list = implode(', ', $id); 
                $id_filter = '
                WHERE user_id IN ('.$list.')'; 
                
                # Return default status number if there is no assigned employee
                if(count($id)<=0){
                    return array( 'status_numbers' => $numbers  );
                }
                
            }elseif($data->url=='my_requests'){
                $id = Auth::user()->id;
                $id_filter = '
                WHERE user_id = '.$id.'';  
            }

            # Date filter
            $date_filter = "";
            $change_sched_date = "";
            if( isset($data->valid_from)&&isset($data->valid_to) ){
                $date_filter = "AND date BETWEEN '".$data->valid_from."' AND '".$data->valid_to."' ";
                $change_sched_date = "AND ( (valid_from  BETWEEN '".$data->valid_from."' AND '".$data->valid_to."' ) 
                OR (valid_to BETWEEN '".$data->valid_from."' AND '".$data->valid_to."') )";
            }

            # Department
            $filter_department = "";
            if( isset($data->department_id) ){
                $filter_department = "AND users.department_id = ".$data->department_id;
            }

            # Filter Name
            $filter_name = "";
            if( isset($data->name) ){
                $filter_name = 'AND (users.first_name like "%'.$data->name.'%" OR users.last_name like "%'.$data->name.'%" OR CONCAT(users.first_name, " ", users.last_name) LIKE "%' . $data->name. '%" )';
            }
            

            # Filter Request type
            if(isset($data->request_type)){
                if($data->request_type=='all'){
                    $filter = ' SELECT status FROM overtimes 
                    LEFT JOIN users ON users.id = overtimes.user_id
                    '.$id_filter.'
                    '.$date_filter.'
                    '.$filter_department.'
                    '.$filter_name.'
                    UNION  ALL
                    SELECT status FROM alter_logs 
                        LEFT JOIN users ON users.id = alter_logs.user_id
                    '.$id_filter.'
                    '.$date_filter.'
                    '.$filter_department.'
                    '.$filter_name.'
                    UNION  ALL
                    SELECT status FROM rest_day_works 
                        LEFT JOIN users ON users.id = rest_day_works.user_id
                    '.$id_filter.'
                    '.$date_filter.'
                    '.$filter_department.'
                    '.$filter_name.'
                    UNION  ALL
                    SELECT status FROM change_schedules 
                        LEFT JOIN users ON users.id = change_schedules.user_id
                    '.$id_filter.'
                    '.$change_sched_date.'
                    '.$filter_department.'
                    '.$filter_name.'';
        
                }elseif($data->request_type=='alteration'){
                    $filter = 'SELECT status FROM alter_logs 
                    LEFT JOIN users ON users.id = alter_logs.user_id
                    '.$id_filter.'
                    '.$date_filter.'
                    '.$filter_department.'
                    '.$filter_name.'';
                }elseif($data->request_type=='overtime'){
                    $filter = 'SELECT status FROM overtimes 
                    LEFT JOIN users ON users.id = overtimes.user_id
                    '.$id_filter.'
                    '.$date_filter.'
                    '.$filter_department.'
                    '.$filter_name.'';
                }elseif($data->request_type=='rest_day_work'){
                    $filter = 'SELECT status FROM rest_day_works 
                    LEFT JOIN users ON users.id = rest_day_works.user_id
                    '.$id_filter.'
                    '.$date_filter.'
                    '.$filter_department.'
                    '.$filter_name.'';
                }elseif($data->request_type=='change_schedule'){
                    $filter ='SELECT status FROM change_schedules 
                    LEFT JOIN users ON users.id = change_schedules.user_id
                    '.$id_filter.'
                    '.$change_sched_date.'
                    '.$filter_department.'
                    '.$filter_name.'';
                }
                   
            }

            # Construct the Query by Looping the Tables that will be fetch for request numbers
            $query .= ' 
            SELECT request.status, COUNT(*) 
            FROM (
                       '.$filter .'
            ) AS request
            GROUP BY status
                    ';


            # Run the Query
            $status =  DB::select( DB::raw( $query ) );

            
            
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


    public function get_status_numbers_dashboard($data)
    {
        DB::beginTransaction();
        try {
            $numbers = array(
                "alterlogpending" => 0,
                "overtimepending" => 0,
                "restdayworkpending" => 0,
                "changeschedulepending" => 0,
            );


            # Initialize the variable
            $query = '';
            $request_tables     = get_constant('REQUEST_TABLES');
            $request_tables_no  = count(get_constant('REQUEST_TABLES')) - 1;
            
            # Get the Id of Team or User and add it to the query
            if($data->url=='my_team_requests'){
                $id = under_supervisee_id_list(Auth::user()->users_handled()->select('id')->get());
                $list = implode(', ', $id); 
                $id_filter = '
                WHERE user_id IN ('.$list.') AND status = "pending"'; 
                
                # Return default status number if there is no assigned employee
                if(count($id)<=0){
                    return array( 'status_numbers' => $numbers  );
                }
                
            }elseif($data->url=='my_requests'){
                $id = Auth::user()->id;
                $id_filter = '
                WHERE user_id = '.$id.' AND status = "pending"';  
            }
            if(isset($data->request_type)){
                if($data->request_type=='all'){
                    $filter = 'SELECT Count(*) as al  FROM alter_logs 
                    LEFT JOIN users ON users.id = alter_logs.user_id
                    '.$id_filter.'
                    UNION  ALL
                    SELECT Count(*) as ot FROM overtimes
                    LEFT JOIN users ON users.id = overtimes.user_id
                    '.$id_filter.'
                    UNION  ALL
                    SELECT Count(*) as  rd FROM rest_day_works 
                        LEFT JOIN users ON users.id = rest_day_works.user_id
                    '.$id_filter.'
                    UNION  ALL
                    SELECT Count(*) as cs FROM change_schedules 
                        LEFT JOIN users ON users.id = change_schedules.user_id
                    '.$id_filter.'
                    ';
        
                }
                   
            }

            # Construct the Query by Looping the Tables that will be fetch for request numbers
            $query .= ''.$filter .'';


            # Run the Query
            $status =  DB::select( DB::raw( $query ) );
          
             $i = 0;
              # Loop the result of query
              foreach ($status as $key => $value) {

               
                if($i == 0){
                    $numbers["alterlogpending"] = $value->{'al'};
                }else if($i == 1){
                    $numbers["overtimepending"] = $value->{'al'};
                }
                else if($i == 2){
                    $numbers["restdayworkpending"] = $value->{'al'};
                }
                else if($i == 3){
                    $numbers["changeschedulepending"] = $value->{'al'};
                }
                $i=$i+1;
             
            }

            return array( 'status_numbers' => $numbers  );
        } catch (Exception $e) {
            DB::rollback();
            log_error($e);
            throw $e;
        }
    }



}