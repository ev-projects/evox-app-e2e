<?php

namespace App\Modules\Hr\Http\Controllers;

use Illuminate\Http\Request;
use App\Modules\Changelogs\Models\ChangeLogs;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

use App\Http\Controllers\Controller;

class HrController extends Controller
{
    // get all announcements
    public function announcements()
    {
        $announcements = ChangeLogs::with('user')->orderBy('log_date', 'DESC')->get()->toArray();

        return success_response(
            trans('messages.fetch_hr_announcements_success'), 
            new Collection($announcements)
        );
    }

    // get announcement
    public function getAnnouncement($id)
    {
        $announcement = ChangeLogs::find($id)->toArray();

        return success_response(
            trans('messages.fetch_hr_announcement_success'), 
            new Collection($announcement)
        );
    }

    // store announcement to change_log table
    public function store(Request $request)
    {
        DB::beginTransaction();
        try {
            log_activity( trans('messages.create_hr_announcement_attempt') );

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

    // update announcement in change_log table
    public function update(Request $request, $id)
    {
        DB::beginTransaction();
        try {
            log_activity( trans('messages.update_hr_announcement_attempt') );

            $hrAnnouncement = ChangeLogs::find($id)->update($request->except('method'));

            DB::commit();
            return success_response(
                trans('messages.update_hr_announcement_success'), 
                $hrAnnouncement,
            );

        } catch(Exception $e){
            DB::rollback();
            return error_response( trans('messages.error_default'), $e );
        }
    }

    // delete an announcement
    public function delete($id)
    {
        try {
            log_activity( trans('messages.delete_hr_announcement_attempt') );

            return success_response(
                trans('messages.delete_hr_announcement_success'), 
                ChangeLogs::find($id)->delete(),
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }
}
