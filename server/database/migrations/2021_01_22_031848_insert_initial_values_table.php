<?php

use App\Modules\User\Models\User;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class InsertInitialValuesTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {

        // Insert api_keys values
        $insert = array(
            'id' => '1',
            'name' => 'evox-app',
            'key' => 'RlYVynDl9ALmOtfCotsLS9iSr93bMzgpIWfoxLktznLfTUL3NfaNO5HittoAfA9Z',
            'active' => '1',
            'created_at' => '2020-01-23 14:11:41',
            'updated_at' => '2020-01-23 14:11:41',
        );
        DB::table('api_keys')->insert($insert);

        
        // Insert api_key_admin_events values
        $insert = array(
            'id' => '1',
            'api_key_id' => '1',
            'ip_address' => '127.0.0.1',
            'event' => 'created',
            'created_at' => '2020-01-23 14:11:41',
            'updated_at' => '2020-01-23 14:11:41',
        );
        DB::table('api_key_admin_events')->insert($insert);



        // Insert departments Values
        $insert = array(
            array(
                'department_name' => "Product Development",
                'department_code' => "OPS",
                'description' => "This department's responsible for all the In-house Application Development.",
                'created_at' =>         date('Y-m-d H:i:s'),
                'updated_at' =>         date('Y-m-d H:i:s')
            ),
            array(
                'department_name' => "Operations",
                'department_code' => "OPS",
                'description' => "This department's responsible for all Management of all the Company's Operations.",
                'created_at' =>         date('Y-m-d H:i:s'),
                'updated_at' =>         date('Y-m-d H:i:s')
            )
        );
        
        DB::table('departments')->insert($insert);



        // Roles
        $employee_role = Role::create(['name' => 'Employee']);
        $supervisor_role = Role::create(['name' => 'Supervisor']);

        // Employee Permissions
        $employee_permissions = [
            Permission::create(['name' => 'view_my_profile']),
            Permission::create(['name' => 'view_dtr']),
            Permission::create(['name' => 'allow_quickpunch']),
            Permission::create(['name' => 'view_request']),
            Permission::create(['name' => 'add_request']),
            Permission::create(['name' => 'edit_request']),
            Permission::create(['name' => 'view_my_inbox']),
            Permission::create(['name' => 'view_associates']),
            Permission::create(['name' => 'view_inspirations']),
            Permission::create(['name' => 'view_ev_buddy']),
            Permission::create(['name' => 'view_ev_elearnings']),
            Permission::create(['name' => 'view_contact_us']),
        ];

        // Supervisor Permissions
        $supervisor_permissions = [
            Permission::create(['name' => 'view_my_team']),
            Permission::create(['name' => 'view_my_team_dtr']),
            Permission::create(['name' => 'view_my_team_schedule']),
            Permission::create(['name' => 'edit_my_team_schedule']),
            
            Permission::create(['name' => 'view_dtr_logs']),
            Permission::create(['name' => 'view_dtr_summary']),

            Permission::create(['name' => 'view_my_team_request']),
            Permission::create(['name' => 'allow_my_team_request_approval']),

            Permission::create(['name' => 'view_schedule']),
            Permission::create(['name' => 'add_schedule']),
            Permission::create(['name' => 'edit_schedule']),
            Permission::create(['name' => 'delete_schedule']),
            
            Permission::create(['name' => 'assign_schedule']),

            Permission::create(['name' => 'assign_schedule_per_department']),
        ];
        

        // Add Permission for their distinct role
        $employee_role->syncPermissions($employee_permissions);
        $supervisor_role->syncPermissions($supervisor_permissions);

        // Insert USERS Default Values
        $insert = array(
            array('emp_num' => '2065',
                  'bhr_num' => '2065',
                  'department_id' => 1,
                  'email' => "aaron.colina@eastvantage.com",
                  'username' => "acolina2065",
                  'password' => Hash::make("ABC123"),
                  'first_name' => 'Aaron Andrew',
                  'middle_name' => 'Magsino',
                  'last_name' => 'Colina',
                  'employment_status' => "Full-Time",
                  'is_active' => true,
                  'created_at' =>         date('Y-m-d H:i:s'),
                  'updated_at' =>         date('Y-m-d H:i:s')
            ),
            array('emp_num' => '012',
                  'bhr_num' => '012',
                  'department_id' => 1,
                  'email' => "carmela.garcia@eastvantage.com",
                  'username' => "cgarcia012",
                  'password' => Hash::make("ABC123"),
                  'first_name' => 'Carmela',
                  'middle_name' => 'G',
                  'last_name' => 'Garcia',
                  'employment_status' => "Full-Time",
                  'is_active' => true,
                  'created_at' =>         date('Y-m-d H:i:s'),
                  'updated_at' =>         date('Y-m-d H:i:s')
            ),
            array('emp_num' => '1479',
                  'bhr_num' => '1479',
                  'department_id' => 1,
                  'email' => "mel.uggadan@eastvantage.com",
                  'username' => "muggadan1479",
                  'password' => Hash::make("ABC123"),
                  'first_name' => 'Meljohn',
                  'middle_name' => 'O',
                  'last_name' => 'Uggadan',
                  'employment_status' => "Full-Time",
                  'is_active' => true,
                  'created_at' =>         date('Y-m-d H:i:s'),
                  'updated_at' =>         date('Y-m-d H:i:s')
            )
        );
        DB::table('users')->insert($insert);





        // Insert users_supervisors Values
        $insert = array(
            array(
                'emp_num' => '2065',
                'supervisor_emp_num' => '012'
            ),
            array(
                'emp_num' => '1479',
                'supervisor_emp_num' => '012'
            ),
        );
        DB::table('users_supervisors')->insert($insert);


        // Add Users for their distinct permissions
        User::find('2065')
            ->assignRole($employee_role)
            ->syncPermissions(array_merge($employee_permissions));
        User::find('1479')
            ->assignRole($employee_role)
            ->syncPermissions(array_merge($employee_permissions));
        User::find('012')
            ->assignRole([$employee_role, $supervisor_role])
            ->syncPermissions(array_merge($employee_permissions, $supervisor_permissions));


    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        //Schema::dropIfExists('api_key_admin_events');
    }
}
