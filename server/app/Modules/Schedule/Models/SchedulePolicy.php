<?php

namespace App\Modules\Schedule\Models;

use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Traits\LogsActivity;

class SchedulePolicy extends Model{

    use LogsActivity;

    protected $guarded = [];

    protected static $logAttributes = ['policy', 'value'];
    
    public $timestamps = false;

    
    ########################################################################

    /**
     *  Relationships
     */

    /**
     * belongsTo Relationship for Schedule model
     */
    public function schedule(){
        return $this->belongsTo(Schedule::class);
    }

}
