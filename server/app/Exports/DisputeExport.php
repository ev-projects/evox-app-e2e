<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use App\Modules\User\Models\User;
use App\Modules\User\Repositories\UserRepository;
use Maatwebsite\Excel\Events\AfterSheet;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\Exportable;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithCustomStartCell;

class DisputeExport implements FromCollection, WithHeadings, WithEvents
{
    use Exportable;
    protected $data;
    protected $pre_mon;
    protected $cur_mon;
    public function __construct($data, $pre_mon, $cur_mon)

    {

        $this->data = $data;
        $this->pre_mon = $pre_mon;
        $this->cur_mon = $cur_mon;
    }

  
    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                // Insert a custom title row before the actual data
                $event->sheet->getDelegate()->insertNewRowBefore(1, 1); // Add a new row at the top
                $event->sheet->getDelegate()->mergeCells('J1:L1');
                if(isset($this->pre_mon)){
                    $event->sheet->getDelegate()->setCellValue('J1', 'Payroll Cutoff ('.$this->pre_mon.' To '.$this->cur_mon.')');
                }else{
                    $event->sheet->getDelegate()->setCellValue('J1', 'Overall Report');
                }
               

                // $event->sheet->getDelegate()->setCellValue('A1', 'Custom Title or Description');
                
                // // Merge the title row across all columns (you can adjust 'A1:Z1' to match your column count)
                // $event->sheet->getDelegate()->mergeCells('A1:AE1');

            },
        ];
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
            'Id',
            'Employee No',
            'Employee Name',
            'Department',
            'Dispute Type',
            'Desription',
            'Supervisor Name',
            'Status',
            'LWOP',
            'UT',
            'Tardiness',
            'Late',
            'Night Shift Diff',
            'Over Time',
            'OT With NSD',
            'Rest Day',
            'Rest Day 200',
            'Rest Day Work With NSD',
            'Rest Day Work With OT',
            'Rest Day Work NSD With OT',
            'Legal Holiday',
            'Legal Holiday With NSD',
            'Legal_Holiday With Overtime',
            'Legal Holiday OT With OT',
            'Special Holiday',
            'Special Holiday 200',
            'Special Holiday With NSD',
            'Special Holiday With Overtime',
            'Special Holiday OT With OT',
            'Referral Fee',
            'Bonus',
            'LWOP Adjustment',
            'Commission',
            'Payroll Period',
            'Payroll Cutoff',
            "BP's Remarks",
            "BP's Date Encoded",
            'Payroll Remarks',
            'Payout Inclusion',
        ];
    }

}
