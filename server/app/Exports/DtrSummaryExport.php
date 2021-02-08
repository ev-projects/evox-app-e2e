<?php

namespace App\Exports;

use App\Modules\User\Models\User;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;

class DtrSummaryExport implements FromCollection,WithHeadings
{
    public $data;
    private $dtr;
    public function __construct(DtrRepositoryInterface $dtr){
        $this->dtr = $dtr;
    }

    public function collection()
    {
        $summary = Collection::make();

        foreach($this->data['summary'] as $value) {
            # General Information
            $row = array();
            $row['employee_id'] = $value['employee_info']['employee_id'];
            $row['name'] = $value['employee_info']['name'];
            $row['department'] = $value['employee_info']['department'];
            $row['leaves'] = $value['summary']['reg']['vl_sl'];
            $row['ul'] = $value['summary']['reg']['ul'];
            $row['late'] = $value['summary']['reg']['late'];
            $row['undertime'] = $value['summary']['reg']['undertime'];
            $row['night_diff'] = $value['summary']['reg']['night_diff'];
            $row['overtime'] = $value['summary']['reg']['overtime'];
            $row['overtime_night_diff'] = $value['summary']['reg']['overtime_night_diff'];
            $row['rd'] = $value['summary']['rd']['rendered_hours'];
            $row['rd_nd'] = $value['summary']['rd']['night_diff'];
            $row['rd_ot']  = $value['summary']['rd']['overtime'];
            $row['rd_nd_ot']  = $value['summary']['rd']['overtime_night_diff'];

            # For Holiday
            foreach($this->data['column'] as $key) {

                if(isset($value['summary'][$key])){
                    $row[$key] = $value['summary'][$key]['rendered_hours'];
                    $row[$key . '_nd'] = $value['summary'][$key]['night_diff'];
                    $row[$key . '_ot']  = $value['summary'][$key]['overtime'];
                    $row[$key . '_nd_ot']  = $value['summary'][$key]['overtime_night_diff'];
                }else{
                    $row[$key] = 0;
                    $row[$key . '_nd'] = 0;
                    $row[$key . '_ot']  = 0;
                    $row[$key . '_nd_ot']  = 0;
                }
               
            }

            $summary->push(  $row );
        }

        
        return $summary;
    }

    public function headings(): array
    {
        # Default Header

        $headers = [
            '# ID',
            'Name',
            'Department',
            'Leaves',
            'UL',
            'Late',
            'Undertime',
            'Night Diff',
            'Overtime',
            'OT with ND',
            'RD',
            'RD ND',
            'RD OT',
            'RD OT W/ ND',
        ];

        # Addition Header for the Holiday
        foreach($this->data['column'] as $value) {
            array_push($headers, strtoupper($value));
            array_push($headers, strtoupper($value).' ND');
            array_push($headers, strtoupper($value) .' OT');
            array_push($headers, strtoupper($value).' OT w/ OT');
        }
        return $headers;

      



    }
}