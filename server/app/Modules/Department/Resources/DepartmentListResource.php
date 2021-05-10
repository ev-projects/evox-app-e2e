<?php

namespace App\Modules\Department\Resources;

use App\Modules\User\Resources\UserListResource;
use Illuminate\Http\Resources\Json\JsonResource;

class DepartmentListResource extends JsonResource
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
                'department_name' => $this->department_name,
                'description' => $this->description
            );
        }

        return $result;
    }
}
