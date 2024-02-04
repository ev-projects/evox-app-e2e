<?php

namespace App\Modules\Department\Resources;

use Carbon\Carbon;
use Illuminate\Support\Facades\Storage;
use App\Modules\Department\Models\Announcement;
use App\Modules\User\Resources\UserListResource;
use Illuminate\Http\Resources\Json\JsonResource;

class AnnouncementStrictResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array
     */
    public function toArray($request)
    {
        
        $startDate  = Carbon::parse($this->release_date);
        $endDate = Carbon::parse($this->release_date)->addDays(3);
        $dateToCheck = Carbon::now();

        $result = null;

        $owner = [];
        if($this->created_by !=0){
            $user = $this->creator();

            $department = $user->department()->first();

            $owner = [
                'id' => $user->id,
                'emp_num' => $user->emp_num,
                'department' => ( is_valid( $department ) ? $department->getCompleteName() : null ),
                'first_name' => $user->first_name,
                'middle_name' => $user->middle_name,
                'last_name' => $user->last_name,
                'is_active' => $user->is_active,
                'job_title' => $user->job_title,
                'email' => $user->email,
                'full_name' => $user->getFullName(),
            ];
        }

                $depList = NULL;
                $depList = $this->set_all == 0 ? DepartmentLabelResource::collection( $this->announcement_clones_departments()): null;
                if($this->set_all == 0 && $this->present_dep_id != null&& $this->announcement_id != null){
                    $depList = DepartmentLabelResource::collection( Announcement::find($this->announcement_id)->announcement_clones_departments());

                }

            $result = null;

            if( ! is_null( $this->resource ) ) {
            $result = array(
                'id' =>  $this->announcement_id == null? $this->id :  $this->announcement_id,
                'title' => $this->title,
                'headline' => $this->headline,
                'thumbnail' => $this->thumbnail != null ? env('ASSET_URL').Storage::url($this->thumbnail): null,
                'content' => $this->content,
                'category' => $this->category,
                'log_date' => $this->log_date,
                'release_date' => $this->release_date,
                'expiry_date' => $this->expiry_date,
                'link' => $this->link,
                'on_link' => $this->on_link,
                'status' => $this->status,
                'exposure_level' => $this->exposure_level,
                'dep' => $this->dep_id != null? $this->department() : $this->present_department(),
                'set_all' => $this->set_all,
                'set_country_all' => $this->set_country_all,
                'country_id' => $this->country_id,
                'selectedDepartments'=>  $depList,
                'is_expired'=> $this->is_expired(),

                'creator' => $owner,

                'is_new' =>  $dateToCheck->between($startDate, $endDate),

                
              
                'created_at' => $this->created_at->format('Y-m-d h:m:s'),

        
            );
        }

        return $result;
    }
}
