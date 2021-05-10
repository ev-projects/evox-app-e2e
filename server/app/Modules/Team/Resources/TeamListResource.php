<?php

namespace App\Modules\Team\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class TeamListResource extends JsonResource
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
                'name' => $this->name,
                'description' => $this->description
            );
        }

        return $result;
    }
}
