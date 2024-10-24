<?php

namespace App\Modules\Department\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use App\Modules\Department\Models\Department;
use Illuminate\Database\Eloquent\SoftDeletes;

class DepartmentOnSchedule extends Model
{
    // use SoftDeletes;
    protected $table = "department_without_schedule_employees";

    protected $fillable = ['is_active']; 



}
