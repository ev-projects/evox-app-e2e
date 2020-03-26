<?php

namespace App\Modules\Payroll\Models;

use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Traits\LogsActivity;

class DtrPolicy extends Model
{

    use LogsActivity;

    protected $guarded = [];

    protected static $logAttributes = ['policy', 'value'];

    public $timestamps = false;

    
    ########################################################################

    /**
     *  Relationships
     */

    /**
     * belongsTo Relationship for DTR model
     */
    public function dtr(){
        return $this->belongsTo(Dtr::class);
    }

}
