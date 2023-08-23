<?php

namespace App\Modules\Payroll\Resources;


use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\DB;
use App\Modules\Payroll\Resources\DtrPunchLogResource;

class DtrPunchHistoryLogResources extends JsonResource
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
        
        $time_log = [];

        $user = get_authenticated_user( $this->user_id );
        # Get Punch history Logs For DTR
        $time_log=DtrPunchLogResource::collection($user->get_punch_history($this->date)->where("is_active", 1)->orderBy('date', 'asc')->get());

        
        if( ! is_null( $this->resource ) ) {
            $payroll_items = [];
            # Create Resource for Payroll Items
        
        $result = DB::table('drt_summary_report')
            
        ->select(DB::raw("((reg_rendered_hours + rd_rendered_hours + sh_rendered_hours + lh_rendered_hours + dlh_rendered_hours + dsh_rendered_hours + slh_rendered_hours) + IF(render_status=1,reg_rendered_hours_overlapp
        + rd_rendered_hours_overlapp + lh_rendered_hours_overlapp + sh_rendered_hours_overlapp + dlh_rendered_hours_overlapp + dsh_rendered_hours_overlapp + slh_rendered_hours_overlapp,0)) 
        - (reg_night_diff + rd_night_diff + sh_night_diff + lh_night_diff + dlh_night_diff + dsh_night_diff + slh_night_diff + IF(nigdiff_stauts=1,reg_night_diff_overlapp
        + rd_night_diff_overlapp + lh_night_diff_overlapp + sh_night_diff_overlapp + dlh_night_diff_overlapp + dsh_night_diff_overlapp + slh_night_diff_overlapp,0)) as rendered_hours,
        (reg_night_diff + rd_night_diff + sh_night_diff + lh_night_diff + dlh_night_diff + dsh_night_diff + slh_night_diff) + IF(nigdiff_stauts=1,reg_night_diff_overlapp
        + rd_night_diff_overlapp + lh_night_diff_overlapp + sh_night_diff_overlapp + dlh_night_diff_overlapp + dsh_night_diff_overlapp + slh_night_diff_overlapp,0) as night_diff,
        (reg_overtime + rd_overtime + sh_overtime + lh_overtime + dlh_overtime + dsh_overtime + slh_overtime)  as overtime,
        (reg_overtime_night_diff + rd_overtime_night_diff + sh_overtime_night_diff + lh_overtime_night_diff + dlh_overtime_night_diff + dsh_overtime_night_diff + slh_overtime_night_diff)  as overtime_night_diff"))
        ->where('login_date', '=' , $this->resource->date )
        ->where('user_id', '=' , $this->resource->user_id )->get();
        
        foreach( $result as  $key => $value){
            $payroll_items["rendered_hours"] = $value->rendered_hours > 0 ? seconds_to_time(round($value->rendered_hours * 3600),true):"";
            $payroll_items["night_diff"] = $value->night_diff > 0 ? seconds_to_time(round($value->night_diff * 3600),true):"";
            $payroll_items["overtime"] = $value->overtime > 0 ? seconds_to_time(round($value->overtime * 3600),true):"";
            $payroll_items["overtime_night_diff"] = $value->overtime_night_diff > 0 ? seconds_to_time(round($value->overtime_night_diff * 3600),true):"";
        }

            $result = array(
                'user_id'=> $this->user_id,
                'date' =>  $this->date,
                'time_log' => $time_log,
                'payroll_items' => $payroll_items,
            );
        }
        
        return $result;
    }
    
}
