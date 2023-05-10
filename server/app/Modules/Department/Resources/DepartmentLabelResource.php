<?php

namespace App\Modules\Department\Resources;

use Illuminate\Support\Facades\Storage;
use App\Modules\User\Resources\UserListResource;
use Illuminate\Http\Resources\Json\JsonResource;

class DepartmentLabelResource extends JsonResource
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
                'label' => $this->department_name,
                'value' => $this->id,
            );
        }

        return $result;
    }
}
