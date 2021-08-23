<?php

namespace App\Exports;
use Carbon\Carbon;
use Maatwebsite\Excel\Concerns\Exportable;
use Maatwebsite\Excel\Concerns\WithDrawings;
use Maatwebsite\Excel\Concerns\WithCustomStartCell;
use PhpOffice\PhpSpreadsheet\Worksheet\Drawing;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class TeamSummaryAttendanceExport implements 
    WithDrawings,
    WithCustomStartCell,
    WithHeadings, 
    FromArray,
    WithMultipleSheets, 
    WithTitle,
    WithColumnWidths,
    WithStyles
    
{
    use Exportable;
    protected $data;
    protected $list;
    protected $type ;
    public function __construct($data,$list ,$type =  null )
    {
        $this->data = $data;
        $this->list = $list;
        $this->type = $type;
    }


    public function headings(): array
    {
        if($this->type == 'report'){
            return [
                'Label',
                'Number',
                'Percentage',
                'Target',
            ];
        }else {
            return [
                'Employee #',
                'NAME',
                'Department',
                'JOB TITLE',
                'DATE',
                'STATUS'
            ];
        }
       
    }

    public function sheets(): array
    {
        $sheets = [];
        $sheets[] = new TeamSummaryAttendanceExport($this->data,$this->list,'report');
        $sheets[] = new TeamSummaryAttendanceExport($this->data,$this->list,'list');
        

        return $sheets;
    }

    public function array (): array
    {
        if($this->type == 'report'){
            return [
               
                [
                    'Attendance',
                    $this->data['attendance']['total_count'] == 0 ? '0' : $this->data['attendance']['total_count'] ,
                    $this->data['attendance']['total_percentage'] == 0 ? '0' : $this->data['attendance']['total_percentage'],
                    $this->data['attendance']['target_percentage'] == 0 ? '0' : $this->data['attendance']['target_percentage'],
                ],
                [
                    'Planned Leaves',
                    $this->data['planned_leaves']['total_count'] == 0 ? '0' : $this->data['planned_leaves']['total_count'] ,
                    $this->data['planned_leaves']['total_percentage'] == 0 ? '0' : $this->data['planned_leaves']['total_percentage'],
                    $this->data['planned_leaves']['target_percentage'] == 0 ? '0' : $this->data['planned_leaves']['target_percentage'],
                ],
                [
                    'Unplanned Leaves',
                    $this->data['unplanned_leaves']['total_count'] == 0 ? '0' :$this->data['unplanned_leaves']['total_count'] ,
                    $this->data['unplanned_leaves']['total_percentage'] == 0 ? '0' : $this->data['unplanned_leaves']['total_percentage'], 
                    $this->data['unplanned_leaves']['target_percentage'] == 0 ? '0' : $this->data['unplanned_leaves']['target_percentage'],
                ],
            ];
        }else {

            $list = [];
            
            for ($x = 0; $x < count($this->list); $x++) {
                array_push($list, [
                    $this->list[$x]['user_id'],
                    $this->list[$x]['name'],
                    $this->list[$x]['department'],
                    $this->list[$x]['job_title'],
                    Carbon::parse($this->list[$x]['date'])->format('F-d'),
                    $this->list[$x]['status'],
                ]);
              }
            return $list;

            
            return [
                [
                    'Total Headcount',
                    $this->data['total_headcount'] == 0 ? '0' : $this->data['total_headcount'],
                    gettype($this->list)
                ],
                [
                    'Scheduled Headcount',
                    $this->data['scheduled_employees']['total_count'] == 0 ? '0' : $this->data['scheduled_employees']['total_count'],
                ],
                [
                    'Attendance',
                    $this->data['attendance']['total_count'] == 0 ? '0' : $this->data['attendance']['total_count'] ,
                    $this->data['attendance']['total_percentage'] == 0 ? '0' : $this->data['attendance']['total_percentage'],
                    $this->data['attendance']['target_percentage'] == 0 ? '0' : $this->data['attendance']['target_percentage'],
                ],
                [
                    'Planned Leaves',
                    $this->data['planned_leaves']['total_count'] == 0 ? '0' : $this->data['planned_leaves']['total_count'] ,
                    $this->data['planned_leaves']['total_percentage'] == 0 ? '0' : $this->data['planned_leaves']['total_percentage'],
                    $this->data['planned_leaves']['target_percentage'] == 0 ? '0' : $this->data['planned_leaves']['target_percentage'],
                ],
                [
                    'Unplanned Leaves',
                    $this->data['unplanned_leaves']['total_count'] == 0 ? '0' :$this->data['unplanned_leaves']['total_count'] ,
                    $this->data['unplanned_leaves']['total_percentage'] == 0 ? '0' : $this->data['unplanned_leaves']['total_percentage'], 
                    $this->data['unplanned_leaves']['target_percentage'] == 0 ? '0' : $this->data['unplanned_leaves']['target_percentage'],
                ],
            ];
        }
        
    }

    public function drawings()
    {
        $drawing = new Drawing();
        $drawing->setName('Logo');
        $drawing->setDescription('This is my logo');
        $drawing->setPath(public_path('/images/EV_logo_FLAT.jpg'));
        $drawing->setHeight(95);
        $drawing->setCoordinates('A1');

        return $drawing;
    }

    public function startCell(): string {
        return 'A6';
    }

    public function title(): string
    {
        if($this->type == 'report'){
            return 'Report';
        }else {
            return 'List';
        }
        
    }

    public function columnWidths(): array
    {
        if($this->type == 'report'){
            return [
                'A' => 30,
                'B' => 15,  
                'C' => 15,
                'D' => 15,              
            ];
        }else {
            return [
                'A' => 20,
                'B' => 40,  
                'C' => 20,
                'D' => 40, 
                'E' => 20,
                'F' => 20,              
            ];
        }
    }

    public function styles(Worksheet $sheet)
    {
        if($this->type == 'report'){
            $sheet->getStyle('B')->getAlignment()->setHorizontal(\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle('C')->getAlignment()->setHorizontal(\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle('D')->getAlignment()->setHorizontal(\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER);
        
        }else {
            $sheet->getStyle('A')->getAlignment()->setHorizontal(\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle('E')->getAlignment()->setHorizontal(\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER);
        
        }
        return [
            // Style the first row as bold text.
            6    => ['font' => ['bold' => true]],
        ];
    }


}
