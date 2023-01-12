<?php

namespace App\Modules\Coe\Resources;

use Carbon\Carbon;
use Illuminate\Http\Resources\Json\JsonResource;

class COEResource extends JsonResource
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
            'user_id' => $this->user_id,
            'purpose' => $this->purpose,
            'generated_at' => Carbon::parse($this->created_at)->format('Y-m-d H:i:s')
        );

        return $main_info;
    }
}
