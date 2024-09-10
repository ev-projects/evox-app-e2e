<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\FromCollection;

class TimeoffAllocationExport implements FromCollection,  WithHeadings
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

            "Employee Number",

            "Employee Name",
            
            "TimeOff Type",
            
            "Description",
            
            "Duration",
            
            "Valid From",
            
            "Valid To",
            
            "Remaining Day",
            
            "Allocation Type"

        ];

    }
}
