<?php

namespace App\Modules\Payroll\Resources;

use Illuminate\Http\Resources\Json\ResourceCollection;

class DtrLogResourceCollection extends ResourceCollection
{
    /**
     * Transform the resource into an array.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array
     */
    public function toArray($request)
    {   
        $result = [
            'data' => $this->collection
        ];
        
        if($this->resource instanceof \Illuminate\Pagination\LengthAwarePaginator) {

            $result['pagination'] = [
                'total' => $this->total(),
                'count' => $this->count(),
                'per_page' => $this->perPage(),
                'current_page' => $this->currentPage(),
                'last_page' => $this->lastPage()
            ];
        }  

        return $result;
    }
}
