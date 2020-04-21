<?php

namespace App\Modules\Payroll\Models;


use App\Modules\User\Models\User;
use App\Modules\Payroll\Models\Dtr;

class DtrSummary
{  
    # Instance of the DTR
    private $dtr;
    private $total = array();

    function __construct($dtr){
        $this->total = $dtr;
    }

    public function get_summary(){
        $total = array();
        foreach ($this->total  as $key => $value) {
            $dtr_model = Dtr::find( $value['id']);
            $current_day_type = null;
            $next_day_type = null;
            $previous_dtr_model = null;

            $payroll_items = $dtr_model->payroll_items()->get() ;
            foreach ($payroll_items as $payroll_item) {
                 # If the Item is undertime and Late
                 if($payroll_item['undertime']||$payroll_item['late']){
                    $total['regular'][$payroll_item['item']] =  isset($total[$payroll_item['item']])?$total[$payroll_item['item']]+(int) $payroll_item['value']:(int) $payroll_item['value'];
                    continue;
                 }
                 # Separate the dtr that is overlap and that is not
                 if($payroll_item['tag']==null){
                    # Get the Holiday 
                    if($current_day_type==null){
                        $current_day_type = $dtr_model->get_holiday();
                    }
                    $total[$current_day_type][$payroll_item['item']] =  isset($total[$payroll_item['item']])?$total[$payroll_item['item']]+(int) $payroll_item['value']:(int) $payroll_item['value'];
                 # This condition is for the overlapped
                 }elseif ($payroll_item['tag']=='overlapped'){
                    # Get the Next Day Holiday 
                    if($next_day_type==null){
                        $next_dtr_model = Dtr::find($dtr_model->next_dtr()->get()[0]['id']);
                        $next_day_type = $next_dtr_model->get_holiday();
                    }
                    $total[$next_day_type][$payroll_item['item']] =  isset($total[$payroll_item['item']])?$total[$payroll_item['item']]+(int) $payroll_item['value']:(int) $payroll_item['value'];
                 
                 }elseif ($payroll_item['tag']=='underlapped'){
                    # Get the Next Day Holiday 
                    if($previous_dtr_model==null){
                        $previous_dtr_model = Dtr::find($dtr_model->previous_dtr()->get()[0]['id']);
                        $previous_dtr_model = $previous_dtr_model->get_holiday();
                    }
                    $total[$previous_dtr_model][$payroll_item['item']] =  isset($total[$payroll_item['item']])?$total[$payroll_item['item']]+(int) $payroll_item['value']:(int) $payroll_item['value'];
                 }
            }
        }
        
    # Reduction of nightdifferential to rendered hours
    foreach ($total as  $key => $value) {
        $total[$key]['rendered_hours'] = $total[$key]['rendered_hours'] - $total[$key]['night_diff'];
    }
        return $total;
    }

}
