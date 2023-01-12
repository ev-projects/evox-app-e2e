<?php

namespace App\Models;

use Spatie\Activitylog\Models\Activity as SpatieActivity;

class Activity extends SpatieActivity
{
    protected $connection = 'evox_logs';
}
