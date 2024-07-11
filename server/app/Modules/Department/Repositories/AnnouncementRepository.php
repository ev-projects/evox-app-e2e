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
use App\Modules\Department\Models\EvoxDepartment;
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
            $announcements_list = null;

            // dd(request()->all());

            $pov_user = null;
            if(is_valid( request()->get('employee') )){
                $pov_user = User::find(request()->get('employee'));
            }

            if(is_valid( request()->get('department_id') ) || $pov_user){
                $department_id = $pov_user == null ? request()->get('department_id') : $pov_user->department_id;
            
                if(is_valid(auth()->user()->SubDepartmentID)){
                    $department_id  = auth()->user()->direct_department_id();
                }
                $announcements_list = Announcement::where(function($query) use (  $department_id){
                    
                    $query->where('set_all', 1);
                    $query->orWhere('present_dep_id', $department_id);
                    
                });

                // dd($announcements_list->toSql());
            }
            else{
                $announcements_list =  Announcement::where('announcement_id', null );
            }
            if($pov_user){
                if($pov_user->country_id){
               
                    $country_id = $pov_user->country_id;
                  
                    $announcements_list->where(function($query) use (  $country_id){

                        $query->where('set_country_all', 1);
                        $query->orWhere('country_id',$country_id);
                     
                    });
                }
               
            }
        
            if(is_valid( request()->get('country_id') ) && $pov_user == null){
                
                $country_id =  request()->get('country_id');
                $announcements_list->where('set_country_all', 0);
                $announcements_list->where('country_id', $country_id);
            
            }


            if( is_valid( request()->get('announcement_title') ) ) {
                $announcements_list->where('title', 'like', '%' .request()->get('announcement_title'). '%');
            }
            if( is_valid( request()->get('status') ) ) {
                $now = Carbon::now()->format('Y-m-d');
                if(request()->get('status') == "ongoing"){
                    $announcements_list->whereDate('expiry_date', '>=', $now);
                }

                if(request()->get('status') == "expired"){
                    $announcements_list->whereDate('expiry_date', '<', $now);
                }
                
            }

            if( is_valid( request()->get('order_by') ) ) {
                $order = explode(":", request()->get('order_by'));

                switch ($order[0]) {
                    case "announcement_title":
                            $announcements_list->orderBy('title',  $order[1]);
                        break;

                    case "created_at":
                        $announcements_list->orderBy('created_at',  $order[1]);
                        break;
                    
                        
                    }
            }else{
                    $announcements_list->orderBy('created_at', 'desc');
            }
            
            // return $announcements_list->get();
            return $announcements_list->paginate(6);
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
      

        $dep_ids = null;
        if( is_valid( $request->selectedDepartments ) &&  $request->set_all == 0  ){
            $dep_ids = $request->selectedDepartments;
            if(gettype($dep_ids) === "string"){
                $dep_ids = preg_split("/\,/", $dep_ids );
            }
            
            if($request->set_exclude =="1" && $request->set_all == "0"){
                $dep_ids = EvoxDepartment::whereNotIn("id",$dep_ids )->pluck('id')->toArray();
            }
            else{
                $dep_ids = EvoxDepartment::whereIn("id",$dep_ids )->pluck('id')->toArray();
            }
         
        }   
        // dd($dep_ids);
    
        DB::beginTransaction();
        try {
            
            $main_dep_id = 0;
            log_activity(trans('messages.create_department_announcement_attempt'));
           
            if(is_valid(auth()->user()->SubDepartmentID)){
                $main_dep_id = auth()->user()->direct_department_id();
            }
            $dep_announcement = new Announcement;

            $dep_announcement->title            = $request->title;
            $dep_announcement->category         = $request->category;
            $dep_announcement->content          = $request->content;
            $dep_announcement->headline         = $request->headline;
            $dep_announcement->release_date     = $request->release_date;
            $dep_announcement->expiry_date      = $request->expiry_date;
            $dep_announcement->on_link          = $request->on_link;
            $dep_announcement->link             = $request->link;
            $dep_announcement->status           = $request->status;


            // $dep_announcement->country_id       = Auth::user()->country_id;
            $dep_announcement->country_id       = $request->country_id != null ? $request->country_id : Auth::user()->country_id;


            $dep_announcement->dep_id           = $main_dep_id;
            $dep_announcement->present_dep_id   = $main_dep_id;
            $dep_announcement->created_by       = auth()->user()->id;
            $dep_announcement->updated_by       = auth()->user()->id;
            $dep_announcement->set_all          = $request->set_all == 1? 1:0;
            $dep_announcement->set_exclude          = $request->set_exclude == 1? 1:0;
            $dep_announcement->set_country_all  = $request->set_country_all == 1? 1:0;

            $dep_announcement->save();

            if ($request->thumbnail != null) {
                $path = $request->file('thumbnail')->store(
                    'public/announcements/' . $dep_announcement->id,
                );

                // $dep_announcement->update(['thumbnail' => $path]);
                $dep_announcement->thumbnail = $path;
                $dep_announcement->update();
            }

            $saved_dep_announcement = $dep_announcement;
            
            if(is_valid($dep_ids)){
                // $dep_ids = array_diff($dep_ids,  [auth()->user()->department_id]);
                foreach( $dep_ids as $dep_id){
                    $dep_announcement = new Announcement;

                    $dep_announcement->announcement_id  = $saved_dep_announcement->id;

                    $dep_announcement->title            = $saved_dep_announcement->title;
                    $dep_announcement->category         = $saved_dep_announcement->category;
                    $dep_announcement->content          = $saved_dep_announcement->content;
                    $dep_announcement->headline         = $saved_dep_announcement->headline;
                    // $dep_announcement->log_date          = $saved_dep_announcement->log_date;
                    $dep_announcement->release_date     = $saved_dep_announcement->release_date;
                    $dep_announcement->expiry_date      = $saved_dep_announcement->expiry_date;
                    $dep_announcement->on_link          = $saved_dep_announcement->on_link;
                    $dep_announcement->link             = $saved_dep_announcement->link;
                    $dep_announcement->status           = $saved_dep_announcement->status;
                  
                    // $dep_announcement->country_id       = Auth::user()->country_id;
                    $dep_announcement->country_id       = $request->country_id != null ? $request->country_id : Auth::user()->country_id;


                    // $dep_announcement->exposure_level   = $saved_dep_announcement->exposure_level;
                    // $dep_announcement->dep_id           = auth()->user()->department_id;
                    if ($saved_dep_announcement->thumbnail != null){
                        $dep_announcement->thumbnail = $path;
                    }
                    $dep_announcement->present_dep_id   = $dep_id;
                    $dep_announcement->set_all          = 0;
                    $dep_announcement->set_country_all  = $request->set_country_all == 1? 1:0;

                    $dep_announcement->created_by       = auth()->user()->id;
                    $dep_announcement->updated_by       = auth()->user()->id;
                    // dump($dep_id);
                    $dep_announcement->save();
                }
            }
        

            DB::commit();
    
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
            $logged_user = Auth::user();
            $department =  EvoxDepartment::find( $logged_user->department_id);
            // $announcements_list = Announcement::orderBy('created_at', 'desc')->take(8)->get();

            $exist_announcement = Announcement::find($id);
            $main_dep_id =   $logged_user->department_id;
            if(is_valid(auth()->user()->SubDepartmentID)){
                $main_dep_id = Auth::user()->direct_department_id();
            }
            if($exist_announcement->set_all == 0){
                $exist_announcement = Announcement::where('announcement_id', $id)->where("present_dep_id",    $main_dep_id)->first();
            }

            if( $exist_announcement){

                   if(($exist_announcement->set_all == 1 || ($exist_announcement->set_all == 0&& $exist_announcement->present_dep_id ==  $logged_user->department_id))  
                && ($exist_announcement->set_country_all == 1||  ($exist_announcement->set_country_all == 0 && $exist_announcement->country_id ==  $logged_user->country_id))){
                    return  $exist_announcement;
                }
            }

            // ("not passed");
            if( $exist_announcement){ // checks if in dashbaord

                        $toExclude = Announcement::where('announcement_id' ,'!=' ,null)->pluck('announcement_id')->toArray();
                        $list_all = Announcement::latest()->where('set_all',1)
                        
                        ->where(function ($query)  {
                            $query->where('set_country_all',1)->orWhere("country_id", Auth::user()->country_id);
                            // $query;
                        })
                        ->get();

                        $list_dep = Announcement::where("present_dep_id",$main_dep_id)->latest()
                        ->where(function ($query)  {
                            $query->where('set_country_all',1)->orWhere("country_id", Auth::user()->country_id);
                            // $query;
                        })
                        ->whereNotIn('id', $toExclude)

                        ->get();
                       

                        if(!is_valid(auth()->user()->SubDepartmentID) || auth()->user()->department_id == null){
                             $announcements_list = $list_all->sortByDesc('release_date');
                             if($announcements_list->contains('id', $exist_announcement->id)){
                                return $exist_announcement;
                            }
                        }
                        $announcements_list = $list_all->merge($list_dep)->sortByDesc('release_date');
                        if($announcements_list->contains('id', $exist_announcement->id)){
                            return $exist_announcement;
                        }
            }
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

        $dep_ids = null;
        if( is_valid( $request->selectedDepartments ) &&  $request->set_all == 0  ){
            $dep_ids = $request->selectedDepartments;
            if(gettype($dep_ids) === "string"){
                $dep_ids = preg_split("/\,/", $dep_ids );
            }
            if($request->set_exclude =="1" && $request->set_all == "0"){
                $dep_ids = EvoxDepartment::whereNotIn("id",$dep_ids )->pluck('id')->toArray();
            }
            else{
                $dep_ids = EvoxDepartment::whereIn("id",$dep_ids )->pluck('id')->toArray();
            }
         
        }   
        DB::beginTransaction();
        try {
            // dd($request->content, gettype($request->content));
         
                $dep_announcement = Announcement::find($id);


                $dep_announcement->title            = $request->title;
                $dep_announcement->category         = $request->category;
                if( $request->content != "null"){
                    $dep_announcement->content          = $request->content;
                }
              
                $dep_announcement->headline         = $request->headline;
                $dep_announcement->release_date     = $request->release_date;
                $dep_announcement->expiry_date      = $request->expiry_date;
                $dep_announcement->on_link          = $request->on_link == "true" ? 1 : 0;
                $dep_announcement->link             = $request->link;
                $dep_announcement->status           = $request->status;



            // $dep_announcement->country_id       = Auth::user()->country_id;
            $dep_announcement->country_id       = $request->country_id != null ? $request->country_id : Auth::user()->country_id;



                // $dep_announcement->dep_id           = auth()->user()->department_id;
                // $dep_announcement->created_by       = auth()->user()->id;
                $dep_announcement->updated_by       = auth()->user()->id;

                $dep_announcement->set_all          = $request->set_all == 1? 1:0;
                $dep_announcement->set_exclude          = $request->set_exclude == 1? 1:0;
                $dep_announcement->set_country_all  = $request->set_country_all == 1? 1:0;

                $dep_announcement->update();

                if ($request->thumbnail != null) {
                    $path = $request->file('thumbnail')->store(
                        'public/announcements/' . $dep_announcement->id,
                    );

                    // $dep_announcement->update(['thumbnail' => $path]);
                    $dep_announcement->thumbnail = $path;
                    $dep_announcement->update();
                    error_log("upda");
                }
               
                if($request->thumbnail == null && $request->inputFileWasDeleted == "true" ){
                    $dep_announcement->thumbnail = null;
                    $dep_announcement->update();
                    error_log("del");
                }
                
                $saved_dep_announcement = $dep_announcement;

                Announcement::where('announcement_id', $saved_dep_announcement->id)
                                    ->where('set_all', 0)
                                    ->forceDelete();
                if(is_valid($dep_ids)){
                    
                    
        
                    
                // $dep_ids = array_diff($dep_ids,  [auth()->user()->department_id]);
                // dd($dep_ids);
                foreach( $dep_ids as $dep_id){
                    $dep_announcement = new Announcement;

                    $dep_announcement->announcement_id  = $saved_dep_announcement->id;

                    $dep_announcement->title            = $saved_dep_announcement->title;
                    $dep_announcement->category         = $saved_dep_announcement->category;
                    // if( $request->content != "null"){
                        $dep_announcement->content          = $saved_dep_announcement->content;
                    // }
                    $dep_announcement->headline         = $saved_dep_announcement->headline;
                    // $dep_announcement->log_date          = $saved_dep_announcement->log_date;
                    $dep_announcement->release_date     = $saved_dep_announcement->release_date;
                    $dep_announcement->expiry_date      = $saved_dep_announcement->expiry_date;
                    $dep_announcement->on_link          = $saved_dep_announcement->on_link;
                    $dep_announcement->link             = $saved_dep_announcement->link;
                    $dep_announcement->status           = $saved_dep_announcement->status;
                    


                    // $dep_announcement->country_id       = Auth::user()->country_id;
                    $dep_announcement->country_id       = $request->country_id != null ? $request->country_id : Auth::user()->country_id;



                    // $dep_announcement->exposure_level   = $saved_dep_announcement->exposure_level;
                    // $dep_announcement->dep_id           = auth()->user()->department_id;
                    if ($saved_dep_announcement->thumbnail != null){
                        $dep_announcement->thumbnail =  $saved_dep_announcement->thumbnail;
                    }
                    $dep_announcement->present_dep_id   = $dep_id;
                    $dep_announcement->set_all          = 0;
                    $dep_announcement->set_country_all  = $request->set_country_all == 1? 1:0;

                    $dep_announcement->created_by       = auth()->user()->id;
                    $dep_announcement->updated_by       = auth()->user()->id;

                    $dep_announcement->save();
                }
                }

                DB::commit();


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
            Announcement::where('announcement_id', $id)
                                    ->where('set_all', 0)
                                    ->forceDelete();

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
            // $department =  Department::find(Auth::user()->department_id);
            $toExclude = Announcement::where('announcement_id' ,'!=' ,null)->pluck('announcement_id')->toArray();
            $main_dep_id =0;
            if(is_valid(auth()->user()->SubDepartmentID)){
                $main_dep_id = auth()->user()->direct_department_id();
            }
        
            if($request->dep_id == "all" || $request->dep_id == null){

                $list_all = Announcement::latest()->where('set_all',1)->where(function ($query) use ($date_time) {
                    $query->where('release_date', '<=', $date_time);
                    $query->where('expiry_date', '>', $date_time);
                })
                
                ->where(function ($query)  {
                    $query->where('set_country_all',1)->orWhere("country_id", Auth::user()->country_id);
                    // $query;
                })
                ->get();

                $list_dep = Announcement::where("present_dep_id",$main_dep_id)->latest()->where(function ($query) use ($date_time) {
                    $query->where('release_date', '<=', $date_time);
                    $query->where('expiry_date', '>', $date_time);
                })
                ->where(function ($query)  {
                    $query->where('set_country_all',1)->orWhere("country_id", Auth::user()->country_id);
                    // $query;
                })
                ->whereNotIn('id', $toExclude)
                 // only 6 but we get 7 to check if there is a next (show)
                ->get();
                // dd($main_dep_id,  $list_dep);

                if(!is_valid(auth()->user()->SubDepartmentID) || auth()->user()->department_id == null){
                    return $announcements_list = $list_all->sortByDesc('release_date')->take(6);
                }


                return $announcements_list = $list_all->merge($list_dep)->sortByDesc('release_date')->take(6);

              
            }

            if( $request->dep_id != null  && is_numeric($request->dep_id)){
                // $department =  EvoxDepartment::find($request->dep_id);
                $announcements_list =  Announcement::where("present_dep_id",$request->dep_id)->latest()->where(function ($query) use ($date_time) {
                    $query->where('release_date', '<=', $date_time);
                    $query->where('expiry_date', '>', $date_time);
                })
                ->where(function ($query)  {
                    $query->where('set_country_all',1)->orWhere("country_id", Auth::user()->country_id);
                    // $query;
                })
                ->whereNotIn('id', $toExclude);
            }



           

            $announcements_list = $announcements_list->get()->sortByDesc('release_date')->take(6) ;

            return $announcements_list;
            
        } catch (Exception $e) {
            throw $e;
        }
    }

    

    public function increment_dashboard_index($request)
    {

        
//  dasdasdasd
        $date_time = Carbon::now()->toDateString();
        $main_dep_id =0;
        if(is_valid(auth()->user()->SubDepartmentID)){
            $main_dep_id = auth()->user()->direct_department_id();
        }
        try {
            $department =  EvoxDepartment::find(Auth::user()->department_id);
            $toExclude = Announcement::where('announcement_id' ,'!=' ,null)->pluck('announcement_id')->toArray();

        
            if($request->dep_id == "all" || $request->dep_id == null){

                $list_all = Announcement::latest()->where('set_all',1)->where(function ($query) use ($date_time) {
                    $query->where('release_date', '<=', $date_time);
                    $query->where('expiry_date', '>', $date_time);
                })
                
                ->where(function ($query)  {
                    $query->where('set_country_all',1)->orWhere("country_id", Auth::user()->country_id);
                    // $query;
                })
                ->get();

                $list_dep = $department->departments_announcements_presented()->latest()->where(function ($query) use ($date_time) {
                    $query->where('release_date', '<=', $date_time);
                    $query->where('expiry_date', '>', $date_time);
                })
                ->where(function ($query)  {
                    $query->where('set_country_all',1)->orWhere("country_id", Auth::user()->country_id);
                    // $query;
                })
                ->whereNotIn('id', $toExclude)
               // only 6 but we get 7 to check if there is a next (show)
                ->get();
                

                error_log($request->page);
                return $announcements_list = $list_all->merge($list_dep)->sortByDesc('release_date')->forPage($request->page, 3);

              
            }

            if( $request->dep_id != null  && is_numeric($request->dep_id)){
                // $department =  Department::find($request->dep_id);
                $announcements_list = Announcement::where("present_dep_id",$request->dep_id)->latest()->where(function ($query) use ($date_time) {
                    $query->where('release_date', '<=', $date_time);
                    $query->where('expiry_date', '>', $date_time);
                })
                ->where(function ($query)  {
                    $query->where('set_country_all',1)->orWhere("country_id", Auth::user()->country_id);
                    // $query;
                })
                ->whereNotIn('id', $toExclude);
            }



            // if ($request->category == "hr") {
            //     $announcements_list->where("category", "HR");
            // }
            // if ($request->category == "department") {
            //     $announcements_list->where("category", "Department");
            // }
            error_log("here222");

            $announcements_list = $announcements_list
            // only 6 but we get 7 to check if there is a next (show)
            ->get()->sortByDesc('release_date')->forPage($request->page, 3);

            return $announcements_list;
            
        } catch (Exception $e) {
            throw $e;
        }
    }




    public function handle_announcements_index()
    {

        try {


            $announcements_list =   Announcement::where('dep_id', auth()->user()->direct_department_id())->where("category", "Department")->latest()
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


        if (Auth::user()->isLevel("HR")) {
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
