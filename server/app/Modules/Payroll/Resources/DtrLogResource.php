<?php

namespace App\Modules\Payroll\Resources;

use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\DB;
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
        // dump("test");
        if( ! is_null( $this->resource ) ) {
            // Fetch the User related from the DTR
            $user = $this->user()->first();

            // Fetch the Department related from the User
            $department = $user->department()->first();
            
            # Create Resource for Payroll Items
            $payroll_items = [];
            // foreach( $this->payroll_items()->get() as  $key => $payroll_item){
                
            //     // Sum the Payroll items
            //     if(isset($payroll_items[ $payroll_item->item ])){
            //         $payroll_items[ $payroll_item->item ] += $payroll_item->value;
            //     }else{
            //         $payroll_items[ $payroll_item->item] = $payroll_item->value;
            //     }
            // }
            $result = DB::table('drt_summary_report')
            
            ->select(DB::raw("unpaid_leave as ul,reg_late as late,reg_undertime as undertime,
            ((reg_rendered_hours + rd_rendered_hours + sh_rendered_hours + lh_rendered_hours + dlh_rendered_hours + dsh_rendered_hours + slh_rendered_hours) + IF(nigdiff_stauts=1,reg_rendered_hours_overlapp
            + rd_rendered_hours_overlapp + lh_rendered_hours_overlapp + sh_rendered_hours_overlapp + dlh_rendered_hours_overlapp + dsh_rendered_hours_overlapp + slh_rendered_hours_overlapp,0)) 
            - (reg_night_diff + rd_night_diff + sh_night_diff + lh_night_diff + dlh_night_diff + dsh_night_diff + slh_night_diff + IF(nigdiff_stauts=1,reg_night_diff_overlapp
            + rd_night_diff_overlapp + lh_night_diff_overlapp + sh_night_diff_overlapp + dlh_night_diff_overlapp + dsh_night_diff_overlapp + slh_night_diff_overlapp,0)) as rendered_hours,
            (reg_night_diff + rd_night_diff + sh_night_diff + lh_night_diff + dlh_night_diff + dsh_night_diff + slh_night_diff) + IF(nigdiff_stauts=1,reg_night_diff_overlapp
            + rd_night_diff_overlapp + lh_night_diff_overlapp + sh_night_diff_overlapp + dlh_night_diff_overlapp + dsh_night_diff_overlapp + slh_night_diff_overlapp,0) as night_diff,
            (reg_overtime + rd_overtime + sh_overtime + lh_overtime + dlh_overtime + dsh_overtime + slh_overtime)  as overtime,
            (reg_overtime_night_diff + rd_overtime_night_diff + sh_overtime_night_diff + lh_overtime_night_diff + dlh_overtime_night_diff + dsh_overtime_night_diff + slh_overtime_night_diff)  as overtime_night_diff"))
                ->where('login_date', '=' , $this->resource->date )
                ->where('user_id','=',$this->resource->user_id)->get();

            # Convert the time to seconds to 00:00:00 format
            // foreach( $payroll_items as  $key => $value){
            //     $payroll_items[$key] = seconds_to_time($value,true);
            // }
            foreach( $result as  $key => $value){
                $payroll_items["late"] = $value->late > 0 ? seconds_to_time($value->late * 3600,true):"";
                $payroll_items["undertime"] = $value->undertime > 0 ? seconds_to_time($value->undertime * 3600,true):"";
                $payroll_items["overtime"] = $value->overtime > 0 ? seconds_to_time($value->overtime * 3600,true):"";
                $payroll_items["overtime_night_diff"] = $value->overtime_night_diff > 0 ? seconds_to_time($value->overtime_night_diff * 3600,true):"";
                $payroll_items["night_diff"] = $value->night_diff > 0 ? seconds_to_time($value->night_diff * 3600,true):"";
                $payroll_items[ get_constant('PAYROLL_ITEMS.unpaid_leave')  ] = $value->ul > 0 ? round($value->ul):"";
                $payroll_items["rendered_hours"] = $value->rendered_hours > 0 ? seconds_to_time($value->rendered_hours * 3600,true):"";
            }

            $leaves = $this->leaves()->get();
            
            // if( $this->isAbsent() ){
            //     $payroll_items[ get_constant('PAYROLL_ITEMS.unpaid_leave')  ] =  1;
            // }else
            if( $this->onLeave()->count() > 0 )  {
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
                
                'start_flexy_datetime' => timestamp_to_time( $this->start_flexy_datetime ),
                'end_flexy_datetime' => timestamp_to_time( $this->end_flexy_datetime ),
                'break_time' => is_valid( $this->break_time ) && $this->break_time > 0 ? seconds_to_time( $this->break_time ) : null,
                'is_rest_day' => $this->is_rest_day,
                'department' => ( is_valid( $department ) ? $department->getCompleteName() : null ),
                'full_name' => $user->getFullName(),
                'payroll_items' => $payroll_items,
                'timezone' =>  $user->country_zone()->country_time_zone,
                'user_POV' => [

                    'time_in' => timestamp_to_time( $this->time_in , true ,  $user),
                    'time_out' => timestamp_to_time( $this->time_out , true ,  $user),
                    'start_datetime' => timestamp_to_time( $this->start_datetime , true ,  $user),
                    'end_datetime' => timestamp_to_time( $this->end_datetime , true ,  $user),
                 
                    'start_flexy_datetime' => timestamp_to_time( $this->start_flexy_datetime , true ,  $user),
                    'end_flexy_datetime' => timestamp_to_time( $this->end_flexy_datetime , true ,  $user),
                ],
            );
        }
        return $result;
    }
}
