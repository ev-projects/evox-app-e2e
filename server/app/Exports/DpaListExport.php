<?php

namespace App\Exports;

use App\Modules\User\Models\User;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Illuminate\Database\Eloquent\Collection;
use App\Modules\User\Repositories\UserRepository;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Events\AfterSheet;

class DpaListExport implements FromCollection,WithHeadings
{
    /**
    * @return \Illuminate\Support\Collection
    */
    public $data;


    public function collection()
    {
        $summary = Collection::make();

        foreach($this->data as $dpa) {
            # General Information
            $row = array();
            $row['emp_num'] = $dpa->emp_num;
            $row['name'] =  $dpa->getFullName( 3 );
            $row['department'] = $dpa->department()->first()->getCompleteName();
            $row['dpa_ticked_at'] = date($dpa->dpa_ticked_at);
            $row['is_active'] = $dpa->is_active == 1?'Active':'Inactive';
            $summary->push(  $row );
        }

        
        return $summary;


    }


    public function headings(): array
    {
        # Default Header

        $headers = [
            'Emp #',
            'Name',
            'Department',
            'Date Submitted',
            'Status',
        ];

  
        return $headers;

      



    }

      
    /**
     * Write code on Method
     *
     * @return response()
     */
    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function(AfterSheet $event) {
   
                $sheet = $event->sheet->getDelegate();

                $cols = array_keys($sheet->getColumnDimensions());
                foreach ($cols as $col) {
                    $sheet->getColumnDimension($col)->setAutoSize(true);
                }
     
            },
        ];
    }

}