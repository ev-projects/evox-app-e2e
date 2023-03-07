<?php

namespace App\Modules\Department\Models;

use Illuminate\Database\Eloquent\Model;
use App\Modules\Department\Models\Department;
use Illuminate\Database\Eloquent\SoftDeletes;

class Announcement extends Model
{
    use SoftDeletes;
    protected $table = "announcements";


    public function announcements_departments()
    {
        return $this->belongsToMany(Department::class, 'departments_announcements', 'announcement_id', 'department_id');
    }

    public function department()
    {
        return $this->hasOne(Department::class, 'id', 'dep_id');
    }

}
