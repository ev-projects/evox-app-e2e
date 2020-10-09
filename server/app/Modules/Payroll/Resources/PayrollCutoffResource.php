<?php

namespace App\Modules\Payroll\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class PayrollCutoffResource extends JsonResource
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
                'start_date' => ( $this->start_date != null )? $this->start_date : null,
                'end_date' =>   ( $this->end_date != null )? $this->end_date : null
            );
        }

        return $result;
    }
}
