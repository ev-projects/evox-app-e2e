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
    public function __construct($start = null, $end = null)
    {
        $this->start = $start;
        $this->end = $end;
    }



    public function registerEvents(): array
    {
      
        return [
            AfterSheet::class    => function (AfterSheet $event) {


                // $cellValue = $event->sheet->appendRow(2, array(
                //     'appended', 'appended'
                // ));
                // dd($cellValue);
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
                                                            $event->sheet->getDelegate()->getStyle("M2:AP3")->getFill() //YELLOW
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

        
        // $service = [
        //     // "Vaccination" => [],
        //     // "Check up" => [],
        //     // "Follow up" => [],
        //     // "Grooming" => [],
        //     // "Labratory" => [],
        //     // "X-Ray" => [],
        //     // "Surgery" => [],
        //     // "Board and Lodging" => [],
        //     // "Other" => [],
        // ];
        // $service2 =  $service; // make temporary duplicate

        // $clinic = session('selectedClinic')->id;
        // $clinic = session('selectedClinic')->id;
        // $stackweek = [];
        // $stackint = 0;
        // $serviceSUM  =  [
        //     "Vaccination" => 0,
        //     "Check up" => 0,
        //     "Follow up" => 0,
        //     "Grooming" => 0,
        //     "Labratory" => 0,
        //     "X-Ray" => 0,
        //     "Surgery" => 0,
        //     "Board and Lodging" => 0,
        //     "Other" => 0,
        // ];
        // $serviceTotal  = $serviceSUM;
        // $i = 0;
        // $total = [];

        // foreach ($specdate as $key => $d) {
        //     if (!str_contains($d, "WEEK")) {
        //         $get = Clinic::with('appointments')->where("id", $clinic)->first()->appointments->where("date", $d);

        //         foreach ($service as $keyser => $s) { // read each for service
        //             $variableService = $get->where('service', $keyser);

        //             if ( $variableService->sum('bill') > 0) {
        //                 $service[$keyser][] =   $variableService->sum('bill');

        //                 $service2[$keyser][] =   $variableService->sum('bill');
        //             } else {
        //                 $service[$keyser][] = 0; // temp from "0"
        //             }

        //             $serviceTotal[$keyser] = array_sum($service2[$keyser]);
        //         }
        //     } else {
        //         foreach ($service as $keyser => $s) {
        //             $service[$keyser][] =
        //                 array_sum($service[$keyser]) -   $serviceSUM[$keyser];
        //             $serviceSUM[$keyser] = array_sum($service[$keyser]);
        //         }
        //     }
        // }
        // // dd( $serviceTotal);
        // foreach ($service as $keyser => $s) {
        //     $service[$keyser][] =  $serviceTotal[$keyser];
        // }
        // // dd($service );
        // foreach ($service as $key => $single) {

        //     for ($x = 0; $x <= count($single) - 1; $x++) {

        //         // if (!str_contains($single[$x], "WEEK")) {
        //         $total[$x] =

        //             $service["Vaccination"][$x] +
        //             $service["Check up"][$x] +
        //             $service["Follow up"][$x] +
        //             $service["Grooming"][$x] +
        //             $service["Labratory"][$x] +
        //             $service["X-Ray"][$x] +
        //             $service["Surgery"][$x] +
        //             $service["Board and Lodging"][$x] +
        //             $service["Other"][$x];
        //         // } else {
        //         //     $total[$x] = "WEEK";
        //         // }
        //     }
        // }
        // dd($total);

            $excel_employees = [];
            $supervisor = User::with(['supervisee','supervisee.department'=>function($q){$q->orderBy('department_name', 'DESC');}])->find(2);
            $employee_list = $supervisor->supervisee->take(10);
            foreach( $employee_list as $key => $employee){
                $excel_employees[$key]["fullname"] = $employee->getFullName();
                $excel_employees[$key]["department"] = $employee->department->department_name;
            }
        $excel = [];
        array_push(
            $excel,
            ["ATTENDANCE" ],

            array_merge(["Name"],
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
        return 'Monthly/Weekly Sales Report';
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


