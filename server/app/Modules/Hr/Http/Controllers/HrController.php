<?php

namespace App\Modules\Hr\Http\Controllers;

use Illuminate\Http\Request;
use App\Modules\Changelogs\Models\ChangeLogs;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

use App\Http\Controllers\Controller;

class HrController extends Controller
{
    // gett all announcements
    public function announcements()
    {
        $announcements = ChangeLogs::orderBy('log_date', 'DESC')->get()->toArray();

        return success_response(
            trans('messages.fetch_hr_announcement_success'), 
            new Collection($announcements)
        );
    }

    // store announcement to change_log table
    public function store(Request $request)
    {
        DB::beginTransaction();
        try {
            log_activity( trans('messages.create_change_log_attempt') );

            $hrAnnouncement = new ChangeLogs();

            // set all values before saving
            $hrAnnouncement->title          = $request->title;
            $hrAnnouncement->category       = $request->category;
            $hrAnnouncement->description    = $request->description;
            $hrAnnouncement->log_date       = $request->log_date;
            $hrAnnouncement->created_by     = auth()->user()->id;

            $hrAnnouncement->save();

            DB::commit();
            return success_response(
                trans('messages.create_hr_announcement_success'), 
                $hrAnnouncement
            );

        } catch(Exception $e){
            DB::rollback();
            return error_response( trans('messages.error_default'), $e );
        }
    }
}
