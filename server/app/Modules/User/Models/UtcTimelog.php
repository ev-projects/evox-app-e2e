<?php

namespace App\Modules\User\Models;

use Carbon\Carbon;

use Illuminate\Database\Eloquent\Model;

class UtcTimelog extends Model
{
    protected $table = 'utc_timelog';


    public function get_country_timezone_to_offset()
    {


        $timezone_name = $this->timezone;

        $offset_string = Carbon::now($timezone_name);


        return $offset_string->format('P');
    }
}

