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

use App\Modules\Department\Http\Requests\AnnouncementRequest;

use Illuminate\Support\Facades\Redis;
use App\Modules\Department\Repositories\AnnouncementRepositoryInterface;
use App\Modules\User\Models\User;

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
           AnnouncementResource::collection($announcements_list)
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
            
            
            log_activity( trans('messages.create_department_announcement_attempt') );
            $user = User::find(auth()->user()->id);
            $dep_announcement = $this->announcement->store($request);
            Redis::del('get_announcements_dashboard');
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
        log_activity( trans('messages.create_department_announcement_attempt') );
        if(Auth::user()->hasRole( get_constant('USER_ROLES.admin') )  ) { 
            $dep_announcement =  $this->announcement->show($id);
        }
        else {
            $dep_announcement =  $this->announcement->show_strict($id);
        }
      

        return success_response(
            trans('messages.create_department_announcement_success'), 
            new AnnouncementResource( $dep_announcement ) 
        );
    }

    /**
     * Update the specified resource in storage.
     *
     * @param  \Illuminate\Http\Request $request
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */

    public function update(AnnouncementRequest $request, $id)
    {   
        
      
        try {
            log_activity( trans('messages.update_department_announcement_attempt') );
            $department =  Department::find(Auth::user()->department_id);
            $check_announcement = $department->departments_announcements()->find($id);
            if($check_announcement || Auth::user()->hasRole( get_constant('USER_ROLES.admin'))){
                $dep_announcement = $this->announcement->update($request, $id);
            Redis::del('get_announcements_dashboard');
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
    public function dashboard_index(Request $request)
    {
        // error_log("hererrrrr" . implode(" ", $request->all()));
        
       
        try {
            $user = User::find(auth()->user()->id);
            $announcements_list = $this->announcement->dashboard_index($request);
            if(isset($request->dep_id) && $request->dep_id <> "all"){

            return success_response(
            trans('messages.fetch_change_log_success'), 
            AnnouncementResource::collection($announcements_list)
            );
            
            }else{
                $redisresponse = Redis::get('get_announcements_dashboard');
                // Redis::del(Redis::keys('laravel_cache:*'));
                if(isset($redisresponse)) {
                  return success_response(
                    trans('messages.fetch_change_log_success_from_redis'),  json_decode($redisresponse, FALSE)
                    );
                }else{
                  
                   $getannouncements = AnnouncementResource::collection($announcements_list);
                   $jsongetannouncements= json_encode($getannouncements);
                   $Expiretime = (strtotime('tomorrow') - string_offset_to_seconds(Auth::user()->country_timezone_to_offset())) - datetime_to_timestamp(  date("Y-m-d H:i:s"));
                   if($Expiretime < 0){
                    $Expiretime = $Expiretime + (86400);
                    Redis::set('get_announcements_dashboard', $jsongetannouncements,"EX",$Expiretime);
                   }else{
                    Redis::set('get_announcements_dashboard', $jsongetannouncements,"EX",$Expiretime);
                   }
                    
                    return success_response(
                        trans('messages.fetch_change_log_success'), $getannouncements
                    );
                }
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
