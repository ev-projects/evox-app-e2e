<?php

namespace App\Modules\Department\Resources;

use App\Modules\User\Resources\UserListResource;
use Illuminate\Http\Resources\Json\JsonResource;

class DepartmentResource extends JsonResource
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
                'description' => $this->description,
                'department_handlers'  => UserListResource::collection($this->department_handlers()->get())
            );
        }

        return $result;
    }
}
