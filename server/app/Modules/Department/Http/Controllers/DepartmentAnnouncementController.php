<?php


namespace App\Modules\Department\Http\Controllers;

use Exception;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Auth;
use App\Modules\Department\Models\Announcment;
use App\Modules\Department\Models\Department;
use App\Modules\Department\Resources\AnnouncementResource;
use App\Modules\User\Repositories\UserRepositoryInterface;
// use App\Modules\Department\Resources\DepartmentListResource;
use App\Modules\Department\Repositories\DepartmentRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;

class DepartmentAnnouncementController extends Controller
{


    private $department;
    private $user;
    
    public function __construct(DepartmentRepositoryInterface $department, UserRepositoryInterface $user){
        $this->department = $department;
        $this->user = $user;
    }

    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function index()
    {
        
        try {
         $announcements_list = Announcment::orderBy('created_at', 'desc')->get();


        return success_response(
            trans('messages.fetch_change_log_success'), 
           AnnouncementResource::collection($announcements_list)
        );

        
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e, JsonResponse::HTTP_NOT_FOUND);
        }
    }

    /**
     * Show the form for creating a new resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function store(Request $request)
    {
        DB::beginTransaction();
        try {

            
            log_activity( trans('messages.create_department_announcement_attempt') );

            $dep_announcement = new Announcment;

            $dep_announcement->title            = $request->title;
            $dep_announcement->category         = $request->category;
            $dep_announcement->content          = $request->content;
            $dep_announcement->headline         = $request->headline;
            // $dep_announcement->log_date      = $request->log_date;
            $dep_announcement->release_date     = $request->release_date;
            $dep_announcement->link             = $request->link;
            $dep_announcement->status           = $request->status;
            $dep_announcement->exposure_level   = $request->exposure_level;
            $dep_announcement->dep_id           = auth()->user()->department_id;
            $dep_announcement->created_by       = auth()->user()->id;
            $dep_announcement->updated_by       = auth()->user()->id;


            

            $dep_announcement->save();
            if($request->thumbnail != null ){
                $path = $request->file('thumbnail')->store(
                    'public/announcements/'.$dep_announcement->id, 
                );

                // $dep_announcement->update(['thumbnail' => $path]);
                $dep_announcement->thumbnail = $path;
                $dep_announcement->update();
            }
            
            
            $dep_announcement->announcements_departments()->sync([auth()->user()->department_id]);

            DB::commit();
            return success_response(
                trans('messages.create_department_announcement_success'), 
                $dep_announcement
            );

        } catch(Exception $e){
            DB::rollback();
            return error_response( trans('messages.error_default'), $e );
        }
    }



    // public function store(AnnouncementRequest $request)
    // {
    //     try {
    //         log_activity( trans('messages.create_announcement_attempt') );

    //         $newannouncement = $this->announcement->store( $request->all());
    //         if($request->thumbnail != null ){
    //             $path = $request->file('thumbnail')->store(
    //                 'announcements/'.$newannouncement->id, 
    //             );
    //             $newannouncement->update(['thumbnail' => $path]);
    //             return success_response(
    //                 trans('messages.create_announcement_success'), 
    //                 new AnnouncementResource($newannouncement),
    //                 JsonResponse::HTTP_CREATED
    //             );
    //     }

    //     } catch(Exception $e){
    //         return error_response( trans('messages.error_default'), $e );
    //     }
    // }

    /**
     * Display the specified resource.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function show($id)
    {
        log_activity( trans('messages.create_department_announcement_attempt') );

        $dep_announcement = Announcment::find($id);
        // dump( $dep_announcement,$id);
        return success_response(
            trans('messages.create_department_announcement_success'), 
            new AnnouncementResource(  $dep_announcement ) 
        );
    }

    /**
     * Display the specified resource.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function show_strict($id)
    {
        log_activity( trans('messages.create_department_announcement_attempt') );
        if(Auth::user()->hasRole( get_constant('USER_ROLES.admin') )  ) { 
            $dep_announcement = Announcment::find($id);
        }
        else {
            $department =  Department::find(Auth::user()->department_id);
            // $announcements_list = Announcment::orderBy('created_at', 'desc')->take(8)->get();
            $dep_announcement = $department->departments_announcements()->find($id);
        }
      

        return success_response(
            trans('messages.create_department_announcement_success'), 
            new AnnouncementResource(  $dep_announcement ) 
        );
    }

    /**
     * Show the form for editing the specified resource.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function edit($id)
    {
        
    }

    /**
     * Update the specified resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function update(Request $request, $id)
    {   
        
        DB::beginTransaction();
        try {
            log_activity( trans('messages.update_department_announcement_attempt') );
            $department =  Department::find(Auth::user()->department_id);
            $check_announcement = $department->departments_announcements()->find($id);
            if($check_announcement || Auth::user()->hasRole( get_constant('USER_ROLES.admin'))){
            $dep_announcement = Announcment::find($id);

            
            $dep_announcement->title            = $request->title;
            $dep_announcement->category         = $request->category;
            $dep_announcement->content          = $request->content;
            $dep_announcement->headline         = $request->headline;
            // $dep_announcement->log_date      = $request->log_date;
            $dep_announcement->release_date     = $request->release_date;
            $dep_announcement->link             = $request->link;
            $dep_announcement->status           = $request->status;
            $dep_announcement->exposure_level   = $request->exposure_level;
            // $dep_announcement->dep_id           = auth()->user()->department_id;
            // $dep_announcement->created_by       = auth()->user()->id;
            $dep_announcement->updated_by       = auth()->user()->id;

            $dep_announcement->update();

            if($request->thumbnail != null ){
                $path = $request->file('thumbnail')->store(
                    'public/announcements/'.$dep_announcement->id, 
                );

                // $dep_announcement->update(['thumbnail' => $path]);
                $dep_announcement->thumbnail = $path;
                $dep_announcement->update();
            }
            
            
            $dep_announcement->announcements_departments()->sync([auth()->user()->department_id]);

            DB::commit();
            return success_response(
                trans('messages.update_department_announcement_success'), 
                $dep_announcement
            );
            }
            else{
                return error_response( trans('messages.error_default'), "You Dont Have the right update this Announcement" );
            }
            

           

        } catch(Exception $e){
            DB::rollback();
            return error_response( trans('messages.error_default'), $e );
        }
    }


      /**
     * Update the specified resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function update_status(Request $request, $id)
    {
        DB::beginTransaction();
        try {
            log_activity( trans('messages.create_department_announcement_attempt') );

            $dep_announcement = Announcment::find($id);
            $dep_announcement->status    = $request->status;
            $dep_announcement->update();

            DB::commit();
            return success_response(
                trans('messages.create_department_announcement_success'), 
                $dep_announcement
            );

        } catch(Exception $e){
            DB::rollback();
            return error_response( trans('messages.error_default'), $e );
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
            log_activity( trans('messages.delete_department_announcement_attempt') );

            Announcment::destroy($id);

            DB::commit();
            return success_response(
                trans('messages.delete_department_announcement_success'), 
              
            );

        } catch(Exception $e){
            DB::rollback();
            return error_response( trans('messages.error_default'), $e );
        }
    }

    /**
     * Display a listing of the resource only to the users(Logged in but not admin) dashbaord.
     *
     * @return \Illuminate\Http\Response
     */
    public function dashboard_index()
    {
        
        try {
        $department =  Department::find(Auth::user()->department_id);
        // $announcements_list = Announcment::orderBy('created_at', 'desc')->take(8)->get();
        $announcements_list = $department->departments_announcements()->latest()->get();

        return success_response(
            trans('messages.fetch_change_log_success'), 
           AnnouncementResource::collection($announcements_list)
        );

        
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e, JsonResponse::HTTP_NOT_FOUND);
        }
    }

    /**
     * Display a listing of the resource only to the users(Logged in but not admin) dashbaord.
     *
     * @return \Illuminate\Http\Response
     */
    public function all_department_handled_announcments()
    {
        try {
            log_activity( trans('messages.create_department_announcement_attempt') );
            
            $announcements_collection = Announcment::where("dep_id", Auth::user()->dep_id);
            return success_response(
                trans('messages.all_department_success'), 
                AnnouncementResource::collection( $announcements_collection ) 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e, JsonResponse::HTTP_NOT_FOUND);
        }

    }
}
