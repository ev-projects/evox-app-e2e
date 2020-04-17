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


            foreach ($dtr_model->payroll_items()->get() as $payroll_item) {
                
                 # If the Item is undertime and Late
                 if($payroll_item['undertime']||$payroll_item['late']){
                    $total['reg'][$payroll_item['item']] =  isset($total[$payroll_item['item']])?$total[$payroll_item['item']]+(int) $payroll_item['value']:(int) $payroll_item['value'];
                    continue;
                 }

                 # Separate the dtr that is overlap and that is not

                 if($payroll_item['tag']==null){
                    # Get the Holiday 
                    if($current_day_type==null){
                        $current_day_type = $this->get_holiday_type($dtr_model);
                    }

                    $total[$current_day_type][$payroll_item['item']] =  isset($total[$payroll_item['item']])?$total[$payroll_item['item']]+(int) $payroll_item['value']:(int) $payroll_item['value'];
                 
                 # This condition is for the overlapped
                 }else{
                    # Get the Next Day Holiday 
                    if($next_day_type==null){
                        $next_dtr_model = Dtr::find($dtr_model->next_dtr()->get()[0]['id']);
                        $next_day_type = $this->get_holiday_type($next_dtr_model);
                    }


                    $total[$next_day_type][$payroll_item['item']] =  isset($total[$payroll_item['item']])?$total[$payroll_item['item']]+(int) $payroll_item['value']:(int) $payroll_item['value'];
                 }

            }
        }
            return $total;

    }


    public function get_holiday_type($dtr_model){
        $holidays = $dtr_model->holidays()->get();
        if(count($holidays)>0){
            $type = $holidays[0]["type"];
        }else{
            $type = 'reg';
        }     
        return $type;         
    }

}
