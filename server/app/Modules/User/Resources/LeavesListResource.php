<?php

namespace App\Modules\User\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class LeavesListResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array
     */
    public function toArray($request)
    {
        $dtr = $this->dtr()->first();
        $main_info = array(
            'id' => $this->id,
            'date'  => $dtr->date,
            'type' => $this->type,
            'status' => $this->status,
            'amount' => $this->amount,
            'employee_note' => $this->employee_note,
        );

        return $main_info;
    }
}
