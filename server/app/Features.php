<?php

namespace App;

use Illuminate\Database\Eloquent\Model;

class Features extends Model
{
    //
    public $timestamps = false;

    public $guarded = [];


    public function features_level()
    {
        return $this->belongsToMany(EvoxLevels::class, 'role_level_features');
    }
}
