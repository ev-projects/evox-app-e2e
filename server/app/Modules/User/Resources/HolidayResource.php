<?php

namespace App\Modules\User\Resources;

use Illuminate\Http\Resources\Json\JsonResource;
use Carbon\Carbon;


class HolidayResource extends JsonResource
{

    public function __construct($resource)
    {
        // Ensure you call the parent constructor
        parent::__construct($resource);
        $this->holiday = $resource;
    }
    /**
     * Transform the resource into an array.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array
     */
    public function toArray($request){    
        
        $result = null;

        if( ! is_null( $this->holiday ) ) {

            foreach ( $this->holiday as $array) {

                $sql_date = strtotime( $array->date  );
                $date = date( 'F d', $sql_date );

                $result[] = array(
                    'holiday_name'  =>  $array->name,
                    'holiday_date'  =>  $date,
                    'holiday_type'  =>  $array->type,
                );
            }
            
        }
        
        return $result;
    }
}
