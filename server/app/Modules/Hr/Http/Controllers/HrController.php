<?php

namespace App\Modules\Hr\Http\Controllers;

use Illuminate\Http\Request;
use App\Modules\Changelogs\Models\ChangeLogs;
use Illuminate\Database\Eloquent\Collection;

use App\Http\Controllers\Controller;

class HrController extends Controller
{
    //
    public function announcements()
    {
        $announcements = ChangeLogs::orderBy('log_date', 'DESC')->get()->toArray();

        return success_response(
            trans('messages.fetch_hr_announcements_success'), 
            new Collection($announcements)
        );
    }
}
