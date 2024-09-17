<?php

namespace App\Exports;

use App\Modules\Report\Repositories\ReportRepository;
use Carbon\Carbon;


use Carbon\CarbonPeriod;


use App\Modules\User\Models\User;
use App\Modules\User\Repositories\UserRepository;
// use phpDocumentor\Reflection\Types\This;
use Maatwebsite\Excel\Events\AfterSheet;
use Maatwebsite\Excel\Concerns\FromArray;
// use PhpOffice\PhpSpreadsheet\Chart\Chart;
// use PhpOffice\PhpSpreadsheet\Chart\Title;
use Maatwebsite\Excel\Concerns\WithTitle;
// use Maatwebsite\Excel\Concerns\WithCharts;
use Maatwebsite\Excel\Concerns\Exportable;
// use PhpOffice\PhpSpreadsheet\Chart\Layout;
// use PhpOffice\PhpSpreadsheet\Chart\Legend;
// use PhpOffice\PhpSpreadsheet\Chart\PlotArea;
// use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithCustomStartCell;
// use PhpOffice\PhpSpreadsheet\Chart\DataSeries;
// use Maatwebsite\Excel\Concerns\WithColumnWidths;
// use PhpOffice\PhpSpreadsheet\Style\NumberFormat;
// use Maatwebsite\Excel\Concerns\WithCustomStartCell;
// use PhpOffice\PhpSpreadsheet\Chart\DataSeriesValues;

class TimeoffAllocationExport implements FromArray, ShouldAutoSize, WithEvents, WithTitle, WithColumnWidths,WithCustomStartCell
{
    use Exportable;

    protected $list;
    protected $list_new;
    protected $pre_mon;
    protected $cur_mon;
    protected $period;
    protected $current_period;
    protected $noofdays;
    public function __construct($list, $list_new, $pre_mon, $cur_mon, $noofdays)
    {

        $this->list = $list ?? [];
        $this->list_new = $list_new ?? [];
        $this->noofdays = $noofdays;
        $this->pre_mon = $pre_mon;
        $this->cur_mon = $cur_mon;
        $this->period = "NEW HIRE (".$this->pre_mon." 21 - ".$this->cur_mon." 20)";
        $this->current_period = "(".$this->cur_mon." 01 - ".$this->cur_mon."" .$this->noofdays .")";
    }


    public function registerEvents(): array
    {

        return [
            AfterSheet::class    => function (AfterSheet $event) {
                $sheet = $event->sheet;

                $sheet->mergeCells('D1:G1');
                $sheet->setCellValue('F1', "Month of ".$this->cur_mon);

                $sheet->mergeCells('I4:J4');
                $sheet->setCellValue('I4', "Prev. Used");
               
                $columns = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T"];
            foreach ($columns as $column) {
                $event->sheet->getColumnDimension($column)->setAutoSize(true);
            }

                $sheet->mergeCells('F3:G3');
                $sheet->setCellValue('F3', "No of Lv availed");
                $sheet->mergeCells('F4:G4');
                $sheet->setCellValue('F4', $this->current_period);
                $sheet->setCellValue('E6', "(".$this->pre_mon." 21 - ".$this->cur_mon." 20)");
          }

        ];
    }
    public function array(): array
    {

        $employee_items = [];
        $employee_items_new = [];

        foreach ($this->list_new as $item) {
            $item_vals = [];
            foreach(get_object_vars($item) as $key => $val) {
                $item_vals[] = $val;
            }
            array_push($employee_items_new, array_merge($item_vals));
        }
        $excel_employees_new = $employee_items_new;



        foreach ($this->list as $item) {
            $item_vals = [];
            foreach(get_object_vars($item) as $key => $val) {
                $item_vals[] = $val;
            }
            array_push($employee_items, array_merge($item_vals));
        }
        $excel_employees = $employee_items;


        $excel = [];
        array_push(
            $excel,
            [""],
            array_merge(
                [""],
                [""],
                [""],
                [""],
                [""],
                [""],
                [""],
                [""],
                [""],
                [""],
                [""],
            ),
            array_merge(
                [""],
                [""],
                [""],
                [""],
                [""],
                [""],
                [""],
                [""],
                [""],
                [""],
                [""],
            ),
            array_merge(
                ["Employee Number"],
                ["Employment Status"],
                ["Account"],
                ["Start Date"],
                ["Present Days"],
                ["Paid"],
                ["LWP"],
                ["Max Lv Eligible"],
                ["Paid"],
                ["LWP"],
                ["Clos. Bal"],
            ),
            array_merge(
                [""],
                [""],
                [""],
                [""],
                [""],
                [""],
                [""],
                [""],
                [""],
                [""],
                [""],
            ),
            $employee_items,
            array_merge(
                [""],
                [""],
                [""],
                [""],
                [""],
                [""],
                [""],
                [""],
                [""],
                [""],
                [""],
            ),
            [$this->period],
            $employee_items_new,
        );
        return $excel;
    }


    public function columnWidths(): array
    {



        return [
            'A' => 40,
            'B' => 12,
            'C' => 35,
            'D' => 10,
            'E' => 10,
            'F' => 10,
            'G' => 10,
            'H' => 10,
            'I' => 10,
            'J' => 10,
            'K' => 10,

        ];
    }




    public function startCell(): string
    {
        return 'A2';
    }

    public function title(): string
    {
        return 'Timeoff Allocation Report';
    }

}
