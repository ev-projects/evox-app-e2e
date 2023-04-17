<?php

namespace App\Modules\Department\Repositories;


use Exception;
use Carbon\Carbon;
use App\Modules\User\Models\User;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use App\Modules\Department\Models\Department;
use App\Modules\Department\Models\Announcement;
use App\Modules\Department\Models\AnnouncementDepartment;
use App\Modules\Department\Resources\AnnouncementResource;

class AnnouncementRepository implements AnnouncementRepositoryInterface
{

    public function __construct()
    {
    }




    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function index()
    {

        try {
            $announcements_list = Announcement::orderBy('created_at', 'desc')->get();


            return $announcements_list;
        } catch (Exception $e) {
            throw $e;
        }
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function store( $request)
    {
        DB::beginTransaction();
        try {


            log_activity(trans('messages.create_department_announcement_attempt'));

            $dep_announcement = new Announcement;

            $dep_announcement->title            = $request->title;
            $dep_announcement->category         = $request->category;
            $dep_announcement->content          = $request->content;
            $dep_announcement->headline         = $request->headline;
            // $dep_announcement->log_date      = $request->log_date;
            $dep_announcement->release_date     = $request->release_date;
            $dep_announcement->expiry_date     = $request->expiry_date;
            $dep_announcement->link             = $request->link;
            $dep_announcement->status           = $request->status;
            $dep_announcement->country_id       = Auth::user()->country_id;
            $dep_announcement->exposure_level   = $request->exposure_level;
            $dep_announcement->dep_id           = auth()->user()->department_id;
            $dep_announcement->created_by       = auth()->user()->id;
            $dep_announcement->updated_by       = auth()->user()->id;




            $dep_announcement->save();
            if ($request->thumbnail != null) {
                $path = $request->file('thumbnail')->store(
                    'public/announcements/' . $dep_announcement->id,
                );

                // $dep_announcement->update(['thumbnail' => $path]);
                $dep_announcement->thumbnail = $path;
                $dep_announcement->update();
            }

            // if ($dep_announcement->category  == "HR") {
            //     $department_ids = Department::pluck('id')->toArray();

            //     $dep_announcement->announcements_departments()->sync($department_ids);

            //     $announcement_department = new AnnouncementDepartment;
            //     $announcement_department->announcement_id   =  $dep_announcement->id;
            //     $announcement_department->department_ids    =  $department_ids;
            // } else {
            //     $dep_announcement->announcements_departments()->sync([auth()->user()->department_id]);

            //     $announcement_department = new AnnouncementDepartment;
            //     $announcement_department->announcement_id   =  $dep_announcement->id;
            //     $announcement_department->department_ids    =  [auth()->user()->department_id];
            // }
            // $announcement_department->save();

            DB::commit();
            // return success_response(
            //     trans('messages.create_department_announcement_success'),
            //     $dep_announcement
            // );
            return $dep_announcement;
        } catch (Exception $e) {
            DB::rollback();
            throw  $e;
        }
    }




    /**
     * Display the specified resource.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function show($id)
    {
        log_activity(trans('messages.create_department_announcement_attempt'));

        $dep_announcement = Announcement::find($id);
        
        return  $dep_announcement;
    }

    /**
     * Display the specified resource.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function show_strict($id)
    {
            $department =  Department::find(Auth::user()->department_id);
            // $announcements_list = Announcement::orderBy('created_at', 'desc')->take(8)->get();
            $dep_announcement = $department->departments_announcements()->where("category", "Department")->find($id);
        return  $dep_announcement;
    }



    /**
     * Update the specified resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function update($request, $id)
    {

        DB::beginTransaction();
        try {
         
                $dep_announcement = Announcement::find($id);


                $dep_announcement->title            = $request->title;
                $dep_announcement->category         = $request->category;
                $dep_announcement->content          = $request->content;
                $dep_announcement->headline         = $request->headline;
                // $dep_announcement->log_date      = $request->log_date;
                $dep_announcement->release_date     = $request->release_date;
                $dep_announcement->expiry_date      = $request->expiry_date;
                $dep_announcement->link             = $request->link;
                $dep_announcement->status           = $request->status;
                $dep_announcement->exposure_level   = $request->exposure_level;
                // $dep_announcement->dep_id           = auth()->user()->department_id;
                // $dep_announcement->created_by       = auth()->user()->id;
                $dep_announcement->updated_by       = auth()->user()->id;

                $dep_announcement->update();

                if ($request->thumbnail != null) {
                    $path = $request->file('thumbnail')->store(
                        'public/announcements/' . $dep_announcement->id,
                    );

                    // $dep_announcement->update(['thumbnail' => $path]);
                    $dep_announcement->thumbnail = $path;
                    $dep_announcement->update();
                }

                // $announcement_department_to_delete =  AnnouncementDepartment::where("announcement_id", $dep_announcement->id);
                //  // if record exist delete
                //  error_log($announcement_department_to_delete->count() > 0);
                // if( $announcement_department_to_delete->count() > 0){
                //     // $deleted = DB::delete('DELETE FROM announcements_departments WHERE announcements_departments.announcement_id = ?',[$dep_announcement->id]);
                //     AnnouncementDepartment::where('announcement_id', $dep_announcement->id)->delete();
                // } 
            

                DB::commit();

                // $announcement_department = new AnnouncementDepartment;
                // if ($dep_announcement->category  == "HR") {
                //     $department_ids = Department::pluck('id')->toArray();
                //         $announcement_department->department_ids    =  $department_ids;
                //         $announcement_department->save();
                // } else {

                //         $announcement_department->department_ids    =  [auth()->user()->department_id];
                //         $announcement_department->save();
                // }

                return  $dep_announcement;

        } catch (Exception $e) {
            DB::rollback();
            throw $e;
        }
    }


    /**
     * Update the specified resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function update_status( $request, $id)
    {
        DB::beginTransaction();
        try {
            log_activity(trans('messages.create_department_announcement_attempt'));

            $dep_announcement = Announcement::find($id);
            $dep_announcement->status    = $request->status;
            $dep_announcement->update();

            DB::commit();
            return success_response(
                trans('messages.create_department_announcement_success'),
                $dep_announcement
            );
        } catch (Exception $e) {
            DB::rollback();
            throw $e;
        }
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function destroy($id)
    {
        DB::beginTransaction();
        try {
            log_activity(trans('messages.delete_department_announcement_attempt'));

            Announcement::destroy($id);

            DB::commit();
            // return success_response(
            //     trans('messages.delete_department_announcement_success'),

            // );
        } catch (Exception $e) {
            DB::rollback();
            throw  $e;
        }
    }

 
    public function dashboard_index($request)
    {

 
        $date_time = Carbon::now()->toDateString();
        try {
            $department =  Department::find(Auth::user()->department_id);

            // $announcement_ids = AnnouncementDepartment::whereJsonContains('department_ids',[ $department->id])
            // ->pluck('announcement_id')
            // ->toArray();
            // ->get();
            if($request->dep_id == "all" || $request->dep_id == null){
                $announcements_list = Announcement::latest()->where(function ($query) use ($date_time) {
                    $query->where('release_date', '<=', $date_time);
                    $query->where('expiry_date', '>', $date_time);
                });
            }

            if( $request->dep_id != null  && is_numeric($request->dep_id)){
                $department =  Department::find($request->dep_id);
                $announcements_list = $department->departments_announcements()->latest()->where(function ($query) use ($date_time) {
                    $query->where('release_date', '<=', $date_time);
                    $query->where('expiry_date', '>', $date_time);
                });
            }



            // if ($request->category == "hr") {
            //     $announcements_list->where("category", "HR");
            // }
            // if ($request->category == "department") {
            //     $announcements_list->where("category", "Department");
            // }

            $announcements_list = $announcements_list->get();

            return $announcements_list;
            
        } catch (Exception $e) {
            throw $e;
        }
    }



    public function handle_announcements_index()
    {

        try {
            $department =  Department::find(Auth::user()->department_id);

            $announcements_list = $department->departments_announcements()->where("category", "Department")->latest()


                ->get();

            return $announcements_list;

        } catch (Exception $e) {
            throw $e;
        }
    }




    public function all_department_handled_Announcements()
    {
        try {
            log_activity(trans('messages.create_department_announcement_attempt'));

            $announcements_collection = Announcement::where("dep_id", Auth::user()->dep_id);
            return $announcements_collection;

        } catch (Exception $e) {
            throw $e;
        }
    }



    public function show_hr_strict($id)
    {
        log_activity(trans('messages.create_department_announcement_attempt'));


        if (Auth::user()->hasRole(get_constant('USER_ROLES.hr'))) {
            $dep_announcement = Announcement::where('category', "HR")->find($id);
        }



        return $dep_announcement;
    }


    public function all_hr_handled_Announcements()
    {
        try {
            log_activity(trans('messages.create_department_announcement_attempt'));

            $announcements_collection = Announcement::where("category", "HR")->get();
            return $announcements_collection;


        } catch (Exception $e) {
           throw $e;
        }
    }
}
