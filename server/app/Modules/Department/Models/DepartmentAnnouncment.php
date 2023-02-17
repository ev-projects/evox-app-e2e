<?php

namespace App\Modules\Department\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class DepartmentAnnouncment extends Model
{
    use SoftDeletes;
    protected $table = "department_announcements";
}
