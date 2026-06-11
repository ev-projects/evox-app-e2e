<?php

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;

class UserTestSeeder extends Seeder
{
    public function run()
    {
        $password = Hash::make('CorrectPassword123');

        $users = [
            [
                'username' => 'active.user',
                'email' => 'active@company.com',
                'password' => $password,
                'is_active' => 1,
                'termination_date' => null,
                'force_change_password' => 0,
            ],
            [
                'username' => 'force.user',
                'email' => 'force@company.com',
                'password' => $password,
                'is_active' => 1,
                'termination_date' => null,
                'force_change_password' => 1,
            ],
            [
                'username' => 'inactive.user',
                'email' => 'inactive@company.com',
                'password' => $password,
                'is_active' => 0,
                'termination_date' => Carbon::today()->subDays(3),
                'force_change_password' => 0,
            ],
            [
                'username' => 'grace.user',
                'email' => 'grace@company.com',
                'password' => $password,
                'is_active' => 0,
                'termination_date' => Carbon::today(),
                'force_change_password' => 0,
            ],
            [
                'username' => 'nullterm.user',
                'email' => 'nullterm@company.com',
                'password' => $password,
                'is_active' => 0,
                'termination_date' => null,
                'force_change_password' => 0,
            ],
        ];

        foreach ($users as $user) {
            DB::table('users')->updateOrInsert(
                ['username' => $user['username']],
                array_merge($user, [
                    'updated_at' => now(),
                    'created_at' => now(),
                ])
            );
        }
    }
}