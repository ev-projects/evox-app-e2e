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

class AssetExport implements FromCollection, WithHeadings, WithEvents
{
    use Exportable;
    protected $data;

    public function __construct($data)
    {
        $this->data = $data;
    }
  
    public function registerEvents(): array
    {
        return [];
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
            'Is Personal Equipment',
            'Equipment Type',
            'Serial No',
            'Asset Tag',
        ];
    }

}