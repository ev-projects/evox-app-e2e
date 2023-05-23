<?php

namespace App\Modules\Payroll\Resources;

use Carbon\Carbon;
use Illuminate\Http\Resources\Json\JsonResource;

class AnniversaryResources extends JsonResource
{
    private $employment_status;

    public function __construct($resource)
    {
        // Ensure you call the parent constructor
        parent::__construct($resource);
        $this->anniversary_regularization = $resource;
        
    }
    /**
     * Transform the resource into an array.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array
     */
    public function toArray($request){    
        
        $birthday_anniv = [];
        foreach ( $this->anniversary_regularization as $array) {
            $date = new Carbon($array->date);

            switch ($array->type) {
                case "regularization":
                    array_push($birthday_anniv, [
                        "date" => $date->format('F d'),
                        "name" => $array->last_name.', '.$array->first_name ,
                        "display" => "Regularization",
                        "type" =>  $array->type
                    ]);
                  break;
                case "anniversary":
                    $year =  Carbon::now()->year - $date->year;
                    // dump($year." ".$array->last_name);
                    array_push($birthday_anniv, [
                        "date" => $date->format('F d'),
                        "name" => $array->last_name.', '.$array->first_name ,
                        "display" =>  $year == 0 ? "EV Rookies" : ordinal($year) .' Anniversary',
                        "type" =>  $array->type
                    ]);
                  break;
                case "birthdate":
                    array_push($birthday_anniv, [
                        "date" => $date->format('F d'),
                        "name" => $array->last_name.', '.$array->first_name ,
                        "display" => "Birthday",
                        "type" =>  $array->type
                    ]);
                break;
              }

        }
        return $birthday_anniv;
    }
}

