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
    public function get_status_numbers_old($data)
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
                    '.$filter_name.'
                    UNION  ALL
                    SELECT status FROM alter_log_punches 
                        LEFT JOIN users ON users.id = alter_log_punches.user_id
                    '.$id_filter.'
                    '.$date_filter.'
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
                }elseif($data->request_type=='alter_logs_punches'){
                    $filter ='SELECT status FROM alter_log_punches 
                    LEFT JOIN users ON users.id = alter_log_punches.user_id
                    '.$id_filter.'
                    '.$date_filter.'
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
                "declined" => 0,
                "canceled" => 0,
            );

            if(Auth::user()->LevelId == null){
                return $numbers;
            }

            if($data->url=='my_requests'){
                $request_types = [
                    'all'                   => 0,
                    'alteration'            => 1,
                    'overtime'              => 2,
                    'rest_day_work'         => 3,
                    'change_schedule'       => 4,
                    'alter_logs_punches'    => 5,
                ];

                $values = [
                    'all',
                    $data['valid_from'],
                    $data['valid_to'],
                    $request_types[$data['request_type']],
                    Auth::user()->id,
                ];
                $response = call_sp('EH_SP_MyRequest', $values);

                if ($response[0]) {
                    foreach ($response[0] as $value) {
                        switch ($value->status) {
                            case 'pending':
                                $numbers['pending'] += 1;
                                break;
                            case 'approved':
                                $numbers['approved'] += 1;
                                break;
                            case 'declined':
                                $numbers['declined'] += 1;
                                break;
                            case 'canceled':
                                $numbers['canceled'] += 1;
                                break;
                        }
                    }
                    return array( 'status_numbers' => $numbers  );
                }
            }

          if($data->url=='my_team_requests'){
            $my_team_req =  call_sp("EH_SP_My_Team_Request", [Auth::user()->id, Auth::user()->LevelId
            ,$data->valid_from, $data->valid_to,
            get_constant('REQUEST_TYPE_SP_RE')[$data->request_type], 
            $data->status 
            , $data->department_id,
            $data->name, 
            0, 1, 999, 0]);
         
            
            // dd( $data->all(),$my_team_req);
            
            if(is_valid($my_team_req[0])){
                $numbers = array(
                    "pending" => $my_team_req[0][3]->statusCount,
                    "approved" => $my_team_req[0][0]->statusCount,
                    "decline" => $my_team_req[0][2]->statusCount,
                    "canceled" => $my_team_req[0][1]->statusCount,
                );
            }
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
            // dd($data->all());
            try {
                $numbers = array(
                    "alterlogpending" => 0,
                    "overtimepending" => 0,
                    "restdayworkpending" => 0,
                    "changeschedulepending" => 0,
                );
    
    
                # Initialize the variable
                $id = Auth::user()->id;
                $query = '';
                $request_tables     = get_constant('REQUEST_TABLES');
                $request_tables_no  = count(get_constant('REQUEST_TABLES')) - 1;
            
                # Get the Id of Team or User and add it to the query
                if($data->url=='my_team_requests'){ 
                    $id_filter = '
                    WHERE exists (select users_supervisors.user_id from users_supervisors where users_supervisors.user_id = users.id and users_supervisors.supervisor_id = '.$id.' ) AND status = "pending"';
                
                }elseif($data->url=='my_requests'){
                  
                    $id_filter = '
                    WHERE user_id = '.$id.' AND status = "pending"';  
                }
                if(isset($data->request_type)){
                    if($data->request_type=='all'){
                        $filter = 'SELECT Count(alter_logs.id) as pendingCount  FROM alter_logs
                        JOIN users ON users.id = alter_logs.user_id
                        '.$id_filter.'
                        UNION  ALL
                        SELECT Count(overtimes.id) as pendingCount FROM overtimes
                        JOIN users ON users.id = overtimes.user_id
                        '.$id_filter.'
                        UNION  ALL
                        SELECT Count(rest_day_works.id) as  pendingCount FROM rest_day_works
                        JOIN users ON users.id = rest_day_works.user_id
                        '.$id_filter.'
                        UNION  ALL
                        SELECT Count(change_schedules.id) as pendingCount FROM change_schedules
                        JOIN users ON users.id = change_schedules.user_id
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
                if(!count($status)<= 0){
                    foreach ($status as $key => $value) {
    
                
                        if($i == 0){
                            $numbers["alterlogpending"] = $value->{'pendingCount'};
                        }else if($i == 1){
                            $numbers["overtimepending"] = $value->{'pendingCount'};
                        }
                        else if($i == 2){
                            $numbers["restdayworkpending"] = $value->{'pendingCount'};
                        }
                        else if($i == 3){
                            $numbers["changeschedulepending"] = $value->{'pendingCount'};
                        }
                        $i=$i+1;
                    
                    }
                }
                else{
                    $status = $numbers;
                }
                
    
                return array( 'status_numbers' => $numbers  );
            } catch (Exception $e) {
            
                log_error($e);
                throw $e;
            }
        
        }

        public function get_status_numbers_only($user, $cutoff)
        {
           
            try {

                /*
                    status type Type values
                    pending
                    approved
                    declined
                    */

                /*
                    Request Type values
                    0 - All
                    1 - Alteration
                    2 - OverTime
                    3 - Rest Day Work
                    4 - Change Schedule
                    5 - MultiPunch Alteration
                    */
                    

                $alter =  call_sp("EH_SP_MyRequest", ["pending",$cutoff->start_date, $cutoff->end_date, 1 ,$user->id, 1 , 99]);
                $Multi_alter =  call_sp("EH_SP_MyRequest", ["pending",$cutoff->start_date, $cutoff->end_date, 5 ,$user->id, 1 , 99]);
                

                $overtime =  call_sp("EH_SP_MyRequest", ["pending",$cutoff->start_date, $cutoff->end_date, 2 ,$user->id, 1 , 99]);
            

                $restdaywork =  call_sp("EH_SP_MyRequest", ["pending",$cutoff->start_date, $cutoff->end_date, 3 ,$user->id, 1 , 99]);
            

                $changeschedule =  call_sp("EH_SP_MyRequest", ["pending",$cutoff->start_date, $cutoff->end_date, 4 ,$user->id, 1 , 99]);


                $my_team_alter =[];
                $my_team_Multi_alter =[];
                $my_team_changeschedule =[];
                $my_team_restdaywork =[];
                $my_team_overtime =[];
                $features = $user->userFeatures();
                $my_team_alter =[];
                $my_team_Multi_alter =[];
                $my_team_changeschedule =[];
                $my_team_restdaywork =[];
                $my_team_overtime =[];
                    if(!in_array("manage_alter_log_request",$features)){
                        $my_team_alter =  call_sp("EH_SP_My_Team_Request", [$user->id, $user->LevelId,$cutoff->start_date, $cutoff->end_date,"1", "pending" 
                        , null, null , 
                        0, 1, 999, 0]);
        
                        $my_team_Multi_alter =  call_sp("EH_SP_My_Team_Request", [$user->id, $user->LevelId,$cutoff->start_date, $cutoff->end_date,"5", "pending" 
                        , null, null , 
                        0, 1, 999, 0
                        ]);
                    }

                    if(in_array("manage_change_schedules_request",$features)){
                        $my_team_changeschedule =  call_sp("EH_SP_My_Team_Request", [$user->id, $user->LevelId,$cutoff->start_date, $cutoff->end_date,"4", "pending" 
                        , null, null , 
                        0, 1, 999, 0
                        ]);
                    }

                    if(in_array("manage_rest_day_work_request",$features)){
                        $my_team_restdaywork =  call_sp("EH_SP_My_Team_Request", [$user->id, $user->LevelId,$cutoff->start_date, $cutoff->end_date,"3", "pending" 
                        , null, null , 
                        0, 1, 999, 0
                        ]);
                    }

                    if(in_array("manage_overtime_request",$features)){
                        $my_team_overtime =  call_sp("EH_SP_My_Team_Request", [$user->id, $user->LevelId,$cutoff->start_date, $cutoff->end_date,"$user->LevelId", "pending" 
                        , null, null , 
                        0, 1, 999, 0
                        ]);

                    }


                
                

                
                

            //    dd($my_team_alter ,$my_team_Multi_alter );

                $numbers = [
                    "alterlogpending"   => (string)(count($alter[0]) + count($Multi_alter[0])),
                    "overtimepending"   => (string)count($overtime[0]),
                    "restdayworkpending"    => (string)count($restdaywork[0]),
                    "changeschedulepending" => (string)count($changeschedule[0]),
                    "team_alterlogpending"  => (string)(
                        (is_valid( $my_team_alter) ? $my_team_alter[1][0]->TotalCount : 0) + 
                        (is_valid( $my_team_Multi_alter) ? $my_team_Multi_alter[1][0]->TotalCount : 0)) ,
                    "team_overtimepending"  =>(string)( is_valid( $my_team_overtime) ? $my_team_overtime[1][0]->TotalCount : 0),
                    "team_restdayworkpending"   =>  (string)(is_valid( $my_team_overtime) ? $my_team_restdaywork[1][0]->TotalCount : 0),
                    "team_changeschedulepending"    =>  (string)(is_valid( $my_team_changeschedule) ? $my_team_changeschedule[1][0]->TotalCount : 0),
                ];

                return array( 'status_numbers' => $numbers  );


            }catch (Exception $e) {
                dump($e);
                log_error($e);
                throw $e;
            }

        }



}