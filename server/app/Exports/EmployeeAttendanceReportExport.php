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

// use PhpOffice\PhpSpreadsheet\Chart\DataSeries;
// use Maatwebsite\Excel\Concerns\WithColumnWidths;
// use PhpOffice\PhpSpreadsheet\Style\NumberFormat;
// use Maatwebsite\Excel\Concerns\WithCustomStartCell;
// use PhpOffice\PhpSpreadsheet\Chart\DataSeriesValues;

class EmployeeAttendanceReportExport implements FromArray, ShouldAutoSize, WithEvents, WithTitle, WithColumnWidths
{
    use Exportable;

    private $start;
    private $end;
    //protected $data;
    protected $list;
    protected $total_row;
    protected $segragated_total_row;
    protected $list_count;
    protected $period;
    protected $count_period;

    public function __construct($list, $stats, $start, $end)
    {
        $this->start = $start;
        $this->end = $end;
        //$this->data = $data;
        $this->list = $list ?? [];

        $this->total_row = count($this->list);

        $stat_vars = get_object_vars($stats);
        $stat_vals = [];
        foreach ($stat_vars as $key => $val) {
            array_push($stat_vals, $val);
        }
        $this->segragated_total_row = $stat_vals;

        $this->list_count = count($this->list);
        $parsed_start = Carbon::parse($this->start)->format('y-m-d');
        $parsed_end = Carbon::parse($this->end)->format('y-m-d');
        $this->period = CarbonPeriod::between($parsed_start,  $parsed_end);
        $this->count_period = count(CarbonPeriod::between($parsed_start,  $parsed_end));
      
    }


    public function registerEvents(): array
    {

        return [
            AfterSheet::class    => function (AfterSheet $event) {


                                                                        // 12 or more number of fields like name, emp_num
                $coordinate = $event->sheet->getCellByColumnAndRow(13 + $this->count_period, 1)->getCoordinate();
                $month_col_coordinate = substr($coordinate, 0, -1);
             
                $event->sheet->setNumFormatPercent('E4:E' . ($this->list_count + 4));
                $this->addZeroPercent($event, "E", 4, $this->list_count);

                $event->sheet->setNumFormatPercent('D4:D' . ($this->list_count + 4));
                $this->addZeroPercent($event, "D", 4, $this->list_count);

                // $event->sheet->setNumFormatPercent('C4:C' . ($this->list_count + 4));
                // $this->addZeroPercent($event, "C", 4, $this->list_count);

                $event->sheet->setNumFormatPercent('F4:F' . ($this->list_count + 4));
                $this->addZeroPercent($event, "F", 4, $this->list_count);



                $this->colorFillStatusMonth($event, 'P', '38bf0d'); // present
                $this->colorFillStatusMonth($event, 'P-RDW', '9bdf86'); // present but on rest day work
                $this->colorFillStatusMonth($event, 'H', 'FFFF00'); // holiday
                $this->colorFillStatusMonth($event, 'A', 'ffb0b4'); // absent
                $this->colorFillStatusMonth($event, 'UL', 'cf6969'); // unpaid leave
                $this->colorFillStatusMonth($event, 'RD', 'BEBEBE'); // rest day
                $this->colorFillStatusMonth($event, 'SL', 'dca4ed'); // leave
                $this->colorFillStatusMonth($event, 'VL', '72eddb'); // leave
                $this->colorFillStatusMonth($event, 'X', 'fcf6e1'); // no schedule or dtr
                $this->colorFillStatusMonth($event, 'X', 'fcf6e1');
                // $this->colorFillStatusMonth($event, 'XH', 'fcf6e1'); // no shedule holiday
                $this->colorFillStatusMonth($event, 'TBD', 'dcfce4'); // to be determined with in the date
                $this->setMonthWidth($event);



                $event->sheet->getDelegate()->getStyle('2')->getFont()->setSize(12);
                $event->sheet->setFontSize('A2:M2', 10);
                // ->setBold(true);
                $event->sheet->getDelegate()->getStyle('3')->getFont()->setSize(12);
                // ->setBold(true);
                $event->sheet->getDelegate()->getStyle('A')->getFont()->setSize(12);
                // ->setBold(true);



                $event->sheet->getStyle('A2:M2')->getAlignment()->setWrapText(true);
                $event->sheet->verticalAlign('A2:M2', "top");
                $event->sheet->horizontalAlign('N2:'.$month_col_coordinate.'3', "center");

                $event->sheet->getDelegate()->getStyle("N2:".$month_col_coordinate."2")->getFill()
                    ->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)
                    ->getStartColor()->setARGB('55e629');
                $event->sheet->getDelegate()->getStyle("N3:".$month_col_coordinate."3")->getFill()
                    ->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)
                    ->getStartColor()->setARGB('BEBEBE');

                $total_row_coordinate = (4 + $this->list_count);
                $event->sheet->getDelegate()->getStyle("D" . $total_row_coordinate . ":M" . $total_row_coordinate)->getFill()
                    ->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)
                    ->getStartColor()->setARGB('6184d4');

                    $event->sheet->styleCells(
                        "A2:".$month_col_coordinate . (4 + $this->list_count),
                        [
                            'borders' => [
                                'allBorders' => [
                                    'borderStyle' => \PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN
                                ],
                            ]
                        ]
                    );
                    

                // ACCOUNT ROWS EVENTS
                $acc_total_row_coordinate = (4 + 5 + $this->list_count);
                $event->sheet->getDelegate()->getStyle("B" . $acc_total_row_coordinate . ":M" . $acc_total_row_coordinate)->getFill()
                    ->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)
                    ->getStartColor()->setARGB('6184d4');

                $event->sheet->getRowDimension($acc_total_row_coordinate)->setRowHeight(40);
                $event->sheet->getStyle($acc_total_row_coordinate)->getAlignment()->setWrapText(true);
                $event->sheet->getDelegate()->getStyle($acc_total_row_coordinate)->getFont()->setSize(12);
                $event->sheet->setFontSize('B'.$acc_total_row_coordinate.':M'.$acc_total_row_coordinate, 10);
                $event->sheet->verticalAlign($acc_total_row_coordinate, "top");

                $event->sheet->setFontSize('B'.$acc_total_row_coordinate.':C'.$acc_total_row_coordinate, 13);

                $acc_total_w_list = count($this->segragated_total_row)+$acc_total_row_coordinate;

                $event->sheet->styleCells(
                    "B".$acc_total_row_coordinate.":M" . $acc_total_w_list,
                    [
                        'borders' => [
                            'allBorders' => [
                                'borderStyle' => \PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN
                            ],
                        ]
                    ]
                );


                $event->sheet->setNumFormatPercent('E'.$acc_total_row_coordinate.':E' . $acc_total_w_list);
                

                $event->sheet->setNumFormatPercent('D'.$acc_total_row_coordinate.':D' . $acc_total_w_list);


                $event->sheet->setNumFormatPercent('C'.$acc_total_row_coordinate.':C' . $acc_total_w_list);
                
                $event->sheet->setFontSize('A1', 24);
            }

        ];
    }
    public function array(): array
    {
        $i = 1;
        $d = 1;

        foreach ($this->period as $key => $date) {
            $dates[$d]    = $date->format("Y-m-d , D");
            $datesday[$d] = $date->format("D");
            $specdate[$d] = $date->format("M-d");
            // if (Carbon::parse($dates[$d])->format('D') == "Sun") { //WEEK
            //     $dates[++$d] = "WEEK " . $i;
            //     $datesday[$d] = "WEEK " . $i;
            //     $specdate[$d] = "WEEK" . $i;
            //     $i++;
            // }
            $d++;
        }
        $employee_items = [];
        foreach ($this->list as $item) {
            $item_vals = [];
            foreach(get_object_vars($item) as $key => $val) {
                //array_push($item_vals, $val);
                $item_vals[][] = $val;
            }
            //array_push($employee_items, $item_vals);
            $employee_items[] = array_merge($item_vals);
        }
        $excel_employees = $employee_items;
        $excel_employees[] = $this->total_row;

        $excel_accounts = $this->segragated_total_row;

        $excel = [];
        array_push(
            $excel,
            ["ATTENDANCE"],

            array_merge(   //HEADERS
                ["Name"],
                ["Employee\nNumber"],
                ["Account"],
                ["Attendance\nRate"],
                ["Unplanned %"],
                ["Planned %"],
                ["Scheduled\n+\nVL"],
                ["Present\nDays"],
                ["Scheduled\nDays"],
                ["Unplanned\nLeaves"],
                ["Absent"],
                ["SL"],
                ["VL"],
                $specdate
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
                [""],
                [""], //BLANK HEADERS + DAYS 
                $datesday
            ),
            array_merge($excel_employees),

            [""],
            [""],
            [""],
            [""],
            array_merge(   //HEADERS
                [""],
                ["HEAD COUNT"],
                ["ACCOUNT"],
                ["Attendance\nRate"],
                ["Unplanned %"],
                ["Planned %"],
                ["Scheduled\n+\nVL"],
                ["Present\nDays"],
                ["Scheduled\nDays"],
                ["Unplanned\nLeaves"],
                ["Absent"],
                ["SL"],
                ["VL"]
            ),
            $excel_accounts

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
            'L' => 10,
            'M' => 10,


        ];
    }




    public function startCell(): string
    {
        return 'B4';
    }

    public function title(): string
    {
        return 'Monthly Attendance Report';
    }

    private function daydate($i)
    {
        return Carbon::now()->subDays($i)->format("D") . " " . Carbon::now()->subDays($i)->format("m-d-Y");
    }




    private function newline($multiply)
    {
        $line = [""];
        $excelLine = [];

        for ($x = 0; $x <= $multiply; $x++) {
            $excelLine[] = $line;
        }
        return  $excelLine;
    }

    private function addZeroPercent($event, $column, $start, $count)
    {
        for ($x = 0; $x <=  $count; $x++) {
            $val = $event->sheet->getCell($column . ($start + $x))->getValue();
            if ($val == null) {
                $event->sheet->SetCellValue($column . ($start + $x), 0);
            }
        }
    }

    private function colorFillStatusMonth($event, $status, $color)
    {

        // $start = $event->sheet->getCellByColumnAndRow(13, 4 )->getCoordinate();
        for ($x = 0; $x <= $this->count_period - 1; $x++) {
            $new_x = $x + 14; // col M
            for ($y = 0; $y <=  $this->list_count - 1; $y++) {
                $new_y = $y + 4; // row 4
                $coordinate = $event->sheet->getCellByColumnAndRow($new_x, $new_y)->getCoordinate();
                $value =  $event->sheet->getCell($coordinate)->getValue();

                if ($value ==  $status) {
                    $event->sheet->getDelegate()->getStyle($coordinate)->getFill()
                        ->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)
                        ->getStartColor()->setARGB($color);
                }
            }
        }
    }


    private function setMonthWidth($event)
    {
        $col_list = [];

        for ($x = 0; $x <= $this->count_period - 1; $x++) {
            $new_x = $x + 14; // col M

            $coordinate = $event->sheet->getCellByColumnAndRow($new_x, 1)->getCoordinate();

            $col_coordinate = substr($coordinate, 0, -1);
            $event->sheet->getColumnDimension($col_coordinate)->setWidth(7);


            $col_list[] = $col_coordinate;
        }

        $event->sheet->horizontalAlign(reset($col_list) . ':' . end($col_list), "center");
    }
}
