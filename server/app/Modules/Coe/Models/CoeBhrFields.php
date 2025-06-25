<?php

namespace App\Modules\Coe\Models;

use Illuminate\Database\Eloquent\Model;

class CoeBhrFields extends Model
{
    protected $table = 'coe_bhr_fields';

    protected $fillable = [
        'country_id',
        'field_name',
        'subf_field_name',
        'field_label',
        'is_money',
        'encrypt',
        'status_id'
    ];
}
