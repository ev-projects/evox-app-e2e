<?php

namespace App\Modules\Coe\Models;

use Illuminate\Database\Eloquent\Model;

class CoeBhrFieldValues extends Model
{
    protected $table = 'coe_bhr_field_values';

    protected $fillable = [
        'coe_id',
        'coe_bhr_field_id',
        'value'
    ];
}
