<?php

namespace App\Modules\Report\Resources;

use Carbon\Carbon;
use Illuminate\Http\Resources\Json\JsonResource;

class NewDtrSummaryResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array
     */
  

    public function toArray($request)
    {
        if( ! is_null( $this->resource ) ) {
        $result =  
            array(
                'Employee_Name' => $this->Employee_Name,
         
                
            )
         
        ;
            }
        return  $result;
    }
}
