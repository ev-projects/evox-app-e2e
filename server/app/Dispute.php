<?php

namespace App;

use Illuminate\Database\Eloquent\Model;

class Dispute extends Model
{
        protected $fillable = [
            'employee_id',
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
            'Valid_From',
            'Valid_To'
    ];
}
