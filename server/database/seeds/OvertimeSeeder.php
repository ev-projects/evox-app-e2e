<?php

use Illuminate\Database\Seeder;
use App\Models\User;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Support\Str;

class OvertimeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        $status = array('approved','declined','canceled','pending');
        $ot_type = array('post_overtime','pre_overtime');

        foreach(range(1, 20) as $index) {
            $date = Carbon::create(2020, 5, 28, 12, 30, 55);

            $id = rand(1,3);
            DB::table('overtimes')->insert([
                'user_id' => $id,
                'date' =>  $date->addWeeks(rand(1, 52))->format('Y-m-d H:i:s'),
                'amount' => 3600,
                'type' => $ot_type[rand(0,1)],
                'employee_note' => Str::random(10),
                'approver_note' => Str::random(10),
                'updated_by' => rand(1,3),
                'created_by' => $id,
                'updated_at' => $date->addWeeks(rand(1, 52))->format('Y-m-d H:i:s'),
                'created_at' => $date->addWeeks(rand(1, 52))->format('Y-m-d H:i:s'),
                'status' => $status[rand(0,3)]
            ]);

            $id = rand(1,3);
            DB::table('work_from_homes')->insert([
                'user_id' => $id,
                'valid_from' =>  $date->addWeeks(rand(1, 52))->format('Y-m-d H:i:s'),
                'valid_to' => $date->addWeeks(rand(1, 52))->format('Y-m-d H:i:s'),
                'employee_note' => Str::random(10),
                'approver_note' => Str::random(10),
                'updated_by' => rand(1,5),
                'created_by' => $id,
                'updated_at' => $date->addWeeks(rand(1, 52))->format('Y-m-d H:i:s'),
                'created_at' => $date->addWeeks(rand(1, 52))->format('Y-m-d H:i:s'),
                'status' => $status[rand(0,3)]
            ]);

            $id = rand(1,3);
            DB::table('alter_logs')->insert([
                'user_id' => $id,
                'date' =>  $date->addWeeks(rand(1, 52))->format('Y-m-d H:i:s'),
                'current_time_in' => $date->addWeeks(rand(1, 52))->timestamp,
                'current_time_out' => $date->addWeeks(rand(1, 52))->timestamp,
                'new_time_in' => $date->addWeeks(rand(1, 52))->timestamp,
                'new_time_out' => $date->addWeeks(rand(1, 52))->timestamp,
                'employee_note' => Str::random(10),
                'approver_note' => Str::random(10),
                'updated_by' => rand(1,3),
                'created_by' => $id,
                'updated_at' => $date->addWeeks(rand(1, 52))->format('Y-m-d H:i:s'),
                'created_at' => $date->addWeeks(rand(1, 52))->format('Y-m-d H:i:s'),
                'status' => $status[rand(0,3)]
            ]);

            $id = rand(1,3);
            DB::table('rest_day_works')->insert([
                'user_id' => $id,
                'date' =>  $date->addWeeks(rand(1, 52))->format('Y-m-d H:i:s'),
                'start_time' => $date->addWeeks(rand(1, 52))->timestamp,
                'end_time' => $date->addWeeks(rand(1, 52))->timestamp,
                'break_time' => 3600,
                'employee_note' => Str::random(10),
                'approver_note' => Str::random(10),
                'updated_by' => rand(1,3),
                'created_by' => $id,
                'updated_at' => $date->addWeeks(rand(1, 52))->format('Y-m-d H:i:s'),
                'created_at' => $date->addWeeks(rand(1, 52))->format('Y-m-d H:i:s'),
                'status' => $status[rand(0,3)]
            ]);

            $id = rand(1,3);
            DB::table('change_schedules')->insert([
                'user_id' => $id,
                'valid_from' => $date->addWeeks(rand(1, 52))->format('Y-m-d H:i:s'),
                'valid_to' => $date->addWeeks(rand(1, 52))->format('Y-m-d H:i:s'),
                'employee_note' => Str::random(10),
                'approver_note' => Str::random(10),
                'updated_by' => rand(1,3),
                'created_by' => $id,
                'updated_at' => $date->addWeeks(rand(1, 52))->format('Y-m-d H:i:s'),
                'created_at' => $date->addWeeks(rand(1, 52))->format('Y-m-d H:i:s'),
                'status' => $status[rand(0,3)]
            ]);
        }
    }
}


