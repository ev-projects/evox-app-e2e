<?php

namespace App;

use Illuminate\Database\Eloquent\Model;

class EvoxLevels extends Model
{
    protected $table = 'EVOX_LEVELS';
    protected $fillable = [];
    protected $guarded = [];

    public function level_features()
    {
    return $this->belongsToMany(Features::class, 'role_level_features', "evox_levels_id"  ,"features_id");
    }
}
