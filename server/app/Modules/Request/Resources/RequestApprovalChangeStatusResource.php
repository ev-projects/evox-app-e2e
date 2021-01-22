<?php

namespace App\Modules\Request\Resources;

use App\Modules\Request\Models\AlterLog;
use App\Modules\Request\Models\ChangeSchedule;
use App\Modules\Request\Models\Overtime;
use App\Modules\Request\Models\RestDayWork;
use App\Modules\Request\Resources\AlterLogResource;
use App\Modules\Request\Resources\ChangeScheduleResource;
use App\Modules\Request\Resources\OvertimeResource;
use App\Modules\Request\Resources\RestDayWorkResource;
use Illuminate\Http\Resources\Json\JsonResource;

class RequestApprovalChangeStatusResource extends JsonResource
{    
    private $is_changed;

    public function __construct($resource, $is_changed = true)
    {
        // Ensure you call the parent constructor
        parent::__construct($resource);
        $this->resource = $resource;
        
        $this->is_changed = $is_changed;
    }
    /**
     * Transform the resource into an array.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array
     */
    public function toArray($request)
    {        
        if( ! is_null( $this->resource ) ) {

            $result = [
                'request'    => null,
                'is_changed' => $this->is_changed,
            ];
            if( $this->resource instanceof Overtime ){
                $result['request'] = new OvertimeResource( $this->resource );

            } elseif( $this->resource instanceof RestDayWork ){
                $result['request'] = new RestDayWorkResource( $this->resource );

            }elseif( $this->resource instanceof AlterLog ){
                $result['request'] = new AlterLogResource( $this->resource );

            }elseif( $this->resource instanceof ChangeSchedule ){
                $result['request'] = new ChangeScheduleResource( $this->resource );
            }
        }

        return $result;
    }
}
