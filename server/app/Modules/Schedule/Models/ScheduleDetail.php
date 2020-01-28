<?php

namespace App\Modules\Schedule\Models;

use Illuminate\Database\Eloquent\Model;

class ScheduleDetail extends Model
{
    //
    protected $guarded = [];

    public $timestamps = false;
    protected $dateFormat = 'U';


    // public function setStartTimeAttribute($value) {
    //     $this->attributes['start_time'] = time_to_seconds($value);
    // }

    // public function setEndTimeAttribute($value) {
    //     $this->attributes['end_time'] = time_to_seconds($value);
    // }
    
    // public function setStartFlexyTimeAttribute($value) {
    //     $this->attributes['start_flexy_time'] =  time_to_seconds($value);
    // }
    
    // public function setEndFlexyTimeAttribute($value) {
    //     $this->attributes['end_flexy_time'] =  time_to_seconds($value);
    // }
    
    // public function setBreakTimeAttribute($value) {
    //     $this->attributes['break_time'] =  time_to_seconds($value);
    // }


    

    // public function getStartTimeAttribute($value) {
    //     return seconds_to_time($value);
    // }

    // public function getEndTimeAttribute($value) {
    //     return seconds_to_time($value);
    // }
    
    // public function getStartFlexyTimeAttribute($value) {
    //     return seconds_to_time($value);
    // }
    
    // public function getEndFlexyTimeAttribute($value) {
    //     return seconds_to_time($value);
    // }
    
    // public function getBreakTimeAttribute($value) {
    //     return seconds_to_time($value);
    // }
}
