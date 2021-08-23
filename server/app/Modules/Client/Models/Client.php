<?php

namespace App\Modules\Client\Models;

use App\Modules\Schedule\Models\Schedule;
use App\Modules\Team\Models\Team;
use App\Modules\User\Models\User;
use Illuminate\Database\Eloquent\Model;

class Client extends Model
{
    // use SoftDeletes;

    protected $guarded = [];
    protected $table = 'employee_clients';
    protected $fillable = ['client_id','department_id','user_id'];
    // protected static $logAttributes = ['department_name', 'description', 'schedule_id'];

    protected $dates = [
        'deleted_at'
    ];
    public $timestamps = false;

    ########################################################################
    ############################ Custom Helpers ############################
    ########################################################################

    /**
     * 
     *  Gets the Complete Name of the Department 
     * 
     */
    public function getCompleteName()
    {
        return  $this->department_name;
    }
    


    ########################################################################
    ############################ Relationships #############################
    ########################################################################



    # Fetch the Department's Default Schedule (Source type is Default)
    public function users(){
        return $this->hasMany(User::class, 'department_id', 'id');
    }

    # Fetch the Department's Teams
    public function teams(){
        return $this->hasMany(Team::class, 'department_id', 'id');
    }

    # Fetch the Department's Default Schedule (Source type is Default)
    public function defaultSchedule(){
        return $this->hasOne(Schedule::class, 'bind_id', 'id')->where([
            'bind_to' => 'department',
            'source_type' => 'default'
        ]);
    }

    # Fetch the Department User's Supervisors
    public function department_supervisors()
    {
        return $this->belongsToMany(User::class, 'department_handlers', 'department_id', 'user_id');
    }
    
    
    /**
     * //////////////////////////////////////////
     *          Handled/Handler Methods 
     * //////////////////////////////////////////
     */
    
    
    # Fetch the Department User Handlers of the current Department Instance
    public function department_user_handlers()
    {     
        /* Gets the following: 
            1. Users that handles the Department via 'department_handlers' table
            2. Users that handles the team the department belongs to via 'team_handlers' 
         */
        $user_id_array = $this->belongsToMany(User::class, 'department_handlers', 'department_id', 'user_id')->pluck('id')->toArray();
        foreach( $this->teams()->get() as $team) {
            $user_id_array = array_merge( 
                $user_id_array, 
                $team->team_handlers()->pluck('id')->toArray() 
            );
        }
        return User::whereIn('users.id', array_unique($user_id_array));
    }

}
