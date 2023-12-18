<?php

namespace App\Modules\Department\Resources;

use Illuminate\Support\Facades\Storage;
use App\Modules\User\Resources\UserListResource;
use Illuminate\Http\Resources\Json\JsonResource;
use Carbon\Carbon;

class AnnouncementResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array
     */
    public function toArray($request)
    {

      
            // $endDate  = Carbon::now();
            // $startDate = Carbon::now()->subDays(3);
            // $dateToCheck = Carbon::parse( $this->release_date);

            $startDate  = Carbon::parse($this->release_date);
            $endDate = Carbon::parse($this->release_date)->addDays(3);
            $dateToCheck = Carbon::now();
                

        $result = null;
    
        if( ! is_null( $this->resource ) ) {
            $result = array(
                'id' => $this->id,
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
                'selectedDepartments'=> $this->set_all == 0 ? DepartmentLabelResource::collection( $this->announcement_clones_departments()):null,
                'is_expired'=> $this->is_expired(),
                'is_new' =>  $dateToCheck->between($startDate, $endDate),
              
                'created_at' => $this->created_at->format('Y-m-d h:m:s'),

        
            );
        }

        return $result;
    }
}
