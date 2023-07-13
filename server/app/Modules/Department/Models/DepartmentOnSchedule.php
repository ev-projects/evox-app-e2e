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
    // public function department()
    // {
    
    //     return Department::find($this->department_id);
    // }
    public function department()
    {
    
        return$this->belongsTo(Department::class, 'department_id', 'id');
    }

}
