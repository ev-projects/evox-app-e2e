<?php

namespace App\Modules\User\Resources;

use Illuminate\Http\Resources\Json\JsonResource;
use Carbon\Carbon;


class JobInformationResource extends JsonResource
{
    private $job_info;

    public function __construct($resource)
    {
        // Ensure you call the parent constructor
        parent::__construct($resource);
        $this->job_info = $resource;
        
    }
    /**
     * Transform the resource into an array.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array
     */
    public function toArray($request){    
        
        $job_info = [];
        foreach ( $this->job_info as $array) {

            if($array->date!= "0000-00-00"){
                array_push($job_info, [
                    "date" => $array->date,
                    "location" => $array->location,
                    "department" => $array->department,
                    "jobTitle" => $array->jobTitle,
                    "reportsTo" => $array->reportsTo
                ]);
            }
        }
        return $job_info;
    }
}
