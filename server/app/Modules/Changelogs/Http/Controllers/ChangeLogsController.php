<?php

namespace App\Modules\Changelogs\Http\Controllers;
use Illuminate\Support\Facades\Redis;
use Illuminate\Http\Request;
use App\Modules\Changelogs\Models\ChangeLogs;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Eloquent\Collection;
use App\Modules\User\Models\User;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Auth;

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
            $changelogs_array[$key]['id']           = $changelog->id;
            $changelogs_array[$key]['title']        = $changelog->title;
            $changelogs_array[$key]['category']     = $changelog->category;
            $changelogs_array[$key]['description']  = htmlspecialchars_decode($changelog->description);
            $changelogs_array[$key]['log_date']     = date_format(new \DateTime($changelog->log_date), "F d, Y");
        }
        $getchangelogs = Redis::get('get_change_logs');
        Redis::del(Redis::keys('laravel_cache:*'));
                if(isset($getchangelogs)) {
                  return success_response(
                        trans('messages.fetch_change_log_success_from_redis'), json_decode($getchangelogs, FALSE)
                    );
                }else{
                   $change_logs = new Collection($changelogs_array);
                   $jsonchangelogs = json_encode($change_logs);
                   $Expiretime = (strtotime('tomorrow') - string_offset_to_seconds(Auth::user()->country_timezone_to_offset())) - datetime_to_timestamp(  date("Y-m-d H:i:s"));
                   if($Expiretime < 0){
                    $Expiretime = $Expiretime + (86400);
                    Redis::set('get_change_logs', $jsonchangelogs,"EX",$Expiretime);
                   }else{
                    Redis::set('get_change_logs', $jsonchangelogs,"EX",$Expiretime);
                   }
                    return success_response(
                        trans('messages.fetch_change_log_success'), $change_logs
                    );
                }

        // return success_response(
        //     trans('messages.fetch_change_log_success'), 
        //     new Collection($changelogs_array)
        // );
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
            $user = User::find(auth()->user()->id);
            $changelogs = new ChangeLogs();

            // set all values before saving
            $changelogs->title          = $request->title;
            $changelogs->category       = $request->category;
            $changelogs->description    = $request->description;
            $changelogs->log_date       = $request->log_date;
            $changelogs->created_by     = auth()->user()->id;

            $changelogs->save();
            Redis::del('getChangeLogs'.$user->id);
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
