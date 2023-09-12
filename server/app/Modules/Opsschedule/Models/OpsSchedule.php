<?php

namespace App\Modules\Opsschedule\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class OpsSchedule extends Model
{
    use SoftDeletes;
    
    protected $fillable = ['department_id', 'type', 'is_active', 'path', 'name', 'position', 'email', 'domain', 'scope', 'work_days', 'start_time', 'end_time', 'timezone'];
}
