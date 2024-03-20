<?php

namespace App\Modules\Department\Models;

use Carbon\Carbon;
use App\Modules\Team\Models\Team;
use App\Modules\User\Models\User;
use Illuminate\Database\Eloquent\Model;
use App\Modules\Schedule\Models\Schedule;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Modules\Department\Models\Announcement;
use App\Modules\Department\Models\DepartmentOnSchedule;
// use App\Modules\Department\Models\AnnouncementDepartment;

class EvoxDepartment extends Model
{
    // use SoftDeletes;

    protected $guarded = [];

    // protected static $logAttributes = ['department_name', 'description', 'schedule_id'];

    protected $table = 'EVOX_DEPARTMENT';

    public function departments_announcements()
    {

        return $this->hasMany(Announcement::class, 'dep_id', 'Id');
    }
public function departments_announcements_presented()
    {
        return $this->hasMany(Announcement::class, 'present_dep_id', 'Id');
    }

}
