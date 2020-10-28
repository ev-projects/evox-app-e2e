<?php

namespace App\Modules\Payroll\Resources;

use Carbon\Carbon;
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
                'end_date' =>   ( $this->end_date != null )? $this->end_date : null,
                'year' => Carbon::parse($this->end_date)->format('Y'),
                'month' => Carbon::parse($this->end_date)->format('m'),
                'month_label' => Carbon::parse($this->end_date)->format('F')
            );
        }

        return $result;
    }
}
