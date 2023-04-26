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
      
        return Department::find($this->dep_id);
    }

    public function present_department()
    {
        return Department::find($this->present_dep_id);
    }

    public function announcement_clones_departments()
    {


         $dep_collection = Announcement::where('announcement_id', $this->id)->pluck('present_dep_id')->toArray();

         return Department::whereIn('id',$dep_collection)->get();
    }

}
