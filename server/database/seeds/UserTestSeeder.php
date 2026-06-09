<?php

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;

class UserTestSeeder extends Seeder
{
    public function run()
    {
        DB::table('users')->whereIn('username', [
            'active.user',
            'force.user',
            'inactive.user',
            'grace.user',
            'nullterm.user',
        ])->delete();

        $password = Hash::make('CorrectPassword123');

        DB::table('users')->insert([
            [
                'username' => 'active.user',
                'email' => 'active@company.com',
                'password' => $password,
                'is_active' => 1,
                'termination_date' => null,
                'force_change_password' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ],

            [
                'username' => 'force.user',
                'email' => 'force@company.com',
                'password' => $password,
                'is_active' => 1,
                'termination_date' => null,
                'force_change_password' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],

            [
                'username' => 'inactive.user',
                'email' => 'inactive@company.com',
                'password' => $password,
                'is_active' => 0,
                'termination_date' => Carbon::today()->subDays(3),
                'force_change_password' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ],

            [
                'username' => 'grace.user',
                'email' => 'grace@company.com',
                'password' => $password,
                'is_active' => 0,
                'termination_date' => Carbon::today(),
                'force_change_password' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ],

            [
                'username' => 'nullterm.user',
                'email' => 'nullterm@company.com',
                'password' => $password,
                'is_active' => 0,
                'termination_date' => null,
                'force_change_password' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
}