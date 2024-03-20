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

    // public function present_department()
    // {
    //     return Department::find($this->present_dep_id);
    // }

    public function announcement_clones_departments_old($not = true )
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

    public function announcement_clones_departments($not = true )
    {
        // dd("here");

         $dep_collection = Announcement::where('announcement_id', $this->id)->pluck('present_dep_id')->toArray();

         if($not){

            return EvoxDepartment::select(
                ["Id AS id",
                'Name AS department_name', 
                'HeadId',
                'isActive',
                'CreatedOn AS created_at',
                'UpdatedOn AS updated_at',
                'CreatedBy',
                'LevelId',])
                ->whereIn('Id',$dep_collection)
                ->orderBy('Name', 'asc')
                ->get();
         }

         if(!$not){

            return EvoxDepartment::select(
                ["Id AS id",
                'Name AS department_name', 
                'HeadId',
                'isActive',
                'CreatedOn AS created_at',
                'UpdatedOn AS updated_at',
                'CreatedBy',
                'LevelId',])
                ->whereNotIn('Id',$dep_collection)
                ->orderBy('Name', 'asc')
                ->get();
         }

        return [];
    }

    public function is_expired(){
        $now = Carbon::now();

        return !(Carbon::parse($this->expiry_date) >=$now);
    }   

}
