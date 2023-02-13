<?php

namespace App\Modules\Changelogs\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Modules\User\Models\User;

class ChangeLogs extends Model
{
    use SoftDeletes;

    protected $guarded = [];

    protected $dates = [
        'deleted_at',
        'created_at',
        'updated_at'
    ];

    /**
     * Get the user associated with the announcement.
     */
    public function user()
    {
        return $this->hasOne(User::class, 'id', 'created_by');
    }
}
