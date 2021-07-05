<?php

namespace App\Exports;

use App\Modules\User\Models\User;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Illuminate\Database\Eloquent\Collection;

class TeamScheduleExport implements FromCollection,WithHeadings
{
    public $data;

    public function collection()
    {
        $summary = Collection::make();

        foreach($this->data as $dtr) {
            # General Information
            $row = array();
            $row['id'] = $dtr->user()->first()->id;
            $row['name'] =  $dtr->user()->first()->getFullName( 3 );
            $row['department'] = $dtr->user()->first()->department()->first()->getCompleteName();
            $row['date'] = $dtr->date;
            $row['on_duty'] = '';
            $row['off_duty'] = ''; 
            $row['flexy_start'] = '';
            $row['flexy_off'] = '';
            $row['status'] = '';

            if( $dtr->hasSchedule() ){
                    $row['on_duty'] = date("h:i:s", $dtr->start_datetime);
                    $row['off_duty'] = date("h:i:s", $dtr->end_datetime );
                if( $dtr->hasFlexibleSchedule() ){
                    $row['flexy_start'] = date("h:i:s", $dtr->start_flexy_datetime);
                    $row['flexy_off'] = date("h:i:s", $dtr->end_flexy_datetime );
                }
            }
            $row['status'] =  implode(" ", $dtr->getDtrStatus() );

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
            'Date',
            'Duty On',
            'Duty Off',
            'Flexi Start',
            'Flexi End',
            'Status ',
        ];

  
        return $headers;

      



    }
}