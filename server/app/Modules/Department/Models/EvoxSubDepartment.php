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

class EvoxSubDepartment extends Model
{
    protected $guarded = [];

    protected $table = 'EVOX_SUB_DEPARTMENT';
}
