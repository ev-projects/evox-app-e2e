<?php

namespace App\Modules\Team\Models;

use App\Modules\Department\Models\Department;
use App\Modules\User\Models\User;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\Traits\LogsActivity;

class Team extends Model
{
    use SoftDeletes, LogsActivity;
 
    protected $fillable = [];

    protected $hidden = [];
    
    protected $dates = ['deleted_at'];

    ########################################################################
    ############################ Custom Helpers ############################
    ########################################################################

    

    ########################################################################
    ############################ Relationships #############################
    ########################################################################


    # Fetch the Team's Department
    public function department(){
        return $this->hasOne(Department::class, 'id', 'department_id');
    }
    
    # Fetch the Team's Handlers
    public function team_handlers()
    {
        return $this->belongsToMany(User::class, 'team_handlers', 'team_id', 'user_id');
    }
    
    # Fetch the Team's Users
    public function team_users()
    {
        return $this->belongsToMany(User::class, 'team_users', 'team_id', 'user_id');
    }

    ########################################################################
}
