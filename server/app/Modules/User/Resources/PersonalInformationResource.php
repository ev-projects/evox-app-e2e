<?php

namespace App\Modules\User\Resources;

use Illuminate\Http\Resources\Json\JsonResource;
use Carbon\Carbon;


class PersonalInformationResource extends JsonResource
{

    public function __construct($resource)
    {
        // Ensure you call the parent constructor
        parent::__construct($resource);
        
    }
    /**
     * Transform the resource into an array.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array
     */
    public function toArray($request){    
        
        $result = null;

        if( ! is_null( $this->resource ) ) {
            $result = array(
                'mobile_phone'  =>  $this->mobilePhone,
                'job_title'  =>  $this->jobTitle,
            );
        }
        
        return $result;
    }
}
