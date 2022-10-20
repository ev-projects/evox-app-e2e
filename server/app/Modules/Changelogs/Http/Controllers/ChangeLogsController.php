<?php

namespace App\Modules\Changelogs\Http\Controllers;

use Illuminate\Http\Request;
use App\Modules\Changelogs\Models\ChangeLogs;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Eloquent\Collection;

use App\Http\Controllers\Controller;

class ChangeLogsController extends Controller
{

    /**
     * Creates a Change Log
     * @return \Illuminate\Http\JsonResponse
     */
    public function getChangeLogs()
    {
        // get all change logs
        $changelogs = ChangeLogs::orderBy('log_date', 'DESC')->get();

        $changelogs_array = [];
        foreach ($changelogs as $key => $changelog) {
            $changelogs_array[$key]['id'] = $changelog->id;
            $changelogs_array[$key]['title'] = $changelog->title;
            $changelogs_array[$key]['description'] = htmlspecialchars_decode($changelog->description);
            $changelogs_array[$key]['log_date'] = date_format(new \DateTime($changelog->log_date), "F d, Y");
        }

        return success_response(
            trans('messages.fetch_change_log_success'), 
            new Collection($changelogs_array)
        );
    }

    /**
     * Creates a Change Log
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(Request $request)
    {
        DB::beginTransaction();
        try {
            log_activity( trans('messages.create_change_log_attempt') );

            $changelogs = new ChangeLogs();

            // set all values before saving
            $changelogs->title = $request->title;
            $changelogs->description = $request->description;
            $changelogs->log_date = $request->log_date;
            $changelogs->created_by = auth()->user()->id;

            $changelogs->save();

            DB::commit();
            return success_response(
                trans('messages.create_change_log_success'), 
                $changelogs
            );

        } catch(Exception $e){
            DB::rollback();
            return error_response( trans('messages.error_default'), $e );
        }
    }
}
