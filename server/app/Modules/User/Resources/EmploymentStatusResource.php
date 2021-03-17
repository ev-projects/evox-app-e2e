<?php

namespace App\Modules\User\Resources;

use Illuminate\Http\Resources\Json\JsonResource;
use Carbon\Carbon;


class EmploymentStatusResource extends JsonResource
{
    private $employment_status;

    public function __construct($resource)
    {
        // Ensure you call the parent constructor
        parent::__construct($resource);
        $this->employment_status = $resource;
        
    }
    /**
     * Transform the resource into an array.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array
     */
    public function toArray($request){    
        
        $job_info = [];
        if( is_valid( $this->employment_status ) ) {
            foreach ( $this->employment_status as $array) {
                array_push($job_info, [
                    "date" => $array->date,
                    "emp_status" => $array->employmentStatus,
                    "comment" => $array->comment
                ]);
            }
        }
        return $job_info;
    }
}

