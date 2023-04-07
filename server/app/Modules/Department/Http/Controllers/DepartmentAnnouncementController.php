<?php


namespace App\Modules\Department\Http\Controllers;

use Exception;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Auth;
use Illuminate\Database\Eloquent\Collection;
use App\Modules\Department\Models\Department;
use App\Modules\Department\Models\Announcement;
// use App\Modules\Department\Resources\DepartmentListResource;
use App\Modules\Department\Resources\AnnouncementResource;
use App\Modules\User\Repositories\UserRepositoryInterface;
use App\Modules\Department\Repositories\DepartmentRepositoryInterface;

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
         $announcements_list = Announcement::orderBy('created_at', 'desc')->get();


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
            
            if( $dep_announcement->category  == "HR"){
              $department_ids = Department::pluck('id')->toArray();
                
                  $dep_announcement->announcements_departments()->sync($department_ids);
            }else{
                  $dep_announcement->announcements_departments()->sync([auth()->user()->department_id]);
            }
          

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

        $dep_announcement = Announcement::find($id);
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
            $dep_announcement = Announcement::find($id);
        }
        else {
            $department =  Department::find(Auth::user()->department_id);
            // $announcements_list = Announcement::orderBy('created_at', 'desc')->take(8)->get();
            $dep_announcement = $department->departments_announcements()->where("category", "Department")->find($id);
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
            $dep_announcement = Announcement::find($id);

            
            $dep_announcement->title            = $request->title;
            $dep_announcement->category         = $request->category;
            $dep_announcement->content          = $request->content;
            $dep_announcement->headline         = $request->headline;
            // $dep_announcement->log_date      = $request->log_date;
            $dep_announcement->release_date     = $request->release_date;
            $dep_announcement->expiry_date     = $request->expiry_date;
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
            
            
            if( $dep_announcement->category  == "HR"){
              $department_ids = Department::pluck('id')->toArray();
                $dep_announcement->announcements_departments()->sync( $department_ids);
            }else{
                  $dep_announcement->announcements_departments()->sync([auth()->user()->department_id]);
            }

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

            $dep_announcement = Announcement::find($id);
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

            Announcement::destroy($id);

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
    public function dashboard_index(Request $request)
    {
        // error_log("hererrrrr" . implode(" ", $request->all()));
        
        $date_time = Carbon::now()->toDateString();
        try {
        $department =  Department::find(Auth::user()->department_id);
        // $announcements_list = Announcement::orderBy('created_at', 'desc')->take(8)->get();
        
        if(isset($department)){
            $announcements_list = 
            $department->departments_announcements()->latest()->
            where(function ($query) use ($date_time) {
                $query->where('release_date', '<=', $date_time);
                $query->where('expiry_date', '>', $date_time);
            });
    
            if($request->category == "hr"){
                $announcements_list->where("category", "HR");
            }
            if($request->category == "department"){
                $announcements_list->where("category", "Department");
            }
    
            
            $announcements_list = $announcements_list->get();
        
       
        // dd( AnnouncementResource::collection($announcements_list));
        return success_response(
            trans('messages.fetch_change_log_success'), 
           AnnouncementResource::collection($announcements_list)
        );
    }else{
        $array=[];
        return success_response(
            trans('messages.fetch_change_log_success'), 
            $array,
        );
    }

        
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e, JsonResponse::HTTP_NOT_FOUND);
        }
    }


    /**
     * Display a listing of the resource only to the users(Logged in but not admin) dashbaord.
     *
     * @return \Illuminate\Http\Response
     */
    public function handle_announcements_index()
    {

        try {
        $department =  Department::find(Auth::user()->department_id);
        // $announcements_list = Announcement::orderBy('created_at', 'desc')->take(8)->get();
        $announcements_list = $department->departments_announcements()->where("category", "Department")->latest()
        ->get();
        // dd( AnnouncementResource::collection($announcements_list));
        return success_response(
            trans('messages.fetch_change_log_success'), 
           AnnouncementResource::collection($announcements_list)
        );

        
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e, JsonResponse::HTTP_NOT_FOUND);
        }
    }

    

    /**
     * Display a listing of the resource only to the Supervisor(Logged in but not admin) dashbaord.
     *
     * @return \Illuminate\Http\Response
     */
    public function all_department_handled_Announcements()
    {
        try {
            log_activity( trans('messages.create_department_announcement_attempt') );
            
            $announcements_collection = Announcement::where("dep_id", Auth::user()->dep_id);
            return success_response(
                trans('messages.all_department_success'), 
                AnnouncementResource::collection( $announcements_collection ) 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e, JsonResponse::HTTP_NOT_FOUND);
        }

    }



    public function show_hr_strict($id)
    {
        log_activity( trans('messages.create_department_announcement_attempt') );


        if(Auth::user()->hasRole( get_constant('USER_ROLES.hr') )  ) { 
            $dep_announcement = Announcement::where('category', "HR")->find($id);
        }
      
      

        return success_response(
            trans('messages.create_department_announcement_success'), 
            new AnnouncementResource(  $dep_announcement ) 
        );
    }

        /**
     * Display a listing of the resource only to the HR(Logged in but not admin) dashbaord.
     *
     * @return \Illuminate\Http\Response
     */
    public function all_hr_handled_Announcements()
    {
        try {
            log_activity( trans('messages.create_department_announcement_attempt') );
            
            $announcements_collection = Announcement::where("category", "HR")->get();
            return success_response(
                trans('messages.all_department_success'), 
                AnnouncementResource::collection( $announcements_collection ) 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e, JsonResponse::HTTP_NOT_FOUND);
        }

    }
}
