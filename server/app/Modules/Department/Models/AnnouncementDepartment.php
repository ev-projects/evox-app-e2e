<?php

namespace App\Modules\Department\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;

class AnnouncementDepartment extends Model
{
    protected $primaryKey = 'announcement_id';
    protected $table = "announcements_departments";
    public $timestamps = false;

    protected $casts = [
        'department_ids'  => 'array',
        'department_exculded_ids'  => 'array'
    ];

    

}
