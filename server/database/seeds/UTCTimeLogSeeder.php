<?php

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class UTCTimeLogSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        DB::table('utc_timelog')->insert([
            'country_time_zone' => 'IST',
            'timezone' => 'Asia/Kolkata',
            'time_difference' => '+5:30',
            'country_id' => 1,
            'country_name' => 'India',
            'created_at' => date("Y-m-d H:i:s")
        ]);
        DB::table('utc_timelog')->insert([
            'country_time_zone' => 'PST',
            'timezone' => 'Asia/Manila',
            'time_difference' => '+8:00',
            'country_id' => 2,
            'country_name' => 'Philippines',
            'created_at' => date("Y-m-d H:i:s")
        ]);
        DB::table('utc_timelog')->insert([
            'country_time_zone' => 'EET',
            'timezone' => 'Europe/Sofia',
            'time_difference' => '+2:00',
            'country_id' => 3,
            'country_name' => 'Bulgaria',
            'created_at' => date("Y-m-d H:i:s")
        ]);
    }
}
