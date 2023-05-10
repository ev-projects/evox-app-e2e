<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\FromCollection;

class NewExportDTRSummary implements FromCollection,  WithHeadings
{

    protected $data;
    public function __construct($data)

    {

        $this->data = $data;

    }

  


    /**
    * @return \Illuminate\Support\Collection
    */
    public function collection()
    {
        return collect($this->data);
    }

    public function headings() :array

    {

        return [

            "Employee Name",

            "Employee Number",
            
            "Department",
            
            "ul",
            
            "vl_sl",
            
            "reg_late",
            
            "reg_under_time",
            
            "reg_rendered_hr",
            
            "reg_night_dif",
            
            "reg_over_time",
            
            "reg_over_night_dif",
            
            "rd_rendered_hr",
            
            "rd_night_dif",
            
            "rd_over_time",
            
            "rd_over_night_dif",
            
            "lh_rendered_hr",
            
            "lh_night_dif",
            
            "lh_over_time",
            
            "lh_over_night_dif",
            
            "sh_rendered_hr",
            
            "sh_night_dif",
            
            "sh_over_time",
            
            "sh_over_night_dif",
            
            "dsh_rendered_hr",
            
            "dsh_night_dif",
            
            "dsh_over_time",
            
            "dsh_over_night_dif",
            
            "dlh_rendered_hr",
            
            "dlh_night_dif",
            
            "dlh_over_time",
            
            "dlh_over_night_dif",
            
            "slh_rendered_hr",
            
            "slh_night_dif",
            
            "slh_over_time",
            
            "slh_over_night_dif",

        ];

    }
}
