<?php

namespace App\Modules\User\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class RoleResource extends JsonResource
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
            'name' => $this->name,
            'permissions' => PermissionResource::collection( $this->permissions->sortBy('name') )
        );

        return $main_info;
    }
}
