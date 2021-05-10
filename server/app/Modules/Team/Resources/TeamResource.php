<?php

namespace App\Modules\Team\Resources;

use App\Modules\User\Resources\UserListResource;
use Illuminate\Http\Resources\Json\JsonResource;

class TeamResource extends JsonResource
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
                'description' => $this->description,
                'department_id' => $this->department_id,
                'team_handlers'  => UserListResource::collection( $this->team_handlers()->orderBy('first_name', 'asc')
                                                                                        ->orderBy('last_name', 'asc')
                                                                                        ->get()),
                'team_users'  => UserListResource::collection( $this->team_users()->orderBy('first_name', 'asc')
                                                                        ->orderBy('last_name', 'asc')
                                                                        ->get())
            );
        }

        return $result;
    }
}
