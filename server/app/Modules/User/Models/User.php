<?php

namespace App\Modules\User\Models;

use App\Modules\Team\Models\Team;
use App\Modules\Department\Models\Department;
use App\Modules\Payroll\Models\Dtr;
use App\Modules\Payroll\Models\DtrPunchHistory;
use App\Modules\Payroll\Models\PayrollCutoff;
use App\Modules\Schedule\Models\Schedule;

use Illuminate\Notifications\Notifiable;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Permission\Traits\HasRoles;
use Spatie\Permission\Traits\HasPermissions;
use Tymon\JWTAuth\Contracts\JWTSubject;


use App\Modules\Request\Models\ChangeSchedule;
use App\Modules\Request\Models\Overtime;
use App\Modules\Request\Models\RestDayWork;
use App\Modules\Request\Models\AlterLog;
use App\Modules\Request\Models\WorkFromHome;
use DB;
use Illuminate\Database\Eloquent\Collection;
use Carbon\Carbon;
use Auth;

class User extends Authenticatable implements JWTSubject
{
    use Notifiable, HasRoles, HasPermissions, SoftDeletes, LogsActivity;
    
    protected $fillable = [];

    protected $hidden = [
        'password'
    ];
    protected $casts = [
        'email_verified_at' => 'datetime',
    ];

    protected $dates = ['deleted_at'];

    /**
     * Get the identifier that will be stored in the subject claim of the JWT.
     *
     * @return mixed
     */
    public function getJWTIdentifier()
    {
        return $this->getKey();
    }

    /**
     * Return a key value array, containing any custom claims to be added to the JWT.
     *
     * @return array
     */
    public function getJWTCustomClaims()
    {
        return [];
    }

    ########################################################################
    ############################ Custom Helpers ############################
    ########################################################################

    /**
     * 
     *  Gets the Full Name of the User 
     *  - Can have additional format depending on the $format_type variable.
     *  -   1  -> {first_name} {middle_name} {last_name}
     *  -   2  -> {last_name}, {first_name} {middle_name} 
     * 
     */
    public function getFullName( $format_type = 1  )
    {
        $result = '';
        switch($format_type) {
            case 1:
                $result = $this->first_name . ' ' . (is_valid($this->middle_name) ? $this->middle_name . ' ' : '') . $this->last_name;
                break;
            case 2:
                $result = $this->last_name . ', '. $this->first_name . (is_valid($this->middle_name) ? ' ' . $this->middle_name : '');
                break;
            case 3:
                $result = $this->first_name. ' '. $this->last_name ;
                break;
            default:
                $result = $this->first_name . ' ' . (is_valid($this->middle_name) ? $this->middle_name . ' ' : '') . $this->last_name;
                break;
        }
        return $result;
    }

    /**
     *  Gets the parsed Employee Number that would be used for Biometrics fetching
     */
    public function getBiometricsId()
    {
        return "20".$this->emp_num;
    }
    
    public function personal(){
        return [    
            "first_name" => $this->first_name , 
            "middle_name" => $this->middle_name , 
            "last_name" => $this->last_name , 
            "emp_num" => $this->emp_num , 
            "email" => $this->email , 
            "department" => $this->department()->first()->department_name   
        ];
    }

    public function job_description(){
        return [    
            "first_name" => $this->first_name 
        ];
    }

    /**
     *  Gets user info for displaying page or block
     */
    public function getUserInfo()
    {               $offset = $this->country_timezone_to_offset();
        return [    "full_name" => $this->getFullName() , 
                    "department" => $this->department()->first()->department_name ?? '',


                    /// SEPARATE
                    "timezone" => $this->timezone,
                    "user_offset_seconds" => string_offset_to_seconds($offset),
                    "user_server_time" =>  timestamp_to_datetime(Carbon::now()->timestamp),
                    "user_server_timestamp" => (Carbon::now()->timestamp + string_offset_to_seconds($offset)),
                    "user_server_timestamp_mils" => (Carbon::now()->timestamp + string_offset_to_seconds($offset))*1000,
                    'pov_timezone'=>  $this->country_zone()->country_name . " " . $this->country_zone()->country_time_zone."(".$this->country_zone()->time_difference .")"
                    
                ];
    }

    ########################################################################
    ############################ Relationships #############################
    ########################################################################

    
    # Fetch the User's Supervisors
    public function supervisors()
    {            
        return $this->belongsToMany(User::class, 'users_supervisors', 'user_id', 'supervisor_id');
    }
    
    # Fetch the User's Supervisee
    public function supervisee()
    {         
        return$this->belongsToMany(User::class, 'users_supervisors', 'supervisor_id', 'user_id');
    }

    # Fetch the User Departments Supervised
    public function departments_supervised()
    {
        return $this->belongsToMany(Department::class, 'department_handlers', 'user_id', 'department_id');
    }

    # Fetch the User's Department
    public function department(){
        return $this->hasOne(Department::class, 'id', 'department_id');
    }

    # Fetch the User's Team
    public function team()
    {
        return $this->belongsToMany(Team::class, 'team_users', 'user_id', 'team_id');
    }

    public function country_zone()
    {
        return $this->hasOne(UtcTimelog::class, 'country_id', 'country_id')->first();
    }

    public function country_zone_offset()
    {
        return $this->hasOne(UtcTimelog::class, 'country_id', 'country_id')->first()->time_difference;
    }

    public function country_timezone_to_offset()
    {
        

        $timezone_name = $this->hasOne(UtcTimelog::class, 'country_id', 'country_id')->first()->timezone;

        $offset_string = Carbon::now($timezone_name);
       

        return $offset_string->format('P');
    }

    public function department_schedule_active()
    {
        return $this->department()->first()->departments_on_schedule_is_active();
    }



    # Fetch the User's Schedule (Source type is Default)
    public function defaultSchedule(){
        return $this->hasOne(Schedule::class, 'bind_id', 'id')->where([
            'bind_to' => 'user',
            'source_type' => get_constant('DTR_SOURCE_TYPE_TAGGING.default')
        ]);
    }

    # Fetch the User's Overtime Requests
    public function overtimes(){
        return $this->hasMany(Overtime::class, 'user_id', 'id');
    }

    # Fetch the User's AlterLog Requests
    public function alter_log(){
        return $this->hasMany(AlterLog::class, 'user_id', 'id');
    }

    # Fetch the User's Rest Day Work Requests
    public function rest_day_works(){
        return $this->hasMany(RestDayWork::class, 'user_id', 'id');
    }

    # Fetch the User's Schedule (Source type is Temporary)
    public function temporarySchedules($start_date = null, $end_date = null){

        $temporary_schedule_condition = [
            'bind_to' => 'user',
            'source_type' => get_constant('DTR_SOURCE_TYPE_TAGGING.temporary')
        ];

        # If the Start and End Date is valid, fetch the Temporary Schedule that exists between the Date Range.
        if( is_valid( $start_date ) && is_valid( $end_date ) ){
            return $this->hasMany(Schedule::class, 'bind_id', 'id')->where($temporary_schedule_condition)
                                                                   ->whereRaw("( valid_from BETWEEN '".$start_date."' AND '".$end_date."' OR valid_to BETWEEN '".$start_date."' AND '".$end_date."')");

        # If the Start Date is valid and End Date is NOT Valid, fetch the Temporary Schedule that scopes the Start Date
        } elseif( is_valid( $start_date ) && !is_valid( $end_date ) ){
            return $this->hasMany(Schedule::class, 'bind_id', 'id')->where($temporary_schedule_condition)
                                                                   ->whereRaw("('". $start_date . "' BETWEEN valid_from AND valid_to)");

        # If the Start and End Date is NOT valid, fetch the all other Temporary Schedules.
        } else {
            return $this->hasMany(Schedule::class, 'bind_id', 'id')->where($temporary_schedule_condition);
        }                                             
    }

    # Fetch the User's Schedule (Source type is Change Schedule)
    public function changeSchedules($start_date = null, $end_date = null){
        
        $change_schedule_condition = [
            'status' => get_constant('REQUEST_STATUS.approved')
        ];

        # If the Start and End Date is valid, fetch the Change Schedule that exists between the Date Range.
        if( is_valid( $start_date ) && is_valid( $end_date ) ){
            return $this->hasMany(ChangeSchedule::class, 'user_id', 'id')->where($change_schedule_condition)
                                                                         ->whereRaw("( valid_from BETWEEN '".$start_date."' AND '".$end_date."' OR valid_to BETWEEN '".$start_date."' AND '".$end_date."')");

        # If the Start Date is valid and End Date is NOT Valid, fetch the Change Schedule that scopes the Start Date
        } elseif( is_valid( $start_date ) && !is_valid( $end_date ) ){
            return $this->hasMany(ChangeSchedule::class, 'user_id', 'id')->where($change_schedule_condition)
                                                                         ->whereRaw("('". $start_date . "' BETWEEN valid_from AND valid_to)");

        # If the Start and End Date is NOT valid, fetch the all other Change Schedules.
        } else {
            return $this->hasMany(ChangeSchedule::class, 'user_id', 'id')->where($change_schedule_condition);
        }
    }

    # This is a duplicate function.
    # Fetch the  Change Schedule
    public function change_schedule($start_date, $end_date){
        return $this->hasMany(ChangeSchedule::class, 'user_id', 'id')
                    ->whereRaw("    ( valid_from BETWEEN '".$start_date."' AND '".$end_date."') OR 
                                    ( valid_to BETWEEN '".$start_date."' AND '".$end_date."') OR
                                    ( valid_to <= '".$start_date."' AND valid_from >= '".$end_date."')");  
    }

    # Fetch the User's DTR
    public function dtr($start_date = null, $end_date = null){

        # If the Start and End Date is valid, fetch the DTR between the Date Range.
        if( is_valid( $start_date ) && is_valid( $end_date ) ){
            return $this->hasMany(Dtr::class)->whereBetween('date', [$start_date, $end_date]);

        # If the Start is valid AND End Date is NOT valid, fetch the DTR Date Range from Start Date Onwards.
        } elseif( is_valid( $start_date ) && !is_valid( $end_date ) ){
            return $this->hasMany(Dtr::class)->where('date', '>=', $start_date);

        # If the Start and End date is NOT valid, fetch the DTR as a whole
        }elseif( !is_valid( $start_date ) && !is_valid( $end_date ) ){
            return $this->hasMany(Dtr::class);
        }
    }

        # Fetch the User's Punch History
        public function punch($start_date = null, $end_date = null){

            # If the Start and End Date is valid, fetch the DTR between the Date Range.
            if( is_valid( $start_date ) && is_valid( $end_date ) ){
                return $this->hasMany(DtrPunchHistory::class)->whereBetween('date', [$start_date, $end_date]);
    
            # If the Start is valid AND End Date is NOT valid, fetch the DTR Date Range from Start Date Onwards.
            } elseif( is_valid( $start_date ) && !is_valid( $end_date ) ){
                return $this->hasMany(DtrPunchHistory::class)->where('date', '>=', $start_date);
    
            # If the Start and End date is NOT valid, fetch the DTR as a whole
            }elseif( !is_valid( $start_date ) && !is_valid( $end_date ) ){
                return $this->hasMany(DtrPunchHistory::class);
            }
        }

    public function requests_list($request,$filter = array()){
        $column = array('id','status','created_at','created_by','updated_by');

        $change_schedules    =   DB::table('change_schedules')
        ->Leftjoin('users as a', 'a.id', '=', 'change_schedules.user_id')
        ->Leftjoin('users as b', 'b.id', '=', 'change_schedules.updated_by')
        ->Leftjoin('departments as c', 'c.id', '=', 'a.department_id')
        ->select(  
                    'change_schedules.id',
                    'change_schedules.status',
                    'change_schedules.created_at',
                    'change_schedules.employee_note',
                    DB::raw('CONCAT(a.first_name," ", a.last_name) as created_by'), 
                    DB::raw('CONCAT(b.first_name," ", b.last_name) as updated_by'),
                    'change_schedules.schedule_id as fourth_column',
                    DB::raw('NULL fifth_column'),
                    DB::raw('CONCAT(valid_from," ", valid_to) As date_requested '),
                    DB::raw('"change_schedules" as table_name'),
                    'c.department_name',
                    'change_schedules.updated_at');

        $overtimes    =   DB::table('overtimes')
        ->Leftjoin('users as a', 'a.id', '=', 'overtimes.user_id')
        ->Leftjoin('users as b', 'b.id', '=', 'overtimes.updated_by')
        ->Leftjoin('departments as c', 'c.id', '=', 'a.department_id')
        ->select(  
                    'overtimes.id',
                    'overtimes.status',
                    'overtimes.created_at',
                    'overtimes.employee_note',
                    DB::raw('CONCAT(a.first_name," ", a.last_name) as created_by'),  
                    DB::raw('CONCAT(b.first_name," ", b.last_name) as updated_by'), 
                    'overtimes.amount as fourth_column',
                    DB::raw('overtimes.type fifth_column'),
                    DB::raw('overtimes.date As date_requested'),
                    DB::raw('"overtimes"  as table_name'),
                    'c.department_name',
                    'overtimes.updated_at');

        $rest_day_works    =   DB::table('rest_day_works')
        ->Leftjoin('users as a', 'a.id', '=', 'rest_day_works.user_id')
        ->Leftjoin('users as b', 'b.id', '=', 'rest_day_works.updated_by')
        ->Leftjoin('departments as c', 'c.id', '=', 'a.department_id')
        ->select(  
                    'rest_day_works.id',
                    'rest_day_works.status',
                    'rest_day_works.created_at',
                    'rest_day_works.employee_note',
                    DB::raw('CONCAT(a.first_name," ", a.last_name) as created_by'), 
                    DB::raw('CONCAT(b.first_name," ", b.last_name) as updated_by'), 
                    'rest_day_works.start_time as fourth_column',
                    DB::raw('rest_day_works.end_time fifth_column'),
                    DB::raw('rest_day_works.date As date_requested'),
                    DB::raw('"rest_day_works"  as table_name'),
                    'c.department_name',
                    'rest_day_works.updated_at');

        $alter_logs    =   DB::table('alter_logs')
        ->Leftjoin('users as a', 'a.id', '=', 'alter_logs.user_id')
        ->Leftjoin('users as b', 'b.id', '=', 'alter_logs.updated_by')
        ->Leftjoin('departments as c', 'c.id', '=', 'a.department_id')
        ->select(  
                    'alter_logs.id',
                    'alter_logs.status',
                    'alter_logs.created_at',
                    'alter_logs.employee_note',
                    DB::raw('CONCAT(a.first_name," ", a.last_name) as created_by'), 
                    DB::raw('CONCAT(b.first_name," ", b.last_name) as updated_by'), 
                    'alter_logs.id As fourth_column',
                    DB::raw('NULL fifth_column'),
                    DB::raw('alter_logs.date As date_requested'),
                    DB::raw('"alter_logs"  as table_name'),
                    'c.department_name',
                    'alter_logs.updated_at');

        #Team or Individual Request
        if($filter['url']=='my_team_requests'){
            $id = auth()->user()->users_handled()->pluck('id')->toArray();

            $change_schedules->whereIn('change_schedules.user_id',$id);
            $overtimes       ->whereIn('overtimes.user_id',$id);
            $rest_day_works  ->whereIn('rest_day_works.user_id',$id);
            $alter_logs      ->whereIn('alter_logs.user_id',$id);
        }elseif($filter['url']=='my_requests'){
            $id = auth()->user()->id;

            $change_schedules->where('change_schedules.user_id',$id);
            $overtimes       ->where('overtimes.user_id',$id);
            $rest_day_works  ->where('rest_day_works.user_id',$id);
            $alter_logs      ->where('alter_logs.user_id',$id);
        }
        
        # Status
        if(isset($filter['status'])){
            $change_schedules->where('change_schedules.status',$filter['status']);
            $overtimes       ->where('overtimes.status',$filter['status']);
            $rest_day_works  ->where('rest_day_works.status',$filter['status']);
            $alter_logs      ->where('alter_logs.status',$filter['status']);
        }

         # Department Filter
         if(isset($filter['department_id'])){
            $change_schedules->where('a.department_id', $filter['department_id']);
            $overtimes       ->where('a.department_id', $filter['department_id']);
            $rest_day_works  ->where('a.department_id', $filter['department_id']);
            $alter_logs      ->where('a.department_id', $filter['department_id']);
        }

        # Name Filter
        if(isset($filter['name'])){
            $change_schedules->whereRaw('(a.first_name like "%' . $filter['name']. '%" OR a.last_name like "%' . $filter['name']. '%" OR CONCAT(a.first_name, " ", a.last_name) LIKE "%' . $filter['name']. '%")'); 
            $overtimes       ->whereRaw('(a.first_name like "%' . $filter['name']. '%" OR a.last_name like "%' . $filter['name']. '%" OR CONCAT(a.first_name, " ", a.last_name) LIKE "%' . $filter['name']. '%")'); 
            $rest_day_works  ->whereRaw('(a.first_name like "%' . $filter['name']. '%" OR a.last_name like "%' . $filter['name']. '%" OR CONCAT(a.first_name, " ", a.last_name) LIKE "%' . $filter['name']. '%")'); 
            $alter_logs      ->whereRaw('(a.first_name like "%' . $filter['name']. '%" OR a.last_name like "%' . $filter['name']. '%" OR CONCAT(a.first_name, " ", a.last_name) LIKE "%' . $filter['name']. '%")'); 
        }
        
        

        # Date Filter
        if(isset($filter['valid_from'])&&isset($filter['valid_to'])){
            $change_schedules->where(function($query) use ($filter) {
                $query->whereBetween("valid_from", array($filter['valid_from'], $filter['valid_to'])); 
                $query->orwhereBetween("valid_to", array($filter['valid_from'], $filter['valid_to'])); 
            }); 

            $rest_day_works ->whereBetween("date", array($filter['valid_from'], $filter['valid_to'])); 
            $overtimes      ->whereBetween("date", array($filter['valid_from'], $filter['valid_to'])); 
            $alter_logs     ->whereBetween("date", array($filter['valid_from'], $filter['valid_to']));
        }
  
        if(isset($filter['request_type'])){
            if($filter['request_type']=='all'){
                $query = $alter_logs->union($change_schedules)
                ->union($overtimes)
                ->union($rest_day_works)
                ->orderByRaw("FIELD(status, 'pending', 'approved', 'canceled','declined') ");
            }elseif($filter['request_type']=='alteration'){
                $query = $alter_logs->orderByRaw("FIELD(status, 'pending', 'approved', 'canceled','declined') ");
            }elseif($filter['request_type']=='overtime'){
                $query = $overtimes->orderByRaw("FIELD(status, 'pending', 'approved', 'canceled','declined') ");
            }elseif($filter['request_type']=='rest_day_work'){
                $query = $rest_day_works->orderByRaw("FIELD(status, 'pending', 'approved', 'canceled','declined') ");
            }elseif($filter['request_type']=='change_schedule'){
                $query = $change_schedules->orderByRaw("FIELD(status, 'pending', 'approved', 'canceled','declined') ");
            }
               
        }
        
        if($filter['status']=='pending'){
            $query->orderBy('created_at','desc');
        }else{
            $query->orderBy('updated_at','desc');
        }

        
        $result = array(
            "query" =>  $query->paginate(10)
        );
     
        return   $result ;
    }
  
    # Fetch the User's DTR
    public function get_user_by_string($str = null){
        return $this->where('first_name', 'like', '%' . $str . '%')->orWhere('last_name', 'like', '%' . $str . '%');
    }

    
    /**
     * //////////////////////////////////////////
     *          Handled/Handler Methods 
     * //////////////////////////////////////////
     */
    
    # Fetch the User Handlers of the current User Instance
    public function user_handlers()
    {            
        /* Gets the following: 
            1. Users that handles you via 'department_handlers' table
            2. Users that handles the team you belong to via 'team_handlers' 
         */
        $team = $this->team()->first();
        $user_id_array = array_merge( 
            $this->belongsToMany(User::class, 'users_supervisors', 'user_id', 'supervisor_id')->pluck('id')->toArray(), 
            ( is_valid( $team ) ) ? $team->team_handlers()->pluck('id')->toArray() : []
        );
        return User::whereIn('users.id', array_unique($user_id_array))->where('users.is_active', 1);
    }

    # Fetch the Users Handled of the current User Instance 
    public function users_handled()
    {   
        // If the User has Client Role, get all the Users from his/her departments handled.
        if( $this->hasRole( get_constant('USER_ROLES.client') )  ) { 
            return User::whereIn('users.department_id', $this->departments_handled()->pluck('id')->toArray());


        //HR and Payroll gets all the users
        } elseif ( 
            $this->hasRole( get_constant('USER_ROLES.admin') ) ||
            $this->hasRole( get_constant('USER_ROLES.hr') ) ||
            $this->hasRole( get_constant('USER_ROLES.payroll') )
         ) {
            return User::whereNotNull('id');//practically all users

        // If the User has Team Leader & Supervisor Role, get all the Users from the Department's Handled Team list AND the default users handled via users_supervivsors pivot table.
        } elseif( $this->hasRole( get_constant('USER_ROLES.supervisor') ) && $this->hasRole( get_constant('USER_ROLES.team_leader') )  ) { 
            $user_id_array = $this->belongsToMany(User::class, 'users_supervisors', 'supervisor_id', 'user_id')->pluck('id')->toArray();
            foreach( $this->departments_handled()->get() as $departments ){ 
                foreach( $departments->teams()->get() as $teams ){
                    $user_id_array = array_merge( $user_id_array, $teams->team_users()->pluck('id')->toArray());
                }
            }
            return User::whereIn('users.id', array_unique($user_id_array));
          

        // If the User has Supervisor Role, fetch the default users handled via the users_supervisors pivot table
        } elseif( $this->hasRole( get_constant('USER_ROLES.supervisor') )  ) { 
            return $this->belongsToMany(User::class, 'users_supervisors', 'supervisor_id', 'user_id');
          

        // If the User has Team Leader Role, get all the Users from his/her teams being leaded.
        } elseif( $this->hasRole( get_constant('USER_ROLES.team_leader') )  ) { 
            $user_id_array = [];
            foreach( $this->teams_handled()->get() as $teams ){
                $user_id_array = array_merge( $user_id_array, $teams->team_users()->pluck('id')->toArray());
            }
            return User::whereIn('users.id', $user_id_array);
  
        // If not, fetch the default users handled via the users_supervisors pivot table
        } else {
            return $this->belongsToMany(User::class, 'users_supervisors', 'supervisor_id', 'user_id');
        }
            
    }

    # Fetch the User Teams Handled
    public function teams_handled()
    {
        /* Gets the following: 
            1. Teams that you handle via 'team_handlers' table
            2. Teams under the Departments you supervised via 'departments_handlers' 
         */
        $teams_id_array = $this->belongsToMany(Team::class, 'team_handlers', 'user_id', 'team_id')->pluck('id')->toArray();
        foreach ( $this->departments_supervised()->get() as $department ) {
            $teams_id_array = array_merge( 
                $teams_id_array,
                $department->teams()->pluck('id')->toArray()
            );
        };
        return Team::whereIn('teams.id', $teams_id_array);
    }

    # Fetch the Departments Team
    public function departments_team($department_id)
    {
        // Fetch department team if Supervisor
        if( $this->hasRole( get_constant('USER_ROLES.supervisor') ) || $this->hasRole( get_constant('USER_ROLES.client') )  ) { 
            $teams_id_array = Team::where( "department_id" , $department_id );
        } elseif( $this->hasRole( get_constant('USER_ROLES.team_leader') )  ) { 
            $teams_id_array =  $this->belongsToMany(Team::class, 'team_handlers', 'user_id', 'team_id')->where( "department_id" ,$department_id );
        }


        return $teams_id_array->get();
    }

    # Fetch the Selected Departments Teams
    public function selected_departments_team($department_id_array)
    {
        // Fetch department team if Supervisor
        if( $this->hasRole( get_constant('USER_ROLES.supervisor') ) || $this->hasRole( get_constant('USER_ROLES.client') )  ) { 
            $teams_id_array = Team::whereIn( "department_id" , $department_id_array );
        } elseif( $this->hasRole( get_constant('USER_ROLES.team_leader') )  ) { 
            $teams_id_array =  $this->belongsToMany(Team::class, 'team_handlers', 'user_id', 'team_id')->whereIn( "department_id" ,$department_id_array );
        }


        return $teams_id_array->get();
    }

    # Fetch the User Departments Handled
    public function departments_handled()
    {
        /* Gets the following: 
            1. Departments that you handle via 'department_handlers' table
            2. Departments of the Teams you are handling via 'team_handlers' 
        */
        $departments_id_array = $this->belongsToMany(Department::class, 'department_handlers', 'user_id', 'department_id')->pluck('id')->toArray();
        foreach( $this->teams_handled()->get() as $team) {
            $departments_id_array = array_merge( 
                $departments_id_array, 
                $team->department()->pluck('id')->toArray() 
            );
        }
        return Department::whereIn('departments.id', array_unique($departments_id_array));
    }

    public function getHasSchedule(){

       
    
        # Fetch the Default Schedule for the current User.
        $checkDefault_schedule = is_valid($this->defaultSchedule()->first());

            $temporary_schedule_condition = [
                'bind_to' => 'user',
                'source_type' => get_constant('DTR_SOURCE_TYPE_TAGGING.temporary')
            ];
        $checkTemp_schedule = is_valid( $this->hasMany(Schedule::class, 'bind_id', 'id')->where($temporary_schedule_condition)->latest()->first());
          
            return ($checkDefault_schedule ||  $checkTemp_schedule);
    }

    ########################################################################
}
