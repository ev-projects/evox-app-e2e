<?php

namespace App\Modules\User\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class CountryResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array
     */
    public function toArray($request)
    {
        $main_info = array(
            'id' => $this->id,
            'country_id' => $this->country_id,
            'country_name' => $this->country_name,
            'alpha_two' => $this->alpha_two,
            'alpha_three' => $this->alpha_three
            
        );

        return $main_info;
    }
}
