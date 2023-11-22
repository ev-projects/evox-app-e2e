<?php

namespace App\Modules\Payroll\Resources;
use Carbon\Carbon;
use Illuminate\Http\Resources\Json\JsonResource;
use App\Modules\User\Models\User;
class DtrHalfDayMismacth extends JsonResource
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
        $owner = User::where('users.id','=',$this->id)->first();
        if( ! is_null( $this->resource ) ) {
            
            $result =  array_merge( 
                array(
                    'emp_no' => $this->Employee_Number,
                    'user_name' => $this->Employee_Name,
                    'department_name' => $this->Department,
                    'date' => $this->date,
                    'time_in' => timestamp_to_datetime( $this->time_in, true ,  $owner),
                    'time_out' => timestamp_to_datetime( $this->time_out, true ,  $owner),
                    'type' => $this->type,
                    'amount' => $this->amount,
                    'status' => $this->status,
                    'employee_note' => $this->employee_note,
                    'created_at' => $this->created_at,
                    'updated_at' => $this->updated_at,
                ), 
            );
        }
        return $result;
    }
}
