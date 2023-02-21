<?php

namespace App\Modules\Department\Resources;

use Illuminate\Support\Facades\Storage;
use App\Modules\User\Resources\UserListResource;
use Illuminate\Http\Resources\Json\JsonResource;

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
        $result = null;

        if( ! is_null( $this->resource ) ) {
            $result = array(
                'id' => $this->id,
                'title' => $this->title,
                'headline' => $this->headline,
                'thumbnail' => $this->thumbnail != null ? env('APP_URL').Storage::url($this->thumbnail): null,
                'content' => $this->content,
                'category' => $this->category,
                'log_date' => $this->log_date,
                'release_date' => $this->release_date,
                'link' => $this->link,
                'status' => $this->status,
                'exposure_level' => $this->exposure_level,
                'dep_id' => $this->dep_id,
              
              
                'created_at' => $this->created_at->format('Y-m-d')
            );
        }

        return $result;
    }
}
