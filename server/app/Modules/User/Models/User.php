<?php

namespace App\Modules\User\Models;

use App\Modules\Department\Models\Department;
use App\Modules\Payroll\Models\Dtr;

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
                $result = $this->first_name . ' ' . $this->middle_name . ' ' . $this->last_name;
                break;
            case 2:
                $result = $this->last_name . ', '. $this->first_name . ' ' . $this->middle_name;
                break;
            default:
                $result = $this->first_name . ' ' . $this->middle_name . ' ' . $this->last_name;
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
        return $this->belongsToMany(User::class, 'users_supervisors', 'supervisor_id', 'user_id');
    }

    # Fetch the User's Department
    public function department(){
        return $this->hasOne(Department::class, 'id', 'department_id');
    }

    # Fetch the User Departments Handled
    public function departments_handled()
    {
        return $this->belongsToMany(Department::class, 'department_handlers', 'user_id', 'department_id');
    }

    # Fetch the User's Schedule (Source type is Default)
    public function defaultSchedule(){
        return $this->hasOne(Schedule::class, 'bind_id', 'id')->where([
            'bind_to' => 'user',
            'source_type' => 'default'
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
            'source_type' => 'temporary'
        ];

        # If the Start and End Date is valid, fetch the Temporary Schedule that exists between the Date Range.
        if( is_valid( $start_date ) && is_valid( $end_date ) ){
            return $this->hasMany(Schedule::class, 'bind_id', 'id')->where($temporary_schedule_condition)
                                                                   ->whereRaw("( valid_from BETWEEN '".$start_date."' AND '".$end_date."' OR valid_to BETWEEN '".$start_date."' AND '".$end_date."')");

        # If the Start Date is valid and End Date is NOT Valid, fetch the Temporary Schedule that scopes the Start Date
        } elseif( is_valid( $start_date ) && !is_valid( $end_date ) ){
            return $this->hasMany(Schedule::class, 'bind_id', 'id')->where($temporary_schedule_condition)
                                                                   ->whereRaw("( valid_from >= '".$start_date."' AND  valid_to <= '".$start_date."')");

        # If the Start and End Date is NOT valid, fetch the all other Temporary Schedules.
        } else {
            return $this->hasMany(Schedule::class, 'bind_id', 'id')->where($temporary_schedule_condition);
        }                                             
    }

    # Fetch the User's Schedule (Source type is Change Schedule)
    public function changeSchedules($start_date, $end_date){
        return $this->hasMany(ChangeSchedule::class, 'user_id', 'id')
                    ->where("status","approved")
                    ->whereRaw("( valid_from BETWEEN '".$start_date."' AND '".$end_date."' OR valid_to BETWEEN '".$start_date."' AND '".$end_date."')");  
    }

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

    public function requests_list($request,$filter = array()){
        $column = array('id','status','created_at','created_by','updated_by');

        $change_schedules    =   DB::table('change_schedules')
        ->Leftjoin('users as a', 'a.id', '=', 'change_schedules.created_by')
        ->Leftjoin('users as b', 'b.id', '=', 'change_schedules.updated_by')
        ->Leftjoin('departments as c', 'c.id', '=', 'b.department_id')
        ->select(  
                    'change_schedules.id',
                    'change_schedules.status',
                    'change_schedules.created_at',
                    DB::raw('CONCAT(a.first_name," ", a.last_name) as user_id'), 
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
        ->Leftjoin('departments as c', 'c.id', '=', 'b.department_id')
        ->select(  
                    'overtimes.id',
                    'overtimes.status',
                    'overtimes.created_at',
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
        ->Leftjoin('departments as c', 'c.id', '=', 'b.department_id')
        ->select(  
                    'rest_day_works.id',
                    'rest_day_works.status',
                    'rest_day_works.created_at',
                    DB::raw('CONCAT(a.first_name," ", a.last_name) as user_id'), 
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
        ->Leftjoin('departments as c', 'c.id', '=', 'b.department_id')
        ->select(  
                    'alter_logs.id',
                    'alter_logs.status',
                    'alter_logs.created_at',
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
            $id = under_supervisee_id_list($this->supervisee()->select('id')->get());

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
            
            $change_schedules->where('a.first_name', 'like', '%' . $filter['name']. '%')->orWhere('a.last_name', 'like', '%' . $filter['name']. '%'); 
            $overtimes       ->where('a.first_name', 'like', '%' . $filter['name']. '%')->orWhere('a.last_name', 'like', '%' . $filter['name']. '%');
            $rest_day_works  ->where('a.first_name', 'like', '%' . $filter['name']. '%')->orWhere('a.last_name', 'like', '%' . $filter['name']. '%');
            $alter_logs      ->where('a.first_name', 'like', '%' . $filter['name']. '%')->orWhere('a.last_name', 'like', '%' . $filter['name']. '%');
        }

        # Date Filter
        if(isset($filter['valid_from'])&&isset($filter['valid_to'])){
            $change_schedules->whereBetween("valid_from", array($filter['valid_from'], $filter['valid_to']))
            ->orwhereBetween("valid_to", array($filter['valid_from'], $filter['valid_to']))
            ->orwhereRaw('valid_from < '.$filter['valid_from'].' AND valid_to > '.$filter['valid_to']);
            $rest_day_works       ->whereBetween("date", array($filter['valid_from'], $filter['valid_to'])); 
            $overtimes       ->whereBetween("date", array($filter['valid_from'], $filter['valid_to'])); 
            $alter_logs      ->whereBetween("date", array($filter['valid_from'], $filter['valid_to']));
        }
  


      
        $query = $alter_logs->union($change_schedules)
        ->union($overtimes)
        ->union($rest_day_works)
        ->orderByRaw("FIELD(status, 'pending', 'approved', 'canceled','declined') ")
        ;


        $query_number = $alter_logs->count();
        
        $result = array(
            "query" =>  $query->paginate(10),
            "request_count" => $query_number,
        );
     
        return   $result ;
    }


  
    # Fetch the User's DTR
    public function get_user_by_string($str = null){
        return $this->where('first_name', 'like', '%' . $str . '%')->orWhere('last_name', 'like', '%' . $str . '%');
    }


    ########################################################################
}
