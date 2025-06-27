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
            'Employee No',
            'Employee Name',
            'Department',
            'Rendered Hours',
            'Night Differential',
            'Overtime',
            'Overtime Night Differential',
            'Rest Day Rendered Hours',
            'Rest Day Night Differential',
            'Rest Day Overtime',
            'Rest Day Overtime Night Differential',
            'Legal Holiday Rendered Hours',
            'Legal Holiday Night Differential',
            'Legal Holiday Overtime',
            'Legal Holiday Overtime Night Differential',
            'Special Holiday Rendered Hours',
            'Special Holiday Night Differential',
            'Special Holiday Overtime',
            'Special Holiday Overtime Night Differential',
            'Double Special Holiday Rendered Hours',
            'Double Special Holiday Night Differential',
            'Double Special Holiday Overtime',
            'Double Special Holiday Overtime Night Differential',
            'Double Legal Holiday Rendered Hours',
            'Double Legal Holiday Night Differential',
            'Double Legal Holiday Overtime',
            'Double Legal Holiday Overtime Night Differential',
            'Special Legal Rendered Hours',
            'Special Legal Night Differential',
            'Special Legal Overtime',
            'Special Legal Overtime Night Differential',
        ];
    }

}
