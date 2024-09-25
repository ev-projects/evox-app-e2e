<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\FromCollection;

class ExportDTRMultiLogsSummary implements FromCollection,  WithHeadings
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
            
            "Date",
            
            "Total_Hours",
            
            "Rendered_Hr",
            
            "Night_Diff",
            
            "Project_Name",

        ];

    }
}
