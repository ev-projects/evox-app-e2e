<?php

namespace App\Modules\Coe\Models;

use Illuminate\Database\Eloquent\Model;

class COE extends Model
{
    protected $table = 'coes';

    protected $fillable = [
        'sequence_number',
        'user_id',
        'purpose_index',
        'purpose_note',
        'full_name',
        'address',
        'hire_date',
        'separation_date',
        'position',
        'basic_pay',
        'de_minimis',
        'de_minimis_currency_code',
        'other_allowance',
        'other_allowance_currency_code',
        'show_compensation',
        'requested_by',
    ];

    public function getPurposeAttribute()
    {
        return get_constant('COE_PURPOSES')[$this->purpose_index]['purpose'];
    }
}
