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



        // Insert Predefined holidays values
        $insert = array(
            // Legal Holidays
            array(
                'name' => "New Year's Day",
                'date' => "2020-01-01",
                'type' => "lh",
                'is_predefined' =>  true,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ),
            array(
                'name' => "Araw ng Kagitingan",
                'date' => "2020-04-09",
                'type' => "lh",
                'is_predefined' =>  true,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ),
            array(
                'name' => "Labor Day",
                'date' => "2020-05-01",
                'type' => "lh",
                'is_predefined' =>  true,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ),
            array(
                'name' => "Independence Day",
                'date' => "2020-06-12",
                'type' => "lh",
                'is_predefined' =>  true,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ),
            array(
                'name' => "National Heroes' Day",
                'date' => "2020-08-26",
                'type' => "lh",
                'is_predefined' =>  true,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ),
            array(
                'name' => "Bonifacio Day",
                'date' => "2020-11-30",
                'type' => "lh",
                'is_predefined' =>  true,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ),
            array(
                'name' => "Christmas Day",
                'date' => "2020-12-25",
                'type' => "lh",
                'is_predefined' =>  true,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ),
            array(
                'name' => "Rizal Day",
                'date' => "2020-12-30",
                'type' => "lh",
                'is_predefined' =>  true,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ),

            // Special Holidays
            array(
                'name' => "EDSA Revolution Anniversary",
                'date' => "2020-02-25",
                'type' => "sh",
                'is_predefined' =>  true,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ),
            array(
                'name' => "Ninoy Aquino Day",
                'date' => "2020-08-21",
                'type' => "sh",
                'is_predefined' =>  true,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ),
            array(
                'name' => "All Saints' Day",
                'date' => "2020-11-01",
                'type' => "sh",
                'is_predefined' =>  true,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ),
            array(
                'name' => "All Souls' Day",
                'date' => "2020-11-02",
                'type' => "sh",
                'is_predefined' =>  true,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ),
            array(
                'name' => "Feast of the Immaculate Conception of Mary",
                'date' => "2020-12-08",
                'type' => "sh",
                'is_predefined' =>  true,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ),
            array(
                'name' => "Taguig Day",
                'date' => "2020-12-08",
                'type' => "sh",
                'is_predefined' =>  true,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ),
            array(
                'name' => "Christmas Eve",
                'date' => "2020-12-24",
                'type' => "sh",
                'is_predefined' =>  true,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ),
            array(
                'name' => "Last Day of the Year",
                'date' => "2020-12-31",
                'type' => "sh",
                'is_predefined' =>  true,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ),
        );
        
        DB::table('holidays')->insert($insert);

        // Insert Payroll Cutoffs
        $insert = array(
            array(
                'start_date' => "2020-01-19",
                'end_date' => "2020-02-18",
                'description' => "For January",
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ),
            array(
                'start_date' => "2020-02-19",
                'end_date' => "2020-03-18",
                'description' => "For February",
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ),
            array(
                'start_date' => "2020-03-19",
                'end_date' => "2020-04-18",
                'description' => "For March",
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ),
            array(
                'start_date' => "2020-04-19",
                'end_date' => "2020-05-18",
                'description' => "For April",
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ),
            array(
                'start_date' => "2020-05-19",
                'end_date' => "2020-06-18",
                'description' => "For May",
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ),
            array(
                'start_date' => "2020-06-19",
                'end_date' => "2020-07-18",
                'description' => "For June",
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ),
        );
        
        DB::table('payroll_cutoffs')->insert($insert);



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
                  'bhr_num' => '42576',
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
                  'bhr_num' => '40359',
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
                  'bhr_num' => '42026',
                  'department_id' => 1,
                  'email' => "mel.ugaddan@eastvantage.com",
                  'username' => "mugaddan1479",
                  'password' => Hash::make("ABC123"),
                  'first_name' => 'Meljohn',
                  'middle_name' => 'O',
                  'last_name' => 'Ugaddan',
                  'employment_status' => "Full-Time",
                  'is_active' => true,
                  'created_at' =>         date('Y-m-d H:i:s'),
                  'updated_at' =>         date('Y-m-d H:i:s')
            ),
            array('emp_num' => '1742',
                  'bhr_num' => '42270',
                  'department_id' => 1,
                  'email' => "juan.norico@eastvantage.com",
                  'username' => "jnorico1742",
                  'password' => Hash::make("ABC123"),
                  'first_name' => 'Juan Rodrigo',
                  'middle_name' => 'ITT',
                  'last_name' => 'Norico - NIGHT SHIFT',
                  'employment_status' => "Full-Time",
                  'is_active' => true,
                  'created_at' =>         date('Y-m-d H:i:s'),
                  'updated_at' =>         date('Y-m-d H:i:s')
            ),
            array('emp_num' => '273',
                  'bhr_num' => '40616',
                  'department_id' => 1,
                  'email' => "kier.soriano@eastvantage.com",
                  'username' => "ksoriano273",
                  'password' => Hash::make("ABC123"),
                  'first_name' => 'Kier',
                  'middle_name' => 'HKI',
                  'last_name' => 'Norico - NIGHT SHIFT',
                  'employment_status' => "Full-Time",
                  'is_active' => true,
                  'created_at' =>         date('Y-m-d H:i:s'),
                  'updated_at' =>         date('Y-m-d H:i:s')
            ),
            array('emp_num' => '2042',
                  'bhr_num' => '42553',
                  'department_id' => 1,
                  'email' => "allan.rimando@eastvantage.com",
                  'username' => "arimando2042",
                  'password' => Hash::make("ABC123"),
                  'first_name' => 'Allan Paul',
                  'middle_name' => 'OPT',
                  'last_name' => 'Rimando - MID SHIFT',
                  'employment_status' => "Full-Time",
                  'is_active' => true,
                  'created_at' =>         date('Y-m-d H:i:s'),
                  'updated_at' =>         date('Y-m-d H:i:s')
            ),
            array('emp_num' => '114',
                  'bhr_num' => '40457',
                  'department_id' => 1,
                  'email' => "analyn.condat@eastvantage.com",
                  'username' => "acondat114",
                  'password' => Hash::make("ABC123"),
                  'first_name' => 'Analyn',
                  'middle_name' => 'VID',
                  'last_name' => 'Condat - MID SHIFT',
                  'employment_status' => "Full-Time",
                  'is_active' => true,
                  'created_at' =>         date('Y-m-d H:i:s'),
                  'updated_at' =>         date('Y-m-d H:i:s')
            ),
            array('emp_num' => '1234',
                  'bhr_num' => '42606',
                  'department_id' => 1,
                  'email' => "dummy@ops.eastvantage.com",
                  'username' => "demployee1234",
                  'password' => Hash::make("ABC123"),
                  'first_name' => 'Dummy',
                  'middle_name' => 'OPS',
                  'last_name' => 'Employee - MID SHIFT',
                  'employment_status' => "Full-Time",
                  'is_active' => true,
                  'created_at' =>         date('Y-m-d H:i:s'),
                  'updated_at' =>         date('Y-m-d H:i:s')
            ),
            array('emp_num' => '4321',
                  'bhr_num' => '42605',
                  'department_id' => 1,
                  'email' => "dummy_manager@ops.eastvantage.com",
                  'username' => "dmanager4321",
                  'password' => Hash::make("ABC123"),
                  'first_name' => 'Dummy',
                  'middle_name' => 'OPS',
                  'last_name' => 'Manager - MID SHIFT',
                  'employment_status' => "Full-Time",
                  'is_active' => true,
                  'created_at' =>         date('Y-m-d H:i:s'),
                  'updated_at' =>         date('Y-m-d H:i:s')
            ),
            array('emp_num' => '1590',
                  'bhr_num' => '42129',
                  'department_id' => 1,
                  'email' => "Claribel.Jalbuena@globalenglish.com",
                  'username' => "cjalbuena",
                  'password' => Hash::make("ABC123"),
                  'first_name' => 'Claribel Karen ',
                  'middle_name' => 'GBE',
                  'last_name' => 'Jalbuena',
                  'employment_status' => "Full-Time",
                  'is_active' => true,
                  'created_at' =>         date('Y-m-d H:i:s'),
                  'updated_at' =>         date('Y-m-d H:i:s')
            ),
        );
        DB::table('users')->insert($insert);





        // Insert users_supervisors Values
        $insert = array(
            array(
                'user_id' => '1',
                'supervisor_id' => '2'
            ),
            array(
                'user_id' => '3',
                'supervisor_id' => '2'
            ),
            array(
                'user_id' => '4',
                'supervisor_id' => '2'
            ),
            array(
                'user_id' => '5',
                'supervisor_id' => '2'
            ),
            array(
                'user_id' => '6',
                'supervisor_id' => '2'
            ),
            array(
                'user_id' => '7',
                'supervisor_id' => '2'
            ),
            array(
                'user_id' => '8',
                'supervisor_id' => '9'
            ),
            array(
                'user_id' => '9',
                'supervisor_id' => '2'
            ),
            array(
                'user_id' => '10',
                'supervisor_id' => '2'
            ),
        );
        DB::table('users_supervisors')->insert($insert);

        // Add Users for their distinct permissions
        User::find(1)
            ->assignRole($employee_role)
            ->syncPermissions(array_merge($employee_permissions));
        User::find(3)
            ->assignRole($employee_role)
            ->syncPermissions(array_merge($employee_permissions));
        User::find(4)
            ->assignRole($employee_role)
            ->syncPermissions(array_merge($employee_permissions));
        User::find(5)
            ->assignRole($employee_role)
            ->syncPermissions(array_merge($employee_permissions));
        User::find(6)
            ->assignRole($employee_role)
            ->syncPermissions(array_merge($employee_permissions));
        User::find(7)
            ->assignRole($employee_role)
            ->syncPermissions(array_merge($employee_permissions));
        User::find(8)
            ->assignRole($employee_role)
            ->syncPermissions(array_merge($employee_permissions));
        User::find(10)
            ->assignRole($employee_role)
            ->syncPermissions(array_merge($employee_permissions));
            
        User::find(2)
            ->assignRole([$employee_role, $supervisor_role])
            ->syncPermissions(array_merge($employee_permissions, $supervisor_permissions));

        User::find(9)
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
