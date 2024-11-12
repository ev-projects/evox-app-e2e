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
                    $event->sheet->getDelegate()->setCellValue('J1', 'Cutoff ('.$this->pre_mon.' To '.$this->cur_mon.')');
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
            'employee_id',
            'EmployeeName',
            'Department',
            'dispute_type',
            'description',
            'created_by',
            'status',
            'LWOP',
            'UT',
            'TARDINESS',
            'Late',
            'Night_Shift_Diff',
            'Overtime',
            'OT_with_NSD',
            'Rest_Day',
            'Rest_Day_200',
            'Rest_Day_Work_With_NSD',
            'Rest_Day_Work_With_OT',
            'Rest_Day_Work_NSD_With_OT',
            'Legal_Holiday',
            'Legal_Holiday_With_NSD',
            'Legal_Holiday_With_Overtime',
            'Legal_Holiday_OT_With_OT',
            'Special_Holiday',
            'Special_Holiday_200',
            'Special_Holiday_With_NSD',
            'Special_Holiday_With_Overtime',
            'Special_Holiday_OT_With_OT',
            'Referral_Fee',
            'Bonus',
            'LWOP_Adjustment',
            'Commission',
            'Payroll_Period',
            'Payroll_Cutoff',
            'BPs_Remarks',
            'BPs_Date_Encoded',
            'Payroll_Remarks',
            'Payout_Inclusion',
        ];
    }

}
