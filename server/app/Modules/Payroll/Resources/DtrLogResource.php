<?php

namespace App\Modules\Payroll\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class DtrLogResource extends JsonResource
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
            // Fetch the User related from the DTR
            $user = $this->user()->first();

            // Fetch the Department related from the User
            $department = $user->department()->first();
            
            # Create Resource for Payroll Items
            $payroll_items = [];
            foreach( $this->payroll_items()->get() as  $key => $payroll_item){
                
                // Sum the Payroll items
                if(isset($payroll_items[ $payroll_item->item ])){
                    $payroll_items[ $payroll_item->item ] += $payroll_item->value;
                }else{
                    $payroll_items[ $payroll_item->item] = $payroll_item->value;
                }
            }

            # Convert the time to seconds to 00:00:00 format
            foreach( $payroll_items as  $key => $value){
                $payroll_items[$key] = seconds_to_time($value,true);
            }

            $leaves = $this->leaves()->get();
            
            if( $this->isAbsent() ){
                $payroll_items[ get_constant('PAYROLL_ITEMS.unpaid_leave')  ] =  1;
            }elseif( $this->on_leave()->count() > 0 )  {
                $payroll_items[ get_constant('PAYROLL_ITEMS.'. text_to_slug( $leaves->first()->type ))  ] =  $leaves->first()->amount;
            }

            $result = array(
                'id' => $this->id,
                'emp_num' => $user->emp_num,
                'user_id' => $this->user_id,
                'date' => $this->date,
                'time_in' => timestamp_to_time( $this->time_in ),
                'time_out' => timestamp_to_time( $this->time_out ),
                'start_datetime' => timestamp_to_time( $this->start_datetime ),
                'end_datetime' => timestamp_to_time( $this->end_datetime ),
                'end_datetime' => timestamp_to_time( $this->end_datetime ),
                'start_flexy_datetime' => timestamp_to_time( $this->start_flexy_datetime ),
                'end_flexy_datetime' => timestamp_to_time( $this->end_flexy_datetime ),
                'break_time' => is_valid( $this->break_time ) && $this->break_time > 0 ? seconds_to_time( $this->break_time ) : null,
                'is_rest_day' => $this->is_rest_day,
                'department' => ( is_valid( $department ) ? $department->getCompleteName() : null ),
                'full_name' => $user->getFullName(),
                'payroll_items' => $payroll_items
            );
        }
        return $result;
    }
}
