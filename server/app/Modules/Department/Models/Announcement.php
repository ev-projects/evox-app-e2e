<?php

namespace App\Modules\Department\Models;

use Carbon\Carbon;
use App\Modules\User\Models\User;
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

    //owner of the annoucment
    public function creator()
    {
      if($this->created_by != 0){
        return User::find($this->created_by);
      }
       
    }

    public function present_department()
    {
        return Department::find($this->present_dep_id);
    }

    public function announcement_clones_departments($not = true )
    {


         $dep_collection = Announcement::where('announcement_id', $this->id)->pluck('present_dep_id')->toArray();

         if($not){
            return Department::whereIn('id',$dep_collection)->get();
         }

         if(!$not){
            return Department::whereNotIn('id',$dep_collection)->get();
         }

        return [];
    }

    public function is_expired(){
        $now = Carbon::now();

        return !(Carbon::parse($this->expiry_date) >=$now);
    }   

}
