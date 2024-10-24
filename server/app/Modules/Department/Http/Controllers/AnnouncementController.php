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
use App\Modules\Department\Models\EvoxDepartment;

use App\Modules\Department\Resources\AnnouncementResource;


use App\Modules\Department\Http\Requests\AnnouncementRequest;

use App\Modules\Department\Resources\AnnouncementStrictResource;
use App\Modules\Department\Resources\AnnouncementResourceCollection;
use App\Modules\Department\Repositories\AnnouncementRepositoryInterface;

class AnnouncementController extends Controller
{


    private $announcement;
    
    public function __construct(AnnouncementRepositoryInterface $announcement ){
        $this->announcement = $announcement;
    }

    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function index()
    {
        
        try {
        //  $announcements_list = Announcement::orderBy('created_at', 'desc')->get();

         $announcements_list = $this->announcement->index();
        return success_response(
            trans('messages.fetch_change_log_success'), 
        //    AnnouncementResource::collection($announcements_list)
        new AnnouncementResourceCollection($announcements_list ) 
        );

        
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e, JsonResponse::HTTP_NOT_FOUND);
        }
    }


    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function store(AnnouncementRequest $request)
    {   
       
        try {
            // dd( $request->all());
            
            log_activity( trans('messages.create_department_announcement_attempt') );

            $dep_announcement = $this->announcement->store($request);
            return success_response(
                trans('messages.create_department_announcement_success'), 
                $dep_announcement
            );

        } catch(Exception $e){
         
            return error_response( trans('messages.error_default'), $e );
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
        log_activity( trans('messages.create_department_announcement_attempt') );

        $dep_announcement =  $this->announcement->show($id);

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

        try {
        log_activity( trans('messages.create_department_announcement_attempt') );
        $user = Auth::user();
        $owner_pass= false;
        $manager_pass = false;
        $called_announcement = Announcement::find($id);
        if($called_announcement){
           $owner_pass=  $called_announcement->created_by ==$user->id;
        }
       
        // if(Auth::user()->permissions()->pluck('name')->contains('admin_manage_all_announcements') || Auth::user()->permissions()->pluck('name')->contains('manage_all_announcements')){
        //     $manager_pass= true;
        // }

        // dd(Announcement::find($id));

        $parameter =  [     $user->LevelId, 
                                                        $user->id ,  
                                                        null,                            
                                                        $user->country_id,
                                                        3,
                                                        1,
                                                        999
                                    ];
                                    $response =  call_sp("EH_SP_Dashboard", $parameter);
                                    // dd($id,$called_announcement);
                                    $check_all = (array_filter($response[1], function($object) use ($called_announcement) { return $object->id == $called_announcement->id; }));
                                    if(count($check_all) > 0){
                                        return success_response(
                                            trans('messages.create_department_announcement_success'), 
                                            new AnnouncementResource(  $called_announcement) 
                                        );
                                    }
                                //    dd("here");
        if($user->isLevel("Admin") ||  $owner_pass ) { 
            $dep_announcement =  $this->announcement->show($id);
        }
        else {
            $dep_announcement =  $this->announcement->show_strict($id);
        }
        if(  $dep_announcement == null){
            return error_response( trans('Your not allowed to see this announcement'), "You Dont Have the right to see this Announcement" );
        }
      

        return success_response(
            trans('messages.create_department_announcement_success'), 
            new AnnouncementResource(  $dep_announcement ) 
        );
    } catch(Exception $e){
        dd($e);
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
    public function update(AnnouncementRequest $request, $id)
    {   
        
    // dd($request->all(),$id);
        try {
            log_activity( trans('messages.update_department_announcement_attempt') );
            $department =  EvoxDepartment::find(Auth::user()->department_id);
            $check_announcement = $department->departments_announcements()->find($id);
            if($check_announcement || Auth::user()->isLevel("Admin")){
                $dep_announcement = $this->announcement->update($request, $id);
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

            $this->announcement->destroy($id);

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
    // public function dashboard_index(Request $request)
    // {
    //     // error_log("hererrrrr" . implode(" ", $request->all()));
        
       
    //     try {
    //         $announcements_list = $this->announcement->dashboard_index($request);
    //     return success_response(
    //         trans('got the dashboard items'), 
    //         AnnouncementStrictResource::collection($announcements_list)
    //     );

        
    //     } catch(Exception $e){
    //         return error_response( trans('messages.error_default'), $e, JsonResponse::HTTP_NOT_FOUND);
    //     }
    // }

    public function dashboard_index(Request $request){
                try {
                    $user = Auth::user();
                $parameter =    [   $user->LevelId, 
                                    $user->id ,  
                                    null,                            
                                    $user->country_id,
                                    3,
                                    1,
                                    4
                                ];
            $response =  call_sp("EH_SP_Dashboard", $parameter);
            return success_response(
                        trans('got the dashboard items'), 
                        $response[1]
                    );

            }
            catch(Exception $e){
                return error_response( trans('messages.error_default'), $e, JsonResponse::HTTP_NOT_FOUND);
            }
    }


    public function increment_dashboard_index(Request $request)
    {
        // error_log("hererrrrr" . implode(" ", $request->all()));
        
       
        try {
            $announcements_list = $this->announcement->increment_dashboard_index($request);
        return success_response(
            trans('messages.fetch_change_log_success'), 
            AnnouncementStrictResource::collection($announcements_list)
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
    public function handle_announcements_index()
    {

        try {
            $announcements_list = $this->announcement->handle_announcements_index();
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


        if(Auth::user()->isLevel("HR")  ) { 
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
            
            $announcements_collection = $this->announcement->all_hr_handled_Announcements();
            return success_response(
                trans('messages.all_department_success'), 
                AnnouncementResource::collection( $announcements_collection ) 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e, JsonResponse::HTTP_NOT_FOUND);
        }

    }
}
