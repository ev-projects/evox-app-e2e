<?php

namespace App\Modules\User\Models;

use App\Modules\Team\Models\Team;
use App\Modules\Department\Models\Department;
use App\Modules\Payroll\Models\Dtr;
use App\Modules\Payroll\Models\DtrPunchHistory;
use App\Modules\Payroll\Models\PayrollCutoff;
use App\Modules\Schedule\Models\Schedule;
use Illuminate\Support\Facades\DB;
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

    public function country_timezone_name()
    {
        

        return $timezone_name = $this->hasOne(UtcTimelog::class, 'country_id', 'country_id')->first()->timezone;

 
       

        return $offset_string->format('P');
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


     # Fetch  all of the User's Schedule 
     public function AllSchedules(){
          return $this->hasMany(Schedule::class, 'bind_id', 'id');
    }

    public function Schedule_Find($schedule_id){
        return $this->hasOne(Schedule::class, 'bind_id', 'id')->where([
            'bind_to' => 'user',
            'id' => $schedule_id
        ]);

        // return Schedule::where([
        //     'bind_to' => 'user',
        //     'user_id'=> $this->id,
        //     'id' => $schedule_id
        // ]);
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
                return $this->hasMany(DtrPunchHistory::class)->whereBetween('date', [$start_date, $end_date])
                ->where('is_active','=','1');
    
            # If the Start is valid AND End Date is NOT valid, fetch the DTR Date Range from Start Date Onwards.
            } elseif( is_valid( $start_date ) && !is_valid( $end_date ) ){
                return $this->hasMany(DtrPunchHistory::class)->where('date', '>=', $start_date)
                ->where('is_active','=','1');
    
            # If the Start and End date is NOT valid, fetch the DTR as a whole
            }elseif( !is_valid( $start_date ) && !is_valid( $end_date ) ){
                return $this->hasMany(DtrPunchHistory::class)
                 ->where('is_active','=','1');
            }
        }

        # Fetch the User single date Punch History
        public function target_punch($date){

           
          if( is_valid( $date )  ){
                return $this->hasMany(DtrPunchHistory::class)->where('date', '==', $date)
                ->where('is_active','=','1');
    
         
            }
        }

        # Fetch the User's Punch History Logs Dates
        public function punchlogs($start_date = null, $end_date = null){
              
                    # If the Start and End Date is valid, fetch the Distinct Date in Dtr Collective Punch history between the Date Range.
                    if( is_valid( $start_date ) && is_valid( $end_date ) ){

                        return $this->hasMany(DtrPunchHistory::class)->select('date','user_id')->distinct()->whereBetween('date', [$start_date, $end_date]);
            
                    # If the Start is valid AND End Date is NOT valid, fetch the Distinct Date in Dtr Collective Punch history Date Range from Start Date Onwards.
                    } elseif( is_valid( $start_date ) && !is_valid( $end_date ) ){

                        return $this->hasMany(DtrPunchHistory::class)->select('date','user_id')->distinct()->where('date', '>=', $start_date);
            
                    # If the Start and End date is NOT valid,  fetch the Distinct Date in Dtr Collective Punch history as a whole
                    }elseif( !is_valid( $start_date ) && !is_valid( $end_date ) ){

                        return $this->hasMany(DtrPunchHistory::class)->select('date','user_id')->distinct();

                    }
       }

       #Fecth the Punch History Logs

       public function get_punch_history($start_date = null){

        if( is_valid( $start_date )){

            return $this->hasMany(DtrPunchHistory::class)->select('dtr_collective_punch_history.date as date', 'dtr_collective_punch_history.user_id as user_id',
            'dtr_collective_punch_history.time_in', 
            'dtr_collective_punch_history.time_out', 'dtr_collective_punch_history.log_in_type', 'dtr_collective_punch_history.log_out_type', 
            'dtr_collective_punch.duration')
            ->join('dtr_collective_punch','dtr_collective_punch_history.id','=','dtr_collective_punch.dtr_collective_punch_history_id')
            ->where('dtr_collective_punch_history.date','=',$start_date);
        }
       }

    public function requests_list($request,$filter = array()){
        $id = auth()->user()->id;

        $request_types = [
            'all'                   => 0,
            'alteration'            => 1,
            'overtime'              => 2,
            'rest_day_work'         => 3,
            'change_schedule'       => 4,
            'alter_logs_punches'    => 5,
        ];

        $values = [
            $filter['status'],
            $filter['valid_from'],
            $filter['valid_to'],
            $request_types[$filter['request_type']],
            $id,
        ];
        $response = call_sp('EH_SP_MyRequest', $values);

        $result = array(
            "query" =>  $response[0] ?? [],
        );
     
        return $result;
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
            return User::whereNotNull("bhr_num");//practically all users

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
