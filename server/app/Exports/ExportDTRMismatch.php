<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
class ExportDTRMismatch implements FromCollection, WithHeadings
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
            
            "Department",
            
            "Date",
            
            "Time IN",
            
            "Time Out",
            
            "Leave Type",
            
            "Amount",
            
            "Status",
            
            "Employee Note",

            "Created at",

            "Updated at"
        ];

    }
}
