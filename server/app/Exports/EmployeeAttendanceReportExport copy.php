<?php

namespace App\Exports;

use Carbon\Carbon;


use Carbon\CarbonPeriod;


use App\Modules\User\Models\User;
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
    protected $data;
    protected $list;

    public function __construct($start = null, $end = null, $data,$list)
    {
        $this->start = $start;
        $this->end = $end;
        $this->data = $data;
        $this->list = $list;
    }



    public function registerEvents(): array
    {
      
        return [
            AfterSheet::class    => function (AfterSheet $event) {


                // $cellValue = $event->sheet->appendRow(2, array(
                //     'appended', 'appended'
                // ));
          
                $event->sheet->setFontSize('A1', 26);
                
                $event->sheet->getDelegate()->getStyle('2')->getFont()->setSize(12);
                // ->setBold(true);
                $event->sheet->getDelegate()->getStyle('3')->getFont()->setSize(12);
                // ->setBold(true);
                $event->sheet->getDelegate()->getStyle('A')->getFont()->setSize(12);
                // ->setBold(true);
                $event->sheet->setFontSize('A2:L2', 10);
                $event->sheet->getStyle('A2:L2')->getAlignment()->setWrapText(true);
                $event->sheet->verticalAlign('A2:L2',"top");
                $event->sheet->horizontalAlign('M2:AP3',"center");
                $cellRange = 'B5:L5';
                                                            $event->sheet->getDelegate()->getStyle("M2:AP3")->getFill() 
                                                                ->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)
                                                                ->getStartColor()->setARGB('49be25');
                // $event->sheet->getDelegate()->getStyle("A4:AK12")->getFill() //YELLOW
                //     ->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)
                //     ->getStartColor()->setARGB('f7e516');
                                                            // $event->sheet->getDelegate()->getStyle("A13:AK13")->getFill() //BLUE
                                                            //     ->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)
                                                            //     ->getStartColor()->setARGB('46bdc6');
                $event->sheet->styleCells(
                    "A2:AP13",
                    [
                        'borders' => [
                            'allBorders' => [
                                'borderStyle' => \PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN
                            ],
                        ]
                    ]
                );

                // $event->sheet->getStyle('A1:AK3')->applyFromArray([
                //     'font' => [
                //         'bold' => true
                //     ]
                // ]);
            }

        ];
    }
    public function array(): array
    {
        

        $month_start = Carbon::parse($this->end)->startOfMonth()->format('y-m-d');
        $month_end = Carbon::parse($this->end)->endOfMonth()->format('y-m-d');
        $period = CarbonPeriod::between($month_start,  $month_end);

        
        $list = $this->getDetailsOfSummary($array['team_attendance_summary']);
        $i = 1;
        $d = 1;

        foreach ($period as $key => $date) {
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

 { 
        
        };
            $excel_employees = [];
            $supervisor = User::with(['supervisee','supervisee.department'=>function($q){$q->orderBy('department_name', 'DESC');}])->find(2);
            $employee_list = $supervisor->supervisee->take(10);
            foreach( $employee_list as $key => $employee){
                $excel_employees[$key]["fullname"] = $employee->getFullName();
                $excel_employees[$key]["department"] = $employee->department->department_name;


                $excel_employees[$key]["Name"]                          = null;
                $excel_employees[$key]["Account"]                       = null;
                $excel_employees[$key]["Attendance_Rate"]               = null;
                $excel_employees[$key]["Unplanned"]                     = null;
                $excel_employees[$key]["Planned"]                       = null;
                $excel_employees[$key]["Scheduled_VL"]                  = null;
                $excel_employees[$key]["Present_Days"]                  = null;
                $excel_employees[$key]["Scheduled_Days"]                = null;
                $excel_employees[$key]["Unplanned_Leaves"]              = null;
                $excel_employees[$key]["Absent"]                        = null;
                $excel_employees[$key]["SL"]                            = null;
                $excel_employees[$key]["VL"]                            = null;
                array_merge($list[$key]);
            }
        $excel = [];
        array_push(
            $excel,
            ["ATTENDANCE" ],

            array_merge(
                        ["Name"],
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
            $specdate),
            array_merge([""],[""],[""],[""],[""],[""],[""],[""],[""],[""],[""],[""], 
            $datesday),
            $excel_employees

            

            // array_merge(["Vaccination"], $service["Vaccination"]),
            // array_merge(["Check up"], $service["Check up"]),
            // array_merge(["Follow up"], $service["Follow up"]),
            // array_merge(["Grooming"], $service["Grooming"]),
            // array_merge(["Labratory"], $service["Labratory"]),
            // array_merge(["X-Ray"], $service["X-Ray"]),
            // array_merge(["Surgery"], $service["Surgery"]),
            // array_merge(["Board and Lodging"], $service["Board and Lodging"]),
            // array_merge(["Other"], $service["Other"]),
            // array_merge(["Total"], $total),

        );
        return $excel;
    }


    public function columnWidths(): array {
        return[
            'A' => 35,
            'B' => 35,
            'C' => 10,
            'D' => 10,
            'E' => 10,
            'F' => 10,
            'G' => 10,
            'H' => 10,
            'I' => 10,
            'J' => 10,
            'K' => 10,
            'L' => 10,
            

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
        return Carbon::now("Asia/Manila")->subDays($i)->format("D") . " " . Carbon::now("Asia/Manila")->subDays($i)->format("m-d-Y");
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
}


