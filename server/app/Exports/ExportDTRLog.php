<?php

namespace App\Exports;

use Illuminate\Support\Facades\Auth;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\FromCollection;

class ExportDTRLog implements FromCollection,  WithHeadings, WithMapping
{

    protected $data;
    protected $toggle_pov;
    protected $timezone;
    public function __construct($data, $toggle_pov, $timezone)
    {
        $this->data = $data;
        $this->toggle_pov = $toggle_pov;
        $this->timezone = $timezone;
    }

  


    /**
    * @return \Illuminate\Support\Collection
    */
    public function collection()
    {
        // dd($this->data[0]->user()->first());
        return collect($this->data);
    }

    public function map($data): array
    {
        // This example will return 3 rows.
        // First row will have 2 column, the next 2 will have 1 column
        // dump($data);
        return [
            
                $data["emp_num"],
                $data["full_name"],
                $data["department"],
                $data["date"],
                count($data["holidays"]) > 0 ? $data["holidays"][0]['type'] : null,
                count($data["holidays"]) > 0 ? $data["holidays"][0]['name'] : null,
                $this->toggle_pov ? $this->timezone : $data["timezone"],
                $this->toggle_pov ? $data["time_in"] : $data['user_POV']["time_in"] ,
                $this->toggle_pov ? $data["time_out"] : $data['user_POV']["time_out"],
                $this->toggle_pov ? $data["start_datetime"] : $data['user_POV']["start_datetime"] ,
                $this->toggle_pov ? $data["end_datetime"] : $data['user_POV']["end_datetime"],
                $this->toggle_pov ? $data["start_flexy_datetime"] : $data['user_POV']["start_flexy_datetime"],
                $this->toggle_pov ? $data["end_flexy_datetime"] : $data['user_POV']["end_flexy_datetime"],
                $data["break_time"],
                isset($data["payroll_items"]["rendered_hours"])? $data["payroll_items"]["rendered_hours"] : null,
                isset($data["payroll_items"]["sl"]) ? $data["payroll_items"]["sl"]: null,
                isset($data["payroll_items"]["vl"]) ? $data["payroll_items"]["vl"]: null,
                isset($data["payroll_items"]["ul"]) ?$data["payroll_items"]["ul"] : null,
                isset($data["payroll_items"]["other_leave"]) ?$data["payroll_items"]["other_leave"] : null,
                isset($data["payroll_items"]["late"]) ? $data["payroll_items"]["late"]: null,
                isset($data["payroll_items"]["undertime"]) ? $data["payroll_items"]["undertime"]: null,
                isset($data["payroll_items"]["night_diff"]) ? $data["payroll_items"]["night_diff"]: null,
                isset($data["payroll_items"]["overtime"]) ? $data["payroll_items"]["overtime"]: null,
                isset($data["payroll_items"]["overtime_night_diff"]) ? $data["payroll_items"]["overtime_night_diff"]: null,
                // Date::dateTimeToExcel($data->created_at),
            
        
        ];
    }

    public function headings() :array

    {

        return [

            "ID",

            "EMPLOYEE Name",
            
            "DEP",

            "DATE",

            "HOL TYPE",

            "HOLIDAY",

            "POV",

            "TIME_IN",

            "TIME_OUT",

            "ON_DUTY",

            "OFF_DUTY",

            "ON_FLEX_DUTY",

            "OFF_FLEX_DUTY",

            "BREAK",

            "RENDERED_TIME",

            "SL",

            "VL",

            "UL",

            "OTHER LEAVE",

            "LATE",

            "UNDERTIME",

            "ND",

            "OT", 

            "OT_ND"







        ];

    }
}
